export type OrderStatus =
  | 'pending_selection'
  | 'selecting'
  | 'selected'
  | 'retouching'
  | 'layouting'
  | 'producing'
  | 'shipping'
  | 'completed';

export type PhotoMark = 'album' | 'retouch' | 'none';

export interface Photographer {
  id: string;
  name: string;
}

export interface Customer {
  name: string;
  phone: string;
}

export interface PackageInfo {
  name: string;
  albumCount: number;
  retouchCount: number;
}

export interface Photo {
  id: string;
  orderId: string;
  filename: string;
  url: string;
  mark: PhotoMark | null;
  remark: string | null;
  uploadedAt: string;
}

export interface StatusLog {
  status: OrderStatus;
  timestamp: string;
  operator?: string;
  remark?: string;
}

export interface ShippingInfo {
  company: string;
  trackingNo: string;
}

export interface Order {
  id: string;
  orderNo: string;
  customer: Customer;
  photographerId: string;
  photographerName?: string;
  shootDate: string;
  packageInfo: PackageInfo;
  status: OrderStatus;
  selectionToken: string;
  photos: Photo[];
  statusHistory: StatusLog[];
  shipping?: ShippingInfo;
  satisfaction?: number;
  selectionLinkSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhotographerStats {
  photographerId: string;
  photographerName: string;
  totalPhotos: number;
  retouchPhotos: number;
  avgSatisfaction: number;
  orderCount: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_selection: '待选片',
  selecting: '选片中',
  selected: '已选片',
  retouching: '精修中',
  layouting: '排版中',
  producing: '相册制作中',
  shipping: '物流中',
  completed: '已完成',
};

export const ORDER_STATUS_STEP: Record<OrderStatus, number> = {
  pending_selection: 0,
  selecting: 0,
  selected: 0,
  retouching: 1,
  layouting: 2,
  producing: 3,
  shipping: 4,
  completed: 5,
};

export const PRODUCTION_STATUSES: OrderStatus[] = [
  'retouching',
  'layouting',
  'producing',
  'shipping',
  'completed',
];

export const PHOTO_MARK_LABELS: Record<PhotoMark, string> = {
  album: '入册',
  retouch: '精修',
  none: '不选',
};
