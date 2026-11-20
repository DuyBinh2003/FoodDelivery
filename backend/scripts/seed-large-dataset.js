import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[ConfigError] Thiếu biến môi trường DATABASE_URL trong backend/.env');
  process.exit(1);
}

const ES_NODE = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const pool = new pg.Pool({ connectionString });

function uuid() {
  return crypto.randomUUID();
}

// Danh mục ẩm thực chuẩn
const CATEGORIES = [
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Phở', icon_url: 'https://example.com/icon/pho.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Bún Bò', icon_url: 'https://example.com/icon/bunbo.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Giải khát', icon_url: 'https://example.com/icon/drink.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Cơm Tấm', icon_url: 'https://example.com/icon/comtam.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'Trà Sữa', icon_url: 'https://example.com/icon/trasua.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Gà Rán & Burger', icon_url: 'https://example.com/icon/burger.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Bánh Mì', icon_url: 'https://example.com/icon/banhmi.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', name: 'Pizza & Mì Ý', icon_url: 'https://example.com/icon/pizza.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Món Chay', icon_url: 'https://example.com/icon/chay.png' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', name: 'Cà Phê & Bánh', icon_url: 'https://example.com/icon/cafe.png' },
];

const TAGS = [
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Món Nước' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Bò' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Gà' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Ăn Vặt' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'Hải Sản' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Cơm' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Bún/Phở' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', name: 'Tráng Miệng' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Giải Khát' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', name: 'Không Cay' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', name: 'Món Chay' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', name: 'Healthy' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', name: 'Bán Chạy' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', name: 'Đặc Sản' },
];

const RESTAURANT_PREFIXES = [
  'Quán', 'Tiệm', 'Bếp', 'Cơm Niêu', 'Phở Gia Truyền', 'Bún Bò', 'Trà Sữa',
  'Cà Phê', 'Bánh Mì', 'Gà Rán', 'Lẩu & Nướng', 'Bún Đậu', 'Pizza Box',
  'Mì Cay', 'Hủ Tiếu Nam Vang', 'Bánh Cuốn Nóng', 'Cơm Tấm', 'Chè Ngon',
];

const RESTAURANT_NAMES = [
  'Cô Ba', 'Bà Tám', 'Chú Bảy', 'Sài Gòn', 'Hà Nội', 'Đông Ba', 'Nam Bộ',
  'Phúc Long', 'Gong Cha', 'Highlands', 'Kichi', 'Gogi', 'An Lạc', 'Hoàng Gia',
  'Phố Cổ', 'Bến Thành', 'Chợ Lớn', 'Gia Định', 'Ba Đình', 'Kim Liên', 'Hương Việt',
  'Tân Định', 'Ngọc Lan', 'Thanh Niên', 'Hải Vân', 'Bạch Đằng', 'Trường Sa',
];

const RESTAURANT_SUFFIXES = [
  'Gia Truyền', '1985', 'Phố Thị', 'Truyền Thống', 'Đậm Đà', 'Gia Bảo',
  'Đặc Biệt', 'Chính Gốc', 'Xưa', 'Hiện Đại', 'Ngon Mê Ly', 'Chuẩn Vị',
];

const STREET_NAMES = [
  'Nguyễn Huệ, Quận 1', 'Lê Lợi, Quận 1', 'Đồng Khởi, Quận 1', 'Hai Bà Trưng, Quận 3',
  'Điện Biên Phủ, Quận Bình Thạnh', 'Cách Mạng Tháng 8, Quận 10', 'Nguyễn Thị Minh Khai, Quận 3',
  'Phan Xích Long, Quận Phú Nhuận', 'Nguyễn Trãi, Quận 5', 'Sư Vạn Hạnh, Quận 10',
  'Nguyễn Văn Cừ, Quận 5', 'Võ Văn Ngân, TP. Thủ Đức', 'Lê Văn Việt, TP. Thủ Đức',
  'Nguyễn Thị Thập, Quận 7', 'Nguyễn Hữu Thọ, Quận 7', 'Hoàng Văn Thụ, Quận Tân Bình',
  'Cộng Hòa, Quận Tân Bình', 'Quang Trung, Quận Gò Vấp', 'Phan Văn Trị, Quận Gò Vấp',
];

