import crypto from 'node:crypto';

/**
 * Mulberry32 deterministic PRNG so every DB: Reset generates reproducible UUIDs, records, and totals.
 */
export class SeedPrng {
  private state: number;

  constructor(seed = 20261125) {
    this.state = seed >>> 0;
  }

  /** Returns float in [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    if (max <= min) return min;
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min: number, max: number, decimals = 2): number {
    const value = min + this.next() * (max - min);
    return Number(value.toFixed(decimals));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('[SeedPrngError] Cannot pick from an empty array.');
    }
    const idx = Math.floor(this.next() * items.length);
    return items[idx] as T;
  }

  pickMany<T>(items: readonly T[], count: number): T[] {
    if (items.length === 0 || count <= 0) return [];
    const copy = [...items];
    const take = Math.min(count, copy.length);
    for (let i = 0; i < take; i++) {
      const swapIdx = i + Math.floor(this.next() * (copy.length - i));
      const tmp = copy[i] as T;
      copy[i] = copy[swapIdx] as T;
      copy[swapIdx] = tmp;
    }
    return copy.slice(0, take);
  }
}

/**
 * Generates deterministic valid RFC 4122 UUID v4 derived from namespace + identifier.
 * Avoids fixed demo prefixes (a0eebc99..f0eebc99) and never collides across entities.
 */
export function deterministicUuid(namespace: string, key: string | number): string {
  const hash = crypto.createHash('sha256').update(`fd-seed:${namespace}:${String(key)}`).digest('hex');
  const timeLow = hash.slice(0, 8);
  const timeMid = hash.slice(8, 12);
  // Set version 4 (0100)
  const timeHiAndVersion = `4${hash.slice(13, 16)}`;
  // Set RFC 4122 variant (10xx -> 8, 9, a, or b)
  const variantNibble = (parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8;
  const clkSeq = `${variantNibble.toString(16)}${hash.slice(17, 20)}`;
  const node = hash.slice(20, 32);
  return `${timeLow}-${timeMid}-${timeHiAndVersion}-${clkSeq}-${node}`;
}

export function daysBefore(referenceDate: Date, days: number, minutesOffset = 0): Date {
  const ms = days * 86_400_000 + minutesOffset * 60_000;
  return new Date(referenceDate.getTime() - ms);
}

export function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

const SURNAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trương', 'Đinh',
] as const;

const MIDDLE_NAMES = [
  'Văn', 'Thị', 'Minh', 'Hoàng', 'Quốc', 'Thanh', 'Ngọc', 'Gia', 'Đức', 'Phương',
  'Anh', 'Tuấn', 'Bảo', 'Hữu', 'Khánh',
] as const;

const GIVEN_NAMES = [
  'An', 'Bình', 'Châu', 'Dũng', 'Dương', 'Giang', 'Hà', 'Hải', 'Hân', 'Hiếu',
  'Hòa', 'Huy', 'Hùng', 'Khang', 'Khoa', 'Khôi', 'Kiên', 'Lâm', 'Lan', 'Linh',
  'Long', 'Mai', 'My', 'Nam', 'Ngân', 'Nghĩa', 'Nhi', 'Nhung', 'Phong', 'Phúc',
  'Quân', 'Quang', 'Quỳnh', 'Sơn', 'Tài', 'Tâm', 'Tân', 'Thảo', 'Thắng', 'Thịnh',
  'Trang', 'Trí', 'Trung', 'Tú', 'Uyên', 'Vinh', 'Vy', 'Yến',
] as const;

const PHONE_PREFIXES = ['090', '091', '093', '094', '096', '097', '098', '032', '038', '070'] as const;

export function generateVietnameseName(prng: SeedPrng): string {
  return `${prng.pick(SURNAMES)} ${prng.pick(MIDDLE_NAMES)} ${prng.pick(GIVEN_NAMES)}`;
}

export function generatePhone(prng: SeedPrng, seedIdx: number): string {
  const prefix = PHONE_PREFIXES[seedIdx % PHONE_PREFIXES.length] as string;
  const suffix = String(1_000_000 + ((seedIdx * 7919 + prng.int(100, 999)) % 8_999_999)).padStart(7, '0');
  return `${prefix}${suffix}`;
}

export interface HcmcDistrictSpec {
  readonly district: string;
  readonly ward: string;
  readonly streets: readonly string[];
  readonly centerLat: number;
  readonly centerLng: number;
}

export const HCMC_DISTRICTS: readonly HcmcDistrictSpec[] = [
  {
    district: 'Quận 1',
    ward: 'Bến Nghé',
    streets: ['Nguyễn Huệ', 'Lê Lợi', 'Đồng Khởi', 'Lê Thánh Tôn', 'Hai Bà Trưng', 'Lê Duẩn'],
    centerLat: 10.7756,
    centerLng: 106.7019,
  },
  {
    district: 'Quận 3',
    ward: 'Võ Thị Sáu',
    streets: ['Nguyễn Thị Minh Khai', 'Võ Văn Tần', 'Nam Kỳ Khởi Nghĩa', 'Pasteur', 'Lê Văn Sỹ'],
    centerLat: 10.7834,
    centerLng: 106.6881,
  },
  {
    district: 'Quận 5',
    ward: 'Phường 7',
    streets: ['Nguyễn Trãi', 'Trần Hưng Đạo', 'An Dương Vương', 'Nguyễn Văn Cừ', 'Hồng Bàng'],
    centerLat: 10.7549,
    centerLng: 106.6664,
  },
  {
    district: 'Quận 7',
    ward: 'Tân Phong',
    streets: ['Nguyễn Thị Thập', 'Nguyễn Hữu Thọ', 'Nguyễn Văn Linh', 'Tôn Dật Tiên', 'Lâm Văn Bền'],
    centerLat: 10.7340,
    centerLng: 106.7155,
  },
  {
    district: 'Quận 10',
    ward: 'Phường 12',
    streets: ['Sư Vạn Hạnh', 'Cách Mạng Tháng 8', 'Ba Tháng Hai', 'Tô Hiến Thành', 'Thành Thái'],
    centerLat: 10.7729,
    centerLng: 106.6675,
  },
  {
    district: 'Quận Bình Thạnh',
    ward: 'Phường 25',
    streets: ['Điện Biên Phủ', 'Xô Viết Nghệ Tĩnh', 'Phan Đăng Lưu', 'Ung Văn Khiêm', 'Nguyễn Gia Trí'],
    centerLat: 10.8012,
    centerLng: 106.7118,
  },
  {
    district: 'Quận Phú Nhuận',
    ward: 'Phường 2',
    streets: ['Phan Xích Long', 'Phan Đình Phùng', 'Nguyễn Văn Trỗi', 'Hoàng Văn Thụ', 'Huỳnh Văn Bánh'],
    centerLat: 10.7985,
    centerLng: 106.6824,
  },
  {
    district: 'Quận Tân Bình',
    ward: 'Phường 4',
    streets: ['Cộng Hòa', 'Trường Chinh', 'Hoàng Hoa Thám', 'Út Tịch', 'Lý Thường Kiệt'],
    centerLat: 10.8015,
    centerLng: 106.6528,
  },
  {
    district: 'Quận Gò Vấp',
    ward: 'Phường 10',
    streets: ['Quang Trung', 'Phan Văn Trị', 'Nguyễn Oanh', 'Lê Đức Thọ', 'Thống Nhất'],
    centerLat: 10.8295,
    centerLng: 106.6745,
  },
  {
    district: 'TP. Thủ Đức',
    ward: 'Linh Chiểu',
    streets: ['Võ Văn Ngân', 'Lê Văn Việt', 'Xa Lộ Hà Nội', 'Phạm Văn Đồng', 'Thảo Điền'],
    centerLat: 10.8492,
    centerLng: 106.7581,
  },
];

export function generateHcmcPoint(
  prng: SeedPrng,
  index: number,
): {
  streetAddress: string;
  ward: string;
  district: string;
  city: string;
  fullAddress: string;
  lat: number;
  lng: number;
} {
  const zone = HCMC_DISTRICTS[index % HCMC_DISTRICTS.length] as HcmcDistrictSpec;
  const street = zone.streets[(index + prng.int(0, 10)) % zone.streets.length] as string;
  const houseNo = ((index * 19 + prng.int(1, 50)) % 650) + 1;
  const lat = Number((zone.centerLat + prng.float(-0.015, 0.015, 6)).toFixed(6));
  const lng = Number((zone.centerLng + prng.float(-0.015, 0.015, 6)).toFixed(6));
  const streetAddress = `${houseNo} ${street}`;
  const city = 'TP. Hồ Chí Minh';
  const fullAddress = `${streetAddress}, ${zone.ward}, ${zone.district}, ${city}`;
  return { streetAddress, ward: zone.ward, district: zone.district, city, fullAddress, lat, lng };
}
