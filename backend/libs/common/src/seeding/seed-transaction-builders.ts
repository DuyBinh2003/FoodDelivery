import { Decimal } from 'decimal.js';
import {
  DEMO_IDS,
  type RedisInflightOrderSeed,
  type ScaleConfig,
  type SeedChatFeedbackRecord,
  type SeedChatMessageRecord,
  type SeedChatSessionRecord,
  type SeedDeliveryProofRecord,
  type SeedIdempotencyKeyRecord,
  type SeedLoyaltyTransactionRecord,
  type SeedOrderDisputeRecord,
  type SeedOrderItemRecord,
  type SeedOrderRecord,
  type SeedOrderReviewRecord,
  type SeedOrderStatus,
  type SeedOutboxRecord,
  type SeedPaymentIntentRecord,
  type SeedUserVoucherRecord,
  type SeedVoucherRecord,
  type SeedVoucherReservationRecord,
  type SeedVoucherUsageRecord,
  type SeedWithdrawalRequestRecord,
} from '@/common/seeding/seed-types.js';
import { addMinutes, daysBefore, deterministicUuid, SeedPrng } from '@/common/seeding/seed-prng.js';
import { buildS3Url, DISPUTE_ASSET_KEYS, POD_ASSET_KEYS } from '@/common/seeding/seed-s3-assets.js';
import type { MasterDataBundle } from '@/common/seeding/seed-master-builders.js';
import { SeedLedgerEngine } from '@/common/seeding/seed-ledger-builder.js';

export interface TransactionDataBundle {
  readonly loyaltyTransactions: SeedLoyaltyTransactionRecord[];
  readonly userVouchers: SeedUserVoucherRecord[];
  readonly orders: SeedOrderRecord[];
  readonly orderItems: SeedOrderItemRecord[];
  readonly orderReviews: SeedOrderReviewRecord[];
  readonly voucherUsages: SeedVoucherUsageRecord[];
  readonly voucherReservations: SeedVoucherReservationRecord[];
  readonly deliveryProofs: SeedDeliveryProofRecord[];
  readonly orderDisputes: SeedOrderDisputeRecord[];
  readonly paymentIntents: SeedPaymentIntentRecord[];
  readonly withdrawalRequests: SeedWithdrawalRequestRecord[];
  readonly outboxEvents: SeedOutboxRecord[];
  readonly idempotencyKeys: SeedIdempotencyKeyRecord[];
  readonly chatSessions: SeedChatSessionRecord[];
  readonly chatMessages: SeedChatMessageRecord[];
  readonly chatFeedbacks: SeedChatFeedbackRecord[];
  readonly redisInflightOrders: RedisInflightOrderSeed[];
}

const REVIEW_COMMENTS = [
  'Đồ ăn đóng gói cực kỳ cẩn thận, còn nóng hổi khi nhận. Quán làm nhanh!',
  'Hương vị đậm đà chuẩn vị, phần ăn đầy đặn xứng đáng 5 sao.',
  'Tài xế giao hàng thân thiện, gọi điện báo trước rất lịch sự.',
  'Nước dùng ngọt thanh, topping nhiều. Sẽ đặt lại nhiều lần nữa.',
  'Giao hơi chậm do giờ cao điểm nhưng món vẫn ngon và nguyên vẹn.',
  'Quán làm đúng ghi chú không hành, rất hài lòng với dịch vụ.',
] as const;

const ORDER_NOTES = [
  'Ít hành lá, nước dùng để riêng giúp mình nhé.',
  'Giao trước sảnh chung cư, gọi số này khi tới nơi.',
  'Không ớt cay, cho thêm đũa muỗng.',
  'Để ở quầy lễ tân tầng trệt giúp mình.',
  null,
  null,
] as const;

const DISPUTE_DESCRIPTIONS: ReadonlyArray<{
  code: string;
  desc: string;
  imgKey: string;
  penalty: 'DRIVER' | 'RESTAURANT' | 'PLATFORM';
}> = [
  {
    code: 'SPILLED_FOOD',
    desc: 'Nước dùng bị đổ ra túi khi vận chuyển, hộp mì bị ướt.',
    imgKey: DISPUTE_ASSET_KEYS.SPILLED,
    penalty: 'DRIVER',
  },
  {
    code: 'MISSING_ITEMS',
    desc: 'Đơn đặt 3 món nhưng trong túi chỉ có 2 món chính, thiếu đồ uống.',
    imgKey: DISPUTE_ASSET_KEYS.MISSING,
    penalty: 'RESTAURANT',
  },
  {
    code: 'LATE_DELIVERY',
    desc: 'Đơn giao trễ hơn dự kiến 45 phút khiến thức ăn bị nguội lạnh.',
    imgKey: DISPUTE_ASSET_KEYS.LATE,
    penalty: 'PLATFORM',
  },
];

const BANKS = ['VCB', 'TCB', 'MBB', 'ACB', 'VPB', 'TPB'] as const;

