import type {
  Order,
  OrderStatus,
  Photographer,
  PhotographerStats,
  PhotoMark,
} from '@shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getPhotographers: () => request<Photographer[]>('/photographers'),

  getOrders: (filters?: { status?: OrderStatus; photographerId?: string; keyword?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.photographerId) params.set('photographerId', filters.photographerId);
    if (filters?.keyword) params.set('keyword', filters.keyword);
    const qs = params.toString();
    return request<Order[]>(`/orders${qs ? `?${qs}` : ''}`);
  },

  getOrder: (id: string) => request<Order>(`/orders/${id}`),

  createOrder: (data: {
    customerName: string;
    customerPhone: string;
    photographerId: string;
    shootDate: string;
    packageName: string;
    albumCount: number;
    retouchCount: number;
  }) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadPhotos: (orderId: string, files: File[], onProgress?: (done: number, total: number) => void) => {
    return new Promise<Order>((resolve, reject) => {
      const formData = new FormData();
      files.forEach((f) => formData.append('photos', f));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/orders/${orderId}/photos`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          api.getOrder(orderId).then(resolve).catch(reject);
        } else {
          reject(new Error('上传失败'));
        }
      };
      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.send(formData);
    });
  },

  deletePhoto: (orderId: string, photoId: string) =>
    request(`/orders/${orderId}/photos/${photoId}`, { method: 'DELETE' }),

  getSelectionLink: (orderId: string) =>
    request<{ token: string; link: string }>(`/orders/${orderId}/selection-link`),

  getSelection: (token: string) => request<Order>(`/selection/${token}`),

  submitSelection: (
    token: string,
    selections: { id: string; mark: PhotoMark; remark?: string }[]
  ) =>
    request<Order>(`/selection/${token}`, {
      method: 'POST',
      body: JSON.stringify({ selections }),
    }),

  updateOrderStatus: (
    id: string,
    data: {
      status: OrderStatus;
      operator?: string;
      remark?: string;
      shipping?: { company: string; trackingNo: string };
      satisfaction?: number;
    }
  ) =>
    request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  markSelectionLinkSent: (id: string, sent: boolean) =>
    request<Order>(`/orders/${id}/selection-link-sent`, {
      method: 'PATCH',
      body: JSON.stringify({ sent }),
    }),

  queryOrders: (keyword: string) => request<Order[]>(`/query?keyword=${encodeURIComponent(keyword)}`),

  getStatistics: (month?: string) =>
    request<PhotographerStats[]>(`/statistics${month ? `?month=${month}` : ''}`),
};
