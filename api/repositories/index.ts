import db from '../db/index.ts';
import type { Order, Photo, StatusLog, Photographer, PhotographerStats, OrderStatus, PhotoMark } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

function mapOrder(row: any, photos: Photo[], logs: StatusLog[]): Order {
  return {
    id: row.id,
    orderNo: row.order_no,
    customer: { name: row.customer_name, phone: row.customer_phone },
    photographerId: row.photographer_id,
    photographerName: row.photographer_name,
    shootDate: row.shoot_date,
    packageInfo: {
      name: row.package_name,
      albumCount: row.album_count,
      retouchCount: row.retouch_count,
    },
    status: row.status,
    selectionToken: row.selection_token,
    photos,
    statusHistory: logs,
    shipping: row.shipping_company && row.shipping_tracking_no
      ? { company: row.shipping_company, trackingNo: row.shipping_tracking_no }
      : undefined,
    satisfaction: row.satisfaction ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPhoto(row: any): Photo {
  return {
    id: row.id,
    orderId: row.order_id,
    filename: row.filename,
    url: row.filename.startsWith('http') ? row.filename : `/api/photos/${row.filename}`,
    mark: row.mark as PhotoMark | null,
    remark: row.remark,
    uploadedAt: row.uploaded_at,
  };
}

function mapStatusLog(row: any): StatusLog {
  return {
    status: row.status,
    timestamp: row.timestamp,
    operator: row.operator,
  };
}

export const photographerRepo = {
  listAll(): Photographer[] {
    const rows = db.prepare('SELECT id, name FROM photographers ORDER BY name').all();
    return rows as Photographer[];
  },

  getById(id: string): Photographer | null {
    const row = db.prepare('SELECT id, name FROM photographers WHERE id = ?').get(id);
    return row ? (row as Photographer) : null;
  },
};

export const photoRepo = {
  getByOrderId(orderId: string): Photo[] {
    const rows = db.prepare('SELECT * FROM photos WHERE order_id = ? ORDER BY uploaded_at').all(orderId);
    return rows.map(mapPhoto);
  },

  create(orderId: string, filename: string): Photo {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO photos (id, order_id, filename, mark, remark, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, orderId, filename, null, null, now);
    return {
      id,
      orderId,
      filename,
      url: filename.startsWith('http') ? filename : `/api/photos/${filename}`,
      mark: null,
      remark: null,
      uploadedAt: now,
    };
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM photos WHERE id = ?').run(id);
    return result.changes > 0;
  },

  updateMark(id: string, mark: PhotoMark | null, remark: string | null): boolean {
    const result = db.prepare('UPDATE photos SET mark = ?, remark = ? WHERE id = ?').run(mark, remark, id);
    return result.changes > 0;
  },
};

export const statusLogRepo = {
  getByOrderId(orderId: string): StatusLog[] {
    const rows = db.prepare(
      'SELECT * FROM status_logs WHERE order_id = ? ORDER BY timestamp'
    ).all(orderId);
    return rows.map(mapStatusLog);
  },

  create(orderId: string, status: OrderStatus, operator?: string): StatusLog {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO status_logs (id, order_id, status, timestamp, operator) VALUES (?, ?, ?, ?, ?)'
    ).run(id, orderId, status, now, operator ?? null);
    return { status, timestamp: now, operator };
  },
};

export const orderRepo = {
  listAll(filters?: { status?: OrderStatus; photographerId?: string; keyword?: string }): Order[] {
    let sql = `
      SELECT o.*, p.name as photographer_name
      FROM orders o
      LEFT JOIN photographers p ON o.photographer_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND o.status = ?';
      params.push(filters.status);
    }
    if (filters?.photographerId) {
      sql += ' AND o.photographer_id = ?';
      params.push(filters.photographerId);
    }
    if (filters?.keyword) {
      sql += ' AND (o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.order_no LIKE ?)';
      const kw = `%${filters.keyword}%`;
      params.push(kw, kw, kw);
    }

    sql += ' ORDER BY o.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    return rows.map((row: any) => {
      const photos = photoRepo.getByOrderId(row.id);
      const logs = statusLogRepo.getByOrderId(row.id);
      return mapOrder(row, photos, logs);
    });
  },

  getById(id: string): Order | null {
    const row = db.prepare(`
      SELECT o.*, p.name as photographer_name
      FROM orders o
      LEFT JOIN photographers p ON o.photographer_id = p.id
      WHERE o.id = ?
    `).get(id);
    if (!row) return null;
    const photos = photoRepo.getByOrderId(row.id);
    const logs = statusLogRepo.getByOrderId(row.id);
    return mapOrder(row, photos, logs);
  },

  getByToken(token: string): Order | null {
    const row = db.prepare(`
      SELECT o.*, p.name as photographer_name
      FROM orders o
      LEFT JOIN photographers p ON o.photographer_id = p.id
      WHERE o.selection_token = ?
    `).get(token);
    if (!row) return null;
    const photos = photoRepo.getByOrderId(row.id);
    const logs = statusLogRepo.getByOrderId(row.id);
    return mapOrder(row, photos, logs);
  },

  create(data: {
    customerName: string;
    customerPhone: string;
    photographerId: string;
    shootDate: string;
    packageName: string;
    albumCount: number;
    retouchCount: number;
  }): Order {
    const id = uuidv4();
    const orderNo = `HS${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 900) + 100)}`;
    const token = `sel-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO orders (
        id, order_no, customer_name, customer_phone, photographer_id,
        shoot_date, package_name, album_count, retouch_count, status,
        selection_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, orderNo, data.customerName, data.customerPhone, data.photographerId,
      data.shootDate, data.packageName, data.albumCount, data.retouchCount,
      'pending_selection', token, now, now
    );

    statusLogRepo.create(id, 'pending_selection', '系统');

    return this.getById(id)!;
  },

  updateStatus(id: string, status: OrderStatus, operator?: string): boolean {
    const now = new Date().toISOString();
    const result = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
    if (result.changes > 0) {
      statusLogRepo.create(id, status, operator);
    }
    return result.changes > 0;
  },

  updateShipping(id: string, company: string, trackingNo: string): boolean {
    const now = new Date().toISOString();
    const result = db.prepare(
      'UPDATE orders SET shipping_company = ?, shipping_tracking_no = ?, updated_at = ? WHERE id = ?'
    ).run(company, trackingNo, now, id);
    return result.changes > 0;
  },

  updateSatisfaction(id: string, score: number): boolean {
    const now = new Date().toISOString();
    const result = db.prepare(
      'UPDATE orders SET satisfaction = ?, updated_at = ? WHERE id = ?'
    ).run(score, now, id);
    return result.changes > 0;
  },
};

