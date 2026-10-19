/**
 * @file street-routing.test.ts
 * @description Unit tests for OSRM street routing, step maneuvers translation, waypoint interpolation and graceful fallback.
 * @traceability
 * - Plan: docs/plans/driver/street-routing-turn-by-turn-map.md
 * - Features: docs/features/driver/realtime-gps-tracking.md
 * - Target: frontend/src/features/orders/utils/geo-map.utils.ts & frontend/src/app/api/routing/route.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceKm,
  calculateEtaMinutes,
  calculateBearing,
  interpolateGpsRoute,
  findCurrentStep,
  buildStreetSimulationWaypoints,
  translateManeuver,
  type StreetRouteStep,
} from '../utils/geo-map.utils.ts';

describe('OSRM Street Routing & Navigation Suite', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Chuyển đổi maneuver sang câu chỉ dẫn tiếng Việt tự nhiên và chính xác', () => {
      assert.strictEqual(
        translateManeuver('depart', undefined, 'Nguyễn Huệ'),
        'Xuất phát trên đường Nguyễn Huệ',
      );
      assert.strictEqual(
        translateManeuver('turn', 'right', 'Lê Lợi'),
        'Rẽ phải vào đường Lê Lợi',
      );
      assert.strictEqual(
        translateManeuver('turn', 'left', 'Pasteur'),
        'Rẽ trái vào đường Pasteur',
      );
      assert.strictEqual(
        translateManeuver('turn', 'slight right', 'Nam Kỳ Khởi Nghĩa'),
        'Chếch sang phải vào đường Nam Kỳ Khởi Nghĩa',
      );
      assert.strictEqual(
        translateManeuver('turn', 'sharp left', 'Hàm Nghi'),
        'Rẽ ngoặt sang trái vào đường Hàm Nghi',
      );
      assert.strictEqual(translateManeuver('turn', 'uturn'), 'Quay đầu xe');
      assert.strictEqual(translateManeuver('arrive'), 'Đến điểm giao hàng');
      assert.strictEqual(
        translateManeuver('roundabout', undefined, 'Quách Thị Trang'),
        'Vào vòng xuyến, đi theo lối ra vào đường Quách Thị Trang',
      );
    });

    it('2. Tính góc xoay la bàn (bearing) chính xác theo các hướng chính', () => {
      // Hướng Bắc (North ~ 0 độ)
      const north = calculateBearing(10.0, 106.0, 10.1, 106.0);
      assert.ok(Math.round(north) === 0 || Math.round(north) === 360);

      // Hướng Đông (East ~ 90 độ)
      const east = calculateBearing(10.0, 106.0, 10.0, 106.1);
      assert.strictEqual(Math.round(east), 90);

      // Hướng Nam (South ~ 180 độ)
      const south = calculateBearing(10.1, 106.0, 10.0, 106.0);
      assert.strictEqual(Math.round(south), 180);
    });

    it('3. Sinh danh sách các waypoints mô phỏng bám sát phố kèm heading và percent', () => {
      const coords: [number, number][] = [
        [10.7725, 106.7027],
        [10.774, 106.7035],
        [10.7765, 106.701],
      ];

      const waypoints = buildStreetSimulationWaypoints(coords);
      assert.ok(waypoints.length >= 3, 'Waypoints must have at least 3 points');
      assert.strictEqual(waypoints[0].percent, 0);
      assert.strictEqual(waypoints[waypoints.length - 1].percent, 100);

      assert.ok(Math.abs(waypoints[0].lat - 10.7725) < 0.001);
      assert.ok(Math.abs(waypoints[waypoints.length - 1].lat - 10.7765) < 0.001);
    });

    it('4. Xác định đúng bước chỉ đường hiện tại (currentStep) và kế tiếp (nextStep)', () => {
      const steps: StreetRouteStep[] = [
        {
          instruction: 'Xuất phát từ Quán',
          distance_meters: 100,
          duration_seconds: 20,
          type: 'depart',
          name: 'Đường A',
          location: [10.772, 106.702],
        },
        {
          instruction: 'Rẽ phải vào Lê Lợi',
          distance_meters: 300,
          duration_seconds: 45,
          type: 'turn',
          modifier: 'right',
          name: 'Lê Lợi',
          location: [10.774, 106.703],
        },
        {
          instruction: 'Đến nơi giao hàng',
          distance_meters: 0,
          duration_seconds: 0,
          type: 'arrive',
          name: 'Điểm giao',
          location: [10.776, 106.701],
        },
      ];

      const current = findCurrentStep(10.7739, 106.7031, steps);
      assert.strictEqual(current.currentStep?.name, 'Lê Lợi');
      assert.strictEqual(current.nextStep?.type, 'arrive');
      assert.strictEqual(current.stepIndex, 1);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (GIÁ TRỊ BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Xử lý tọa độ trùng nhau: cự ly = 0, ETA = 1, waypoints an toàn', () => {
      const dist = calculateDistanceKm(10.772, 106.702, 10.772, 106.702);
      assert.strictEqual(dist, 0);

      const eta = calculateEtaMinutes(0);
      assert.strictEqual(eta, 1);

      const waypoints = buildStreetSimulationWaypoints([[10.772, 106.702]]);
      assert.strictEqual(waypoints.length, 1);
      assert.strictEqual(waypoints[0].percent, 100);
    });

    it('2. Mảng bước chỉ đường rỗng hoặc chỉ có 1 bước', () => {
      const empty = findCurrentStep(10.772, 106.702, []);
      assert.strictEqual(empty.currentStep, null);
      assert.strictEqual(empty.nextStep, null);
      assert.strictEqual(empty.stepIndex, -1);

      const singleStep: StreetRouteStep = {
        instruction: 'Đến điểm giao hàng',
        distance_meters: 0,
        duration_seconds: 0,
        type: 'arrive',
        name: 'Điểm giao',
        location: [10.776, 106.701],
      };
      const single = findCurrentStep(10.776, 106.701, [singleStep]);
      assert.strictEqual(single.currentStep?.type, 'arrive');
      assert.strictEqual(single.nextStep, null);
      assert.strictEqual(single.stepIndex, 0);
    });

    it('3. Khi steps nội suy đường thẳng <= 0 -> trả về 1 điểm an toàn', () => {
      const waypoints = interpolateGpsRoute(10.772, 106.702, 10.776, 106.701, 0);
      assert.strictEqual(waypoints.length, 1);
      assert.strictEqual(waypoints[0].lat, 10.772);
    });

    it('4. Dịch các thao tác rẽ không có tên đường hoặc loại không xác định', () => {
      assert.strictEqual(translateManeuver('turn', 'left', ''), 'Rẽ trái vào đường tiếp theo');
      assert.strictEqual(translateManeuver('turn', undefined, ''), 'Rẽ vào ngã rẽ tiếp theo');
      assert.strictEqual(translateManeuver('unknown_action', undefined, ''), 'Tiếp tục di chuyển');
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error / Rejection Flow', () => {
    it('1. Tọa độ đầu vào là null hoặc undefined -> cự ly trả về 0 an toàn', () => {
      assert.strictEqual(calculateDistanceKm(null, 106.7, 10.7, 106.7), 0);
      assert.strictEqual(calculateDistanceKm(undefined, undefined, 10.7, 106.7), 0);
    });

    it('2. Tọa độ đầu vào là NaN -> cự ly trả về 0 an toàn không hỏng app', () => {
      assert.strictEqual(calculateDistanceKm(NaN, 106.7, 10.7, 106.7), 0);
    });

    it('3. Sinh waypoints từ chuỗi tọa độ rỗng [] -> trả về mảng rỗng an toàn', () => {
      const waypoints = buildStreetSimulationWaypoints([]);
      assert.deepStrictEqual(waypoints, []);
    });
  });
});
