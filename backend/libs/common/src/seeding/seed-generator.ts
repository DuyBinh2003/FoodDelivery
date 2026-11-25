import {
  resolveScaleConfig,
  type EsMenuItemDoc,
  type EsRestaurantDoc,
  type RedisDriverGeoSeed,
  type SeedBundle,
} from '@/common/seeding/seed-types.js';
import { SeedPrng } from '@/common/seeding/seed-prng.js';
import { buildS3AssetSpecs } from '@/common/seeding/seed-s3-assets.js';
import { buildMasterData, type KnowledgeDocInput } from '@/common/seeding/seed-master-builders.js';
import { SeedLedgerEngine } from '@/common/seeding/seed-ledger-builder.js';
import { buildTransactionAndLedgerData } from '@/common/seeding/seed-transaction-builders.js';
import { assertDatasetInvariants } from '@/common/seeding/seed-validators.js';

export interface GenerateSeedBundleOptions {
  readonly scale: string;
  readonly s3PublicPrefix: string;
  readonly referenceDate?: Date;
  readonly seed?: number;
  readonly knowledgeDocs?: readonly KnowledgeDocInput[];
}

export function generateSeedBundle(options: GenerateSeedBundleOptions): SeedBundle {
  const config = resolveScaleConfig(options.scale);
  if (!options.s3PublicPrefix || options.s3PublicPrefix.trim() === '') {
    throw new Error('[SeedConfigError] s3PublicPrefix is required to generate asset URLs.');
  }

  const referenceDate = options.referenceDate ?? new Date();
  const prng = new SeedPrng(options.seed ?? 20261125);
  const s3Assets = buildS3AssetSpecs(options.s3PublicPrefix);

  const master = buildMasterData({
    config,
    prng,
    referenceDate,
    s3PublicPrefix: options.s3PublicPrefix,
    knowledgeDocs: options.knowledgeDocs,
  });

  const ledger = new SeedLedgerEngine(referenceDate);
  const txns = buildTransactionAndLedgerData({
    config,
    prng,
    referenceDate,
    s3PublicPrefix: options.s3PublicPrefix,
    master,
    ledger,
  });
  const ledgerExport = ledger.exportResults();

  // Build Elasticsearch projection documents
  const reviewCountByRest = new Map<string, number>();
  for (const rev of txns.orderReviews) {
    reviewCountByRest.set(rev.restaurant_id, (reviewCountByRest.get(rev.restaurant_id) ?? 0) + 1);
  }

  const restById = new Map(master.restaurants.map((r) => [r.id, r]));

  const esRestaurants: EsRestaurantDoc[] = master.restaurants
    .filter((r) => r.is_active)
    .map((r) => ({
      id: r.id,
      name: r.name,
      location: { lat: r.lat, lon: r.lon },
      rating: r.rating,
      total_reviews: (reviewCountByRest.get(r.id) ?? 0) + 15,
      is_active: r.is_active,
      categories: r.category_names,
      tags: ['Giao Siêu Tốc', 'Đối Tác'],
      suggest: [r.name],
    }));

  const esMenuItems: EsMenuItemDoc[] = master.menuItems
    .filter((m) => {
      const parent = restById.get(m.restaurant_id);
      return Boolean(parent && parent.is_active);
    })
    .map((m) => {
      const parent = restById.get(m.restaurant_id)!;
      return {
        id: m.id,
        restaurant_id: m.restaurant_id,
        restaurant_name: parent.name,
        name: m.name,
        description: m.description,
        price: m.price,
        is_available: m.is_available,
        tags: m.tag_names,
        location: { lat: parent.lat, lon: parent.lon },
        rating: parent.rating,
        suggest: [m.name],
      };
    });

  const redisOnlineDrivers: RedisDriverGeoSeed[] = master.driverProfiles
    .filter((d) => d.status === 'ONLINE' && d.verification_status === 'APPROVED')
    .map((d) => ({
      driverId: d.user_id,
      lat: d.current_location_lat,
      lng: d.current_location_lng,
      status: 'ONLINE',
    }));

  const bundle: SeedBundle = {
    scale: config.scale,
    referenceDate,
    users: master.users,
    customerProfiles: master.customerProfiles,
    driverProfiles: master.driverProfiles,
    userAddresses: master.userAddresses,
    registrationRequests: master.registrationRequests,
    loyaltyWallets: master.loyaltyWallets,
    loyaltyTransactions: txns.loyaltyTransactions,
    categories: master.categories,
    tags: master.tags,
    restaurants: master.restaurants,
    restaurantCategories: master.restaurantCategories,
    operatingHours: master.operatingHours,
    menuItems: master.menuItems,
    menuItemTags: master.menuItemTags,
    campaigns: master.campaigns,
    merchantCampaignBudgets: master.merchantCampaignBudgets,
    vouchers: master.vouchers,
    voucherRules: master.voucherRules,
    userVouchers: txns.userVouchers,
    orders: txns.orders,
    orderItems: txns.orderItems,
    orderReviews: txns.orderReviews,
    voucherUsages: txns.voucherUsages,
    voucherReservations: txns.voucherReservations,
    deliveryProofs: txns.deliveryProofs,
    orderDisputes: txns.orderDisputes,
    walletAccounts: ledgerExport.walletAccounts,
    walletBalances: ledgerExport.walletBalances,
    ledgerTransactions: ledgerExport.ledgerTransactions,
    ledgerEntries: ledgerExport.ledgerEntries,
    paymentIntents: txns.paymentIntents,
    withdrawalRequests: txns.withdrawalRequests,
    outboxEvents: txns.outboxEvents,
    idempotencyKeys: txns.idempotencyKeys,
    knowledgeChunks: master.knowledgeChunks,
    chatSessions: txns.chatSessions,
    chatMessages: txns.chatMessages,
    chatFeedbacks: txns.chatFeedbacks,
    esRestaurants,
    esMenuItems,
    redisInflightOrders: txns.redisInflightOrders,
    redisOnlineDrivers,
    s3Assets,
  };

  assertDatasetInvariants(bundle);
  return bundle;
}
