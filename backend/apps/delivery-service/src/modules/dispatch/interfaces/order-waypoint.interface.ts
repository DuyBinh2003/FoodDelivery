import { WaypointType } from '@/modules/dispatch/enums/waypoint-type.enum.js';

export interface OrderWaypoint {
  orderId: string;
  type: WaypointType;
  sequence: number; // 0, 1, 2, 3
  locationName: string;
  address: string;
  lat: number;
  lng: number;
  isCompleted: boolean;
  completedAt?: string | null;
}

export interface OrderLocationInfo {
  orderId: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
}
