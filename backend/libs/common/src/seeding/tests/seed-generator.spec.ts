/**
 * @file seed-generator.spec.ts
 * @description Kiểm thử 3 nhánh cho Modular Seeder Engine (Master, Transactions, Ledger Double-Entry, Invariants)
 * @trace docs/architecture/database-schema-strategy.md
 * @plan docs/plans/platform/comprehensive-database-seeding-and-reset.md # Verification Plan
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  DEMO_IDS,
  assertDatasetInvariants,
  generateSeedBundle,
  resolveScaleConfig,
  SeedLedgerEngine,
  SeedPrng,
  type SeedBundle,
} from '@/common/seeding/index.js';

const FIXED_DATE = new Date('2026-11-25T12:00:00.000Z');
const S3_PREFIX = 'http://localhost:4566/food-delivery-assets';

function cloneBundle(bundle: SeedBundle): SeedBundle {
  return {
    ...bundle,
    restaurants: bundle.restaurants.map((r) => ({ ...r })),
    orders: bundle.orders.map((o) => ({ ...o })),
    orderItems: bundle.orderItems.map((i) => ({ ...i })),
    walletAccounts: bundle.walletAccounts.map((w) => ({ ...w })),
    walletBalances: bundle.walletBalances.map((b) => ({ ...b })),
    ledgerTransactions: bundle.ledgerTransactions.map((t) => ({ ...t })),
    ledgerEntries: bundle.ledgerEntries.map((e) => ({ ...e })),
    withdrawalRequests: bundle.withdrawalRequests.map((w) => ({ ...w })),
  };
}

describe('Modular Database Seeder Engine', () => {
  // ==========================================
  // 1. HAPPY PATH
  // ==========================================
  describe('Happy Path', () => {
    it('should generate full standard dataset across all 7 schemas with balanced double-entry ledger', () => {
      const bundle = generateSeedBundle({
        scale: 'standard',
        s3PublicPrefix: S3_PREFIX,
        referenceDate: FIXED_DATE,
      });

      // Master tables (m_*)
      expect(bundle.categories).toHaveLength(10);
      expect(bundle.tags).toHaveLength(16);
      expect(bundle.users.length).toBeGreaterThanOrEqual(200);
      expect(bundle.restaurants.length).toBeGreaterThanOrEqual(150);
      expect(bundle.operatingHours).toHaveLength(bundle.restaurants.length * 7);
      expect(bundle.menuItems.length).toBeGreaterThanOrEqual(1500);
      expect(bundle.vouchers.length).toBeGreaterThanOrEqual(16);
      expect(bundle.campaigns.length).toBeGreaterThanOrEqual(5);
      expect(bundle.knowledgeChunks.length).toBeGreaterThanOrEqual(3);

      // Transaction tables (t_*)
      expect(bundle.orders).toHaveLength(600);
      expect(bundle.orderItems.length).toBeGreaterThanOrEqual(600);
      expect(bundle.orderReviews.length).toBeGreaterThan(250);
      expect(bundle.deliveryProofs.length).toBeGreaterThan(400);
      expect(bundle.orderDisputes).toHaveLength(35);
      expect(bundle.withdrawalRequests).toHaveLength(35);
      expect(bundle.registrationRequests).toHaveLength(35);
      expect(bundle.chatSessions).toHaveLength(20);
      expect(bundle.chatMessages).toHaveLength(40);
      expect(bundle.ledgerTransactions.length).toBeGreaterThan(500);
      expect(bundle.ledgerEntries.length).toBeGreaterThan(1200);

      // Global double-entry sum check: SUM(DEBIT) === SUM(CREDIT)
      let globalDebit = new Decimal(0);
      let globalCredit = new Decimal(0);
      for (const entry of bundle.ledgerEntries) {
        if (entry.entry_type === 'DEBIT') {
          globalDebit = globalDebit.plus(entry.amount);
        } else {
          globalCredit = globalCredit.plus(entry.amount);
        }
      }
      expect(globalDebit.equals(globalCredit)).toBe(true);
      expect(globalDebit.gt(0)).toBe(true);

      // Infrastructure projections
      expect(bundle.esRestaurants.length).toBeGreaterThan(140);
      expect(bundle.esMenuItems.length).toBeGreaterThan(1300);
      expect(bundle.redisOnlineDrivers.length).toBeGreaterThan(10);
      expect(bundle.redisInflightOrders.length).toBeGreaterThan(0);
      expect(bundle.s3Assets.length).toBeGreaterThan(30);
    });

    it('should be strictly deterministic for identical inputs and enrich all 6 Demo Accounts', () => {
      const first = generateSeedBundle({
        scale: 'standard',
        s3PublicPrefix: S3_PREFIX,
        referenceDate: FIXED_DATE,
      });
      const second = generateSeedBundle({
        scale: 'standard',
        s3PublicPrefix: S3_PREFIX,
        referenceDate: FIXED_DATE,
      });

      expect(first.users.map((u) => u.id)).toEqual(second.users.map((u) => u.id));
      expect(first.orders.map((o) => o.total_amount)).toEqual(second.orders.map((o) => o.total_amount));
      expect(first.walletBalances).toEqual(second.walletBalances);

      // Verify core demo accounts have rich activity
      const demoCustomerOrders = first.orders.filter(
        (o) => o.customer_id === DEMO_IDS.CUSTOMER_USER_ID,
      );
      expect(demoCustomerOrders.length).toBeGreaterThanOrEqual(20);
      const demoStatuses = new Set(demoCustomerOrders.map((o) => o.status));
      expect(demoStatuses.has('COMPLETED')).toBe(true);
      expect(demoStatuses.has('DELIVERING')).toBe(true);
      expect(demoStatuses.has('PENDING')).toBe(true);

      const demoDisputes = first.orderDisputes.filter(
        (d) => d.customer_id === DEMO_IDS.CUSTOMER_USER_ID,
      );
      expect(demoDisputes.length).toBeGreaterThanOrEqual(3);

      const driver1Trips = first.orders.filter(
        (o) => o.driver_id === DEMO_IDS.DRIVER1_USER_ID,
      );
      expect(driver1Trips.length).toBeGreaterThanOrEqual(10);

      const phoBienOrders = first.orders.filter(
        (o) => o.restaurant_id === DEMO_IDS.REST_PHOBIEN_ID,
      );
      expect(phoBienOrders.length).toBeGreaterThanOrEqual(15);
    });
  });

  // ==========================================
  // 2. EDGE CASES
  // ==========================================
  describe('Edge Cases', () => {
    it('should generate large scale preset (500 restaurants, 5000+ menu items, 3000 orders) preserving all invariants', () => {
      const large = generateSeedBundle({
        scale: 'large',
        s3PublicPrefix: S3_PREFIX,
        referenceDate: FIXED_DATE,
      });

      expect(large.scale).toBe('large');
      expect(large.restaurants).toHaveLength(500);
      expect(large.menuItems.length).toBeGreaterThanOrEqual(5000);
      expect(large.orders).toHaveLength(3000);
      expect(large.operatingHours).toHaveLength(3500);

      // Unique restaurant owners (1-1 constraint)
      const uniqueOwners = new Set(large.restaurants.map((r) => r.owner_id));
      expect(uniqueOwners.size).toBe(large.restaurants.length);

      // Every wallet satisfies locked_balance === sum(PENDING/PROCESSING withdrawals)
      expect(() => assertDatasetInvariants(large)).not.toThrow();
    });

    it('should normalize trailing slash in s3PublicPrefix and support custom knowledge chunks & PRNG bounds', () => {
      const bundle = generateSeedBundle({
        scale: 'standard',
        s3PublicPrefix: `${S3_PREFIX}/`,
        referenceDate: FIXED_DATE,
        knowledgeDocs: [
          {
            sourceType: 'POLICY',
            sourceRef: 'custom.md',
            rawContent: 'Chính sách thử nghiệm kiểm tra chia chunk văn bản ngắn.',
          },
        ],
      });

      expect(bundle.s3Assets[0]?.publicUrl).not.toContain('//defaults');
      expect(bundle.knowledgeChunks).toHaveLength(1);
      expect(bundle.knowledgeChunks[0]?.source_ref).toBe('custom.md');

      const prng = new SeedPrng(123);
      expect(prng.pickMany([1, 2, 3], 0)).toEqual([]);
      expect(prng.int(5, 5)).toBe(5);
    });

    it('should reconcile Hold & Settle withdrawal locked_balance accurately in SeedLedgerEngine', () => {
      const engine = new SeedLedgerEngine(FIXED_DATE);
      const drvWallet = engine.ensureWallet({
        ownerId: DEMO_IDS.DRIVER1_USER_ID,
        ownerType: 'DRIVER',
        accountCategory: 'LIABILITY',
        accountCode: `WALLET_DRIVER_${DEMO_IDS.DRIVER1_USER_ID}`,
        createdAt: FIXED_DATE,
      });

      engine.postTransaction({
        transactionKey: 'topup-edge',
        transactionCode: 'TOPUP-EDGE-1',
        referenceType: 'WALLET_TOPUP',
        referenceId: DEMO_IDS.DRIVER1_USER_ID,
        description: 'Topup edge',
        idempotencyKey: 'idemp-edge-1',
        postedAt: FIXED_DATE,
        entries: [
          {
            walletAccountId: engine.systemGatewayVnpayAccountId,
            entryType: 'DEBIT',
            amount: new Decimal(300000),
          },
          {
            walletAccountId: drvWallet.id,
            entryType: 'CREDIT',
            amount: new Decimal(300000),
          },
        ],
      });

      engine.holdForWithdrawal(drvWallet.id, new Decimal(120000));
      const exported = engine.exportResults();
      const drvBal = exported.walletBalances.find((b) => b.wallet_account_id === drvWallet.id);
      expect(drvBal?.available_balance).toBe('180000');
      expect(drvBal?.locked_balance).toBe('120000');
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('should fail fast on invalid scale preset or missing s3PublicPrefix', () => {
      expect(() => resolveScaleConfig('ultra')).toThrow(/Scale preset không hợp lệ/);
      expect(() =>
        generateSeedBundle({
          scale: 'standard',
          s3PublicPrefix: '',
          referenceDate: FIXED_DATE,
        }),
      ).toThrow(/s3PublicPrefix is required/);
    });

    it('should reject empty pick or imbalanced double-entry transactions in SeedLedgerEngine', () => {
      const prng = new SeedPrng(1);
      expect(() => prng.pick([])).toThrow(/Cannot pick from an empty array/);

      const engine = new SeedLedgerEngine(FIXED_DATE);
      const custWallet = engine.ensureWallet({
        ownerId: DEMO_IDS.CUSTOMER_USER_ID,
        ownerType: 'CUSTOMER',
        accountCategory: 'LIABILITY',
        accountCode: 'WALLET_CUST_ERR',
        createdAt: FIXED_DATE,
      });

      expect(() =>
        engine.postTransaction({
          transactionKey: 'bad-balance',
          transactionCode: 'ERR-IMBALANCE',
          referenceType: 'WALLET_TOPUP',
          referenceId: DEMO_IDS.CUSTOMER_USER_ID,
          description: 'Mismatched entries',
          idempotencyKey: 'idemp-bad-1',
          postedAt: FIXED_DATE,
          entries: [
            {
              walletAccountId: engine.systemGatewayVnpayAccountId,
              entryType: 'DEBIT',
              amount: new Decimal(100000),
            },
            {
              walletAccountId: custWallet.id,
              entryType: 'CREDIT',
              amount: new Decimal(90000),
            },
          ],
        }),
      ).toThrow(/Double-entry imbalance/);
    });

    it('should catch corrupted order totals or ledger imbalances in assertDatasetInvariants', () => {
      const base = generateSeedBundle({
        scale: 'standard',
        s3PublicPrefix: S3_PREFIX,
        referenceDate: FIXED_DATE,
      });

      const badOrderBundle = cloneBundle(base);
      badOrderBundle.orders[0]!.total_amount += 5000;
      expect(() => assertDatasetInvariants(badOrderBundle)).toThrow(/total_amount mismatch/);

      const badLedgerBundle = cloneBundle(base);
      badLedgerBundle.ledgerEntries[0]!.amount = '999999999';
      expect(() => assertDatasetInvariants(badLedgerBundle)).toThrow(/double-entry invariant/i);

      const badOwnerBundle = cloneBundle(base);
      badOwnerBundle.restaurants[1]!.owner_id = badOwnerBundle.restaurants[0]!.owner_id;
      expect(() => assertDatasetInvariants(badOwnerBundle)).toThrow(/Duplicate 1-to-1 owner_id/);
    });
  });
});