export const statsRepo = {
  getPhotographerStats(month?: string): PhotographerStats[] {
    let dateFilter = '';
    const params: any[] = [];

    if (month) {
      dateFilter = " AND strftime('%Y-%m', o.created_at) = ?";
      params.push(month);
    }

    const sql = `
      SELECT
        p.id as photographer_id,
        p.name as photographer_name,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(CASE WHEN ph.mark = 'album' THEN 1 ELSE 0 END), 0) as total_photos,
        COALESCE(SUM(CASE WHEN ph.mark IN ('album', 'retouch') THEN 1 ELSE 0 END), 0) as retouch_photos,
        COALESCE(AVG(o.satisfaction), 0) as avg_satisfaction
      FROM photographers p
      LEFT JOIN orders o ON o.photographer_id = p.id ${dateFilter}
      LEFT JOIN photos ph ON ph.order_id = o.id
      GROUP BY p.id, p.name
      ORDER BY total_photos DESC
    `;

    const rows = db.prepare(sql).all(...params);
    return rows.map((row: any) => ({
      photographerId: row.photographer_id,
      photographerName: row.photographer_name,
      totalPhotos: row.total_photos ?? 0,
      retouchPhotos: row.retouch_photos ?? 0,
      avgSatisfaction: Math.round((row.avg_satisfaction ?? 0) * 10) / 10,
      orderCount: row.order_count ?? 0,
    }));
  },
};
