import {
  DEMO_IDS,
  type ScaleConfig,
  type SeedCampaignRecord,
  type SeedCategoryRecord,
  type SeedCustomerProfileRecord,
  type SeedDriverProfileRecord,
  type SeedKnowledgeChunkRecord,
  type SeedLoyaltyWalletRecord,
  type SeedMenuItemRecord,
  type SeedMenuItemTagRecord,
  type SeedMerchantCampaignBudgetRecord,
  type SeedOperatingHourRecord,
  type SeedRegistrationRequestRecord,
  type SeedRestaurantCategoryRecord,
  type SeedRestaurantRecord,
  type SeedTagRecord,
  type SeedUserAddressRecord,
  type SeedUserRecord,
  type SeedVoucherRecord,
  type SeedVoucherRuleRecord,
} from '@/common/seeding/seed-types.js';
import {
  addDays,
  daysBefore,
  deterministicUuid,
  generateHcmcPoint,
  generatePhone,
  generateVietnameseName,
  SeedPrng,
} from '@/common/seeding/seed-prng.js';
import {
  AVATAR_ASSET_KEYS,
  buildS3Url,
  CATEGORY_ASSET_KEYS,
} from '@/common/seeding/seed-s3-assets.js';

export interface KnowledgeDocInput {
  readonly sourceType: 'POLICY' | 'FAQ';
  readonly sourceRef: string;
  readonly rawContent: string;
}

export interface MasterDataBundle {
  readonly categories: SeedCategoryRecord[];
  readonly tags: SeedTagRecord[];
  readonly users: SeedUserRecord[];
  readonly customerProfiles: SeedCustomerProfileRecord[];
  readonly driverProfiles: SeedDriverProfileRecord[];
  readonly userAddresses: SeedUserAddressRecord[];
  readonly registrationRequests: SeedRegistrationRequestRecord[];
  readonly loyaltyWallets: SeedLoyaltyWalletRecord[];
  readonly restaurants: SeedRestaurantRecord[];
  readonly restaurantCategories: SeedRestaurantCategoryRecord[];
  readonly operatingHours: SeedOperatingHourRecord[];
  readonly menuItems: SeedMenuItemRecord[];
  readonly menuItemTags: SeedMenuItemTagRecord[];
  readonly campaigns: SeedCampaignRecord[];
  readonly merchantCampaignBudgets: SeedMerchantCampaignBudgetRecord[];
  readonly vouchers: SeedVoucherRecord[];
  readonly voucherRules: SeedVoucherRuleRecord[];
  readonly knowledgeChunks: SeedKnowledgeChunkRecord[];
  readonly customerUserIds: string[];
  readonly driverUserIds: string[];
  readonly restaurantIds: string[];
  readonly menuByRestaurantId: Map<string, SeedMenuItemRecord[]>;
  readonly defaultAddressByCustomerId: Map<string, SeedUserAddressRecord>;
  readonly userNameById: Map<string, string>;
}

const CORE_CATEGORIES: ReadonlyArray<{ id: string; name: string; slug: string; iconKey: string }> = [
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Phở', slug: 'pho', iconKey: CATEGORY_ASSET_KEYS[0].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Bún Bò', slug: 'bun-bo', iconKey: CATEGORY_ASSET_KEYS[1].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Giải khát', slug: 'giai-khat', iconKey: CATEGORY_ASSET_KEYS[2].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Cơm Tấm', slug: 'com-tam', iconKey: CATEGORY_ASSET_KEYS[3].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'Trà Sữa', slug: 'tra-sua', iconKey: CATEGORY_ASSET_KEYS[4].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Gà Rán & Burger', slug: 'ga-ran-burger', iconKey: CATEGORY_ASSET_KEYS[5].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Bánh Mì', slug: 'banh-mi', iconKey: CATEGORY_ASSET_KEYS[6].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', name: 'Pizza & Mì Ý', slug: 'pizza-mi-y', iconKey: CATEGORY_ASSET_KEYS[7].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Món Chay', slug: 'mon-chay', iconKey: CATEGORY_ASSET_KEYS[8].iconKey },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', name: 'Cà Phê & Bánh', slug: 'ca-phe-banh', iconKey: CATEGORY_ASSET_KEYS[9].iconKey },
];

const CORE_TAGS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Món Nước' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Bò' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Gà' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Ăn Vặt' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'Hải Sản' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Cơm' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Bún/Phở' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', name: 'Tráng Miệng' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Giải Khát' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', name: 'Cay Nồng' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', name: 'Ít Cay' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', name: 'Không Cay' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', name: 'Món Chay' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', name: 'Healthy' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', name: 'Bán Chạy' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', name: 'Đặc Sản' },
];

interface DishTemplate {
  readonly name: string;
  readonly desc: string;
  readonly price: number;
  readonly originalPrice: number | null;
  readonly tags: readonly string[];
}