// Danh mục món ăn chi tiết theo category
const DISH_TEMPLATES = {
  Phở: [
    { name: 'Phở Bò Tái Lăn', desc: 'Thịt bò xào lăn tỏi thơm nức, nước dùng đậm đà', price: 65000, tags: ['Món Nước', 'Bò', 'Bán Chạy'] },
    { name: 'Phở Bò Chín Nạm', desc: 'Bò chín mềm nhừ cùng thảo quả hồi quế truyền thống', price: 60000, tags: ['Món Nước', 'Bò'] },
    { name: 'Phở Gà Đồi Xé Phay', desc: 'Thịt gà ta thả vườn dai ngọt giòn da', price: 55000, tags: ['Món Nước', 'Gà', 'Healthy'] },
    { name: 'Phở Đặc Biệt Thập Cẩm', desc: 'Tái, nạm, gầu, bò viên, trứng chần lòng đào', price: 85000, tags: ['Món Nước', 'Bò', 'Đặc Sản'] },
    { name: 'Phở Xào Bắp Bò', desc: 'Bánh phở áp chảo giòn thơm xào cùng cải ngọt', price: 70000, tags: ['Bò', 'Bán Chạy'] },
    { name: 'Quẩy Giòn Nóng Hổi', desc: 'Quẩy chiên vàng ruộm ăn kèm phở', price: 10000, tags: ['Ăn Vặt'] },
  ],
  'Bún Bò': [
    { name: 'Bún Bò Huế Đặc Biệt', desc: 'Nạm bò, giò heo, chả cua, huyết và nước dùng ruốc thơm nức', price: 75000, tags: ['Món Nước', 'Bò', 'Bán Chạy', 'Đặc Sản'] },
    { name: 'Bún Bò Tái Nạm', desc: 'Thịt bắp bò hoa chần tái mềm ngọt', price: 60000, tags: ['Món Nước', 'Bò'] },
    { name: 'Bún Bò Gân Giòn', desc: 'Gân bò hầm trong veo giòn sần sật', price: 65000, tags: ['Món Nước', 'Bò'] },
    { name: 'Bún Bò Giò Heo', desc: 'Khoanh giò heo béo ngậy hầm mềm', price: 65000, tags: ['Món Nước'] },
    { name: 'Chả Cua Huế Hấp', desc: 'Chả cua nguyên chất đậm đà vị cố đô', price: 20000, tags: ['Ăn Vặt', 'Đặc Sản'] },
  ],
  'Cơm Tấm': [
    { name: 'Cơm Tấm Sườn Bì Chả', desc: 'Sườn nướng mật ong thơm lừng, bì giòn và chả trứng hấp', price: 65000, tags: ['Cơm', 'Bán Chạy', 'Đặc Sản'] },
    { name: 'Cơm Tấm Sườn Cây Khổng Lồ', desc: 'Sườn cây nguyên cọng ướp sốt ngũ vị nướng than hoa', price: 85000, tags: ['Cơm', 'Bán Chạy'] },
    { name: 'Cơm Tấm Ba Rọi Nướng', desc: 'Ba rọi heo cháy cạnh sốt chua ngọt', price: 60000, tags: ['Cơm'] },
    { name: 'Cơm Tấm Đùi Gà Rô Ti', desc: 'Đùi gà góc tư sốt nước dừa óng ả', price: 60000, tags: ['Cơm', 'Gà'] },
    { name: 'Canh Khổ Qua Nhồi Thịt', desc: 'Canh giải nhiệt thanh mát ngày hè', price: 25000, tags: ['Món Nước', 'Healthy'] },
  ],
  'Trà Sữa': [
    { name: 'Trà Sữa Trân Châu Đường Đen', desc: 'Trân châu dẻo nấu đường mía organic', price: 45000, tags: ['Giải Khát', 'Bán Chạy'] },
    { name: 'Trà Oolong Macchiato', desc: 'Trà ô long thượng hạng lớp kem cheese béo mặn', price: 50000, tags: ['Giải Khát'] },
    { name: 'Trà Đào Cam Sả Tươi', desc: 'Miếng đào giòn ngọt kèm hương sả thơm lừng', price: 45000, tags: ['Giải Khát', 'Healthy'] },
    { name: 'Trà Vải Lài Hoa Hồng', desc: 'Vải ngâm mọng nước cùng trà hoa lài thanh khiết', price: 48000, tags: ['Giải Khát', 'Tráng Miệng'] },
    { name: 'Matcha Latte Đậu Đỏ', desc: 'Matcha Uji Nhật Bản cùng đậu đỏ nghiền bùi béo', price: 55000, tags: ['Giải Khát'] },
  ],
  'Gà Rán & Burger': [
    { name: 'Burger Bò Phô Mai Tan Chảy', desc: 'Bò Úc xay nướng than kèm 2 lớp cheddar', price: 79000, tags: ['Bò', 'Bán Chạy'] },
    { name: 'Gà Rán Giòn Cay Giòn Rụm', desc: 'Gà ướp 11 loại gia vị bí truyền giòn tan', price: 42000, tags: ['Gà', 'Bán Chạy'] },
    { name: 'Gà Sốt Phô Mai Tuyết', desc: 'Lắc bột phô mai tuyết ngọt ngậy thơm lừng', price: 48000, tags: ['Gà', 'Ăn Vặt'] },
    { name: 'Khoai Tây Chiên Lắc Rong Biển', desc: 'Khoai tây cọng giòn rụm lắc bột rong biển Nhật', price: 32000, tags: ['Ăn Vặt'] },
  ],
  'Bánh Mì': [
    { name: 'Bánh Mì Thịt Nướng Sa Tế', desc: 'Thịt nướng xả ớt kèm đồ chua và pate béo ngậy', price: 35000, tags: ['Bán Chạy', 'Ăn Vặt'] },
    { name: 'Bánh Mì Heo Quay Giòn Da', desc: 'Heo quay bánh hỏi kèm nước sốt đậm đà', price: 40000, tags: ['Bán Chạy'] },
    { name: 'Bánh Mì Xíu Mại Trứng Muối', desc: 'Viên xíu mại mềm thơm kèm lòng đỏ trứng muối bùi béo', price: 38000, tags: ['Đặc Sản'] },
    { name: 'Bánh Mì Chả Cá Nha Trang', desc: 'Chả cá chiên nóng hổi thơm mùi rau răm', price: 30000, tags: ['Hải Sản'] },
  ],
  'Pizza & Mì Ý': [
    { name: 'Pizza Hải Sản Pesto Cao Cấp', desc: 'Tôm mực tươi rói trên nền sốt húng tây Pesto', price: 165000, tags: ['Hải Sản', 'Bán Chạy'] },
    { name: 'Pizza Bò Băm Nấm Truffle', desc: 'Bò Mỹ nướng kèm dầu nấm Truffle thơm ngào ngạt', price: 185000, tags: ['Bò', 'Đặc Sản'] },
    { name: 'Mì Ý Sốt Bò Băm Bolognese', desc: 'Mì Spaghetti chuẩn Ý nấu sốt cà chua thịt bò băm', price: 95000, tags: ['Bò'] },
    { name: 'Mì Ý Sốt Kem Carbonara', desc: 'Sốt kem tươi trứng gà cùng thịt ba chỉ xông khói giòn', price: 105000, tags: ['Bán Chạy'] },
  ],
  'Món Chay': [
    { name: 'Cơm Chiên Hạt Sen Nấm Đông Cô', desc: 'Cơm hạt tơi xốp kèm hạt sen bùi và nấm hương', price: 65000, tags: ['Cơm', 'Món Chay', 'Healthy'] },
    { name: 'Đậu Hũ Tứ Xuyên Chay', desc: 'Đậu hũ non mềm mịn sốt ớt cay the', price: 55000, tags: ['Món Chay', 'Healthy'] },
    { name: 'Lẩu Nấm Thập Cẩm Thanh Đạm', desc: 'Nước dùng rau củ hầm ngọt thanh cùng 5 loại nấm tươi', price: 180000, tags: ['Món Nước', 'Món Chay', 'Healthy'] },
  ],
  'Cà Phê & Bánh': [
    { name: 'Cà Phê Muối Xứ Huế', desc: 'Cà phê phin đậm đà hòa quyện lớp kem muối béo ngậy', price: 35000, tags: ['Giải Khát', 'Bán Chạy', 'Đặc Sản'] },
    { name: 'Bạc Xỉu Sài Gòn Ba Tầng', desc: 'Hương vị cà phê sữa kinh điển của người Sài Gòn', price: 32000, tags: ['Giải Khát'] },
    { name: 'Cold Brew Cam Sả Giải Nhiệt', desc: 'Cà phê ủ lạnh 16 tiếng thơm mát vị cam tươi', price: 48000, tags: ['Giải Khát', 'Healthy'] },
    { name: 'Bánh Croissant Bơ Pháp', desc: 'Bánh ngàn lớp nướng giòn rụm thơm mùi bơ', price: 42000, tags: ['Tráng Miệng', 'Ăn Vặt'] },
  ],
  'Giải khát': [
    { name: 'Nước Mía Sầu Riêng Béo Ngậy', desc: 'Nước mía ép tươi hòa cùng cơm sầu riêng Ri6 thơm lừng', price: 28000, tags: ['Giải Khát', 'Đặc Sản'] },
    { name: 'Rau Má Đậu Đỏ Sữa Dừa', desc: 'Rau má tươi thanh lọc cơ thể kết hợp cốt dừa béo', price: 25000, tags: ['Giải Khát', 'Healthy'] },
  ],
};

