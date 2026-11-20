/**
 * Migration: seed-restaurants (Large Dataset: 100 Restaurants & 500+ Menu Items)
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. Categories (16 Danh Mục Ẩm Thực)
  const categories = [
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Phở & Món Nước', icon: 'https://example.com/icon/pho.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Bún Bò Huế', icon: 'https://example.com/icon/bunbo.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Cơm Tấm & Cơm Phần', icon: 'https://example.com/icon/comtam.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Bánh Mì & Xôi Sáng', icon: 'https://example.com/icon/banhmi.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'Trà Sữa & Topping', icon: 'https://example.com/icon/trasua.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Cà Phê & Trà Trái Cây', icon: 'https://example.com/icon/cafe.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Món Chay & Thực Dưỡng', icon: 'https://example.com/icon/chay.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', name: 'Ăn Vặt & Bánh Tráng', icon: 'https://example.com/icon/anvat.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Gà Rán & Fast Food', icon: 'https://example.com/icon/garan.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', name: 'Ẩm Thực Hàn Quốc', icon: 'https://example.com/icon/korean.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', name: 'Ẩm Thực Nhật Bản', icon: 'https://example.com/icon/japanese.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', name: 'Ẩm Thực Thái Lan', icon: 'https://example.com/icon/thai.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', name: 'Hải Sản & Ốc Sài Gòn', icon: 'https://example.com/icon/haisan.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', name: 'Cháo & Súp Bổ Dưỡng', icon: 'https://example.com/icon/chao.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', name: 'Lẩu & Đồ Nướng BBQ', icon: 'https://example.com/icon/bbq.png' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', name: 'Tráng Miệng & Chè', icon: 'https://example.com/icon/che.png' },
  ];

  const catValues = categories
    .map((c) => `('${c.id}', '${c.name}', '${c.icon}')`)
    .join(',\n');

  pgm.sql(`
    INSERT INTO schema_restaurant.m_category (id, name, icon_url) VALUES
    ${catValues}
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon_url = EXCLUDED.icon_url;
  `);

  // 2. Tags (20 Tags Phong Phú)
  const tags = [
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
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', name: 'Ấm Bụng' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', name: 'Ăn Khuya' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', name: 'Cơm Trưa' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', name: 'Trà Sữa' },
  ];

  const tagValues = tags.map((t) => `('${t.id}', '${t.name}')`).join(',\n');
  pgm.sql(`
    INSERT INTO schema_restaurant.m_tag (id, name) VALUES
    ${tagValues}
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  `);

  // Danh mục Options mẫu chuẩn
  const drinkOptions = JSON.stringify([
    {
      id: 'opt-size',
      name: 'Chọn Kích Cỡ (Size)',
      required: true,
      min_choices: 1,
      max_choices: 1,
      choices: [
        { id: 'size-m', name: 'Size M (Vừa)', price: 0, is_default: true },
        { id: 'size-l', name: 'Size L (Lớn)', price: 8000 },
      ],
    },
    {
      id: 'opt-sugar',
      name: 'Chọn Mức Đường',
      required: false,
      min_choices: 0,
      max_choices: 1,
      choices: [
        { id: 'sugar-100', name: '100% Đường (Bình thường)', price: 0, is_default: true },
        { id: 'sugar-70', name: '70% Đường', price: 0 },
        { id: 'sugar-50', name: '50% Đường (Ít ngọt)', price: 0 },
        { id: 'sugar-30', name: '30% Đường', price: 0 },
        { id: 'sugar-0', name: 'Không đường', price: 0 },
      ],
    },
    {
      id: 'opt-ice',
      name: 'Chọn Mức Đá',
      required: false,
      min_choices: 0,
      max_choices: 1,
      choices: [
        { id: 'ice-100', name: '100% Đá', price: 0, is_default: true },
        { id: 'ice-50', name: '50% Đá (Ít đá)', price: 0 },
        { id: 'ice-0', name: 'Không đá', price: 0 },
      ],
    },
    {
      id: 'opt-topping',
      name: 'Thêm Topping',
      required: false,
      min_choices: 0,
      max_choices: 3,
      choices: [
        { id: 'top-boba', name: 'Trân Châu Đen Hoàng Kim', price: 8000 },
        { id: 'top-pudding', name: 'Pudding Trứng Mềm Mịn', price: 10000 },
        { id: 'top-jelly', name: 'Thạch Trái Cây Giòn', price: 8000 },
      ],
    },
  ]);

  const foodOptions = JSON.stringify([
    {
      id: 'opt-size',
      name: 'Phần Ăn',
      required: true,
      min_choices: 1,
      max_choices: 1,
      choices: [
        { id: 'size-std', name: 'Phần Chuẩn (Vừa ăn)', price: 0, is_default: true },
        { id: 'size-up', name: 'Phần Lớn Đặc Biệt (+Thịt/Topping)', price: 15000 },
      ],
    },
    {
      id: 'opt-extra',
      name: 'Món Thêm Kèm',
      required: false,
      min_choices: 0,
      max_choices: 3,
      choices: [
        { id: 'extra-egg', name: 'Trứng Ốp La / Trứng Lòng Đào', price: 8000 },
        { id: 'extra-meat', name: 'Thêm Thịt / Chả', price: 15000 },
        { id: 'extra-soup', name: 'Chén Canh Nóng Thêm', price: 5000 },
      ],
    },
  ]);

  // Template Menu cho 10 loại hình ẩm thực (6 món mỗi loại -> 600 món ăn trên 100 nhà hàng)
  const menuTemplates = {
    pho: [
      { name: 'Phở Bò Tái Nạm Gầu Béo', price: 60000, orig: 70000, desc: 'Bánh phở mềm dai, nước dùng hầm xương 12 tiếng thơm quế hồi', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
      { name: 'Phở Bò Tái Lăn Hà Nội', price: 65000, orig: 75000, desc: 'Thịt bò xào lăn tỏi thơm lừng, đậm đà chuẩn vị phố cổ', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'] },
      { name: 'Phở Gà Ta Đồi Chặt Lá Chanh', price: 55000, orig: 60000, desc: 'Thịt gà ta da giòn thịt ngọt, nước dùng thanh ngọt lá chanh', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
      { name: 'Phở Bò Viên Gân Giòn', price: 50000, orig: 55000, desc: 'Bò viên giòn sần sật, nước phở ngọt thanh ấm bụng', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'] },
      { name: 'Quẩy Giòn Nóng (3 cái)', price: 10000, orig: null, desc: 'Quẩy chiên giòn tan chấm nước dùng phở thơm phức', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'] },
      { name: 'Chén Tiết Hột Gà Nước Béo Hành Trần', price: 15000, orig: 20000, desc: 'Hột gà ta trần nước béo thơm phức rắc tiêu gừng ấm bụng', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
    ],
    bunbo: [
      { name: 'Bún Bò Huế Đặc Biệt (Bắp, Chả Cua, Gân)', price: 65000, orig: 75000, desc: 'Bún bò sợi to, bắp bò hoa giòn, chả cua Huế thơm nồng sa tế', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'] },
      { name: 'Bún Bò Bắp Hoa Thơm Cay', price: 55000, orig: 60000, desc: 'Bắp hoa bò thái lát mỏng, nước lèo ruốc sả thơm nức', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'] },
      { name: 'Bún Chả Cua Huế Giò Heo', price: 58000, orig: 65000, desc: 'Móng giò giòn sần sật béo ngậy, chả cua quết đậm vị', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26'] },
      { name: 'Bún Bò Gân Trong Giòn Giòn', price: 52000, orig: 58000, desc: 'Gân bò ninh mềm dẻo, thơm ngát mùi ruốc Huế cổ truyền', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'] },
      { name: 'Đĩa Chả Cua Huế Hấp Nóng', price: 20000, orig: 25000, desc: 'Chả cua quết tay gia truyền đượm vị tiêu đen hạt giã rối', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26'] },
      { name: 'Trà Đá Hoa Cúc Mát Lạnh', price: 5000, orig: null, desc: 'Trà đá thơm dịu giải nhiệt khi ăn bún cay', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19'] },
    ],
    comtam: [
      { name: 'Cơm Tấm Sườn Bì Chả Trứng Ốp La', price: 62000, orig: 70000, desc: 'Sườn nướng mật ong than hoa mềm ngọt mọng nước, mỡ hành tép mỡ giòn', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a29'] },
      { name: 'Cơm Tấm Sườn Cốt Lết Nướng Than Hoa', price: 48000, orig: 55000, desc: 'Cốt lết ướp đậm đà, nước mắm kẹo chua ngọt tuyệt đỉnh', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a29'] },
      { name: 'Cơm Tấm Đùi Gà Nướng Mật Ong', price: 45000, orig: 50000, desc: 'Đùi gà góc tư vàng ươm mật ong, cơm tấm hạt dẻo thơm', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'] },
      { name: 'Cơm Tấm Ba Rọi Nướng Muối Ớt Xanh', price: 52000, orig: 60000, desc: 'Ba rọi giòn bì ướp muối ớt thơm cay đậm đà tròn vị', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'] },
      { name: 'Canh Khổ Qua Nhồi Thịt Thanh Nhiệt', price: 15000, orig: null, desc: 'Canh đắng nhẹ hậu ngọt, thanh lọc cơ thể', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'] },
      { name: 'Chén Mỡ Hành Tép Mỡ Giòn Tan Thêm', price: 8000, orig: null, desc: 'Tép mỡ rán giòn rụm phi cùng hành lá tươi', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'] },
    ],
    banhmi: [
      { name: 'Bánh Mì Kẹp Thịt Nguội & Patê Cột Đèn', price: 32000, orig: 35000, desc: 'Vỏ giòn rụm, patê béo ngậy, bơ thơm và dưa chua giòn ngọt', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'] },
      { name: 'Bánh Mì Xíu Mại Trứng Muối', price: 35000, orig: 40000, desc: 'Viên xíu mại thịt băm mềm ngọt quyện sốt cà chua và trứng muối bùi béo', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'] },
      { name: 'Bánh Mì Chảo Bò Bít Tết Trứng Lòng Đào', price: 55000, orig: 65000, desc: 'Chảo gang sôi xèo xèo, bò mềm sốt tiêu đen kèm bánh mì nóng', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'] },
      { name: 'Bánh Mì Heo Quay Giòn Bì Rưới Sốt Đậm Đà', price: 35000, orig: 40000, desc: 'Heo quay da nổ giòn tan, chan nước sốt chua ngọt và dưa leo', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'] },
      { name: 'Bánh Mì Gà Xé Nấm Hương Cay Nhẹ', price: 30000, orig: 35000, desc: 'Gà xé sợi cay ngọt thấm vị bơ sốt đặc chế gia truyền', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'] },
      { name: 'Xôi Mặn Thập Cẩm Gà Xé Lạp Xưởng', price: 30000, orig: 35000, desc: 'Nếp dẻo thơm nước cốt dừa, lạp xưởng mai quế lộ và ruốc gà', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16'] },
    ],
    trasua: [
      { name: 'Trà Sữa Ô Long Nướng Trân Châu Đen', price: 38000, orig: 45000, desc: 'Vị trà ô long rang đậm đà, sữa béo ngậy và trân châu dẻo thơm', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a30'] },
      { name: 'Trà Đào Cam Sả Tươi Mát Lạnh', price: 35000, orig: 40000, desc: 'Miếng đào giòn ngọt, cam vàng thơm nồng và sả thanh nhiệt', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'] },
      { name: 'Trà Sữa Mắc Ca Trân Châu Trắng', price: 42000, orig: 48000, desc: 'Hương hạt mắc ca bùi béo kết hợp trân châu trắng 3Q giòn dai', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a30'] },
      { name: 'Sữa Tươi Trân Châu Đường Đen Đài Loan', price: 40000, orig: 45000, desc: 'Sữa tươi thanh trùng Đà Lạt quện đường đen cô đặc thơm ngọt', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a30'] },
      { name: 'Trà Trái Cây Nhiệt Đới Tươi Mát 4 Mùa', price: 38000, orig: 45000, desc: 'Chanh leo, xoài, dưa hấu và táo tươi cắt lát giải khát đỉnh cao', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'] },
      { name: 'Trà Lài Macchiato Kem Cheese Béo Mặn', price: 39000, orig: 45000, desc: 'Vị trà lài thanh tao phủ lớp kem phô mai bồng bềnh béo mặn', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19'] },
    ],
    cafe: [
      { name: 'Cà Phê Sữa Đá Sài Gòn Đậm Đà', price: 25000, orig: 30000, desc: 'Cà phê Robusta pha phin truyền thống quyện sữa đặc thơm béo', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'] },
      { name: 'Bạc Xỉu 3 Tầng Thơm Ngậy', price: 28000, orig: 32000, desc: 'Nhiều sữa ít cà phê, béo thơm dễ uống cho buổi sáng tỉnh táo', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19'] },
      { name: 'Cà Phê Muối Xứ Huế Thơm Béo', price: 32000, orig: 38000, desc: 'Lớp kem mặn bồng bềnh kết hợp cà phê đen sánh quyện', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26'] },
      { name: 'Cold Brew Cam Vàng Thanh Mát', price: 42000, orig: 48000, desc: 'Cà phê ủ lạnh 18 tiếng, ít chua kết hợp lát cam vàng mọng nước', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'] },
      { name: 'Cà Phê Đen Đá Pha Phin Không Đường', price: 22000, orig: 25000, desc: 'Cà phê rang mộc nguyên chất, vị đắng êm sâu tỉnh ngủ cả ngày', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19'] },
      { name: 'Trà Chanh Giã Tay Quảng Đông Thơm Nồng', price: 28000, orig: 32000, desc: 'Chanh nước hoa giã tay tươi giải khát đã khát tức thì', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19'] },
    ],
    chay: [
      { name: 'Cơm Chiên Hạt Sen Nấm Hương Chay', price: 45000, orig: 50000, desc: 'Cơm rang giòn ráo dầu, hạt sen bùi ngậy và nấm hương tươi thanh đạm', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'] },
      { name: 'Bún Nấm Riêu Chay Đậu Hũ', price: 40000, orig: 45000, desc: 'Riêu đậu phụ bùi ngậy, nước dùng cà chua nấm ngọt thanh tự nhiên', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
      { name: 'Hủ Tiếu Nam Vang Chay Rau Củ', price: 42000, orig: 48000, desc: 'Nước dùng củ cải ngọt mát, chả chay chiên giòn và nấm đùi gà', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23'] },
      { name: 'Đậu Hũ Chiên Sả Ớt Giòn Cay Chay', price: 30000, orig: 35000, desc: 'Đậu hũ non chiên giòn rụm bên ngoài mềm mướt bên trong xào sả ớt', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23'] },
      { name: 'Canh Chua Chay Nam Bộ Rau Rút Bạc Hà', price: 35000, orig: 40000, desc: 'Canh chua me tươi thơm lừng bạc hà đậu bắp ngọt hậu thanh khiết', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23'] },
      { name: 'Gỏi Cuốn Chay Chấm Tương Bơ Đậu Phộng (3 Cuốn)', price: 25000, orig: 30000, desc: 'Rau sống sạch, đậu hũ chiên, bún tươi cuốn bánh tráng', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'] },
    ],
    anvat: [
      { name: 'Bánh Tráng Trộn Sa Tế Bò Khô Trứng Cút', price: 25000, orig: 30000, desc: 'Bánh tráng dẻo thấm đẫm sốt me sa tế, bò khô đỏ và đậu phộng rang giòn', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'] },
      { name: 'Bánh Tráng Cuốn Sốt Bơ Béo Ngậy', price: 25000, orig: 30000, desc: 'Sốt bơ trứng gà vàng ươm, hành phi thơm lừng và ruốc tép', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'] },
      { name: 'Cá Viên Chiên Thập Cẩm Nước Mắm Tỏi Ớt', price: 45000, orig: 55000, desc: 'Cá viên, bò viên, tôm viên đảo chảo nước mắm kẹo thơm lừng lá quế', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'] },
      { name: 'Chân Gà Rút Xương Sốt Thái Cóc Xoài', price: 55000, orig: 65000, desc: 'Chân gà giòn sần sật, sốt Thái chua cay tê lưỡi kèm cóc bao tử', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'] },
      { name: 'Bắp Xào Bơ Tép Mỡ Hành Lá Thơm Lừng', price: 25000, orig: 30000, desc: 'Bắp ngọt vàng óng xào bơ béo ngậy kèm ruốc tép và tương ớt', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'] },
      { name: 'Nem Chua Rán Hà Nội Giòn Ngậy (5 Chiếc)', price: 35000, orig: 40000, desc: 'Nem chua lăn bột chiên vàng ruộm chấm tương ớt cay xé lưỡi', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'] },
    ],
    garan: [
      { name: 'Gà Rán Giòn Cay Giòn Rụm (2 Miếng)', price: 69000, orig: 79000, desc: 'Thịt gà tươi ướp gia vị cay nồng, lớp da giòn rụm không ngấy mỡ', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'] },
      { name: 'Burger Bò Nướng Phô Mai Tan Chảy', price: 55000, orig: 65000, desc: 'Bò nướng than hoa mềm ngọt, lát cheddar béo ngậy kèm sốt BBQ', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'] },
      { name: 'Cánh Gà Sốt Bơ Tỏi Mật Ong (4 Miếng)', price: 75000, orig: 85000, desc: 'Cánh gà chiên giòn áo đều lớp sốt bơ tỏi ngọt lịm thơm nức', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'] },
      { name: 'Mì Ý Sốt Bò Bằm Phô Mai Sợi', price: 45000, orig: 55000, desc: 'Mì Ý al dente sốt bò bằm cà chua đậm đà rắc phô mai sợi béo', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'] },
      { name: 'Gà Popcorn Lắc Phô Mai Cay', price: 38000, orig: 45000, desc: 'Từng viên gà không xương giòn tan lắc đẫm phô mai cay', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'] },
      { name: 'Khoai Tây Chiên Lắc Phô Mai Bột', price: 30000, orig: 35000, desc: 'Khoai tây cọng giòn tan lắc đẫm bột phô mai mặn ngọt', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'] },
    ],
    chao: [
      { name: 'Cháo Gà Hạt Sen Ninh Nhừ Nóng Hổi', price: 45000, orig: 50000, desc: 'Cháo sánh mịn bồi bổ, thịt gà ta xé phay, hạt sen bùi béo nhiều gừng giải cảm', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
      { name: 'Cháo Sườn Non Hạt Sen Quẩy Giòn', price: 42000, orig: 48000, desc: 'Sườn non ninh nhừ róc xương, cháo thơm lừng tiêu đen ấm bụng', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
      { name: 'Súp Cua Trứng Bắc Thảo Nóng Ấm', price: 38000, orig: 45000, desc: 'Thịt cua xé sợi, nấm tuyết, trứng bắc thảo bùi béo dễ nuốt khi ốm', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
      { name: 'Cháo Bò Bằm Trứng Gà Ta', price: 40000, orig: 45000, desc: 'Thịt bò tươi băm nhỏ, lòng đỏ trứng gà ta nóng hổi bổ sung dinh dưỡng', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
      { name: 'Cháo Ếch Singapore Đậm Vị Tiêu Ớt', price: 65000, orig: 75000, desc: 'Niêu ếch kho kẹo cay nồng ăn kèm bát cháo trắng hoa lài sánh ngậy', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'] },
      { name: 'Cháo Lòng Thập Cẩm Quẩy Giòn', price: 40000, orig: 45000, desc: 'Dồi trường, gan, cuống họng tươi giòn chấm nước mắm gừng ớt cay', tags: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27'] },
    ],
  };

  // Danh sách 100 Nhà Hàng Phân Bổ Khắp TP.HCM
  const restaurantConfigs = [
    // --- 1. Phở & Món Nước (10 Quán) ---
    { name: 'Phở Hòa Pasteur', district: 'Quận 3', address: '260C Pasteur, P. Võ Thị Sáu', lat: 10.78762, lon: 106.69012, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Lệ Nguyễn Trãi', district: 'Quận 5', address: '413 Nguyễn Trãi, P. 7', lat: 10.75489, lon: 106.66981, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Thìn Lò Đúc Sài Gòn', district: 'Quận 1', address: '110 Đinh Tiên Hoàng, P. Đa Kao', lat: 10.79123, lon: 106.69845, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Phú Vương Lê Văn Sỹ', district: 'Tân Bình', address: '339 Lê Văn Sỹ, P. 1', lat: 10.79634, lon: 106.66512, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Hùng Bến Thành', district: 'Quận 1', address: '241 Nguyễn Trãi, P. Nguyễn Cư Trinh', lat: 10.76781, lon: 106.68923, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Dậu Hẻm 288 Nam Kỳ Khởi Nghĩa', district: 'Quận 3', address: '288 M1 Nam Kỳ Khởi Nghĩa', lat: 10.78912, lon: 106.68654, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Gà Sơn Nga Xứ Bắc', district: 'Bình Thạnh', address: '45 Phan Văn Hân, P. 17', lat: 10.79456, lon: 106.70891, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Miến Gà Kỳ Đồng', district: 'Quận 3', address: '14/5 Kỳ Đồng, P. 9', lat: 10.78234, lon: 106.68012, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Cao Vân Mạc Đĩnh Chi', district: 'Quận 1', address: '25 Mạc Đĩnh Chi, P. Đa Kao', lat: 10.78456, lon: 106.69912, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },
    { name: 'Phở Tàu Bay Lý Thái Tổ', district: 'Quận 10', address: '433 Lý Thái Tổ, P. 9', lat: 10.76891, lon: 106.67123, catIdx: 0, type: 'pho', banner: 'restaurant-banner-pho.svg' },

    // --- 2. Bún Bò Huế (10 Quán) ---
    { name: 'Bún Bò Huế Đông Ba', district: 'Quận 1', address: '207 Nguyễn Trãi, P. Nguyễn Cư Trinh', lat: 10.76854, lon: 106.69012, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Út Hưng Sài Gòn', district: 'Bình Thạnh', address: '6c Tú Mỡ, P. 7', lat: 10.80671, lon: 106.69451, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Gánh Ngô Đức Kế', district: 'Quận 1', address: '88 Ngô Đức Kế, P. Bến Nghé', lat: 10.77341, lon: 106.70451, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Sông Hương', district: 'Quận 7', address: '65 Nguyễn Thị Thập, P. Tân Phú', lat: 10.73891, lon: 106.71456, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Ba Nghị Oanh', district: 'Quận 10', address: '466 Nguyễn Tri Phương, P. 9', lat: 10.76451, lon: 106.66891, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Huế Kim Hương', district: 'Thủ Đức', address: '118 Hoàng Diệu 2, P. Linh Chiểu', lat: 10.85412, lon: 106.77123, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Xưa Phổ Quang', district: 'Phú Nhuận', address: '48 Phổ Quang, P. 2', lat: 10.80345, lon: 106.67123, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Nam Giao Huỳnh Tịnh Của', district: 'Quận 3', address: '136 Huỳnh Tịnh Của, P. 8', lat: 10.79123, lon: 106.68945, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Hạnh Cố Đô', district: 'Tân Bình', address: '135 Bàu Cát, P. 14', lat: 10.79671, lon: 106.64321, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },
    { name: 'Bún Bò Mụ Rơi Đặc Sản', district: 'Gò Vấp', address: '245 Quang Trung, P. 10', lat: 10.83412, lon: 106.66781, catIdx: 1, type: 'bunbo', banner: 'restaurant-banner-bunbo.svg' },

    // --- 3. Cơm Tấm & Cơm Phần (10 Quán) ---
    { name: 'Cơm Tấm Ba Ghiền', district: 'Phú Nhuận', address: '84 Đặng Văn Ngữ, P. 10', lat: 10.79341, lon: 106.67412, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Tấm Phúc Lộc Thọ Lê Văn Sỹ', district: 'Quận 3', address: '478 Lê Văn Sỹ, P. 14', lat: 10.79123, lon: 106.67345, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Tấm Thuận Kiều Tôn Thất Tùng', district: 'Quận 1', address: '26 Tôn Thất Tùng, P. Bến Thành', lat: 10.77123, lon: 106.69123, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Tấm Cali Nguyễn Trãi', district: 'Quận 5', address: '236 Nguyễn Trãi, P. 3', lat: 10.75891, lon: 106.67812, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Tấm Bụi Sài Gòn', district: 'Bình Thạnh', address: '378 Điện Biên Phủ, P. 17', lat: 10.79891, lon: 106.71123, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Tấm Mộc Nguyễn Thị Minh Khai', district: 'Quận 1', address: '85 Nguyễn Thị Minh Khai', lat: 10.77345, lon: 106.69345, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Tấm Ma Đêm Đinh Tiên Hoàng', district: 'Bình Thạnh', address: '128 Đinh Tiên Hoàng, P. 1', lat: 10.79781, lon: 106.69912, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Tấm Sườn Chéo Bà Rọi 77', district: 'Quận 7', address: '115 Lâm Văn Bền, P. Tân Thuận', lat: 10.74567, lon: 106.72123, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Tấm Nhớ Nguyễn Tri Phương', district: 'Quận 10', address: '106 Nguyễn Tri Phương, P. 7', lat: 10.75891, lon: 106.66891, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },
    { name: 'Cơm Niêu Thiên Lý Sài Gòn', district: 'Quận 1', address: '16 Nguyễn Đình Chiểu, P. Đa Kao', lat: 10.78891, lon: 106.69945, catIdx: 2, type: 'comtam', banner: 'restaurant-banner-comtam.svg' },

    // --- 4. Bánh Mì & Xôi (10 Quán) ---
    { name: 'Bánh Mì Huỳnh Hoa Sài Gòn', district: 'Quận 1', address: '26 Lê Thị Riêng, P. Bến Thành', lat: 10.77156, lon: 106.69234, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Bánh Mì Bảy Hổ Huỳnh Khương Ninh', district: 'Quận 1', address: '19 Huỳnh Khương Ninh, P. Đa Kao', lat: 10.79012, lon: 106.69781, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Bánh Mì Chim Chạy Cống Quỳnh', district: 'Quận 1', address: '189 Cống Quỳnh, P. Phạm Ngũ Lão', lat: 10.76712, lon: 106.68791, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Bánh Mì Chảo Hòa Mã Cao Thắng', district: 'Quận 3', address: '53 Cao Thắng, P. 3', lat: 10.77123, lon: 106.68234, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Bánh Mì Cô Điệp Xứ Nam Bộ', district: 'Quận 3', address: '238 Võ Văn Tần, P. 5', lat: 10.77456, lon: 106.68456, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Xôi Gà Bà Chiểu Đêm', district: 'Bình Thạnh', address: '318 Bùi Hữu Nghĩa, P. 2', lat: 10.80123, lon: 106.69891, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Xôi Mặn Thập Cẩm Chợ Tân Định', district: 'Quận 1', address: '315 Hai Bà Trưng, P. 8', lat: 10.78945, lon: 106.69123, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Bánh Mì Hà Nội Lê Thị Riêng', district: 'Quận 1', address: '83 Lê Thị Riêng, P. Bến Thành', lat: 10.77012, lon: 106.69123, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Bánh Mì Phá Lấu Bà 6', district: 'Quận 4', address: '243 Tôn Đản, P. 15', lat: 10.75891, lon: 106.70891, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },
    { name: 'Bánh Mì Que Hải Phòng CMT8', district: 'Quận 10', address: '540 Cách Mạng Tháng 8, P. 11', lat: 10.78345, lon: 106.66781, catIdx: 3, type: 'banhmi', banner: 'restaurant-banner-banhmi.svg' },

    // --- 5. Trà Sữa & Đồ Uống (10 Quán) ---
    { name: 'Phê La - Ô Long Sữa Đặc Sản', district: 'Quận 1', address: '125 Hồ Tùng Mậu, P. Bến Nghé', lat: 10.77312, lon: 106.70345, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'Phúc Long Coffee & Tea Trần Hưng Đạo', district: 'Quận 5', address: '188 Trần Hưng Đạo, P. 7', lat: 10.75345, lon: 106.67123, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'KOI Thé Vincom Đồng Khởi', district: 'Quận 1', address: '72 Lê Thánh Tôn, P. Bến Nghé', lat: 10.77789, lon: 106.70189, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'Gong Cha Hồ Con Rùa', district: 'Quận 3', address: '49B Quốc Tế, P. Võ Thị Sáu', lat: 10.78234, lon: 106.69671, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'Trà Sữa TocoToco Sư Vạn Hạnh', district: 'Quận 10', address: '770 Sư Vạn Hạnh, P. 12', lat: 10.77345, lon: 106.66891, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'Trà Sữa Tiên Hưởng Phú Mỹ Hưng', district: 'Quận 7', address: '102 Hà Huy Tập, Tân Phong', lat: 10.72891, lon: 106.70891, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'Maycha Trà Sữa Đậm Vị Ngon', district: 'Bình Thạnh', address: '205 Xô Viết Nghệ Tĩnh, P. 17', lat: 10.79671, lon: 106.70891, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'Chicha San Chen Nguyễn Thái Học', district: 'Quận 1', address: '100 Nguyễn Thái Học, P. Phạm Ngũ Lão', lat: 10.76891, lon: 106.69567, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'Trà Sữa Bobapop Quang Trung', district: 'Gò Vấp', address: '512 Quang Trung, P. 10', lat: 10.83123, lon: 106.66234, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },
    { name: 'The Alley Sữa Tươi Trân Châu', district: 'Quận 1', address: '68 Nguyễn Huệ, P. Bến Nghé', lat: 10.77456, lon: 106.70412, catIdx: 4, type: 'trasua', banner: 'restaurant-banner-trasua.svg' },

    // --- 6. Cà Phê & Trà Trái Cây (10 Quán) ---
    { name: 'The Coffee House Nguyễn Đình Chiểu', district: 'Quận 3', address: '86 Nguyễn Đình Chiểu, P. Đa Kao', lat: 10.78671, lon: 106.69671, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'Trung Nguyên Legend Đồng Khởi', district: 'Quận 1', address: '80 Đồng Khởi, P. Bến Nghé', lat: 10.77671, lon: 106.70345, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'Cộng Cà Phê Bùi Viện Phố Tây', district: 'Quận 1', address: '127 Bùi Viện, P. Phạm Ngũ Lão', lat: 10.76712, lon: 106.69234, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'Highlands Coffee Nhà Thờ Đức Bà', district: 'Quận 1', address: '01 Công Xã Paris, P. Bến Nghé', lat: 10.77981, lon: 106.69912, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'Katinat Saigon Kafe Hàm Nghi', district: 'Quận 1', address: '91 Hàm Nghi, P. Bến Nghé', lat: 10.77123, lon: 106.70234, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'Cheese Coffee D2 Bình Thạnh', district: 'Bình Thạnh', address: '19 Nguyễn Gia Trí, P. 25', lat: 10.80345, lon: 106.71456, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'Chidori Coffee In Bed Hoa Cau', district: 'Phú Nhuận', address: '06 Hoa Cau, P. 7', lat: 10.79891, lon: 106.68912, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'Okkio Caffe Lê Lợi Tầng 2', district: 'Quận 1', address: '120 Lê Lợi, P. Bến Thành', lat: 10.77345, lon: 106.69912, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'Cà Phê Muối Chú Long 3 Tháng 2', district: 'Quận 10', address: '412 Đường 3/2, P. 12', lat: 10.77123, lon: 106.66981, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },
    { name: 'La Viet Coffee Trần Quang Diệu', district: 'Quận 3', address: '57A Trần Quang Diệu, P. 14', lat: 10.78912, lon: 106.67891, catIdx: 5, type: 'cafe', banner: 'restaurant-banner-cafe.svg' },

    // --- 7. Món Chay & Thực Dưỡng (10 Quán) ---
    { name: 'Nhà Hàng Chay Hum Vegetarian', district: 'Quận 3', address: '32 Võ Văn Tần, P. 6', lat: 10.77891, lon: 106.69123, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Cơm Chay Nàng Gạo Eatclean', district: 'Quận 1', address: '12 Thạch Thị Thanh, P. Tân Định', lat: 10.79123, lon: 106.69234, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Quán Chay Giác Ngộ Nguyễn Tri Phương', district: 'Quận 10', address: '213 Nguyễn Tri Phương, P. 9', lat: 10.76345, lon: 106.66891, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Nhà Hàng Chay Pi Bistro Võ Văn Tần', district: 'Quận 3', address: '19 Võ Văn Tần, P. 6', lat: 10.77789, lon: 106.69234, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Chay Rôu Tôn Thất Đạm Phố Cổ', district: 'Quận 1', address: '37 Tôn Thất Đạm, P. Nguyễn Thái Bình', lat: 10.77123, lon: 106.70567, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Cơm Chay Vĩnh Nghiêm Chùa', district: 'Quận 3', address: '339 Nam Kỳ Khởi Nghĩa, P. 7', lat: 10.79012, lon: 106.68456, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Bếp Xanh An Duyên Chợ Lớn', district: 'Quận 5', address: '10 Nguyễn Tri Phương, P. 6', lat: 10.75456, lon: 106.66781, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Cơm Chay Sen Trắng Phan Xích Long', district: 'Phú Nhuận', address: '168 Phan Xích Long, P. 2', lat: 10.79891, lon: 106.68912, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Quán Chay Pháp Hoa Hoàng Sa', district: 'Tân Bình', address: '1012 Hoàng Sa, P. 5', lat: 10.79123, lon: 106.66345, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },
    { name: 'Loving Hut Nguồn Cội Xanh', district: 'Quận 7', address: '35 Huỳnh Tấn Phát, P. Tân Thuận Đông', lat: 10.75123, lon: 106.72345, catIdx: 6, type: 'chay', banner: 'restaurant-banner-chay.svg' },

    // --- 8. Ăn Vặt & Bánh Tráng (10 Quán) ---
    { name: 'Bánh Tráng Trộn Chú Viên Nguyễn Thượng Hiền', district: 'Quận 3', address: '38 Nguyễn Thượng Hiền, P. 5', lat: 10.77456, lon: 106.68345, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Bánh Tráng Cuốn Sốt Me Cô Giang', district: 'Quận 1', address: '84 Cô Giang, P. Cầu Ông Lãnh', lat: 10.76456, lon: 106.69456, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Phá Lấu Bò Cô Thảo Tôn Đản', district: 'Quận 4', address: '243 Tôn Đản, P. 15', lat: 10.75891, lon: 106.70891, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Cá Viên Chiên Lương Hữu Khánh', district: 'Quận 1', address: '33 Lương Hữu Khánh, P. Phạm Ngũ Lão', lat: 10.76891, lon: 106.68789, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Ốc Chợ 200 Xóm Chiếu', district: 'Quận 4', address: '200 Xóm Chiếu, P. 14', lat: 10.76123, lon: 106.70671, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Bánh Tráng Nướng Đà Lạt Hồ Con Rùa', district: 'Quận 3', address: 'Phạm Ngọc Thạch, P. Võ Thị Sáu', lat: 10.78234, lon: 106.69671, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Chè Mâm 16 Món Sư Vạn Hạnh', district: 'Quận 10', address: '032 Lô H Chung cư Ngô Gia Tự', lat: 10.76123, lon: 106.66891, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Bột Chiên Đạt Thành Võ Văn Tần', district: 'Quận 3', address: '277 Võ Văn Tần, P. 5', lat: 10.77123, lon: 106.68012, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Chân Gà Quái Thú Sốt Cay', district: 'Bình Thạnh', address: '48 Lê Quang Định, P. 14', lat: 10.80891, lon: 106.69891, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },
    { name: 'Trứng Cút Lộn Xào Me Cô Ba', district: 'Quận 5', address: '12 An Dương Vương, P. 8', lat: 10.75671, lon: 106.67123, catIdx: 7, type: 'anvat', banner: 'restaurant-banner-anvat.svg' },

    // --- 9. Gà Rán & Fast Food (10 Quán) ---
    { name: 'Lotteria Diamond Plaza Sài Gòn', district: 'Quận 1', address: '34 Lê Duẩn, P. Bến Nghé', lat: 10.78123, lon: 106.69891, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'Jollibee Pasteur Phố Đi Bộ', district: 'Quận 1', address: '35 Pasteur, P. Bến Nghé', lat: 10.77234, lon: 106.70345, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'KFC Hai Bà Trưng Tân Định', district: 'Quận 3', address: '320 Hai Bà Trưng, P. 8', lat: 10.78891, lon: 106.69012, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'Popeyes Gà Rán Louisiana', district: 'Quận 10', address: '772 Sư Vạn Hạnh, P. 12', lat: 10.77345, lon: 106.66891, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'McDonalds Bến Thành Vòng Xoay', district: 'Quận 1', address: '2-2B Trần Hưng Đạo, P. Phạm Ngũ Lão', lat: 10.76891, lon: 106.69671, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'Texas Chicken Hùng Vương Plaza', district: 'Quận 5', address: '126 Hồng Bàng, P. 12', lat: 10.75456, lon: 106.66012, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'Bonchon Chicken Gà Giòn Hàn Quốc', district: 'Quận 1', address: '43 Lý Tự Trọng, P. Bến Nghé', lat: 10.77789, lon: 106.70234, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'Burger King Cống Quỳnh', district: 'Quận 1', address: '212 Cống Quỳnh, P. Phạm Ngũ Lão', lat: 10.76671, lon: 106.68671, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'Gà Rán Otoke Chicken D2', district: 'Bình Thạnh', address: '116 Nguyễn Gia Trí, P. 25', lat: 10.80456, lon: 106.71456, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },
    { name: 'Pizza Company Nguyễn Thị Minh Khai', district: 'Quận 3', address: '500 Nguyễn Thị Minh Khai', lat: 10.77123, lon: 106.68456, catIdx: 8, type: 'garan', banner: 'restaurant-banner-garan.svg' },

    // --- 10. Cháo & Súp Bổ Dưỡng (10 Quán) ---
    { name: 'Quán Cháo Dinh Dưỡng Cô Ba', district: 'Quận 1', address: '128 Đinh Tiên Hoàng, P. Đa Kao', lat: 10.79123, lon: 106.69891, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Cháo Sườn Bà Hào Đêm Sài Gòn', district: 'Quận 1', address: '109/1 Trần Khắc Chân, P. Tân Định', lat: 10.79234, lon: 106.69012, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Súp Cua Chợ Thiếc Gia Truyền', district: 'Quận 11', address: 'Chợ Thiếc, P. 6', lat: 10.75891, lon: 106.65456, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Cháo Lòng Bà Út 80 Năm', district: 'Quận 1', address: '193 Cô Giang, P. Cô Giang', lat: 10.76345, lon: 106.69123, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Cháo Mực Phó Đức Chính', district: 'Quận 1', address: '10 Phó Đức Chính, P. Nguyễn Thái Bình', lat: 10.77012, lon: 106.70123, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Cháo Bò Chợ Bến Thành Đêm', district: 'Quận 1', address: 'Phan Chu Trinh, P. Bến Thành', lat: 10.77234, lon: 106.69812, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Súp Cua Hạnh Nguyễn Tri Phương', district: 'Quận 10', address: '549 Nguyễn Tri Phương, P. 14', lat: 10.76891, lon: 106.66781, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Cháo Ếch Singapore Geylang Lor 9', district: 'Quận 3', address: '128 Võ Văn Tần, P. 6', lat: 10.77456, lon: 106.68912, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Cháo Tiều Cô Út Chợ Lớn', district: 'Quận 5', address: '51/4 Cao Đạt, P. 1', lat: 10.75123, lon: 106.67891, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
    { name: 'Súp Cua Bong Bóng Cá Nhà Thờ', district: 'Quận 5', address: '239 Lương Nhữ Học, P. 11', lat: 10.75456, lon: 106.66123, catIdx: 13, type: 'chao', banner: 'restaurant-banner-chao.svg' },
  ];

  // Sinh 100 Nhà Hàng vào SQL
  const restRows = [];
  const restCatRows = [];
  const menuItemRows = [];
  const menuItemTagRows = [];

  restaurantConfigs.forEach((cfg, rIdx) => {
    const hex = (rIdx + 1).toString().padStart(4, '0');
    const restId = `d0eebc99-9c0b-4ef8-bb6d-6bb9bd38${hex}`;
    const ownerId = `a0eebc99-9c0b-4ef8-bb6d-6bb9bd38${hex}`;
    const categoryId = categories[cfg.catIdx].id;
    const bannerUrl = `http://localhost:4566/food-delivery-assets/defaults/banners/${cfg.banner}`;
    const fullAddress = `${cfg.address}, ${cfg.district}, TP. Hồ Chí Minh`;
    const rating = (4.3 + (rIdx % 7) * 0.1).toFixed(1);

    restRows.push(`('${restId}', '${ownerId}', '${cfg.name.replace(/'/g, "''")}', '${fullAddress.replace(/'/g, "''")}', ${cfg.lat}, ${cfg.lon}, ${rating}, true, '${bannerUrl}')`);
    restCatRows.push(`('c1eebc99-9c0b-4ef8-bb6d-6bb9bd38${hex}', '${restId}', '${categoryId}')`);

    // Tạo các món ăn cho nhà hàng từ menu template tương ứng
    const templateItems = menuTemplates[cfg.type] || menuTemplates.pho;
    templateItems.forEach((m, mIdx) => {
      const mHex = `${hex}${mIdx.toString().padStart(2, '0')}`.slice(-4);
      const itemId = `e0eebc99-9c0b-4ef8-bb6d-6bb9bd${hex}${mIdx.toString().padStart(2, '0')}`;
      const optJson = cfg.type === 'trasua' || cfg.type === 'cafe' ? drinkOptions : foodOptions;
      const origPriceSql = m.orig ? `${m.orig}` : 'NULL';
      const imageUrl = `http://localhost:4566/food-delivery-assets/defaults/dishes/dish-${cfg.type}.svg`;

      menuItemRows.push(
        `('${itemId}', '${restId}', '${categoryId}', '${m.name.replace(/'/g, "''")}', '${m.desc.replace(/'/g, "''")}', '${imageUrl}', ${m.price}, ${origPriceSql}, '${optJson.replace(/'/g, "''")}'::jsonb, true)`
      );

      // Gắn Tags
      m.tags.forEach((tagId, tIdx) => {
        const tagMapId = `f0eebc99-9c0b-4ef8-bb6d-${hex}${mIdx.toString().padStart(4, '0')}${tIdx.toString().padStart(4, '0')}`;
        menuItemTagRows.push(`('${tagMapId}', '${itemId}', '${tagId}')`);
      });
    });
  });

  // Chèn 100 Nhà hàng
  pgm.sql(`
    INSERT INTO schema_restaurant.m_restaurant (id, owner_id, name, address, lat, lon, rating, is_active, banner_url) VALUES
    ${restRows.join(',\n')}
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name, 
      address = EXCLUDED.address, 
      lat = EXCLUDED.lat, 
      lon = EXCLUDED.lon, 
      rating = EXCLUDED.rating,
      banner_url = EXCLUDED.banner_url;
  `);

  // Chèn Categories Mapping
  pgm.sql(`
    INSERT INTO schema_restaurant.m_restaurant_category (id, restaurant_id, category_id) VALUES
    ${restCatRows.join(',\n')}
    ON CONFLICT (id) DO NOTHING;
  `);

  // Chèn Menu Items
  pgm.sql(`
    INSERT INTO schema_restaurant.m_menu_item (id, restaurant_id, category_id, name, description, image_url, price, original_price, options, is_available) VALUES
    ${menuItemRows.join(',\n')}
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      original_price = EXCLUDED.original_price,
      options = EXCLUDED.options;
  `);

  // Chèn Menu Item Tags
  pgm.sql(`
    INSERT INTO schema_restaurant.m_menu_item_tag (id, menu_item_id, tag_id) VALUES
    ${menuItemTagRows.join(',\n')}
    ON CONFLICT (id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM schema_restaurant.m_menu_item_tag;`);
  pgm.sql(`DELETE FROM schema_restaurant.m_menu_item;`);
  pgm.sql(`DELETE FROM schema_restaurant.m_restaurant_category;`);
  pgm.sql(`DELETE FROM schema_restaurant.m_restaurant;`);
  pgm.sql(`DELETE FROM schema_restaurant.m_tag;`);
  pgm.sql(`DELETE FROM schema_restaurant.m_category;`);
};