const DISH_TEMPLATES: Record<string, readonly DishTemplate[]> = {
  'Phở': [
    { name: 'Phở Bò Tái Lăn', desc: 'Thịt bò xào lăn tỏi thơm nức, nước dùng hầm xương 12 giờ', price: 65000, originalPrice: 75000, tags: ['Món Nước', 'Bò', 'Bún/Phở', 'Bán Chạy'] },
    { name: 'Phở Bò Chín Nạm Gầu', desc: 'Nạm gầu giòn sần sật cùng thảo quả hồi quế truyền thống', price: 62000, originalPrice: null, tags: ['Món Nước', 'Bò', 'Bún/Phở'] },
    { name: 'Phở Gà Đồi Xé Phay', desc: 'Thịt gà ta thả vườn dai ngọt giòn da', price: 58000, originalPrice: 65000, tags: ['Món Nước', 'Gà', 'Healthy', 'Không Cay'] },
    { name: 'Phở Đặc Biệt Thập Cẩm', desc: 'Tái, nạm, gầu, bò viên, trứng chần lòng đào', price: 85000, originalPrice: 95000, tags: ['Món Nước', 'Bò', 'Đặc Sản', 'Bán Chạy'] },
    { name: 'Phở Xào Bắp Bò Cải Ngọt', desc: 'Bánh phở áp chảo giòn thơm xào cùng cải ngọt', price: 72000, originalPrice: null, tags: ['Bò', 'Bán Chạy'] },
    { name: 'Phở Cuốn Ngũ Sắc', desc: 'Phở cuốn thịt bò rau thơm chấm mắm nêm chua ngọt', price: 48000, originalPrice: null, tags: ['Ăn Vặt', 'Bò', 'Healthy'] },
    { name: 'Quẩy Giòn Nóng Hổi (4 cái)', desc: 'Quẩy chiên vàng ruộm ăn kèm phở nóng', price: 12000, originalPrice: null, tags: ['Ăn Vặt', 'Không Cay'] },
    { name: 'Trứng Chần & Nước Béo Riêng', desc: 'Chén trứng chần lòng đào béo thơm', price: 15000, originalPrice: null, tags: ['Ăn Vặt'] },
  ],
  'Bún Bò': [
    { name: 'Bún Bò Huế Đặc Biệt', desc: 'Nạm bò, giò heo, chả cua, huyết và nước dùng ruốc Huế', price: 75000, originalPrice: 88000, tags: ['Món Nước', 'Bò', 'Cay Nồng', 'Đặc Sản', 'Bán Chạy'] },
    { name: 'Bún Bò Tái Nạm Hoa', desc: 'Thịt bắp bò hoa chần tái mềm ngọt tự nhiên', price: 62000, originalPrice: null, tags: ['Món Nước', 'Bò', 'Bún/Phở'] },
    { name: 'Bún Bò Gân Giòn Sần Sật', desc: 'Gân bò hầm trong veo mềm dẻo', price: 68000, originalPrice: 75000, tags: ['Món Nước', 'Bò', 'Ít Cay'] },
    { name: 'Bún Bò Giò Heo Khoanh Lớn', desc: 'Khoanh giò heo béo ngậy ninh nhừ thấm vị', price: 70000, originalPrice: null, tags: ['Món Nước', 'Cay Nồng'] },
    { name: 'Bún Chả Cua Đồng Cố Đô', desc: 'Chả cua nguyên chất đậm đà vị Huế xưa', price: 65000, originalPrice: null, tags: ['Món Nước', 'Hải Sản', 'Đặc Sản'] },
    { name: 'Chả Cua & Nem Huế Hấp', desc: 'Phần ăn thêm chuẩn vị Huế thơm tiêu đen', price: 28000, originalPrice: 35000, tags: ['Ăn Vặt', 'Đặc Sản'] },
    { name: 'Rau Ghém Hoa Chuối Thêm', desc: 'Hoa chuối bào, giá đỗ và rau thơm tươi', price: 10000, originalPrice: null, tags: ['Healthy', 'Món Chay'] },
    { name: 'Bánh Bột Lọc Nhân Tôm Thịt', desc: '10 bánh bột lọc lá chuối dẻo dai thơm tôm rim', price: 45000, originalPrice: null, tags: ['Ăn Vặt', 'Hải Sản', 'Đặc Sản'] },
  ],
  'Cơm Tấm': [
    { name: 'Cơm Tấm Sườn Bì Chả Trứng', desc: 'Sườn cốt lết nướng mật ong than hoa, bì giòn và chả hấp', price: 68000, originalPrice: 78000, tags: ['Cơm', 'Bán Chạy', 'Đặc Sản'] },
    { name: 'Cơm Tấm Sườn Cây Khổng Lồ', desc: 'Sườn cây nguyên cọng ướp sốt ngũ vị nướng cháy cạnh', price: 89000, originalPrice: 99000, tags: ['Cơm', 'Bán Chạy'] },
    { name: 'Cơm Tấm Ba Rọi Nướng Muối Ớt', desc: 'Ba rọi heo cháy cạnh thơm sả ớt kèm mỡ hành', price: 62000, originalPrice: null, tags: ['Cơm', 'Ít Cay'] },
    { name: 'Cơm Tấm Đùi Gà Rô Ti Nước Dừa', desc: 'Đùi gà góc tư sốt nước dừa óng ả da giòn', price: 64000, originalPrice: 70000, tags: ['Cơm', 'Gà', 'Không Cay'] },
    { name: 'Cơm Tấm Chả Cá Thác Lác', desc: 'Chả cá chiên vàng dai ngọt ăn kèm đồ chua', price: 58000, originalPrice: null, tags: ['Cơm', 'Hải Sản'] },
    { name: 'Canh Khổ Qua Nhồi Thịt', desc: 'Canh giải nhiệt thanh mát hầm tiêu', price: 25000, originalPrice: null, tags: ['Món Nước', 'Healthy'] },
    { name: 'Canh Chua Cá Lóc Miền Tây', desc: 'Vị chua thanh dọc mùng, bạc hà và bông điên điển', price: 38000, originalPrice: null, tags: ['Món Nước', 'Hải Sản'] },
    { name: 'Trứng Ốp La Lòng Đào & Lạp Xưởng', desc: 'Topping ăn kèm cơm tấm thơm béo', price: 22000, originalPrice: null, tags: ['Ăn Vặt'] },
  ],
  'Trà Sữa': [
    { name: 'Trà Sữa Trân Châu Đường Đen', desc: 'Trân châu dẻo nấu đường mía organic béo thơm sữa tươi', price: 45000, originalPrice: 52000, tags: ['Giải Khát', 'Bán Chạy', 'Không Cay'] },
    { name: 'Trà Oolong Kem Cheese Macchiato', desc: 'Trà ô long thượng hạng phủ lớp kem cheese mặn nhẹ', price: 52000, originalPrice: null, tags: ['Giải Khát', 'Bán Chạy'] },
    { name: 'Trà Đào Cam Sả Tươi', desc: 'Miếng đào giòn ngọt kèm hương sả tươi mát', price: 46000, originalPrice: 55000, tags: ['Giải Khát', 'Healthy'] },
    { name: 'Trà Vải Hoa Lài Hồng Ngọc', desc: 'Vải thiều mọng nước cùng trà lài ủ lạnh', price: 48000, originalPrice: null, tags: ['Giải Khát', 'Tráng Miệng'] },
    { name: 'Matcha Latte Uji Đậu Đỏ', desc: 'Bột matcha Nhật nguyên chất cùng đậu đỏ nghiền bùi', price: 56000, originalPrice: 65000, tags: ['Giải Khát', 'Tráng Miệng'] },
    { name: 'Hồng Trà Sữa Nướng Đài Loan', desc: 'Hương caramel cháy thơm lừng hậu vị béo ngậy', price: 49000, originalPrice: null, tags: ['Giải Khát'] },
    { name: 'Sữa Tươi Khoai Môn Nghiền Taro', desc: 'Khoai môn tươi dẻo mịn không phẩm màu', price: 55000, originalPrice: null, tags: ['Giải Khát', 'Healthy'] },
    { name: 'Bánh Flan Caramel Sốt Cà Phê', desc: 'Tráng miệng mềm mịn tan ngay trong miệng', price: 24000, originalPrice: null, tags: ['Tráng Miệng', 'Ăn Vặt'] },
  ],
  'Gà Rán & Burger': [
    { name: 'Burger Bò Úc Phô Mai Hai Tầng', desc: 'Bò Úc nướng lửa hồng kèm 2 lát cheddar tan chảy', price: 82000, originalPrice: 95000, tags: ['Bò', 'Bán Chạy'] },
    { name: 'Gà Rán Giòn Cay Bí Truyền (2 miếng)', desc: 'Ướp 11 gia vị chiên giòn rụm mọng nước bên trong', price: 78000, originalPrice: 89000, tags: ['Gà', 'Cay Nồng', 'Bán Chạy'] },
    { name: 'Gà Sốt Phô Mai Tuyết Hàn Quốc', desc: 'Ức gà không xương lắc bột phô mai tuyết béo ngậy', price: 65000, originalPrice: null, tags: ['Gà', 'Ăn Vặt'] },
    { name: 'Burger Gà Giòn Sốt Mật Ong Mù Tạt', desc: 'Phi lê gà chiên xù giòn tan cùng xà lách giòn', price: 69000, originalPrice: 79000, tags: ['Gà', 'Ít Cay'] },
    { name: 'Khoai Tây Chiên Lắc Rong Biển', desc: 'Khoai tây cọng lớn giòn rụm lắc rong biển Nhật', price: 34000, originalPrice: null, tags: ['Ăn Vặt', 'Món Chay'] },
    { name: 'Gà Viên Popcorn & Sốt Teriyaki', desc: 'Thích hợp ăn vặt hoặc chia sẻ theo nhóm', price: 49000, originalPrice: null, tags: ['Gà', 'Ăn Vặt'] },
    { name: 'Salad Bắp Cải Tím Coleslaw', desc: 'Rau củ giòn ngọt sốt mayonnaise giảm béo', price: 26000, originalPrice: null, tags: ['Healthy', 'Không Cay'] },
    { name: 'Combo Coca Tươi & Phô Mai Que', desc: '4 que phô mai kéo sợi kèm ly nước có ga lớn', price: 55000, originalPrice: 65000, tags: ['Ăn Vặt', 'Giải Khát'] },
  ],
  'Bánh Mì': [
    { name: 'Bánh Mì Thịt Nướng Sa Tế Sốt Bơ', desc: 'Thịt vai nướng sả ớt thơm lừng kèm pate gan béo', price: 36000, originalPrice: 42000, tags: ['Bán Chạy', 'Ăn Vặt', 'Ít Cay'] },
    { name: 'Bánh Mì Heo Quay Da Giòn', desc: 'Heo quay da nổ giòn tan kèm nước tương tỏi ớt', price: 42000, originalPrice: 48000, tags: ['Bán Chạy', 'Đặc Sản'] },
    { name: 'Bánh Mì Xíu Mại Trứng Muối', desc: 'Viên xíu mại nóng hổi quyện lòng đỏ trứng muối bùi', price: 38000, originalPrice: null, tags: ['Đặc Sản', 'Bán Chạy'] },
    { name: 'Bánh Mì Chả Cá Nha Trang Nóng', desc: 'Chả cá chiên tại quầy thơm mùi thì là rau răm', price: 32000, originalPrice: null, tags: ['Hải Sản', 'Không Cay'] },
    { name: 'Bánh Mì Chảo Thập Cẩm Đầy Đặn', desc: 'Bò né, pate, trứng ốp la, xúc xích kèm ổ bánh mì giòn', price: 65000, originalPrice: 75000, tags: ['Bò', 'Đặc Sản'] },
    { name: 'Bánh Mì Gà Xé Sốt Bơ Trứng', desc: 'Ức gà xé phay cùng dưa leo đồ chua giòn mát', price: 34000, originalPrice: null, tags: ['Gà', 'Healthy'] },
    { name: 'Xôi Mặn Lá Chuối Trứng Cút', desc: 'Xôi nếp dẻo thơm lạp xưởng, chà bông và mỡ hành', price: 32000, originalPrice: null, tags: ['Ăn Vặt'] },
    { name: 'Sữa Đậu Nành Nấu Lá Dứa', desc: 'Đậu nành nguyên chất ít ngọt giải nhiệt buổi sáng', price: 16000, originalPrice: null, tags: ['Giải Khát', 'Healthy'] },
  ],
  'Pizza & Mì Ý': [
    { name: 'Pizza Hải Sản Sốt Pesto (Size M)', desc: 'Tôm sú, mực ống tươi trên nền sốt húng tây Pesto', price: 169000, originalPrice: 199000, tags: ['Hải Sản', 'Bán Chạy'] },
    { name: 'Pizza Bò Băm Nấm Truffle (Size M)', desc: 'Bò Mỹ bằm nướng cùng phô mai mozzarella và dầu Truffle', price: 189000, originalPrice: 215000, tags: ['Bò', 'Đặc Sản'] },
    { name: 'Pizza Phô Mai 4 Loại Béo Ngậy', desc: 'Mozzarella, Cheddar, Parmesan, Gorgonzola kèm mật ong', price: 159000, originalPrice: null, tags: ['Món Chay', 'Không Cay'] },
    { name: 'Mì Ý Sốt Bò Băm Bolognese', desc: 'Spaghetti chuẩn Ý hầm cà chua San Marzano 4 giờ', price: 98000, originalPrice: 115000, tags: ['Bò', 'Bán Chạy'] },
    { name: 'Mì Ý Sốt Kem Carbonara Xông Khói', desc: 'Sốt kem tươi lòng đỏ trứng cùng ba chỉ xông khói', price: 108000, originalPrice: null, tags: ['Bán Chạy'] },
    { name: 'Mì Ý Hải Sản Cay Aglio e Olio', desc: 'Tôm mực áp chảo dầu olive tỏi thơm cay nồng', price: 118000, originalPrice: null, tags: ['Hải Sản', 'Cay Nồng'] },
    { name: 'Salad Caesar Ức Gà Nướng', desc: 'Xà lách Romaine giòn ngọt cùng sốt phô mai Parmesan', price: 79000, originalPrice: null, tags: ['Gà', 'Healthy'] },
    { name: 'Bánh Mì Bơ Tỏi Phô Mai Nướng', desc: '6 lát baguette bơ tỏi nướng thơm lừng ăn khai vị', price: 45000, originalPrice: null, tags: ['Ăn Vặt', 'Món Chay'] },
  ],
  'Món Chay': [
    { name: 'Cơm Chiên Hạt Sen Nấm Đông Cô', desc: 'Cơm hạt tơi xốp kèm hạt sen Huế bùi và nấm hương', price: 65000, originalPrice: 75000, tags: ['Cơm', 'Món Chay', 'Healthy', 'Bán Chạy'] },
    { name: 'Đậu Hũ Tứ Xuyên Sốt Nấm Chay', desc: 'Đậu hũ non mềm mịn sốt tương đậu thơm cay nhẹ', price: 58000, originalPrice: null, tags: ['Món Chay', 'Ít Cay'] },
    { name: 'Bún Huế Chay Thập Cẩm', desc: 'Nước dùng rau củ ninh ngọt tự nhiên không bột ngọt', price: 55000, originalPrice: null, tags: ['Món Nước', 'Món Chay', 'Healthy'] },
    { name: 'Lẩu Nấm Thanh Đạm (2-3 người)', desc: '5 loại nấm tươi quý cùng rau xanh và mì tươi', price: 189000, originalPrice: 220000, tags: ['Món Nước', 'Món Chay', 'Đặc Sản'] },
    { name: 'Gỏi Cuốn Bì Chay Tương Đen (4 cuốn)', desc: 'Cuốn tươi giòn mát chấm tương đậu phộng béo bùi', price: 42000, originalPrice: null, tags: ['Ăn Vặt', 'Món Chay', 'Healthy'] },
    { name: 'Miến Xào Nấm Mèo & Cải Thìa', desc: 'Miến dong dai mềm không dính dầu mỡ', price: 56000, originalPrice: null, tags: ['Món Chay', 'Healthy'] },
    { name: 'Chả Giò Rế Khoai Môn Chay', desc: 'Chiên vàng giòn rụm kèm rau sống cuốn chấm mắm chay', price: 48000, originalPrice: null, tags: ['Ăn Vặt', 'Món Chay'] },
    { name: 'Chè Dưỡng Nhan Tuyết Yến', desc: 'Táo đỏ, kỷ tử, nhựa đào thanh mát đẹp da', price: 32000, originalPrice: 38000, tags: ['Tráng Miệng', 'Giải Khát', 'Healthy'] },
  ],
  'Cà Phê & Bánh': [
    { name: 'Cà Phê Muối Xứ Huế Kem Béo', desc: 'Cà phê phin rang mộc hòa lớp kem muối biển béo mặn', price: 38000, originalPrice: 45000, tags: ['Giải Khát', 'Bán Chạy', 'Đặc Sản'] },
    { name: 'Bạc Xỉu Sài Gòn Ba Tầng', desc: 'Hương vị cà phê sữa đá kinh điển thơm dịu', price: 34000, originalPrice: null, tags: ['Giải Khát', 'Bán Chạy'] },
    { name: 'Cold Brew Cam Vàng Thảo Mộc', desc: 'Cà phê Arabica ủ lạnh 16 giờ kết hợp cam vàng tươi', price: 52000, originalPrice: 59000, tags: ['Giải Khát', 'Healthy'] },
    { name: 'Latte Hạnh Nhân Sữa Yến Mạch', desc: 'Espresso đậm đà pha cùng sữa yến mạch ít calo', price: 56000, originalPrice: null, tags: ['Giải Khát', 'Healthy', 'Món Chay'] },
    { name: 'Bánh Croissant Bơ Pháp Ngàn Lớp', desc: 'Bơ lạt Elle & Vire nướng mới giòn tan mỗi sáng', price: 42000, originalPrice: null, tags: ['Tráng Miệng', 'Ăn Vặt'] },
    { name: 'Tiramisu Cacao Ý Cổ Điển', desc: 'Mascarpone mịn mát hòa cùng hương rượu rum nhẹ', price: 55000, originalPrice: 65000, tags: ['Tráng Miệng', 'Bán Chạy'] },
    { name: 'Bánh Mì Bơ Tỏi Phô Mai Kem', desc: 'Phô mai kem tan chảy thơm béo vị tỏi nướng', price: 48000, originalPrice: null, tags: ['Ăn Vặt', 'Tráng Miệng'] },
    { name: 'Trà Hoa Cúc Mật Ong Táo Đỏ', desc: 'Thư giãn nhẹ nhàng không caffein dùng nóng/lạnh', price: 42000, originalPrice: null, tags: ['Giải Khát', 'Healthy'] },
  ],
  'Giải khát': [
    { name: 'Nước Mía Sầu Riêng Ri6 Đặc Biệt', desc: 'Nước mía ép tươi hòa cơm sầu riêng béo thơm', price: 30000, originalPrice: 35000, tags: ['Giải Khát', 'Đặc Sản', 'Bán Chạy'] },
    { name: 'Rau Má Đậu Xanh Sữa Dừa', desc: 'Rau má tươi xay lạnh kết hợp cốt dừa sánh mịn', price: 28000, originalPrice: null, tags: ['Giải Khát', 'Healthy'] },
    { name: 'Nước Ép Cam Cà Rốt Nguyên Chất', desc: 'Không đường tinh luyện, bổ sung vitamin C tự nhiên', price: 38000, originalPrice: 45000, tags: ['Giải Khát', 'Healthy'] },
    { name: 'Sinh Tố Bơ Sáp Đắk Lắk', desc: 'Bơ sáp dẻo mịn xay cùng sữa đặc béo ngậy', price: 42000, originalPrice: null, tags: ['Giải Khát', 'Tráng Miệng', 'Bán Chạy'] },
    { name: 'Chè Khúc Bạch Hạnh Nhân Nhãn Nhục', desc: 'Khúc bạch phô mai mềm thơm mát lạnh giải nhiệt', price: 36000, originalPrice: null, tags: ['Tráng Miệng', 'Giải Khát'] },
    { name: 'Trà Tắc Xí Muội Khổng Lồ (1 Lít)', desc: 'Chua ngọt sảng khoái cho ngày nắng Sài Gòn', price: 25000, originalPrice: null, tags: ['Giải Khát', 'Bán Chạy'] },
    { name: 'Nước Ép Dưa Hấu Bạc Hà Tươi', desc: 'Dưa hấu đỏ ướp lạnh ép nguyên chất thơm lá bạc hà', price: 32000, originalPrice: null, tags: ['Giải Khát', 'Healthy'] },
    { name: 'Chanh Tuyết Đá Xay Sữa Tươi', desc: 'Đá xay mịn chua thanh hương vỏ chanh thơm dịu', price: 34000, originalPrice: 40000, tags: ['Giải Khát', 'Tráng Miệng'] },
  ],
};

