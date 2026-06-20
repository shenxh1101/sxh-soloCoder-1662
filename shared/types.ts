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

export type ActivityType =
  | 'status_change'
  | 'link_sent'
  | 'link_regenerated'
  | 'selection_submitted'
  | 'shipping_updated'
  | 'satisfaction_updated'
  | 'remark_updated'
  | 'delivery_uploaded'
  | 'delivery_receipt_updated'
  | 'assignee_updated';

export type DeliveryItemType = 'final_package' | 'album_photo' | 'receipt';

export interface DeliveryItem {
  id: string;
  orderId: string;
  type: DeliveryItemType;
  filename: string;
  storedFilename: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  note?: string;
}

export type DeliveryStatus = 'pending' | 'in_transit' | 'delivered' | 'signed';

export interface DeliveryInfo {
  status: DeliveryStatus;
  signedAt?: string;
  signer?: string;
  items: DeliveryItem[];
}

export type ProductionStage = 'retouching' | 'layouting' | 'producing';

export interface StageAssignment {
  stage: ProductionStage;
  assignee?: string;
  dueDate?: string;
  completedAt?: string;
}

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

export interface ActivityLog {
  id: string;
  type: ActivityType;
  timestamp: string;
  operator?: string;
  content?: string;
  detail?: any;
}

export interface LinkSendLog {
  id: string;
  sentAt: string;
  method: string;
  operator?: string;
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
  remark?: string;
  selectionToken: string;
  selectionLinkSent?: boolean;
  selectionLinkCreatedAt?: string;
  selectionLinkExpiresAt?: string;
  linkSendCount?: number;
  lastLinkSentAt?: string;
  photos: Photo[];
  statusHistory: StatusLog[];
  activities?: ActivityLog[];
  shipping?: ShippingInfo;
  satisfaction?: number;
  assignments?: Record<ProductionStage, StageAssignment>;
  delivery?: DeliveryInfo;
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
  ratedOrderCount: number;
}

export interface AssigneeTodo {
  assignee: string;
  stage: ProductionStage;
  orderId: string;
  orderNo: string;
  customerName: string;
  dueDate?: string;
  overdue: boolean;
  stageLabel: string;
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

export const DELIVERY_ITEM_TYPE_LABELS: Record<DeliveryItemType, string> = {
  final_package: '成片数据包',
  album_photo: '相册交付照',
  receipt: '签收凭证',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: '待交付',
  in_transit: '配送中',
  delivered: '已送达',
  signed: '已签收',
};

export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  retouching: '精修',
  layouting: '排版',
  producing: '相册制作',
};
