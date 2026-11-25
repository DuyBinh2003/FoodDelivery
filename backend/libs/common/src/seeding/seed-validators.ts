import { Decimal } from 'decimal.js';
import type { SeedBundle } from '@/common/seeding/seed-types.js';

/**
 * Validates all mathematical, Double-Entry Ledger, and Foreign-Key invariants before persisting to PostgreSQL.
 */
export function assertDatasetInvariants(bundle: SeedBundle): void {
  const userIds = new Set(bundle.users.map((u) => u.id));
  const restaurantIds = new Set(bundle.restaurants.map((r) => r.id));
  const walletIds = new Set(bundle.walletAccounts.map((w) => w.id));

  // 1. Unique & 1-1 owner_id invariant on m_restaurant
  const seenEmails = new Set<string>();
  for (const user of bundle.users) {
    if (seenEmails.has(user.email)) {
      throw new Error(`[SeedValidationError] Duplicate user email: ${user.email}`);
    }
    seenEmails.add(user.email);
  }

  const seenOwnerIds = new Set<string>();
  for (const rest of bundle.restaurants) {
    if (!userIds.has(rest.owner_id)) {
      throw new Error(`[SeedValidationError] Restaurant "${rest.name}" references missing owner_id: ${rest.owner_id}`);
    }
    if (seenOwnerIds.has(rest.owner_id)) {
      throw new Error(`[SeedValidationError] Duplicate 1-to-1 owner_id in m_restaurant: ${rest.owner_id}`);
    }
    seenOwnerIds.add(rest.owner_id);
    if (rest.rating < 1 || rest.rating > 5) {
      throw new Error(`[SeedValidationError] Invalid restaurant rating ${rest.rating} for ${rest.id}`);
    }
  }

  // 2. Operating Hours invariant: every restaurant has all 7 days (0..6)
  const daysByRest = new Map<string, Set<number>>();
  for (const oh of bundle.operatingHours) {
    const days = daysByRest.get(oh.restaurant_id) ?? new Set<number>();
    days.add(oh.day_of_week);
    daysByRest.set(oh.restaurant_id, days);
  }
  for (const restId of restaurantIds) {
    const days = daysByRest.get(restId);
    if (!days || days.size !== 7) {
      throw new Error(`[SeedValidationError] Restaurant ${restId} does not have all 7 operating hour days.`);
    }
  }

  // 3. Order subtotal & total_amount reconciliation against t_order_item
  const itemSubtotalByOrder = new Map<string, number>();
  for (const item of bundle.orderItems) {
    itemSubtotalByOrder.set(item.order_id, (itemSubtotalByOrder.get(item.order_id) ?? 0) + item.quantity * item.unit_price);
  }

  for (const order of bundle.orders) {
    if (!userIds.has(order.customer_id)) {
      throw new Error(`[SeedValidationError] Order ${order.id} references missing customer_id ${order.customer_id}`);
    }
    if (!restaurantIds.has(order.restaurant_id)) {
      throw new Error(`[SeedValidationError] Order ${order.id} references missing restaurant_id ${order.restaurant_id}`);
    }
    const itemsSum = itemSubtotalByOrder.get(order.id) ?? 0;
    if (itemsSum !== order.subtotal) {
      throw new Error(
        `[SeedValidationError] Order ${order.id} subtotal mismatch: order.subtotal=${order.subtotal} != sum(items)=${itemsSum}`,
      );
    }
    const expectedTotal = Math.max(0, order.subtotal + order.delivery_fee - order.points_discount - order.voucher_discount);
    if (expectedTotal !== order.total_amount) {
      throw new Error(
        `[SeedValidationError] Order ${order.id} total_amount mismatch: ${order.total_amount} != ${expectedTotal}`,
      );
    }
  }

  // 4. Double-Entry Bookkeeping Invariant: SUM(DEBIT) == SUM(CREDIT) per transaction and globally
  const debitsByTxn = new Map<string, Decimal>();
  const creditsByTxn = new Map<string, Decimal>();
  const ledgerNetByWallet = new Map<string, Decimal>();
  const walletCategoryById = new Map(bundle.walletAccounts.map((w) => [w.id, w.account_category]));

  for (const entry of bundle.ledgerEntries) {
    if (!walletIds.has(entry.wallet_account_id)) {
      throw new Error(`[SeedValidationError] Ledger entry ${entry.id} points to missing wallet ${entry.wallet_account_id}`);
    }
    const amt = new Decimal(entry.amount);
    if (amt.lte(0)) {
      throw new Error(`[SeedValidationError] Ledger entry ${entry.id} has non-positive amount ${entry.amount}`);
    }

    if (entry.entry_type === 'DEBIT') {
      debitsByTxn.set(entry.ledger_transaction_id, (debitsByTxn.get(entry.ledger_transaction_id) ?? new Decimal(0)).plus(amt));
    } else {
      creditsByTxn.set(entry.ledger_transaction_id, (creditsByTxn.get(entry.ledger_transaction_id) ?? new Decimal(0)).plus(amt));
    }

    const cat = walletCategoryById.get(entry.wallet_account_id);
    const isAssetOrExpense = cat === 'ASSET' || cat === 'EXPENSE';
    const currentNet = ledgerNetByWallet.get(entry.wallet_account_id) ?? new Decimal(0);
    const delta = isAssetOrExpense
      ? entry.entry_type === 'DEBIT'
        ? amt
        : amt.negated()
      : entry.entry_type === 'CREDIT'
        ? amt
        : amt.negated();
    ledgerNetByWallet.set(entry.wallet_account_id, currentNet.plus(delta));
  }

  for (const txn of bundle.ledgerTransactions) {
    const d = debitsByTxn.get(txn.id) ?? new Decimal(0);
    const c = creditsByTxn.get(txn.id) ?? new Decimal(0);
    if (!d.equals(c) || d.isZero()) {
      throw new Error(
        `[SeedValidationError] Transaction ${txn.transaction_code} violates double-entry invariant (DEBIT=${d.toString()}, CREDIT=${c.toString()}).`,
      );
    }
  }

  // 5. Wallet Balance parity against Ledger Entries & Pending/Processing Withdrawal holds
  const heldByWallet = new Map<string, Decimal>();
  for (const wdr of bundle.withdrawalRequests) {
    if (wdr.status === 'PENDING' || wdr.status === 'PROCESSING') {
      heldByWallet.set(wdr.wallet_account_id, (heldByWallet.get(wdr.wallet_account_id) ?? new Decimal(0)).plus(wdr.amount));
    }
  }

  for (const bal of bundle.walletBalances) {
    const avail = new Decimal(bal.available_balance);
    const locked = new Decimal(bal.locked_balance);
    const expectedHeld = heldByWallet.get(bal.wallet_account_id) ?? new Decimal(0);
    if (!locked.equals(expectedHeld)) {
      throw new Error(
        `[SeedValidationError] Wallet ${bal.wallet_account_id} locked_balance=${locked.toString()} != pending withdrawal sum=${expectedHeld.toString()}`,
      );
    }
    const ledgerNet = ledgerNetByWallet.get(bal.wallet_account_id) ?? new Decimal(0);
    if (!avail.plus(locked).equals(ledgerNet)) {
      throw new Error(
        `[SeedValidationError] Wallet ${bal.wallet_account_id} available(${avail.toString()})+locked(${locked.toString()}) != ledgerNet(${ledgerNet.toString()})`,
      );
    }
  }
}