const STANDARD_DISH_OPTIONS: Record<string, unknown>[] = [
  {
    id: 'opt-size',
    name: 'Kích cỡ phần ăn',
    required: true,
    min_choices: 1,
    max_choices: 1,
    choices: [
      { id: 'size-m', name: 'Phần Tiêu Chuẩn (M)', price: 0, is_default: true },
      { id: 'size-l', name: 'Phần Lớn (L +10k)', price: 10000 },
    ],
  },
  {
    id: 'opt-extra',
    name: 'Món thêm / Khẩu vị',
    required: false,
    min_choices: 0,
    max_choices: 3,
    choices: [
      { id: 'ext-spicy', name: 'Sa tế / Ớt tươi riêng', price: 0 },
      { id: 'ext-utensils', name: 'Lấy đủ muỗng đũa & khăn giấy', price: 0, is_default: true },
      { id: 'ext-topping', name: 'Thêm phần topping đặc biệt', price: 15000 },
    ],
  },
];

const DRINK_DISH_OPTIONS: Record<string, unknown>[] = [
  {
    id: 'opt-ice',
    name: 'Lượng đá',
    required: true,
    min_choices: 1,
    max_choices: 1,
    choices: [
      { id: 'ice-100', name: '100% Đá', price: 0, is_default: true },
      { id: 'ice-50', name: '50% Đá', price: 0 },
      { id: 'ice-sep', name: 'Để đá riêng', price: 0 },
    ],
  },
  {
    id: 'opt-sugar',
    name: 'Mức đường',
    required: true,
    min_choices: 1,
    max_choices: 1,
    choices: [
      { id: 'sug-100', name: '100% Đường', price: 0, is_default: true },
      { id: 'sug-70', name: '70% Đường', price: 0 },
      { id: 'sug-30', name: '30% Đường', price: 0 },
    ],
  },
  {
    id: 'opt-topping',
    name: 'Thêm Topping',
    required: false,
    min_choices: 0,
    max_choices: 3,
    choices: [
      { id: 'top-pearl', name: 'Trân châu trắng giòn', price: 6000 },
      { id: 'top-cheese', name: 'Kem cheese macchiato', price: 10000 },
    ],
  },
];

const REST_ADJECTIVES = [
  'Gia Truyền', 'Phố Cổ', 'Sài Gòn', 'Bến Thành', 'Cố Đô', 'Phú Nhuận',
  'Tân Định', 'Hương Việt', 'An Lạc', 'Hoàng Gia', 'Nam Bộ', 'Thanh Niên',
  'Đồng Khởi', 'Thảo Điền', 'Kim Liên', 'Gia Bảo', 'Chuẩn Vị', 'Xưa & Nay',
] as const;

const VEHICLE_TYPES = [
  'Honda Wave Alpha', 'Honda Vision', 'Yamaha Exciter 155', 'Honda Air Blade',
  'Honda Winner X', 'Yamaha Sirius', 'VinFast Feliz S', 'Honda Future',
] as const;

