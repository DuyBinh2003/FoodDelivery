/**
 * Thuật toán Probabilistic Early Expiration (XFetch Algorithm)
 * Công thức: -(beta * delta * ln(rand())) > TTL_remaining
 * 
 * @param deltaMs Thời gian (mili-giây) cần thiết để query/tính toán lại dữ liệu từ DB gốc
 * @param beta Hệ số quyết liệt (> 0, mặc định = 1.0). Giá trị càng lớn càng làm mới sớm
 * @param ttlRemainingSeconds Số giây còn lại trước khi key thực sự hết hạn trong Redis
 * @param randomValue Hàm sinh số ngẫu nhiên trong khoảng (0, 1] (mặc định Math.random)
 * @returns boolean Có nên làm mới cache ngầm trước thời hạn hay không
 */
export function shouldXFetch(
  deltaMs: number,
  beta = 1.0,
  ttlRemainingSeconds: number,
  randomValue = Math.random(),
): boolean {
  if (ttlRemainingSeconds <= 0) {
    return true; // Đã hết hạn hoàn toàn
  }

  // Đảm bảo rand() nằm trong khoảng (0, 1], tránh ln(0) = -Infinity
  const rand = Math.max(0.00001, Math.min(1.0, randomValue));
  const deltaSec = Math.max(0.001, deltaMs / 1000);

  // Tính toán ngưỡng xác suất
  const threshold = -beta * deltaSec * Math.log(rand);

  return threshold > ttlRemainingSeconds;
}