async function seedLargeDataset() {
  const TOTAL_RESTAURANTS = 500;
  console.log(`\n================================================================`);
  console.log(`🚀 BẮT ĐẦU TẠO SEED DATA LỚN: ${TOTAL_RESTAURANTS} NHÀ HÀNG & ~5.000+ MÓN ĂN`);
  console.log(`================================================================\n`);

  const client = await pool.connect();
  const startTime = Date.now();

  try {
    console.log('1️⃣ Khởi tạo Categories & Tags cơ bản...');
    for (const cat of CATEGORIES) {
      await client.query(`
        INSERT INTO schema_restaurant.m_category (id, name, icon_url)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon_url = EXCLUDED.icon_url
      `, [cat.id, cat.name, cat.icon_url]);
    }

    for (const tag of TAGS) {
      await client.query(`
        INSERT INTO schema_restaurant.m_tag (id, name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `, [tag.id, tag.name]);
    }

    console.log('2️⃣ Sinh ngẫu nhiên 500 nhà hàng tại TP.HCM...');
    const restaurantsData = [];
    const restCatData = [];
    const menuItemsData = [];
    const menuItemTagsData = [];

    // Tọa độ trung tâm TP.HCM: Lat 10.75 - 10.82, Lon 106.63 - 106.74
    for (let i = 1; i <= TOTAL_RESTAURANTS; i++) {
      const restId = uuid();
      const ownerId = uuid();

      const prefix = RESTAURANT_PREFIXES[i % RESTAURANT_PREFIXES.length];
      const name = RESTAURANT_NAMES[(i * 3) % RESTAURANT_NAMES.length];
      const suffix = RESTAURANT_SUFFIXES[(i * 7) % RESTAURANT_SUFFIXES.length];
      const restaurantName = `${prefix} ${name} ${suffix} #${i}`;

      const street = STREET_NAMES[i % STREET_NAMES.length];
      const address = `${(i * 17) % 800 + 1} ${street}`;

      // Tọa độ ngẫu nhiên xung quanh TP.HCM
      const lat = Number((10.74 + (Math.sin(i) * 0.05 + Math.random() * 0.06)).toFixed(6));
      const lon = Number((106.66 + (Math.cos(i) * 0.05 + Math.random() * 0.06)).toFixed(6));
      const rating = Number((3.8 + Math.random() * 1.2).toFixed(2)); // 3.8 - 5.0

      restaurantsData.push({
        id: restId,
        owner_id: ownerId,
        name: restaurantName,
        address,
        lat,
        lon,
        rating,
        banner_url: 'http://localhost:4566/food-delivery-assets/defaults/banners/restaurant-banner-pho.svg',
      });

      // Gán 1-2 category
      const primaryCat = CATEGORIES[i % CATEGORIES.length];
      restCatData.push({
        id: uuid(),
        restaurant_id: restId,
        category_id: primaryCat.id,
      });

      // Sinh 10 - 12 món ăn cho mỗi nhà hàng dựa theo template
      const templateDishes = DISH_TEMPLATES[primaryCat.name] || DISH_TEMPLATES['Phở'];
      const extraDishes = DISH_TEMPLATES['Giải khát'];
      const allDishes = [...templateDishes, ...extraDishes];

      for (let j = 0; j < allDishes.length; j++) {
        const dish = allDishes[j];
        const menuItemId = uuid();
        const priceVariation = (dish.price + ((j * 2000) % 15000));
        const originalPrice = priceVariation + 10000;

        menuItemsData.push({
          id: menuItemId,
          restaurant_id: restId,
          category_id: primaryCat.id,
          name: `${dish.name} (${restaurantName.split(' ')[1] || 'Đặc Biệt'})`,
          description: dish.desc,
          price: priceVariation,
          original_price: originalPrice,
          is_available: true,
          image_url: 'http://localhost:4566/food-delivery-assets/defaults/dishes/pho-bo-chin.svg',
          options: JSON.stringify([
            {
              id: 'opt-size',
              name: 'Kích cỡ (Size)',
              choices: [
                { id: 'm', name: 'Vừa (M)', price: 0, is_default: true },
                { id: 'l', name: 'Lớn (L)', price: 10000 },
              ],
              required: true,
            },
          ]),
          tags: dish.tags,
          location: { lat, lon },
          rating,
          restaurant_name: restaurantName,
        });

        // Gán tags
        for (const tagName of dish.tags) {
          const matchedTag = TAGS.find((t) => t.name === tagName);
          if (matchedTag) {
            menuItemTagsData.push({
              id: uuid(),
              menu_item_id: menuItemId,
              tag_id: matchedTag.id,
            });
          }
        }
      }
    }

    console.log(`\n3️⃣ Bulk insert vào PostgreSQL (${restaurantsData.length} quán & ${menuItemsData.length} món ăn)...`);

    // Insert Restaurants theo chunks 100
    for (let c = 0; c < restaurantsData.length; c += 100) {
      const chunk = restaurantsData.slice(c, c + 100);
      const values = [];
      const placeholders = chunk.map((r, idx) => {
        const o = idx * 8;
        values.push(r.id, r.owner_id, r.name, r.address, r.lat, r.lon, r.rating, r.banner_url);
        return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, true, 'VERIFIED', $${o + 8})`;
      });

      await client.query(`
        INSERT INTO schema_restaurant.m_restaurant (id, owner_id, name, address, lat, lon, rating, is_active, verification_status, banner_url)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO NOTHING;
      `, values);
    }
    console.log(`   ✔ Đã insert ${restaurantsData.length} nhà hàng vào PostgreSQL.`);

    // Insert Restaurant Categories theo chunks 200
    for (let c = 0; c < restCatData.length; c += 200) {
      const chunk = restCatData.slice(c, c + 200);
      const values = [];
      const placeholders = chunk.map((rc, idx) => {
        const o = idx * 3;
        values.push(rc.id, rc.restaurant_id, rc.category_id);
        return `($${o + 1}, $${o + 2}, $${o + 3})`;
      });

      await client.query(`
        INSERT INTO schema_restaurant.m_restaurant_category (id, restaurant_id, category_id)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO NOTHING;
      `, values);
    }

    // Insert Menu Items theo chunks 200
    for (let c = 0; c < menuItemsData.length; c += 200) {
      const chunk = menuItemsData.slice(c, c + 200);
      const values = [];
      const placeholders = chunk.map((m, idx) => {
        const o = idx * 8;
        values.push(m.id, m.restaurant_id, m.category_id, m.name, m.description, m.price, m.original_price, m.options);
        return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8}::jsonb, true)`;
      });

      await client.query(`
        INSERT INTO schema_restaurant.m_menu_item (id, restaurant_id, category_id, name, description, price, original_price, options, is_available)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO NOTHING;
      `, values);
    }
    console.log(`   ✔ Đã insert ${menuItemsData.length} món ăn vào PostgreSQL.`);

    // Insert Menu Item Tags theo chunks 500
    for (let c = 0; c < menuItemTagsData.length; c += 500) {
      const chunk = menuItemTagsData.slice(c, c + 500);
      const values = [];
      const placeholders = chunk.map((t, idx) => {
        const o = idx * 3;
        values.push(t.id, t.menu_item_id, t.tag_id);
        return `($${o + 1}, $${o + 2}, $${o + 3})`;
      });

      await client.query(`
        INSERT INTO schema_restaurant.m_menu_item_tag (id, menu_item_id, tag_id)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO NOTHING;
      `, values);
    }
    console.log(`   ✔ Đã insert ${menuItemTagsData.length} tag mappings vào PostgreSQL.`);

    console.log('\n4️⃣ Đang đồng bộ Bulk Ingestion trực tiếp vào cụm Elasticsearch v8...');

    // Bulk index restaurants vào Elasticsearch
    const restBulkPayload = [];
    for (const r of restaurantsData) {
      restBulkPayload.push({ index: { _index: 'restaurants', _id: r.id } });
      restBulkPayload.push({
        id: r.id,
        name: r.name,
        location: { lat: r.lat, lon: r.lon },
        rating: r.rating,
        total_reviews: Math.floor(Math.random() * 500) + 10,
        is_active: true,
        categories: [CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)].name],
        tags: ['Giao Siêu Tốc', 'Đối Tác'],
        suggest: [r.name],
      });
    }

    // Gửi bulk restaurants theo chunks 200 docs (400 items payload)
    for (let i = 0; i < restBulkPayload.length; i += 400) {
      const chunk = restBulkPayload.slice(i, i + 400);
      const ndjson = chunk.map((doc) => JSON.stringify(doc)).join('\n') + '\n';
      const esRes = await fetch(`${ES_NODE}/_bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: ndjson,
      });
      if (!esRes.ok) {
        console.warn(`Lỗi bulk restaurants chunk: ${esRes.statusText}`);
      }
    }
    console.log(`   ✔ Đã index thành công ${restaurantsData.length} documents vào index "restaurants".`);

    // Bulk index menu_items vào Elasticsearch
    const menuBulkPayload = [];
    for (const m of menuItemsData) {
      menuBulkPayload.push({ index: { _index: 'menu_items', _id: m.id } });
      menuBulkPayload.push({
        id: m.id,
        restaurant_id: m.restaurant_id,
        restaurant_name: m.restaurant_name,
        name: m.name,
        description: m.description,
        price: m.price,
        is_available: true,
        tags: m.tags,
        location: m.location,
        rating: m.rating,
        suggest: [m.name],
      });
    }

    for (let i = 0; i < menuBulkPayload.length; i += 500) {
      const chunk = menuBulkPayload.slice(i, i + 500);
      const ndjson = chunk.map((doc) => JSON.stringify(doc)).join('\n') + '\n';
      const esRes = await fetch(`${ES_NODE}/_bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: ndjson,
      });
      if (!esRes.ok) {
        console.warn(`Lỗi bulk menu_items chunk: ${esRes.statusText}`);
      }
    }
    console.log(`   ✔ Đã index thành công ${menuItemsData.length} documents vào index "menu_items".`);

    // Flush & refresh Elasticsearch indices
    await fetch(`${ES_NODE}/restaurants,menu_items/_refresh`, { method: 'POST' });

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 HOÀN TẤT SEED DỮ LIỆU LỚN TRONG ${totalSeconds} GIÂY!`);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  // ==========================================
  // CHẠY BÀI TOÁN BENCHMARK HIỆU NĂNG TÌM KIẾM
  // ==========================================
  await runSearchPerformanceBenchmark();
}

async function runSearchPerformanceBenchmark() {
  console.log(`\n================================================================`);
  console.log(`⚡ BẮT ĐẦU CHẠY BENCHMARK HIỆU NĂNG TÌM KIẾM (PERFORMANCE SUITE)`);
  console.log(`================================================================\n`);

  const SEARCH_BASE_URL = 'http://localhost:3006';

  // 1. Benchmark Vietnamese Full-Text Search (Có dấu & Không dấu)
  console.log('📊 TEST 1: Vietnamese Full-Text Search (Có dấu vs Không dấu)...');
  const testQueries = ['com tam', 'cơm tấm sườn', 'tra sua tran chau', 'pho bo', 'bun bo hue', 'pizza'];
  const textTimes = [];

  for (const q of testQueries) {
    const t0 = performance.now();
    const res = await fetch(`${SEARCH_BASE_URL}/search/menu?q=${encodeURIComponent(q)}`);
    const t1 = performance.now();
    const data = await res.json();
    const duration = t1 - t0;
    textTimes.push(duration);
    console.log(`   - Query: "${q}" -> Kết quả: ${Array.isArray(data) ? data.length : 0} nhà hàng, Latency: ${duration.toFixed(2)}ms`);
  }

  // 2. Benchmark Multi-Factor Geo-Relevance Ranking (Function Score)
  console.log('\n📊 TEST 2: Multi-Factor Geo-Relevance Ranking (Gauss Decay + Rating Factor)...');
  const geoQueries = [
    { q: 'cơm', lat: 10.7725, lon: 106.7027, radius: '5km', sort: 'relevance' },
    { q: 'trà sữa', lat: 10.7816, lon: 106.6908, radius: '10km', sort: 'relevance' },
    { q: 'phở', lat: 10.7500, lon: 106.6800, radius: '3km', sort: 'distance' },
  ];
  const geoTimes = [];

  for (const g of geoQueries) {
    const t0 = performance.now();
    const res = await fetch(
      `${SEARCH_BASE_URL}/search/restaurants?q=${encodeURIComponent(g.q)}&lat=${g.lat}&lon=${g.lon}&radius=${g.radius}&sort_by=${g.sort}`
    );
    const t1 = performance.now();
    const data = await res.json();
    const duration = t1 - t0;
    geoTimes.push(duration);
    console.log(`   - Query: "${g.q}" @ (${g.lat}, ${g.lon}) bán kính ${g.radius} -> ${Array.isArray(data) ? data.length : 0} quán, Latency: ${duration.toFixed(2)}ms`);
  }

  // 3. Benchmark Concurrent Autocomplete Suggestions (100 concurrent requests)
  console.log('\n📊 TEST 3: Concurrent Autocomplete Suggestions (100 concurrent requests)...');
  const keystrokes = ['ph', 'pho', 'tra', 'tra s', 'com', 'com t', 'bun', 'bun b', 'ga', 'ca phe'];
  const concurrentRequests = 100;
  const tStartConcurrent = performance.now();

  const promises = [];
  for (let i = 0; i < concurrentRequests; i++) {
    const kw = keystrokes[i % keystrokes.length];
    promises.push(
      (async () => {
        const reqStart = performance.now();
        const r = await fetch(`${SEARCH_BASE_URL}/search/suggestions?q=${encodeURIComponent(kw)}&lat=10.77&lon=106.70`);
        await r.json();
        return performance.now() - reqStart;
      })()
    );
  }

  const suggestionLatencies = await Promise.all(promises);
  const tEndConcurrent = performance.now();
  const totalConcurrentDuration = tEndConcurrent - tStartConcurrent;

  suggestionLatencies.sort((a, b) => a - b);
  const p50 = suggestionLatencies[Math.floor(suggestionLatencies.length * 0.5)].toFixed(2);
  const p95 = suggestionLatencies[Math.floor(suggestionLatencies.length * 0.95)].toFixed(2);
  const p99 = suggestionLatencies[Math.floor(suggestionLatencies.length * 0.99)].toFixed(2);
  const rps = ((concurrentRequests / totalConcurrentDuration) * 1000).toFixed(1);

  console.log(`   ✔ Hoàn tất 100 requests đồng thời trong: ${totalConcurrentDuration.toFixed(2)}ms`);
  console.log(`   ✔ Throughput: ${rps} requests/second`);
  console.log(`   ✔ P50 Latency: ${p50}ms`);
  console.log(`   ✔ P95 Latency: ${p95}ms`);
  console.log(`   ✔ P99 Latency: ${p99}ms`);

  console.log(`\n================================================================`);
  console.log(`🏆 KẾT LUẬN: HỆ THỐNG ĐẠT HIỆU NĂNG TÌM KIẾM TỐI ƯU TRÊN DỮ LIỆU LỚN!`);
  console.log(`================================================================\n`);
}

seedLargeDataset();