const FALLBACK_KNOWLEDGE_DOCS: readonly KnowledgeDocInput[] = [
  {
    sourceType: 'POLICY',
    sourceRef: 'cancellation-policy.md',
    rawContent:
      'Chính sách hủy đơn: Khách hàng có thể hủy đơn miễn phí khi nhà hàng chưa xác nhận nấu (trạng thái PENDING). Khi nhà hàng đang nấu hoặc tài xế đã nhận đơn, vui lòng liên hệ CSKH để được hỗ trợ kiểm tra hoàn tiền.',
  },
  {
    sourceType: 'POLICY',
    sourceRef: 'refund-policy.md',
    rawContent:
      'Chính sách hoàn tiền & giải quyết khiếu nại: FoodDelivery hỗ trợ hoàn tiền 100% về Ví FoodPay cho các trường hợp giao sai món, thiếu món hoặc đổ vỡ có ảnh bằng chứng rõ ràng trong vòng 24 giờ.',
  },
  {
    sourceType: 'FAQ',
    sourceRef: 'loyalty-program-faq.md',
    rawContent:
      'Chương trình Khách hàng thân thiết (Loyalty): Hạng BRONZE (1.0x), SILVER (1.2x), GOLD (1.5x), PLATINUM (2.0x). 1 điểm quy đổi 10 VND giảm trực tiếp hóa đơn (tối đa 50% giá trị đơn hàng).',
  },
];

function chunkText(text: string, chunkSize = 400, overlap = 40): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