export function buildTransactionAndLedgerData(params: {
  config: ScaleConfig;
  prng: SeedPrng;
  referenceDate: Date;
  s3PublicPrefix: string;
  master: MasterDataBundle;
  ledger: SeedLedgerEngine;
}): TransactionDataBundle {
  const { config, prng, referenceDate, s3PublicPrefix, master, ledger } = params;

  const loyaltyTransactions: SeedLoyaltyTransactionRecord[] = [];
  const userVouchers: SeedUserVoucherRecord[] = [];
  const orders: SeedOrderRecord[] = [];
  const orderItems: SeedOrderItemRecord[] = [];
  const orderReviews: SeedOrderReviewRecord[] = [];
  const voucherUsages: SeedVoucherUsageRecord[] = [];
  const voucherReservations: SeedVoucherReservationRecord[] = [];
  const deliveryProofs: SeedDeliveryProofRecord[] = [];
  const orderDisputes: SeedOrderDisputeRecord[] = [];
  const paymentIntents: SeedPaymentIntentRecord[] = [];
  const withdrawalRequests: SeedWithdrawalRequestRecord[] = [];
  const outboxEvents: SeedOutboxRecord[] = [];
  const idempotencyKeys: SeedIdempotencyKeyRecord[] = [];
  const chatSessions: SeedChatSessionRecord[] = [];
  const chatMessages: SeedChatMessageRecord[] = [];
  const chatFeedbacks: SeedChatFeedbackRecord[] = [];
  const redisInflightOrders: RedisInflightOrderSeed[] = [];

  const podPicked1 = buildS3Url(s3PublicPrefix, POD_ASSET_KEYS.PICKED_UP_1);
  const podPicked2 = buildS3Url(s3PublicPrefix, POD_ASSET_KEYS.PICKED_UP_2);
  const podDeliv1 = buildS3Url(s3PublicPrefix, POD_ASSET_KEYS.DELIVERED_1);
  const podDeliv2 = buildS3Url(s3PublicPrefix, POD_ASSET_KEYS.DELIVERED_2);

  // 1. Initialize Wallets & Baseline Top-Ups for Customers, Drivers, and Restaurants
  const customerWalletByUserId = new Map<string, string>();
  const driverWalletByUserId = new Map<string, string>();
  const restaurantWalletById = new Map<string, string>();

  master.customerUserIds.forEach((customerId, idx) => {
    const createdAt = daysBefore(referenceDate, 40);
    const wallet = ledger.ensureWallet({
      ownerId: customerId,
      ownerType: 'CUSTOMER',
      accountCategory: 'LIABILITY',
      accountCode: `WALLET_CUSTOMER_${customerId}`,
      createdAt,
    });
    customerWalletByUserId.set(customerId, wallet.id);

    const topupAmount = idx === 0 ? 5_000_000 : 1_200_000 + (idx % 6) * 250_000;
    const isMomo = idx % 2 === 1;
    ledger.postTransaction({
      transactionKey: `topup-cust-${customerId}`,
      transactionCode: `TOPUP-CUST-${String(idx + 1).padStart(4, '0')}`,
      referenceType: 'WALLET_TOPUP',
      referenceId: customerId,
      description: `Nạp tiền ví FoodPay ban đầu cho khách hàng`,
      idempotencyKey: `seed-topup-cust-${customerId}`,
      postedAt: daysBefore(referenceDate, 35, idx * 3),
      entries: [
        {
          walletAccountId: isMomo ? ledger.systemGatewayMomoAccountId : ledger.systemGatewayVnpayAccountId,
          entryType: 'DEBIT',
          amount: new Decimal(topupAmount),
        },
        {
          walletAccountId: wallet.id,
          entryType: 'CREDIT',
          amount: new Decimal(topupAmount),
        },
      ],
    });
  });

  master.driverUserIds.forEach((driverId, idx) => {
    const createdAt = daysBefore(referenceDate, 40);
    const wallet = ledger.ensureWallet({
      ownerId: driverId,
      ownerType: 'DRIVER',
      accountCategory: 'LIABILITY',
      accountCode: `WALLET_DRIVER_${driverId}`,
      createdAt,
    });
    driverWalletByUserId.set(driverId, wallet.id);

    const initialDeposit = idx === 0 ? 2_500_000 : 1_000_000 + (idx % 5) * 300_000;
    ledger.postTransaction({
      transactionKey: `topup-drv-${driverId}`,
      transactionCode: `TOPUP-DRV-${String(idx + 1).padStart(4, '0')}`,
      referenceType: 'WALLET_TOPUP',
      referenceId: driverId,
      description: `Nạp ký quỹ hoạt động tài xế`,
      idempotencyKey: `seed-topup-drv-${driverId}`,
      postedAt: daysBefore(referenceDate, 34, idx * 4),
      entries: [
        {
          walletAccountId: ledger.systemGatewayVnpayAccountId,
          entryType: 'DEBIT',
          amount: new Decimal(initialDeposit),
        },
        {
          walletAccountId: wallet.id,
          entryType: 'CREDIT',
          amount: new Decimal(initialDeposit),
        },
      ],
    });
  });

  master.restaurants.forEach((rest) => {
    const wallet = ledger.ensureWallet({
      ownerId: rest.id,
      ownerType: 'RESTAURANT',
      accountCategory: 'LIABILITY',
      accountCode: `WALLET_RESTAURANT_${rest.id}`,
      createdAt: rest.created_at,
    });
    restaurantWalletById.set(rest.id, wallet.id);
  });

  // 2. Loyalty Wallet index & Running point balance
  const loyaltyByUserId = new Map(master.loyaltyWallets.map((lw) => [lw.user_id, lw]));

  // 3. User Voucher Wallet allocations (highlight demo customer with AVAILABLE/USED/EXPIRED)
  const voucherAllocSeen = new Set<string>();
  const addUserVoucher = (
    userId: string,
    voucher: SeedVoucherRecord,
    status: SeedUserVoucherRecord['status'],
    claimedDaysAgo: number,
    usedAt: Date | null,
    keySuffix: string,
  ) => {
    const uniqKey = `${userId}:${voucher.id}:${keySuffix}`;
    if (voucherAllocSeen.has(uniqKey)) return;
    voucherAllocSeen.add(uniqKey);
    const claimedAt = daysBefore(referenceDate, claimedDaysAgo);
    userVouchers.push({
      id: deterministicUuid('user-voucher', uniqKey),
      user_id: userId,
      voucher_id: voucher.id,
      device_fingerprint: `fp-${userId.slice(0, 8)}`,
      status,
      claimed_at: claimedAt,
      used_at: usedAt,
      expires_at: status === 'EXPIRED' ? daysBefore(referenceDate, 1) : voucher.valid_to,
    });
  };

  // Spotlight vouchers for DEMO_IDS.CUSTOMER_USER_ID
  master.vouchers.slice(0, 8).forEach((v, idx) => {
    const st: SeedUserVoucherRecord['status'] =
      idx < 5 ? 'AVAILABLE' : idx === 5 ? 'USED' : idx === 6 ? 'RESERVED' : 'EXPIRED';
    addUserVoucher(
      DEMO_IDS.CUSTOMER_USER_ID,
      v,
      st,
      10 - Math.min(idx, 8),
      st === 'USED' ? daysBefore(referenceDate, 2) : null,
      'demo',
    );
  });

  const userVoucherCount = config.scale === 'large' ? 600 : 180;
  for (let i = 0; i < userVoucherCount; i++) {
    const custId = master.customerUserIds[(i % (master.customerUserIds.length - 1)) + 1] ?? DEMO_IDS.CUSTOMER_USER_ID;
    const voucher = master.vouchers[i % master.vouchers.length] as SeedVoucherRecord;
    const statusPool: readonly SeedUserVoucherRecord['status'][] = ['AVAILABLE', 'AVAILABLE', 'USED', 'EXPIRED'];
    const st = statusPool[i % statusPool.length] as SeedUserVoucherRecord['status'];
    addUserVoucher(custId, voucher, st, (i % 14) + 1, st === 'USED' ? daysBefore(referenceDate, 1) : null, `${i}`);
  }

  // 4. Generate Orders across all 7 statuses with realistic timeline over 30 days + live active orders
  // First 28 orders are specifically tailored for Demo accounts so Customer/Merchant/Driver/Admin portals immediately pop!
  const demoLiveStatuses: readonly SeedOrderStatus[] = [
    'DELIVERING',
    'READY_FOR_PICKUP',
    'COOKING',
    'ACCEPTED',
    'PENDING',
  ];

  const completedOrderList: SeedOrderRecord[] = [];
  const ratingSumByRest = new Map<string, { sum: number; count: number }>();

  for (let i = 0; i < config.orders; i++) {
    const orderId = deterministicUuid('order', i);
    const isDemoSlot = i < 36;

    // Customer assignment: slot 0..24 goes to DEMO customer; rest across all customers
    const customerId =
      i < 24
        ? DEMO_IDS.CUSTOMER_USER_ID
        : (master.customerUserIds[prng.int(0, master.customerUserIds.length - 1)] ?? DEMO_IDS.CUSTOMER_USER_ID);

    // Restaurant assignment: slots 0..19 include demo Pho Bien & Bun Bo, others across verified restaurants
    const restaurantId =
      isDemoSlot && i % 2 === 0
        ? DEMO_IDS.REST_PHOBIEN_ID
        : isDemoSlot && i % 3 === 0
          ? DEMO_IDS.REST_BUNBO_ID
          : (master.restaurantIds[i % master.restaurantIds.length] ?? DEMO_IDS.REST_PHOBIEN_ID);

    const restaurantObj = master.restaurants.find((r) => r.id === restaurantId) ?? master.restaurants[0]!;
    const menuList = master.menuByRestaurantId.get(restaurantId) ?? [];
    const addr = master.defaultAddressByCustomerId.get(customerId);
    const customerName = master.userNameById.get(customerId) ?? 'Khách Hàng';
    const recipientPhone = addr?.recipient_phone ?? '0901234567';
    const deliveryAddress = addr?.full_address ?? '72 Lê Thánh Tôn, Quận 1, TP. Hồ Chí Minh';
    const deliveryLat = addr?.latitude ?? 10.77653;
    const deliveryLng = addr?.longitude ?? 106.70098;

    // Choose Order Status
    let status: SeedOrderStatus;
    if (i < demoLiveStatuses.length) {
      status = demoLiveStatuses[i] as SeedOrderStatus;
    } else if (i < Math.round(config.orders * 0.68)) {
      status = 'COMPLETED';
    } else if (i < Math.round(config.orders * 0.80)) {
      // Other historical or recent CANCELLED / live states
      const activePool: readonly SeedOrderStatus[] = [
        'PENDING',
        'ACCEPTED',
        'COOKING',
        'READY_FOR_PICKUP',
        'DELIVERING',
      ];
      status = activePool[i % activePool.length] as SeedOrderStatus;
    } else {
      status = 'CANCELLED';
    }

    const isInflightStatus =
      status === 'PENDING' ||
      status === 'ACCEPTED' ||
      status === 'COOKING' ||
      status === 'READY_FOR_PICKUP' ||
      status === 'DELIVERING';

    // Timing: inflight orders within last 5-45 minutes; completed/cancelled distributed over 0..30 days (with dense recent days)
    let createdAt: Date;
    if (isInflightStatus) {
      createdAt = addMinutes(referenceDate, -prng.int(4, 35));
    } else {
      const daysBack = i < 40 ? prng.int(0, 7) : prng.int(0, 30);
      createdAt = daysBefore(referenceDate, daysBack, prng.int(60, 1200));
    }

    // Driver assignment (only DELIVERING, COMPLETED, and some CANCELLED after pickup have driver)
    let driverId: string | null = null;
    if (status === 'DELIVERING' || status === 'COMPLETED') {
      if (isDemoSlot) {
        driverId = i % 2 === 0 ? DEMO_IDS.DRIVER1_USER_ID : DEMO_IDS.DRIVER2_USER_ID;
      } else {
        driverId = master.driverUserIds[i % master.driverUserIds.length] ?? DEMO_IDS.DRIVER1_USER_ID;
      }
    }

    // Pick 1..4 distinct menu items from restaurant
    const pickedItems = prng.pickMany(menuList, prng.int(1, Math.min(4, Math.max(1, menuList.length))));
    let subtotal = 0;
    const currentOrderItems: SeedOrderItemRecord[] = [];
    pickedItems.forEach((dish, itemIdx) => {
      const qty = prng.int(1, 3);
      subtotal += dish.price * qty;
      currentOrderItems.push({
        id: deterministicUuid('order-item', `${i}:${itemIdx}`),
        order_id: orderId,
        menu_item_id: dish.id,
        menu_item_name: dish.name,
        quantity: qty,
        unit_price: dish.price,
        created_at: createdAt,
      });
    });

    const deliveryFee = i % 5 === 0 ? 18000 : i % 3 === 0 ? 22000 : 15000;

    // Optional Loyalty points redeem on ~25% of completed orders
    let pointsUsed = 0;
    let pointsDiscount = 0;
    const loyaltyWallet = loyaltyByUserId.get(customerId);
    if (status === 'COMPLETED' && i % 4 === 1 && loyaltyWallet && loyaltyWallet.available_points >= 500) {
      pointsUsed = Math.min(2000, Math.floor(loyaltyWallet.available_points / 2));
      const maxPointsDiscount = Math.floor(subtotal * 0.3);
      pointsDiscount = Math.min(pointsUsed * 10, maxPointsDiscount);
      pointsUsed = Math.floor(pointsDiscount / 10);
      pointsDiscount = pointsUsed * 10;
    }

    // Optional Voucher discount on ~25% of orders
    let voucherId: string | null = null;
    let voucherCode: string | null = null;
    let voucherDiscount = 0;
    if (i % 4 === 2 && subtotal >= 80000) {
      const voucher = master.vouchers[i % master.vouchers.length] as SeedVoucherRecord;
      if (subtotal >= voucher.min_order_amount) {
        voucherId = voucher.id;
        voucherCode = voucher.code;
        if (voucher.voucher_type === 'PERCENTAGE') {
          const pct = Math.round((subtotal * voucher.discount_value) / 100);
          voucherDiscount = Math.min(pct, voucher.max_discount_amount ?? pct);
        } else {
          voucherDiscount = Math.min(voucher.discount_value, deliveryFee + Math.round(subtotal * 0.4));
        }
      }
    }

    const totalAmount = Math.max(0, subtotal + deliveryFee - pointsDiscount - voucherDiscount);
    const pointsEarned =
      status === 'COMPLETED' ? Math.max(10, Math.floor(totalAmount / 1000)) : 0;

    const paymentMethods: readonly SeedOrderRecord['payment_method'][] = ['WALLET', 'CASH', 'VNPAY', 'MOMO'];
    const paymentMethod = paymentMethods[i % paymentMethods.length] as SeedOrderRecord['payment_method'];

    const cookingAt =
      status === 'COOKING' || status === 'READY_FOR_PICKUP' || status === 'DELIVERING' || status === 'COMPLETED'
        ? addMinutes(createdAt, 4)
        : null;
    const readyAt =
      status === 'READY_FOR_PICKUP' || status === 'DELIVERING' || status === 'COMPLETED'
        ? addMinutes(createdAt, 15)
        : null;
    const driverClaimedAt =
      status === 'DELIVERING' || status === 'COMPLETED' ? addMinutes(createdAt, 18) : null;
    const completedAt = status === 'COMPLETED' ? addMinutes(createdAt, 32) : null;
    const cancelledAt = status === 'CANCELLED' ? addMinutes(createdAt, 6) : null;
    const updatedAt = completedAt ?? cancelledAt ?? driverClaimedAt ?? readyAt ?? cookingAt ?? createdAt;

    const orderRecord: SeedOrderRecord = {
      id: orderId,
      customer_id: customerId,
      restaurant_id: restaurantId,
      driver_id: driverId,
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      points_used: pointsUsed,
      points_discount: pointsDiscount,
      points_earned: pointsEarned,
      voucher_id: voucherId,
      voucher_code: voucherCode,
      voucher_discount: voucherDiscount,
      status,
      delivery_address: deliveryAddress,
      delivery_lat: deliveryLat,
      delivery_lng: deliveryLng,
      recipient_name: customerName,
      recipient_phone: recipientPhone,
      note: ORDER_NOTES[i % ORDER_NOTES.length] ?? null,
      estimated_delivery_time: addMinutes(createdAt, 30),
      payment_method: paymentMethod,
      cooking_at: cookingAt,
      ready_at: readyAt,
      driver_claimed_at: driverClaimedAt,
      completed_at: completedAt,
      cancelled_at: cancelledAt,
      created_at: createdAt,
      updated_at: updatedAt,
      restaurant_name: restaurantObj.name,
    };

    orders.push(orderRecord);
    orderItems.push(...currentOrderItems);

    if (status === 'COMPLETED') {
      completedOrderList.push(orderRecord);
    }

    // Add Voucher Usage & Reservations
    if (voucherId) {
      const voucher = master.vouchers.find((v) => v.id === voucherId);
      const campaign = voucher?.campaign_id
        ? master.campaigns.find((c) => c.id === voucher.campaign_id)
        : undefined;
      const platShare = campaign ? Math.round((voucherDiscount * campaign.platform_share_ratio) / 100) : voucherDiscount;
      const merchShare = campaign ? Math.round((voucherDiscount * campaign.merchant_share_ratio) / 100) : 0;
      const partShare = Math.max(0, voucherDiscount - platShare - merchShare);

      voucherUsages.push({
        id: deterministicUuid('voucher-usage', orderId),
        voucher_id: voucherId,
        campaign_id: campaign?.id ?? null,
        order_id: orderId,
        customer_id: customerId,
        discount_amount: voucherDiscount,
        platform_funded_amount: platShare,
        merchant_funded_amount: merchShare,
        partner_funded_amount: partShare,
        status: status === 'CANCELLED' ? 'REVERTED' : 'APPLIED',
        applied_at: createdAt,
        reverted_at: status === 'CANCELLED' ? cancelledAt : null,
      });

      if (isInflightStatus) {
        voucherReservations.push({
          id: deterministicUuid('voucher-res', orderId),
          order_id: orderId,
          voucher_id: voucherId,
          user_id: customerId,
          ticket_token: `TKT-${orderId.slice(0, 12).toUpperCase()}`,
          status: 'LOCKED',
          reserved_until: addMinutes(referenceDate, 15),
          discount_amount: voucherDiscount,
          created_at: createdAt,
        });
      }
    }

    // Loyalty Transactions (Redeem & Earn)
    if (loyaltyWallet) {
      if (pointsUsed > 0) {
        loyaltyWallet.available_points -= pointsUsed;
        loyaltyTransactions.push({
          id: deterministicUuid('loyalty-txn-redeem', orderId),
          wallet_id: loyaltyWallet.id,
          user_id: customerId,
          transaction_type: 'REDEEM_ORDER',
          points: -pointsUsed,
          balance_after: loyaltyWallet.available_points,
          reference_type: 'ORDER',
          reference_id: orderId,
          idempotency_key: `seed-loyalty-redeem-${orderId}`,
          description: `Đổi ${pointsUsed} điểm cho đơn hàng #${orderId.slice(0, 8)}`,
          created_at: createdAt,
        });
      }
      if (pointsEarned > 0 && completedAt) {
        loyaltyWallet.available_points += pointsEarned;
        loyaltyWallet.lifetime_points += pointsEarned;
        loyaltyTransactions.push({
          id: deterministicUuid('loyalty-txn-earn', orderId),
          wallet_id: loyaltyWallet.id,
          user_id: customerId,
          transaction_type: 'EARN',
          points: pointsEarned,
          balance_after: loyaltyWallet.available_points,
          reference_type: 'ORDER',
          reference_id: orderId,
          idempotency_key: `seed-loyalty-earn-${orderId}`,
          description: `Tích ${pointsEarned} điểm từ đơn hàng hoàn tất #${orderId.slice(0, 8)}`,
          created_at: completedAt,
        });
      }
    }

    // Payment Intent + Ledger Settlement for Orders
    const custWalletId = customerWalletByUserId.get(customerId);
    const restWalletId = restaurantWalletById.get(restaurantId);
    const drvWalletId = driverId ? driverWalletByUserId.get(driverId) : undefined;
    const isDigitalPayment = paymentMethod !== 'CASH';

    paymentIntents.push({
      id: deterministicUuid('payment-intent', orderId),
      order_id: orderId,
      customer_id: customerId,
      amount: String(totalAmount),
      currency: 'VND',
      payment_method: paymentMethod,
      gateway_transaction_id: isDigitalPayment ? `GW-${orderId.slice(0, 12).toUpperCase()}` : null,
      status:
        status === 'CANCELLED'
          ? 'CANCELLED'
          : paymentMethod === 'CASH'
            ? status === 'COMPLETED'
              ? 'SUCCEEDED'
              : 'PENDING_COD'
            : 'SUCCEEDED',
      idempotency_key: `seed-pi-${orderId}`,
      error_code: null,
      error_message: null,
      metadata: { restaurantId, orderStatus: status },
      expires_at: addMinutes(createdAt, 60),
      created_at: createdAt,
    });

    if (totalAmount > 0 && custWalletId && restWalletId && status !== 'CANCELLED' && isDigitalPayment) {
      // Top-up customer automatically if wallet balance is below totalAmount so customer never goes negative
      const avail = ledger.getAvailableBalance(custWalletId);
      if (avail.lessThan(totalAmount)) {
        const autoTopup = new Decimal(Math.max(1_000_000, totalAmount * 2));
        ledger.postTransaction({
          transactionKey: `auto-topup-${orderId}`,
          transactionCode: `TOPUP-AUTO-${orderId.slice(0, 8).toUpperCase()}-${i}`,
          referenceType: 'WALLET_TOPUP',
          referenceId: customerId,
          description: `Tự động nạp bổ sung ví thanh toán đơn #${orderId.slice(0, 8)}`,
          idempotencyKey: `seed-auto-topup-${orderId}`,
          postedAt: addMinutes(createdAt, -1),
          entries: [
            {
              walletAccountId: paymentMethod === 'MOMO' ? ledger.systemGatewayMomoAccountId : ledger.systemGatewayVnpayAccountId,
              entryType: 'DEBIT',
              amount: autoTopup,
            },
            {
              walletAccountId: custWalletId,
              entryType: 'CREDIT',
              amount: autoTopup,
            },
          ],
        });
      }

      const restaurantShare = Math.min(Math.round(subtotal * 0.8), totalAmount);
      const platformFee = totalAmount - restaurantShare;
      const settlementEntries = [
        {
          walletAccountId: custWalletId,
          entryType: 'DEBIT' as const,
          amount: new Decimal(totalAmount),
        },
        {
          walletAccountId: restWalletId,
          entryType: 'CREDIT' as const,
          amount: new Decimal(restaurantShare),
        },
      ];
      if (platformFee > 0) {
        settlementEntries.push({
          walletAccountId: ledger.systemRevenueAccountId,
          entryType: 'CREDIT' as const,
          amount: new Decimal(platformFee),
        });
      }

      ledger.postTransaction({
        transactionKey: `order-settle-${orderId}`,
        transactionCode: `PAY-${orderId.slice(0, 8).toUpperCase()}-${i}`,
        referenceType: 'ORDER_SETTLEMENT',
        referenceId: orderId,
        description: `Thanh toán & đối soát đơn hàng #${orderId.slice(0, 8)} (${paymentMethod})`,
        idempotencyKey: `seed-pay-${orderId}`,
        postedAt: createdAt,
        entries: settlementEntries,
      });
    } else if (status === 'COMPLETED' && paymentMethod === 'CASH' && restWalletId) {
      // Simulate restaurant settlement credit for completed COD/Cash reconciliations via gateway pool
      const restaurantCashNet = Math.max(10000, Math.round(subtotal * 0.8));
      const cashPlatformFee = Math.max(5000, Math.round(subtotal * 0.2));
      ledger.postTransaction({
        transactionKey: `cod-settle-${orderId}`,
        transactionCode: `COD-${orderId.slice(0, 8).toUpperCase()}-${i}`,
        referenceType: 'COD_DEDUCTION',
        referenceId: orderId,
        description: `Quyết toán doanh thu đối tác từ thu hộ COD đơn #${orderId.slice(0, 8)}`,
        idempotencyKey: `seed-cod-${orderId}`,
        postedAt: completedAt ?? createdAt,
        entries: [
          {
            walletAccountId: ledger.systemGatewayVnpayAccountId,
            entryType: 'DEBIT',
            amount: new Decimal(restaurantCashNet + cashPlatformFee),
          },
          {
            walletAccountId: restWalletId,
            entryType: 'CREDIT',
            amount: new Decimal(restaurantCashNet),
          },
          {
            walletAccountId: ledger.systemRevenueAccountId,
            entryType: 'CREDIT',
            amount: new Decimal(cashPlatformFee),
          },
        ],
      });
    }

    // Driver earnings & trip commission on COMPLETED orders
    if (status === 'COMPLETED' && driverId && drvWalletId && completedAt) {
      const tripPlatformFee = Math.max(1000, Math.round(deliveryFee * 0.1));
      const driverNetEarning = deliveryFee - tripPlatformFee;

      ledger.postTransaction({
        transactionKey: `drv-earn-${orderId}`,
        transactionCode: `TRIP-EARN-${orderId.slice(0, 8).toUpperCase()}-${i}`,
        referenceType: 'COMMISSION_FEE',
        referenceId: orderId,
        description: `Thu nhập giao hàng & hoa hồng nền tảng cuốc #${orderId.slice(0, 8)}`,
        idempotencyKey: `seed-drv-earn-${orderId}`,
        postedAt: completedAt,
        entries: [
          {
            walletAccountId: ledger.systemGatewayVnpayAccountId,
            entryType: 'DEBIT',
            amount: new Decimal(deliveryFee),
          },
          {
            walletAccountId: drvWalletId,
            entryType: 'CREDIT',
            amount: new Decimal(driverNetEarning),
          },
          {
            walletAccountId: ledger.systemRevenueAccountId,
            entryType: 'CREDIT',
            amount: new Decimal(tripPlatformFee),
          },
        ],
      });
    }

    // Reviews (~55% of COMPLETED orders)
    if (status === 'COMPLETED' && i % 9 !== 0 && completedAt) {
      const restRating = prng.int(4, 5);
      const drvRating = prng.int(4, 5);
      const foodRating = prng.chance(0.85) ? 5 : prng.int(3, 4);
      orderReviews.push({
        id: deterministicUuid('order-review', orderId),
        order_id: orderId,
        restaurant_id: restaurantId,
        restaurant_rating: restRating,
        driver_rating: drvRating,
        food_rating: foodRating,
        comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length] as string,
        image_urls: i % 3 === 0 ? [podDeliv1] : [],
        created_at: addMinutes(completedAt, 20),
      });

      const currentStat = ratingSumByRest.get(restaurantId) ?? { sum: 0, count: 0 };
      currentStat.sum += restRating;
      currentStat.count += 1;
      ratingSumByRest.set(restaurantId, currentStat);
    }

    // Proof of Delivery (PICKED_UP for DELIVERING + both PICKED_UP & DELIVERED for COMPLETED)
    if ((status === 'DELIVERING' || status === 'COMPLETED') && driverId && driverClaimedAt) {
      deliveryProofs.push({
        id: deterministicUuid('pod-pickup', orderId),
        order_id: orderId,
        driver_id: driverId,
        proof_type: 'PICKED_UP',
        image_url: i % 2 === 0 ? podPicked1 : podPicked2,
        captured_lat: restaurantObj.lat,
        captured_lng: restaurantObj.lon,
        notes: 'Đã kiểm tra đủ món và niêm phong túi tại quầy.',
        created_at: addMinutes(driverClaimedAt, 2),
      });

      if (status === 'COMPLETED' && completedAt) {
        deliveryProofs.push({
          id: deterministicUuid('pod-delivered', orderId),
          order_id: orderId,
          driver_id: driverId,
          proof_type: 'DELIVERED',
          image_url: i % 2 === 0 ? podDeliv1 : podDeliv2,
          captured_lat: deliveryLat,
          captured_lng: deliveryLng,
          notes: 'Đã bàn giao tận tay khách hàng.',
          created_at: completedAt,
        });
      }
    }

    // Outbox & Idempotency sample records for observability
    if (i < (config.scale === 'large' ? 200 : 60)) {
      const isPendingOutbox = i % 15 === 0 && isInflightStatus;
      outboxEvents.push({
        id: deterministicUuid('outbox', orderId),
        aggregate_type: 'ORDER',
        aggregate_id: orderId,
        event_type: status === 'COMPLETED' ? 'ORDER_SETTLED' : 'ORDER_CREATED',
        payload: {
          orderId,
          customerId,
          restaurantId,
          totalAmount,
          status,
        },
        status: isPendingOutbox ? 'PENDING' : 'PUBLISHED',
        retry_count: 0,
        last_error: null,
        published_at: isPendingOutbox ? null : addMinutes(createdAt, 1),
        created_at: createdAt,
      });

      idempotencyKeys.push({
        id: deterministicUuid('idemp-key', orderId),
        idempotency_key: `req-checkout-${orderId}`,
        endpoint: '/orders',
        request_hash: deterministicUuid('req-hash', orderId).replaceAll('-', ''),
        status: 'COMPLETED',
        response_status_code: 201,
        response_body: { id: orderId, status, total_amount: totalAmount },
        locked_until: addMinutes(createdAt, 5),
        created_at: createdAt,
      });
    }

    // Active Redis in-flight snapshot (up to 40 active orders across Redis so KDS/Dispatch/Customer tracking load instantly)
    if (isInflightStatus && redisInflightOrders.length < 40) {
      redisInflightOrders.push({
        id: orderId,
        customer_id: customerId,
        restaurant_id: restaurantId,
        restaurant_name: restaurantObj.name,
        driver_id: driverId,
        status,
        delivery_address: deliveryAddress,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        recipient_name: customerName,
        recipient_phone: recipientPhone,
        note: orderRecord.note,
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        points_used: pointsUsed,
        points_discount: pointsDiscount,
        points_earned: pointsEarned,
        total_amount: totalAmount,
        items: currentOrderItems.map((it) => ({
          id: it.id,
          menu_item_id: it.menu_item_id,
          name: it.menu_item_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
        cooking_at: cookingAt ? cookingAt.toISOString() : null,
        ready_at: readyAt ? readyAt.toISOString() : null,
        driver_claimed_at: driverClaimedAt ? driverClaimedAt.toISOString() : null,
        completed_at: completedAt ? completedAt.toISOString() : null,
        cancelled_at: cancelledAt ? cancelledAt.toISOString() : null,
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
      });
    }
  }

  // Reconcile Restaurant ratings against seeded reviews
  for (const rest of master.restaurants) {
    const stat = ratingSumByRest.get(rest.id);
    if (stat && stat.count > 0) {
      rest.rating = Number((stat.sum / stat.count).toFixed(2));
    }
  }

  // 5. Order Disputes (CS Portal Queue + Double-Entry Refunds for RESOLVED disputes)
  const disputePool = completedOrderList.slice(0, Math.min(config.disputes, completedOrderList.length));
  disputePool.forEach((order, dIdx) => {
    const disputeId = deterministicUuid('order-dispute', order.id);
    const tpl = DISPUTE_DESCRIPTIONS[dIdx % DISPUTE_DESCRIPTIONS.length]!;
    const statusPool: readonly SeedOrderDisputeRecord['status'][] = [
      'OPEN',
      'INVESTIGATING',
      'RESOLVED',
      'REJECTED',
    ];
    const dStatus = statusPool[dIdx % statusPool.length] as SeedOrderDisputeRecord['status'];
    const priority: SeedOrderDisputeRecord['priority'] =
      dIdx % 5 === 0 ? 'URGENT' : dIdx % 2 === 0 ? 'HIGH' : 'NORMAL';
    const createdAt = addMinutes(order.completed_at ?? order.created_at, 45);
    const resolvedAt =
      dStatus === 'RESOLVED' || dStatus === 'REJECTED' ? addMinutes(createdAt, 120) : null;

    let resolutionAction: SeedOrderDisputeRecord['resolution_action'] = null;
    let refundAmount = 0;
    let penaltyParty: SeedOrderDisputeRecord['penalty_party'] = null;
    let resolutionNotes: string | null = null;

    if (dStatus === 'RESOLVED') {
      const isFull = dIdx % 2 === 0;
      resolutionAction = isFull ? 'FULL_REFUND' : 'PARTIAL_REFUND';
      refundAmount = isFull ? order.total_amount : Math.round(order.total_amount * 0.5);
      penaltyParty = tpl.penalty;
      resolutionNotes = 'Đã đối chiếu ảnh POD và phản hồi từ nhà hàng, duyệt hoàn tiền về ví khách.';

      const custWalletId = customerWalletByUserId.get(order.customer_id);
      const revAvailable = ledger.getAvailableBalance(ledger.systemRevenueAccountId);
      if (custWalletId && refundAmount > 0 && revAvailable.greaterThanOrEqualTo(refundAmount)) {
        ledger.postTransaction({
          transactionKey: `dispute-refund-${disputeId}`,
          transactionCode: `REFUND-${order.id.slice(0, 8).toUpperCase()}-${dIdx}`,
          referenceType: 'REFUND',
          referenceId: disputeId,
          description: `Hoàn tiền khiếu nại đơn #${order.id.slice(0, 8)} (${resolutionAction})`,
          idempotencyKey: `seed-refund-${disputeId}`,
          postedAt: resolvedAt ?? createdAt,
          entries: [
            {
              walletAccountId: ledger.systemRevenueAccountId,
              entryType: 'DEBIT',
              amount: new Decimal(refundAmount),
            },
            {
              walletAccountId: custWalletId,
              entryType: 'CREDIT',
              amount: new Decimal(refundAmount),
            },
          ],
        });
      }
    } else if (dStatus === 'REJECTED') {
      resolutionAction = 'REJECT';
      penaltyParty = null;
      resolutionNotes = 'Ảnh POD chứng minh tài xế đã giao đủ phần ăn nguyên vẹn, từ chối yêu cầu hoàn tiền.';
    }

    orderDisputes.push({
      id: disputeId,
      order_id: order.id,
      customer_id: order.customer_id,
      reason_code: tpl.code,
      description: tpl.desc,
      evidence_images: [buildS3Url(s3PublicPrefix, tpl.imgKey)],
      status: dStatus,
      priority,
      resolution_action: resolutionAction,
      refund_amount: refundAmount,
      penalty_party: penaltyParty,
      assigned_cs_id: dStatus === 'OPEN' ? null : DEMO_IDS.ADMIN_USER_ID,
      resolution_notes: resolutionNotes,
      version: resolvedAt ? 2 : 1,
      created_at: createdAt,
      updated_at: resolvedAt ?? createdAt,
      resolved_at: resolvedAt,
    });
  });

  // 6. Partner & Driver Bank Withdrawal Requests (PENDING/PROCESSING Hold + COMPLETED Ledger Payout + REJECTED)
  const requesterPool: Array<{
    requesterId: string;
    requesterType: 'DRIVER' | 'RESTAURANT';
    walletId: string;
    holderName: string;
  }> = [];

  master.restaurants.forEach((rest) => {
    const wId = restaurantWalletById.get(rest.id);
    if (wId) {
      requesterPool.push({
        requesterId: rest.id,
        requesterType: 'RESTAURANT',
        walletId: wId,
        holderName: rest.name.toUpperCase().slice(0, 40),
      });
    }
  });
  master.driverUserIds.forEach((drvId) => {
    const wId = driverWalletByUserId.get(drvId);
    if (wId) {
      requesterPool.push({
        requesterId: drvId,
        requesterType: 'DRIVER',
        walletId: wId,
        holderName: (master.userNameById.get(drvId) ?? 'TAI XE').toUpperCase(),
      });
    }
  });

  let createdWithdrawals = 0;
  let scanCursor = 0;
  while (createdWithdrawals < config.withdrawals && scanCursor < requesterPool.length * 4) {
    const reqTarget = requesterPool[scanCursor % requesterPool.length]!;
    scanCursor++;

    const available = ledger.getAvailableBalance(reqTarget.walletId);
    const minWithdraw = new Decimal(100_000);
    if (available.lessThan(minWithdraw.plus(50_000))) {
      continue;
    }

    const reqIndex = createdWithdrawals;
    const statusPool: readonly SeedWithdrawalRequestRecord['status'][] = [
      'PENDING',
      'COMPLETED',
      'COMPLETED',
      'PROCESSING',
      'REJECTED',
    ];
    const wStatus = statusPool[reqIndex % statusPool.length] as SeedWithdrawalRequestRecord['status'];
    const rawAmount = Math.min(500_000, Math.floor(available.toNumber() * 0.25));
    const amount = Math.max(50_000, Math.floor(rawAmount / 10_000) * 10_000);
    const decAmount = new Decimal(amount);
    const createdAt = daysBefore(referenceDate, (reqIndex % 15) + 1, reqIndex * 7);
    const wId = deterministicUuid('withdrawal', `${reqIndex}:${reqTarget.requesterId}`);

    if (wStatus === 'PENDING' || wStatus === 'PROCESSING') {
      ledger.holdForWithdrawal(reqTarget.walletId, decAmount);
    } else if (wStatus === 'COMPLETED') {
      ledger.postTransaction({
        transactionKey: `withdraw-settled-${wId}`,
        transactionCode: `WDR-${String(reqIndex + 1).padStart(4, '0')}`,
        referenceType: 'WITHDRAWAL',
        referenceId: wId,
        description: `Giải ngân rút tiền về ngân hàng (${reqTarget.requesterType})`,
        idempotencyKey: `seed-wdr-${wId}`,
        postedAt: addMinutes(createdAt, 90),
        entries: [
          {
            walletAccountId: reqTarget.walletId,
            entryType: 'DEBIT',
            amount: decAmount,
          },
          {
            walletAccountId: ledger.systemGatewayVnpayAccountId,
            entryType: 'CREDIT',
            amount: decAmount,
          },
        ],
      });
    }

    withdrawalRequests.push({
      id: wId,
      wallet_account_id: reqTarget.walletId,
      requester_id: reqTarget.requesterId,
      requester_type: reqTarget.requesterType,
      amount,
      fee: 0,
      net_amount: amount,
      bank_code: BANKS[reqIndex % BANKS.length] as string,
      bank_account_number: `190${String(33000000 + reqIndex * 7919)}`,
      bank_account_name: reqTarget.holderName,
      status: wStatus,
      rejection_reason:
        wStatus === 'REJECTED' ? 'Tên chủ tài khoản ngân hàng chưa khớp hồ sơ KYC.' : null,
      bank_transaction_ref: wStatus === 'COMPLETED' ? `NAPAS-${900000 + reqIndex}` : null,
      processed_by: wStatus === 'PENDING' ? null : DEMO_IDS.ADMIN_USER_ID,
      processed_at: wStatus === 'PENDING' ? null : addMinutes(createdAt, 60),
      created_at: createdAt,
    });
    createdWithdrawals++;
  }

  // 7. AI Chat Sessions, Messages & Feedbacks
  const chatPrompts = [
    {
      title: 'Gợi ý món Phở & Bún ngon gần Quận 1',
      intent: 'FOOD_RECOMMENDATION',
      q: 'Gợi ý giúp mình quán phở hoặc bún bò ngon ở Quận 1 đang mở cửa',
      a: 'Dựa trên đánh giá cao gần bạn, bạn có thể thử **Phở Biên Hòa** (4.7★, Phở Bò Tái 55.000đ) hoặc **Bún Bò Huế Đông Ba** (4.5★, Bún Bò Đặc Biệt 65.000đ). Cả hai quán đều có mã FREESHIP15!',
    },
    {
      title: 'Tra cứu chính sách hoàn tiền & hủy đơn',
      intent: 'POLICY_INQUIRY',
      q: 'Đơn hàng giao thiếu món thì quy trình hoàn tiền như thế nào?',
      a: 'Theo chính sách của FoodDelivery, bạn chỉ cần chụp ảnh bằng chứng và gửi khiếu nại ngay trên chi tiết đơn. Hệ thống hỗ trợ hoàn tiền 100% về ví FoodPay trong 24 giờ.',
    },
    {
      title: 'Kiểm tra hạng thành viên Loyalty',
      intent: 'LOYALTY_INFO',
      q: 'Điểm tích lũy hạng Vàng được quy đổi tối đa bao nhiêu?',
      a: 'Thành viên hạng GOLD được nhân hệ số x1.5 điểm thưởng mỗi đơn hoàn tất. Mỗi 1 điểm quy đổi 10 VND, tối đa 50% giá trị hóa đơn thanh toán.',
    },
  ] as const;

  for (let s = 0; s < config.chatSessions; s++) {
    const userId = s < 3 ? DEMO_IDS.CUSTOMER_USER_ID : (master.customerUserIds[s % master.customerUserIds.length] ?? DEMO_IDS.CUSTOMER_USER_ID);
    const tpl = chatPrompts[s % chatPrompts.length]!;
    const createdAt = daysBefore(referenceDate, (s % 10) + 1, s * 15);
    const sessionId = deterministicUuid('chat-session', s);

    chatSessions.push({
      id: sessionId,
      user_id: userId,
      user_role: 'USER',
      title: tpl.title,
      is_active: true,
      created_at: createdAt,
      updated_at: addMinutes(createdAt, 5),
      expires_at: addMinutes(createdAt, 30 * 1440),
    });

    const userMsgId = deterministicUuid('chat-msg-u', s);
    const aiMsgId = deterministicUuid('chat-msg-a', s);
    chatMessages.push(
      {
        id: userMsgId,
        session_id: sessionId,
        role: 'user',
        content: tpl.q,
        intent: tpl.intent,
        model_used: null,
        context_sources: null,
        relevance_score: null,
        tokens_used: null,
        latency_ms: null,
        langsmith_run_id: null,
        created_at: createdAt,
      },
      {
        id: aiMsgId,
        session_id: sessionId,
        role: 'assistant',
        content: tpl.a,
        intent: tpl.intent,
        model_used: 'gemini-1.5-flash',
        context_sources: [{ source: 'rag-knowledge-base', score: 0.91 }],
        relevance_score: 0.91,
        tokens_used: 185,
        latency_ms: 420,
        langsmith_run_id: `ls-seed-${s}`,
        created_at: addMinutes(createdAt, 1),
      },
    );

    chatFeedbacks.push({
      id: deterministicUuid('chat-fb', s),
      message_id: aiMsgId,
      rating: s % 7 === 0 ? -1 : 1,
      comment: s % 7 === 0 ? 'Cần thêm chi tiết phí ship.' : 'Trả lời nhanh và chính xác!',
      created_at: addMinutes(createdAt, 2),
    });
  }

  return {
    loyaltyTransactions,
    userVouchers,
    orders,
    orderItems,
    orderReviews,
    voucherUsages,
    voucherReservations,
    deliveryProofs,
    orderDisputes,
    paymentIntents,
    withdrawalRequests,
    outboxEvents,
    idempotencyKeys,
    chatSessions,
    chatMessages,
    chatFeedbacks,
    redisInflightOrders,
  };
}