export function buildMasterData(params: {
  config: ScaleConfig;
  prng: SeedPrng;
  referenceDate: Date;
  s3PublicPrefix: string;
  knowledgeDocs?: readonly KnowledgeDocInput[];
}): MasterDataBundle {
  const { config, prng, referenceDate, s3PublicPrefix } = params;

  const categories: SeedCategoryRecord[] = CORE_CATEGORIES.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    icon_url: buildS3Url(s3PublicPrefix, cat.iconKey),
  }));

  const categoryAssetBySlug = new Map(CATEGORY_ASSET_KEYS.map((item) => [item.slug, item]));
  const tagIdByName = new Map(CORE_TAGS.map((t) => [t.name, t.id]));

  const users: SeedUserRecord[] = [];
  const customerProfiles: SeedCustomerProfileRecord[] = [];
  const driverProfiles: SeedDriverProfileRecord[] = [];
  const userAddresses: SeedUserAddressRecord[] = [];
  const registrationRequests: SeedRegistrationRequestRecord[] = [];
  const loyaltyWallets: SeedLoyaltyWalletRecord[] = [];

  const customerUserIds: string[] = [];
  const driverUserIds: string[] = [];
  const userNameById = new Map<string, string>();
  const defaultAddressByCustomerId = new Map<string, SeedUserAddressRecord>();

  const customerAvatar = buildS3Url(s3PublicPrefix, AVATAR_ASSET_KEYS.CUSTOMER);
  const customerAltAvatar = buildS3Url(s3PublicPrefix, AVATAR_ASSET_KEYS.CUSTOMER_ALT);
  const driverAvatar = buildS3Url(s3PublicPrefix, AVATAR_ASSET_KEYS.DRIVER);
  const driverAltAvatar = buildS3Url(s3PublicPrefix, AVATAR_ASSET_KEYS.DRIVER_ALT);
  const restaurantAvatar = buildS3Url(s3PublicPrefix, AVATAR_ASSET_KEYS.RESTAURANT);
  const adminAvatar = buildS3Url(s3PublicPrefix, AVATAR_ASSET_KEYS.ADMIN);

  // 1. 6 Core Demo Users (exact UUIDs matching seed-users.js migration)
  const coreDemoUsers: Array<{
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    fullName: string;
    phone: string;
    avatarUrl: string;
  }> = [
    { id: DEMO_IDS.CUSTOMER_USER_ID, email: 'customer@fooddelivery.com', role: 'USER', fullName: 'Nguyễn Văn An', phone: '0901234567', avatarUrl: customerAvatar },
    { id: DEMO_IDS.DRIVER1_USER_ID, email: 'driver1@fooddelivery.com', role: 'USER', fullName: 'Trần Văn Tài Xế 1', phone: '0901112222', avatarUrl: driverAvatar },
    { id: DEMO_IDS.DRIVER2_USER_ID, email: 'driver2@fooddelivery.com', role: 'USER', fullName: 'Lê Văn Tài Xế 2', phone: '0903334444', avatarUrl: driverAltAvatar },
    { id: DEMO_IDS.OWNER_PHOBIEN_USER_ID, email: 'owner@phobien.com', role: 'USER', fullName: 'Chủ Quán Phở Biên', phone: '0905556666', avatarUrl: restaurantAvatar },
    { id: DEMO_IDS.OWNER_BUNBO_USER_ID, email: 'owner@bunbo.com', role: 'USER', fullName: 'Chủ Quán Bún Bò', phone: '0907778888', avatarUrl: restaurantAvatar },
    { id: DEMO_IDS.ADMIN_USER_ID, email: 'admin@fooddelivery.com', role: 'ADMIN', fullName: 'Quản Trị Viên', phone: '0909999999', avatarUrl: adminAvatar },
  ];

  coreDemoUsers.forEach((demo, idx) => {
    const createdAt = daysBefore(referenceDate, 45 - idx);
    users.push({
      id: demo.id,
      email: demo.email,
      password_hash: DEMO_IDS.DEFAULT_PASSWORD_HASH,
      role: demo.role,
      avatar_url: demo.avatarUrl,
      created_at: createdAt,
    });
    customerProfiles.push({
      id: idx === 0
        ? 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
        : `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a1${idx + 1}`,
      user_id: demo.id,
      full_name: demo.fullName,
      phone: demo.phone,
      created_at: createdAt,
    });
    userNameById.set(demo.id, demo.fullName);
  });

  // Core demo customer addresses & wallet
  customerUserIds.push(DEMO_IDS.CUSTOMER_USER_ID);
  const demoAddr1: SeedUserAddressRecord = {
    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    user_id: DEMO_IDS.CUSTOMER_USER_ID,
    recipient_name: 'Nguyễn Văn An',
    recipient_phone: '0901234567',
    label: 'HOME',
    street_address: '72 Lê Thánh Tôn',
    ward: 'Bến Nghé',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    full_address: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    latitude: 10.77653,
    longitude: 106.70098,
    delivery_notes: 'Gọi trước khi giao',
    is_default: true,
  };
  userAddresses.push(demoAddr1, {
    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    user_id: DEMO_IDS.CUSTOMER_USER_ID,
    recipient_name: 'Nguyễn Văn An (Công ty)',
    recipient_phone: '0901234567',
    label: 'WORK',
    street_address: 'Tòa nhà Bitexco, 2 Hải Triều',
    ward: 'Bến Nghé',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    full_address: 'Tòa nhà Bitexco, 2 Hải Triều, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    latitude: 10.77166,
    longitude: 106.7044,
    delivery_notes: 'Gửi lễ tân tầng trệt',
    is_default: false,
  });
  defaultAddressByCustomerId.set(DEMO_IDS.CUSTOMER_USER_ID, demoAddr1);

  // Core demo drivers
  driverUserIds.push(DEMO_IDS.DRIVER1_USER_ID, DEMO_IDS.DRIVER2_USER_ID);
  driverProfiles.push(
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      user_id: DEMO_IDS.DRIVER1_USER_ID,
      status: 'ONLINE',
      verification_status: 'APPROVED',
      vehicle_plate: '59-S2 888.88',
      vehicle_type: 'Honda Wave Alpha',
      current_location_lat: 10.7769,
      current_location_lng: 106.7009,
      created_at: daysBefore(referenceDate, 44),
    },
    {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      user_id: DEMO_IDS.DRIVER2_USER_ID,
      status: 'ONLINE',
      verification_status: 'APPROVED',
      vehicle_plate: '59-S3 999.99',
      vehicle_type: 'Yamaha Exciter',
      current_location_lat: 10.7815,
      current_location_lng: 106.6932,
      created_at: daysBefore(referenceDate, 43),
    },
  );

  // 2. Additional Customers
  for (let i = 1; i < config.customers; i++) {
    const userId = deterministicUuid('customer-user', i);
    const fullName = generateVietnameseName(prng);
    const phone = generatePhone(prng, 100 + i);
    const createdAt = daysBefore(referenceDate, prng.int(3, 40));

    users.push({
      id: userId,
      email: `customer.${String(i).padStart(3, '0')}@demo.fooddelivery.local`,
      password_hash: DEMO_IDS.DEFAULT_PASSWORD_HASH,
      role: 'USER',
      avatar_url: i % 2 === 0 ? customerAvatar : customerAltAvatar,
      created_at: createdAt,
    });
    customerProfiles.push({
      id: deterministicUuid('customer-profile', i),
      user_id: userId,
      full_name: fullName,
      phone,
      created_at: createdAt,
    });
    customerUserIds.push(userId);
    userNameById.set(userId, fullName);

    const addrCount = i % 3 === 0 ? 2 : 1;
    for (let a = 0; a < addrCount; a++) {
      const point = generateHcmcPoint(prng, i + a * 3);
      const addrRecord: SeedUserAddressRecord = {
        id: deterministicUuid('customer-addr', `${i}:${a}`),
        user_id: userId,
        recipient_name: fullName,
        recipient_phone: phone,
        label: a === 0 ? 'HOME' : 'WORK',
        street_address: point.streetAddress,
        ward: point.ward,
        district: point.district,
        city: point.city,
        full_address: point.fullAddress,
        latitude: point.lat,
        longitude: point.lng,
        delivery_notes: a === 0 ? 'Gọi trước khi đến' : 'Nhận tại cổng bảo vệ',
        is_default: a === 0,
      };
      userAddresses.push(addrRecord);
      if (a === 0) {
        defaultAddressByCustomerId.set(userId, addrRecord);
      }
    }
  }

  // 3. Additional Drivers (mix of ONLINE/OFFLINE & APPROVED/PENDING)
  for (let i = 2; i < config.drivers; i++) {
    const userId = deterministicUuid('driver-user', i);
    const fullName = generateVietnameseName(prng);
    const phone = generatePhone(prng, 500 + i);
    const createdAt = daysBefore(referenceDate, prng.int(5, 42));
    const point = generateHcmcPoint(prng, i * 2);
    const isPending = i >= config.drivers - 3;
    const verificationStatus: 'APPROVED' | 'PENDING' | 'REJECTED' = isPending
      ? 'PENDING'
      : 'APPROVED';
    const isOnline = verificationStatus === 'APPROVED' && i % 3 !== 0;

    users.push({
      id: userId,
      email: `driver.${String(i).padStart(3, '0')}@demo.fooddelivery.local`,
      password_hash: DEMO_IDS.DEFAULT_PASSWORD_HASH,
      role: 'USER',
      avatar_url: i % 2 === 0 ? driverAvatar : driverAltAvatar,
      created_at: createdAt,
    });
    customerProfiles.push({
      id: deterministicUuid('driver-cust-profile', i),
      user_id: userId,
      full_name: fullName,
      phone,
      created_at: createdAt,
    });
    driverProfiles.push({
      id: deterministicUuid('driver-profile', i),
      user_id: userId,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      verification_status: verificationStatus,
      vehicle_plate: `59-${String.fromCharCode(65 + (i % 20))}${(i % 9) + 1} ${String(100 + ((i * 73) % 899))}.${String(10 + (i % 89))}`,
      vehicle_type: VEHICLE_TYPES[i % VEHICLE_TYPES.length] as string,
      current_location_lat: point.lat,
      current_location_lng: point.lng,
      created_at: createdAt,
    });
    if (verificationStatus === 'APPROVED') {
      driverUserIds.push(userId);
    }
    userNameById.set(userId, fullName);
  }

  // 4. Additional Admins
  for (let i = 1; i < config.admins; i++) {
    const adminId = deterministicUuid('admin-user', i);
    const adminName = `CS & Điều Hành ${i}`;
    users.push({
      id: adminId,
      email: `admin.${String(i + 1).padStart(2, '0')}@demo.fooddelivery.local`,
      password_hash: DEMO_IDS.DEFAULT_PASSWORD_HASH,
      role: 'ADMIN',
      avatar_url: adminAvatar,
      created_at: daysBefore(referenceDate, 40),
    });
    customerProfiles.push({
      id: deterministicUuid('admin-profile', i),
      user_id: adminId,
      full_name: adminName,
      phone: generatePhone(prng, 900 + i),
      created_at: daysBefore(referenceDate, 40),
    });
    userNameById.set(adminId, adminName);
  }

  // 5. Restaurants, Owners (1-1 owner_id), Operating Hours (0..6), Categories, Menu Items, Tags
  const restaurants: SeedRestaurantRecord[] = [];
  const restaurantCategories: SeedRestaurantCategoryRecord[] = [];
  const operatingHours: SeedOperatingHourRecord[] = [];
  const menuItems: SeedMenuItemRecord[] = [];
  const menuItemTags: SeedMenuItemTagRecord[] = [];
  const restaurantIds: string[] = [];
  const menuByRestaurantId = new Map<string, SeedMenuItemRecord[]>();

  // Helper to attach operating hours (0..6) for a restaurant
  const appendOperatingHours = (restId: string, isAlwaysOpenDemo: boolean, index: number) => {
    const openTime = isAlwaysOpenDemo ? '00:00:00' : index % 2 === 0 ? '07:00:00' : '08:00:00';
    const closeTime = isAlwaysOpenDemo ? '23:59:59' : index % 3 === 0 ? '23:00:00' : '22:00:00';
    for (let day = 0; day <= 6; day++) {
      operatingHours.push({
        id: deterministicUuid('op-hour', `${restId}:${day}`),
        restaurant_id: restId,
        day_of_week: day,
        open_time: openTime,
        close_time: closeTime,
        is_closed_all_day: !isAlwaysOpenDemo && index % 15 === 0 && day === 0,
      });
    }
  };

  // Core Restaurant 1: Phở Biên Hòa (seed-restaurants.js)
  const phoCat = categories[0] as SeedCategoryRecord;
  const drinkCat = categories[2] as SeedCategoryRecord;
  const bunBoCat = categories[1] as SeedCategoryRecord;

  const coreRestPho: SeedRestaurantRecord = {
    id: DEMO_IDS.REST_PHOBIEN_ID,
    owner_id: DEMO_IDS.OWNER_PHOBIEN_USER_ID,
    name: 'Phở Biên Hòa',
    address: '123 Nguyễn Huệ, Q1, TP.HCM',
    lat: 10.772545,
    lon: 106.702758,
    rating: 4.7,
    banner_url: buildS3Url(s3PublicPrefix, CATEGORY_ASSET_KEYS[0].bannerImageKey),
    is_active: true,
    verification_status: 'VERIFIED',
    created_at: daysBefore(referenceDate, 44),
    primary_category_name: phoCat.name,
    category_names: [phoCat.name, drinkCat.name],
  };

  const coreRestBunBo: SeedRestaurantRecord = {
    id: DEMO_IDS.REST_BUNBO_ID,
    owner_id: DEMO_IDS.OWNER_BUNBO_USER_ID,
    name: 'Bún Bò Huế Đông Ba',
    address: '456 Lê Lợi, Q3, TP.HCM',
    lat: 10.781682,
    lon: 106.690858,
    rating: 4.5,
    banner_url: buildS3Url(s3PublicPrefix, CATEGORY_ASSET_KEYS[1].bannerImageKey),
    is_active: true,
    verification_status: 'VERIFIED',
    created_at: daysBefore(referenceDate, 43),
    primary_category_name: bunBoCat.name,
    category_names: [bunBoCat.name, drinkCat.name],
  };

  restaurants.push(coreRestPho, coreRestBunBo);
  restaurantIds.push(coreRestPho.id, coreRestBunBo.id);
  appendOperatingHours(coreRestPho.id, true, 0);
  appendOperatingHours(coreRestBunBo.id, true, 1);
  restaurantCategories.push(
    { id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', restaurant_id: coreRestPho.id, category_id: phoCat.id },
    { id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', restaurant_id: coreRestBunBo.id, category_id: bunBoCat.id },
  );

  // Core 10 Demo Menu Items (preserve exact IDs & prices)
  const coreMenuSpecs: Array<{
    id: string;
    restId: string;
    catId: string;
    name: string;
    desc: string;
    key: string;
    price: number;
    origPrice: number | null;
    tags: string[];
  }> = [
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', restId: coreRestPho.id, catId: phoCat.id, name: 'Phở Bò Tái', desc: 'Thịt bò tươi thái mỏng chần tái, nước dùng thơm ngọt đậm đà', key: 'defaults/dishes/pho-bo-tai.svg', price: 55000, origPrice: 65000, tags: ['Món Nước', 'Bò', 'Bún/Phở', 'Không Cay', 'Bán Chạy'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', restId: coreRestPho.id, catId: phoCat.id, name: 'Phở Bò Chín', desc: 'Bò chín mềm nhừ cùng thảo quả hồi quế truyền thống', key: 'defaults/dishes/pho-bo-chin.svg', price: 55000, origPrice: 60000, tags: ['Món Nước', 'Bò', 'Bún/Phở', 'Không Cay'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', restId: coreRestPho.id, catId: phoCat.id, name: 'Phở Gà', desc: 'Thịt gà ta thả vườn dai ngọt xé phay giòn da', key: 'defaults/dishes/pho-ga.svg', price: 50000, origPrice: null, tags: ['Món Nước', 'Gà', 'Bún/Phở', 'Healthy'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', restId: coreRestPho.id, catId: phoCat.id, name: 'Gỏi Cuốn Tôm Thịt', desc: 'Tôm sú tươi kèm thịt ba chỉ chấm sốt tương đen béo ngậy', key: 'defaults/dishes/goi-cuon.svg', price: 35000, origPrice: null, tags: ['Ăn Vặt', 'Hải Sản', 'Healthy', 'Bán Chạy'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', restId: coreRestPho.id, catId: drinkCat.id, name: 'Nước Chanh Dây', desc: 'Nước chanh dây tươi chua ngọt mát lạnh giải nhiệt', key: 'defaults/dishes/nuoc-chanh-day.svg', price: 25000, origPrice: 30000, tags: ['Tráng Miệng', 'Giải Khát'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', restId: coreRestBunBo.id, catId: bunBoCat.id, name: 'Bún Bò Đặc Biệt', desc: 'Tô bún bò thập cẩm đầy đặn nạm gầu chả cua giò heo', key: 'defaults/dishes/bun-bo-dac-biet.svg', price: 65000, origPrice: 80000, tags: ['Món Nước', 'Bò', 'Cay Nồng', 'Bán Chạy', 'Đặc Sản'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', restId: coreRestBunBo.id, catId: bunBoCat.id, name: 'Bún Bò Giò Heo', desc: 'Giò heo giòn sần sật ninh vừa tới ngấm vị cay nồng', key: 'defaults/dishes/bun-bo-gio-heo.svg', price: 70000, origPrice: null, tags: ['Món Nước', 'Cay Nồng'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', restId: coreRestBunBo.id, catId: bunBoCat.id, name: 'Bún Bò Chả Cua', desc: 'Chả cua biển xứ Huế thơm nức mũi mềm béo', key: 'defaults/dishes/bun-bo-cha-cua.svg', price: 75000, origPrice: null, tags: ['Món Nước', 'Hải Sản', 'Đặc Sản'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', restId: coreRestBunBo.id, catId: bunBoCat.id, name: 'Chả Lụa Huế', desc: 'Chả lụa lá chuối tiêu thơm nồng giòn dai sần sật', key: 'defaults/dishes/cha-lua-hue.svg', price: 30000, origPrice: null, tags: ['Ăn Vặt', 'Đặc Sản'] },
    { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', restId: coreRestBunBo.id, catId: drinkCat.id, name: 'Trà Đá', desc: 'Trà lài ướp lạnh truyền thống thanh mát', key: 'defaults/dishes/tra-da.svg', price: 5000, origPrice: null, tags: ['Giải Khát'] },
  ];

  for (const spec of coreMenuSpecs) {
    const item: SeedMenuItemRecord = {
      id: spec.id,
      restaurant_id: spec.restId,
      category_id: spec.catId,
      name: spec.name,
      description: spec.desc,
      image_url: buildS3Url(s3PublicPrefix, spec.key),
      price: spec.price,
      original_price: spec.origPrice,
      options: spec.catId === drinkCat.id ? DRINK_DISH_OPTIONS : STANDARD_DISH_OPTIONS,
      is_available: true,
      tag_names: spec.tags,
    };
    menuItems.push(item);
    const existingList = menuByRestaurantId.get(spec.restId) ?? [];
    existingList.push(item);
    menuByRestaurantId.set(spec.restId, existingList);
  }

  // Add 3 extra dishes for core demo restaurants so they also showcase 8+ dishes cleanly
  for (const extraRest of [coreRestPho, coreRestBunBo]) {
    const catTemplates = DISH_TEMPLATES[extraRest.primary_category_name] ?? [];
    const slice = catTemplates.slice(4, 7);
    slice.forEach((tpl, idx) => {
      const dishId = deterministicUuid('core-extra-dish', `${extraRest.id}:${idx}`);
      const item: SeedMenuItemRecord = {
        id: dishId,
        restaurant_id: extraRest.id,
        category_id: extraRest.id === coreRestPho.id ? phoCat.id : bunBoCat.id,
        name: tpl.name,
        description: tpl.desc,
        image_url: buildS3Url(
          s3PublicPrefix,
          extraRest.id === coreRestPho.id ? CATEGORY_ASSET_KEYS[0].dishImageKey : CATEGORY_ASSET_KEYS[1].dishImageKey,
        ),
        price: tpl.price,
        original_price: tpl.originalPrice,
        options: STANDARD_DISH_OPTIONS,
        is_available: true,
        tag_names: [...tpl.tags],
      };
      menuItems.push(item);
      const existingList = menuByRestaurantId.get(extraRest.id) ?? [];
      existingList.push(item);
      menuByRestaurantId.set(extraRest.id, existingList);

      tpl.tags.forEach((tName, tIdx) => {
        const tagId = tagIdByName.get(tName);
        if (tagId) {
          menuItemTags.push({
            id: deterministicUuid('menu-item-tag', `${dishId}:${tIdx}`),
            menu_item_id: dishId,
            tag_id: tagId,
          });
        }
      });
    });
  }

  // Remaining Restaurants & Owners
  for (let i = 2; i < config.restaurants; i++) {
    const ownerUserId = deterministicUuid('owner-user', i);
    const restId = deterministicUuid('restaurant', i);
    const ownerName = `Chủ Quán ${generateVietnameseName(prng)}`;
    const point = generateHcmcPoint(prng, i);
    const primaryCat = categories[i % categories.length] as SeedCategoryRecord;
    const secondaryCat = categories[(i + 2) % categories.length] as SeedCategoryRecord;
    const catAsset = categoryAssetBySlug.get(primaryCat.slug) ?? CATEGORY_ASSET_KEYS[0];
    const adj = REST_ADJECTIVES[(i * 3) % REST_ADJECTIVES.length] as string;
    const restName = `${primaryCat.name} ${adj} - ${point.district} #${i}`;
    const createdAt = daysBefore(referenceDate, prng.int(7, 42));
    const isPendingVerify = i >= config.restaurants - 4;
    const verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' = isPendingVerify
      ? i % 2 === 0
        ? 'PENDING'
        : 'REJECTED'
      : 'VERIFIED';

    users.push({
      id: ownerUserId,
      email: `owner.${String(i).padStart(3, '0')}@demo.fooddelivery.local`,
      password_hash: DEMO_IDS.DEFAULT_PASSWORD_HASH,
      role: 'USER',
      avatar_url: restaurantAvatar,
      created_at: createdAt,
    });
    customerProfiles.push({
      id: deterministicUuid('owner-profile', i),
      user_id: ownerUserId,
      full_name: ownerName,
      phone: generatePhone(prng, 1500 + i),
      created_at: createdAt,
    });
    userNameById.set(ownerUserId, ownerName);

    const restRecord: SeedRestaurantRecord = {
      id: restId,
      owner_id: ownerUserId,
      name: restName,
      address: point.fullAddress,
      lat: point.lat,
      lon: point.lng,
      rating: prng.float(3.9, 5.0, 2),
      banner_url: buildS3Url(s3PublicPrefix, catAsset.bannerImageKey),
      is_active: verificationStatus === 'VERIFIED',
      verification_status: verificationStatus,
      created_at: createdAt,
      primary_category_name: primaryCat.name,
      category_names: [primaryCat.name, secondaryCat.name],
    };

    restaurants.push(restRecord);
    if (verificationStatus === 'VERIFIED') {
      restaurantIds.push(restId);
    }

    restaurantCategories.push({
      id: deterministicUuid('rest-cat', `${i}:0`),
      restaurant_id: restId,
      category_id: primaryCat.id,
    });
    if (secondaryCat.id !== primaryCat.id) {
      restaurantCategories.push({
        id: deterministicUuid('rest-cat', `${i}:1`),
        restaurant_id: restId,
        category_id: secondaryCat.id,
      });
    }

    appendOperatingHours(restId, false, i);

    // 11 Menu Items per restaurant (~8 from primary category + 3 drinks/snacks)
    const primaryDishes = DISH_TEMPLATES[primaryCat.name] ?? DISH_TEMPLATES['Phở'] ?? [];
    const drinkDishes = (
      primaryCat.slug === 'giai-khat'
        ? (DISH_TEMPLATES['Cà Phê & Bánh'] ?? [])
        : (DISH_TEMPLATES['Giải khát'] ?? [])
    ).slice(0, 3);
    const combinedDishes = [...primaryDishes, ...drinkDishes];
    const restMenuList: SeedMenuItemRecord[] = [];
    const isBeverageCategory =
      primaryCat.slug === 'tra-sua' || primaryCat.slug === 'ca-phe-banh' || primaryCat.slug === 'giai-khat';

    combinedDishes.forEach((tpl, j) => {
      const dishId = deterministicUuid('menu-item', `${i}:${j}`);
      const isDrinkItem = j >= primaryDishes.length || isBeverageCategory;
      const dishAssetKey =
        j >= primaryDishes.length ? CATEGORY_ASSET_KEYS[2].dishImageKey : catAsset.dishImageKey;
      const delta = ((i + j) % 5) * 2000;
      const price = Math.max(12000, tpl.price + delta);
      const originalPrice = tpl.originalPrice !== null ? tpl.originalPrice + delta : null;
      const item: SeedMenuItemRecord = {
        id: dishId,
        restaurant_id: restId,
        category_id: j >= primaryDishes.length ? drinkCat.id : primaryCat.id,
        name: tpl.name,
        description: tpl.desc,
        image_url: buildS3Url(s3PublicPrefix, dishAssetKey),
        price,
        original_price: originalPrice,
        options: isDrinkItem ? DRINK_DISH_OPTIONS : STANDARD_DISH_OPTIONS,
        is_available: !(j === combinedDishes.length - 1 && i % 10 === 0),
        tag_names: [...tpl.tags],
      };

      menuItems.push(item);
      restMenuList.push(item);

      tpl.tags.forEach((tagName, tIdx) => {
        const tagId = tagIdByName.get(tagName);
        if (tagId) {
          menuItemTags.push({
            id: deterministicUuid('menu-item-tag', `${i}:${j}:${tIdx}`),
            menu_item_id: dishId,
            tag_id: tagId,
          });
        }
      });
    });

    menuByRestaurantId.set(restId, restMenuList);
  }

  // 6. Registration Requests (PENDING, APPROVED, REJECTED for Admin KYC Queue)
  for (let i = 0; i < config.registrations; i++) {
    const isDriverReq = i % 2 === 0;
    const reqStatus: 'PENDING' | 'APPROVED' | 'REJECTED' =
      i < Math.ceil(config.registrations * 0.4)
        ? 'PENDING'
        : i < Math.ceil(config.registrations * 0.85)
          ? 'APPROVED'
          : 'REJECTED';

    // Keep unique active constraint on (user_id, type) when PENDING/APPROVED
    const targetUserId = isDriverReq
      ? (driverUserIds[i % driverUserIds.length] ?? DEMO_IDS.DRIVER1_USER_ID)
      : deterministicUuid('reg-applicant', i);

    if (!isDriverReq) {
      // Ensure applicant exists in m_user if not reused
      const exists = users.some((u) => u.id === targetUserId);
      if (!exists) {
        const appName = generateVietnameseName(prng);
        const createdAt = daysBefore(referenceDate, prng.int(1, 20));
        users.push({
          id: targetUserId,
          email: `applicant.${String(i).padStart(3, '0')}@demo.fooddelivery.local`,
          password_hash: DEMO_IDS.DEFAULT_PASSWORD_HASH,
          role: 'USER',
          avatar_url: restaurantAvatar,
          created_at: createdAt,
        });
        customerProfiles.push({
          id: deterministicUuid('reg-applicant-prof', i),
          user_id: targetUserId,
          full_name: appName,
          phone: generatePhone(prng, 2500 + i),
          created_at: createdAt,
        });
        userNameById.set(targetUserId, appName);
      }
    }

    const reqUser =
      reqStatus === 'PENDING' || reqStatus === 'APPROVED'
        ? deterministicUuid('unique-reg-user', `${i}:${isDriverReq ? 'D' : 'R'}`)
        : targetUserId;

    if (
      (reqStatus === 'PENDING' || reqStatus === 'APPROVED') &&
      !users.some((u) => u.id === reqUser)
    ) {
      const applicantName = generateVietnameseName(prng);
      const createdAt = daysBefore(referenceDate, prng.int(1, 15));
      users.push({
        id: reqUser,
        email: `kyc.applicant.${String(i).padStart(3, '0')}@demo.fooddelivery.local`,
        password_hash: DEMO_IDS.DEFAULT_PASSWORD_HASH,
        role: 'USER',
        avatar_url: isDriverReq ? driverAvatar : restaurantAvatar,
        created_at: createdAt,
      });
      customerProfiles.push({
        id: deterministicUuid('kyc-profile', i),
        user_id: reqUser,
        full_name: applicantName,
        phone: generatePhone(prng, 3000 + i),
        created_at: createdAt,
      });
      userNameById.set(reqUser, applicantName);
    }

    const point = generateHcmcPoint(prng, i + 7);
    const createdAt = daysBefore(referenceDate, prng.int(1, 25));
    const updatedAt = reqStatus === 'PENDING' ? createdAt : addDays(createdAt, 1);

    registrationRequests.push({
      id: deterministicUuid('registration-req', i),
      user_id: reqUser,
      type: isDriverReq ? 'DRIVER' : 'RESTAURANT',
      payload: isDriverReq
        ? {
            fullName: userNameById.get(reqUser) ?? 'Ứng Viên Tài Xế',
            phone: generatePhone(prng, 3100 + i),
            vehicleType: VEHICLE_TYPES[i % VEHICLE_TYPES.length],
            vehiclePlate: `59-X1 ${String(10000 + i)}`,
            licenseNumber: `GPLX-${790000 + i}`,
          }
        : {
            restaurantName: `Quán Đăng Ký Mới #${i}`,
            address: point.fullAddress,
            phone: generatePhone(prng, 3200 + i),
            businessLicense: `GPKD-${880000 + i}`,
            category: CORE_CATEGORIES[i % CORE_CATEGORIES.length]?.name,
          },
      status: reqStatus,
      review_message:
        reqStatus === 'APPROVED'
          ? 'Hồ sơ hợp lệ, đã duyệt kích hoạt tài khoản đối tác.'
          : reqStatus === 'REJECTED'
            ? 'Ảnh giấy tờ chưa rõ nét hoặc thiếu mã số thuế hộ kinh doanh.'
            : null,
      reviewed_by: reqStatus === 'PENDING' ? null : DEMO_IDS.ADMIN_USER_ID,
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }

  // 7. Loyalty Wallets (1 per customer, points/tiers reconciled in transaction builder)
  customerUserIds.forEach((customerId, idx) => {
    const tier =
      idx === 0
        ? 'GOLD'
        : idx % 10 === 0
          ? 'PLATINUM'
          : idx % 4 === 0
            ? 'GOLD'
            : idx % 2 === 0
              ? 'SILVER'
              : 'BRONZE';
    loyaltyWallets.push({
      id: deterministicUuid('loyalty-wallet', customerId),
      user_id: customerId,
      available_points: 0,
      lifetime_points: 0,
      tier,
    });
  });

  // 8. Campaigns, Merchant Budgets, Vouchers & Composite Rules
  const campaigns: SeedCampaignRecord[] = [
    {
      id: 'c0000000-0000-4000-8000-000000000001',
      code: 'MEGA_SUPER_DEAL',
      name: 'Siêu Đại Tiệc Ăn Uống 11.11',
      sponsor_type: 'CO_FUNDED',
      platform_share_ratio: 70,
      merchant_share_ratio: 30,
      partner_share_ratio: 0,
      total_budget_amount: 50000000,
      current_spent_amount: 4200000,
      emergency_killed: false,
      start_time: daysBefore(referenceDate, 10),
      end_time: addDays(referenceDate, 30),
    },
    {
      id: deterministicUuid('campaign', 'FREESHIP_FESTIVAL'),
      code: 'FREESHIP_FESTIVAL',
      name: 'Lễ Hội Miễn Phí Vận Chuyển',
      sponsor_type: 'PLATFORM',
      platform_share_ratio: 100,
      merchant_share_ratio: 0,
      partner_share_ratio: 0,
      total_budget_amount: 30000000,
      current_spent_amount: 2150000,
      emergency_killed: false,
      start_time: daysBefore(referenceDate, 15),
      end_time: addDays(referenceDate, 45),
    },
    {
      id: deterministicUuid('campaign', 'PARTNER_WALLET_DAY'),
      code: 'PARTNER_WALLET_DAY',
      name: 'Tuần Lễ Thanh Toán Ví Điện Tử',
      sponsor_type: 'CO_FUNDED',
      platform_share_ratio: 40,
      merchant_share_ratio: 10,
      partner_share_ratio: 50,
      total_budget_amount: 40000000,
      current_spent_amount: 1850000,
      emergency_killed: false,
      start_time: daysBefore(referenceDate, 7),
      end_time: addDays(referenceDate, 25),
    },
    {
      id: deterministicUuid('campaign', 'MERCHANT_SPOTLIGHT'),
      code: 'MERCHANT_SPOTLIGHT',
      name: 'Tuần Lễ Quán Ngon Quanh Bạn',
      sponsor_type: 'MERCHANT',
      platform_share_ratio: 0,
      merchant_share_ratio: 100,
      partner_share_ratio: 0,
      total_budget_amount: 25000000,
      current_spent_amount: 960000,
      emergency_killed: false,
      start_time: daysBefore(referenceDate, 5),
      end_time: addDays(referenceDate, 20),
    },
    {
      id: deterministicUuid('campaign', 'LUNCH_GOLD_HOUR'),
      code: 'LUNCH_GOLD_HOUR',
      name: 'Giờ Vàng Bữa Trưa Văn Phòng',
      sponsor_type: 'PLATFORM',
      platform_share_ratio: 100,
      merchant_share_ratio: 0,
      partner_share_ratio: 0,
      total_budget_amount: 20000000,
      current_spent_amount: 1420000,
      emergency_killed: false,
      start_time: daysBefore(referenceDate, 20),
      end_time: addDays(referenceDate, 30),
    },
  ];

  if (config.scale === 'large') {
    for (let c = 5; c < 8; c++) {
      campaigns.push({
        id: deterministicUuid('campaign', `EXTRA_${c}`),
        code: `SEASONAL_PROMO_${c}`,
        name: `Chiến Dịch Ưu Đãi Đặc Biệt #${c}`,
        sponsor_type: c % 2 === 0 ? 'CO_FUNDED' : 'PLATFORM',
        platform_share_ratio: c % 2 === 0 ? 60 : 100,
        merchant_share_ratio: c % 2 === 0 ? 40 : 0,
        partner_share_ratio: 0,
        total_budget_amount: 35000000,
        current_spent_amount: 500000,
        emergency_killed: false,
        start_time: daysBefore(referenceDate, 12),
        end_time: addDays(referenceDate, 35),
      });
    }
  }

  const merchantCampaignBudgets: SeedMerchantCampaignBudgetRecord[] = [];
  const budgetPairSeen = new Set<string>();
  const targetBudgetCount = config.scale === 'large' ? 120 : 40;
  for (let i = 0; i < targetBudgetCount; i++) {
    const camp = campaigns[i % campaigns.length] as SeedCampaignRecord;
    const restId = restaurantIds[i % restaurantIds.length] as string;
    const key = `${camp.id}:${restId}`;
    if (budgetPairSeen.has(key)) continue;
    budgetPairSeen.add(key);
    merchantCampaignBudgets.push({
      id: deterministicUuid('merchant-budget', key),
      campaign_id: camp.id,
      restaurant_id: restId,
      merchant_budget_cap: 5000000 + (i % 5) * 1000000,
      current_spent_amount: (i % 4) * 125000,
      is_active: true,
    });
  }

  // Core 5 Vouchers (exact codes from voucher migrations) + rich Enterprise vouchers
  const vouchers: SeedVoucherRecord[] = [
    {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      campaign_id: campaigns[0].id,
      code: 'WELCOME50',
      name: 'Chào bạn mới giảm 50%',
      description: 'Giảm 50% tối đa 50k cho đơn từ 100k',
      voucher_type: 'PERCENTAGE',
      voucher_category: 'PLATFORM_DISCOUNT',
      distribution_type: 'COLLECTIBLE',
      sponsor_type: 'PLATFORM',
      restaurant_id: null,
      target_restaurant_id: null,
      discount_value: 50,
      max_discount_amount: 50000,
      min_order_amount: 100000,
      total_quantity: 2000,
      claimed_quantity: 120,
      used_quantity: 45,
      max_claims_per_user: 1,
      max_usage_per_user: 1,
      valid_from: daysBefore(referenceDate, 15),
      valid_to: addDays(referenceDate, 45),
      start_hour: null,
      end_hour: null,
      is_active: true,
    },
    {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      campaign_id: campaigns[1].id,
      code: 'FREESHIP15',
      name: 'Freeship đơn hàng 15k',
      description: 'Giảm 15k phí ship cho đơn từ 60k',
      voucher_type: 'FIXED_AMOUNT',
      voucher_category: 'FREE_SHIPPING',
      distribution_type: 'COLLECTIBLE',
      sponsor_type: 'PLATFORM',
      restaurant_id: null,
      target_restaurant_id: null,
      discount_value: 15000,
      max_discount_amount: 15000,
      min_order_amount: 60000,
      total_quantity: 3000,
      claimed_quantity: 250,
      used_quantity: 80,
      max_claims_per_user: 3,
      max_usage_per_user: 3,
      valid_from: daysBefore(referenceDate, 15),
      valid_to: addDays(referenceDate, 45),
      start_hour: null,
      end_hour: null,
      is_active: true,
    },
    {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      campaign_id: campaigns[3].id,
      code: 'LUNCH20K',
      name: 'Bữa trưa vui vẻ giảm 20k',
      description: 'Giảm 20k cho đơn từ 80k tại hệ thống Phở & Bún',
      voucher_type: 'FIXED_AMOUNT',
      voucher_category: 'MERCHANT_DISCOUNT',
      distribution_type: 'PROMO_CODE',
      sponsor_type: 'MERCHANT',
      restaurant_id: coreRestPho.id,
      target_restaurant_id: coreRestPho.id,
      discount_value: 20000,
      max_discount_amount: 20000,
      min_order_amount: 80000,
      total_quantity: 1000,
      claimed_quantity: 90,
      used_quantity: 32,
      max_claims_per_user: 2,
      max_usage_per_user: 2,
      valid_from: daysBefore(referenceDate, 10),
      valid_to: addDays(referenceDate, 30),
      start_hour: null,
      end_hour: null,
      is_active: true,
    },
    {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
      campaign_id: campaigns[2].id,
      code: 'MOMOPAY20',
      name: 'Giảm 20k khi trả qua MoMo',
      description: 'Ưu đãi liên kết ví MoMo cho đơn từ 80k',
      voucher_type: 'FIXED_AMOUNT',
      voucher_category: 'PAYMENT_DISCOUNT',
      distribution_type: 'COLLECTIBLE',
      sponsor_type: 'PAYMENT_PARTNER',
      restaurant_id: null,
      target_restaurant_id: null,
      discount_value: 20000,
      max_discount_amount: 20000,
      min_order_amount: 80000,
      total_quantity: 1500,
      claimed_quantity: 140,
      used_quantity: 40,
      max_claims_per_user: 2,
      max_usage_per_user: 2,
      valid_from: daysBefore(referenceDate, 10),
      valid_to: addDays(referenceDate, 30),
      start_hour: null,
      end_hour: null,
      is_active: true,
    },
    {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      campaign_id: campaigns[0].id,
      code: 'FLASHDEAL30',
      name: 'Flash Sale Giờ Vàng Giảm 30%',
      description: 'Mã Flash Sale giảm 30% tối đa 40k cho đơn từ 100k',
      voucher_type: 'PERCENTAGE',
      voucher_category: 'PLATFORM_DISCOUNT',
      distribution_type: 'COLLECTIBLE',
      sponsor_type: 'PLATFORM',
      restaurant_id: null,
      target_restaurant_id: null,
      discount_value: 30,
      max_discount_amount: 40000,
      min_order_amount: 100000,
      total_quantity: 800,
      claimed_quantity: 200,
      used_quantity: 65,
      max_claims_per_user: 1,
      max_usage_per_user: 1,
      valid_from: daysBefore(referenceDate, 5),
      valid_to: addDays(referenceDate, 25),
      start_hour: null,
      end_hour: null,
      is_active: true,
    },
  ];

  const totalVouchersTarget = config.scale === 'large' ? 30 : 16;
  const voucherCats: Array<SeedVoucherRecord['voucher_category']> = [
    'PLATFORM_DISCOUNT',
    'MERCHANT_DISCOUNT',
    'FREE_SHIPPING',
    'PAYMENT_DISCOUNT',
  ];

  for (let v = vouchers.length; v < totalVouchersTarget; v++) {
    const vCat = voucherCats[v % voucherCats.length] as SeedVoucherRecord['voucher_category'];
    const targetRest = vCat === 'MERCHANT_DISCOUNT' ? (restaurantIds[v % restaurantIds.length] ?? coreRestPho.id) : null;
    const isPct = vCat === 'PLATFORM_DISCOUNT' && v % 2 === 0;
    vouchers.push({
      id: deterministicUuid('voucher', v),
      campaign_id: campaigns[v % campaigns.length]?.id ?? null,
      code: `FDDEAL${String(v + 10).padStart(2, '0')}`,
      name:
        vCat === 'FREE_SHIPPING'
          ? `Freeship Siêu Tốc ${15 + (v % 3) * 5}k`
          : vCat === 'PAYMENT_DISCOUNT'
            ? `Ưu Đãi FoodPay / VNPay ${15 + (v % 4) * 5}k`
            : isPct
              ? `Siêu Giảm ${15 + (v % 4) * 5}% Hóa Đơn`
              : `Giảm Trực Tiếp ${20 + (v % 5) * 5}k`,
      description: 'Áp dụng cho đơn đặt món đủ điều kiện giá trị tối thiểu trên hệ thống FoodDelivery.',
      voucher_type: isPct ? 'PERCENTAGE' : vCat === 'FREE_SHIPPING' ? 'FREE_SHIPPING' : 'FIXED_AMOUNT',
      voucher_category: vCat,
      distribution_type: v % 3 === 0 ? 'PROMO_CODE' : 'COLLECTIBLE',
      sponsor_type:
        vCat === 'MERCHANT_DISCOUNT'
          ? 'MERCHANT'
          : vCat === 'PAYMENT_DISCOUNT'
            ? 'PAYMENT_PARTNER'
            : 'PLATFORM',
      restaurant_id: targetRest,
      target_restaurant_id: targetRest,
      discount_value: isPct ? 15 + (v % 4) * 5 : 15000 + (v % 4) * 5000,
      max_discount_amount: isPct ? 40000 : 25000 + (v % 4) * 5000,
      min_order_amount: 60000 + (v % 4) * 20000,
      total_quantity: 1000,
      claimed_quantity: 50 + (v % 10) * 5,
      used_quantity: 15 + (v % 7) * 3,
      max_claims_per_user: 2,
      max_usage_per_user: 2,
      valid_from: daysBefore(referenceDate, 10),
      valid_to: addDays(referenceDate, 30),
      start_hour: null,
      end_hour: null,
      is_active: true,
    });
  }

  const voucherRules: SeedVoucherRuleRecord[] = [];
  vouchers.forEach((voucher, idx) => {
    if (voucher.voucher_category === 'PAYMENT_DISCOUNT') {
      voucherRules.push({
        id: deterministicUuid('voucher-rule', `${idx}:pay`),
        voucher_id: voucher.id,
        rule_type: 'PAYMENT_METHOD',
        operator: 'IN',
        rule_payload: { allowed_methods: voucher.code === 'MOMOPAY20' ? ['MOMO', 'WALLET'] : ['WALLET', 'VNPAY'] },
        error_message: 'Mã chỉ áp dụng khi thanh toán bằng Ví điện tử / VNPay / MoMo.',
      });
    } else if (idx % 3 === 0) {
      voucherRules.push({
        id: deterministicUuid('voucher-rule', `${idx}:seg`),
        voucher_id: voucher.id,
        rule_type: 'USER_SEGMENT',
        operator: 'IN',
        rule_payload: { tiers: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] },
        error_message: 'Mã chỉ áp dụng cho thành viên FoodDelivery hợp lệ.',
      });
    } else if (idx % 4 === 1) {
      voucherRules.push({
        id: deterministicUuid('voucher-rule', `${idx}:cat`),
        voucher_id: voucher.id,
        rule_type: 'MENU_CATEGORY',
        operator: 'IN',
        rule_payload: { categories: [CORE_CATEGORIES[idx % CORE_CATEGORIES.length]?.name ?? 'Phở'] },
        error_message: 'Mã chỉ áp dụng cho nhóm danh mục món quy định.',
      });
    }
  });

  // 9. Knowledge Chunks for AI RAG
  const rawDocs = params.knowledgeDocs && params.knowledgeDocs.length > 0 ? params.knowledgeDocs : FALLBACK_KNOWLEDGE_DOCS;
  const knowledgeChunks: SeedKnowledgeChunkRecord[] = [];
  rawDocs.forEach((doc, dIdx) => {
    const chunks = chunkText(doc.rawContent);
    chunks.forEach((content, cIdx) => {
      knowledgeChunks.push({
        id: deterministicUuid('knowledge-chunk', `${dIdx}:${cIdx}:${doc.sourceRef}`),
        source_type: doc.sourceType,
        source_ref: doc.sourceRef,
        content,
        metadata: { language: 'vi', chunkIndex: cIdx, seeded: true },
        created_at: daysBefore(referenceDate, 10),
      });
    });
  });

  return {
    categories,
    tags: [...CORE_TAGS],
    users,
    customerProfiles,
    driverProfiles,
    userAddresses,
    registrationRequests,
    loyaltyWallets,
    restaurants,
    restaurantCategories,
    operatingHours,
    menuItems,
    menuItemTags,
    campaigns,
    merchantCampaignBudgets,
    vouchers,
    voucherRules,
    knowledgeChunks,
    customerUserIds,
    driverUserIds,
    restaurantIds,
    menuByRestaurantId,
    defaultAddressByCustomerId,
    userNameById,
  };
}
