import db from '../db/index.ts';
import type {
  Order,
  Photo,
  StatusLog,
  Photographer,
  PhotographerStats,
  OrderStatus,
  PhotoMark,
  ActivityLog,
  ActivityType,
  DeliveryItem,
  DeliveryItemType,
  DeliveryStatus,
  ProductionStage,
  StageAssignment,
  AssigneeTodo,
} from '../../shared/types';
import { PRODUCTION_STAGE_LABELS } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
    .replace(/\n/g, '<br>');
}

function mapOrder(
  row: any,
  photos: Photo[],
  logs: StatusLog[],
  activities?: ActivityLog[],
  assignments?: Record<ProductionStage, StageAssignment>,
  delivery?: { status: DeliveryStatus; signedAt?: string; signer?: string; items: DeliveryItem[] }
): Order {
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
    remark: row.remark ?? undefined,
    selectionToken: row.selection_token,
    selectionLinkSent: row.selection_link_sent === 1,
    selectionLinkCreatedAt: row.selection_link_created_at,
    selectionLinkExpiresAt: row.selection_link_expires_at,
    photos,
    statusHistory: logs,
    activities: activities || [],
    shipping:
      row.shipping_company && row.shipping_tracking_no
        ? { company: row.shipping_company, trackingNo: row.shipping_tracking_no }
        : undefined,
    satisfaction: row.satisfaction ?? undefined,
    assignments,
    delivery,
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
    remark: row.remark || undefined,
  };
}

function mapDeliveryItem(row: any): DeliveryItem {
  const VALID_TYPES: DeliveryItemType[] = ['final_package', 'album_photo', 'receipt'];
  const rawType = String(row.type || '').trim();
  let type: DeliveryItemType;
  if (VALID_TYPES.includes(rawType as DeliveryItemType)) {
    type = rawType as DeliveryItemType;
  } else if (rawType === 'receipt_proof') {
    type = 'receipt';
  } else {
    type = 'final_package';
  }
  const storedFilename = String(row.url || '').trim();
  const filename = String(row.filename || '未命名文件').trim() || '未命名文件';
  const hasFile = storedFilename.length > 0;
  const url = hasFile
    ? (filename.startsWith('http') ? filename : `/api/uploads/${storedFilename}`)
    : '';
  return {
    id: row.id,
    orderId: row.order_id,
    type,
    filename,
    storedFilename,
    url,
    uploadedBy: String(row.uploaded_by || '系统'),
    uploadedAt: row.uploaded_at,
    note: row.note || undefined,
  };
}

function buildOrderFromRow(row: any): Order {
  const photos = photoRepo.getByOrderId(row.id);
  const logs = statusLogRepo.getByOrderId(row.id);
  const activities = activityLogRepo.getByOrderId(row.id);
  const assignments = stageAssignmentRepo.getByOrderId(row.id);
  const delStatus = deliveryRepo.getStatus(row.id);
  const delItems = deliveryRepo.getItemsByOrderId(row.id);
  const sendLogs = linkSendLogRepo.getByOrderId(row.id);
  const order = mapOrder(row, photos, logs, activities, assignments, {
    ...delStatus,
    items: delItems,
  });
  return {
    ...order,
    linkSendCount: sendLogs.length,
    lastLinkSentAt: sendLogs.length > 0 ? sendLogs[0].sentAt : undefined,
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
    const rows = db.prepare('SELECT * FROM status_logs WHERE order_id = ? ORDER BY timestamp').all(orderId);
    return rows.map(mapStatusLog);
  },
  create(orderId: string, status: OrderStatus, operator?: string, remark?: string): StatusLog {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO status_logs (id, order_id, status, timestamp, operator, remark) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, orderId, status, now, operator ?? null, remark ?? null);
    return { status, timestamp: now, operator, remark: remark || undefined };
  },
};

export const activityLogRepo = {
  getByOrderId(orderId: string): ActivityLog[] {
    const rows = db.prepare(
      'SELECT * FROM activity_logs WHERE order_id = ? ORDER BY timestamp DESC'
    ).all(orderId);
    return rows.map((row: any) => ({
      id: row.id,
      type: row.type as ActivityType,
      timestamp: row.timestamp,
      operator: row.operator,
      content: row.content,
      detail: row.detail_json ? JSON.parse(row.detail_json) : undefined,
    }));
  },
  create(
    orderId: string,
    type: ActivityType,
    content: string,
    operator?: string,
    detail?: any
  ): ActivityLog {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO activity_logs (id, order_id, type, content, detail_json, operator, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, orderId, type, content, detail ? JSON.stringify(detail) : null, operator ?? null, now);
    return { id, type, timestamp: now, operator, content, detail };
  },
};

export const linkSendLogRepo = {
  getByOrderId(orderId: string): { id: string; sentAt: string; method: string; operator?: string }[] {
    const rows = db.prepare(
      'SELECT * FROM link_send_logs WHERE order_id = ? ORDER BY sent_at DESC'
    ).all(orderId);
    return rows.map((row: any) => ({
      id: row.id,
      sentAt: row.sent_at,
      method: row.method,
      operator: row.operator,
    }));
  },
  create(orderId: string, method: string, operator?: string): string {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO link_send_logs (id, order_id, sent_at, method, operator) VALUES (?, ?, ?, ?, ?)'
    ).run(id, orderId, now, method, operator ?? null);
    return now;
  },
  countByOrderId(orderId: string): number {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM link_send_logs WHERE order_id = ?').get(orderId) as {
      cnt: number;
    };
    return row.cnt;
  },
};

export const stageAssignmentRepo = {
  getByOrderId(orderId: string): Record<ProductionStage, StageAssignment> {
    const rows = db
      .prepare('SELECT * FROM stage_assignments WHERE order_id = ?')
      .all(orderId) as any[];
    const result: Record<string, StageAssignment> = {};
    const STAGES: ProductionStage[] = ['retouching', 'layouting', 'producing'];
    for (const s of STAGES) {
      result[s] = { stage: s };
    }
    for (const r of rows) {
      if (r.stage in result) {
        result[r.stage] = {
          stage: r.stage as ProductionStage,
          assignee: r.assignee || undefined,
          dueDate: r.due_date || undefined,
          completedAt: r.completed_at || undefined,
        };
      }
    }
    return result as Record<ProductionStage, StageAssignment>;
  },

  upsert(
    orderId: string,
    stage: ProductionStage,
    data: { assignee?: string; dueDate?: string; completedAt?: string }
  ): boolean {
    const existing = db
      .prepare('SELECT id FROM stage_assignments WHERE order_id = ? AND stage = ?')
      .get(orderId, stage) as { id?: string } | undefined;
    const now = new Date().toISOString();
    if (existing?.id) {
      const result = db
        .prepare(
          'UPDATE stage_assignments SET assignee = ?, due_date = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?'
        )
        .run(
          data.assignee ?? null,
          data.dueDate ?? null,
          data.completedAt ?? null,
          existing.id
        );
      return result.changes > 0;
    } else {
      const id = uuidv4();
      const result = db
        .prepare(
          'INSERT INTO stage_assignments (id, order_id, stage, assignee, due_date, completed_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          id,
          orderId,
          stage,
          data.assignee ?? null,
          data.dueDate ?? null,
          data.completedAt ?? null
        );
      return result.changes > 0;
    }
  },

  markCompleted(orderId: string, stage: ProductionStage): boolean {
    const now = new Date().toISOString();
    const result = db
      .prepare(
        'UPDATE stage_assignments SET completed_at = ? WHERE order_id = ? AND stage = ? AND completed_at IS NULL'
      )
      .run(now, orderId, stage);
    return result.changes > 0;
  },

  listTodos(): AssigneeTodo[] {
    const rows = db
      .prepare(
        `SELECT sa.*, o.order_no, o.customer_name, o.status
         FROM stage_assignments sa
         JOIN orders o ON o.id = sa.order_id
         WHERE sa.completed_at IS NULL
           AND sa.assignee IS NOT NULL
           AND sa.assignee != ''
           AND o.status IN ('retouching', 'layouting', 'producing')
           AND sa.stage = o.status
         ORDER BY COALESCE(sa.due_date, '9999') ASC`
      )
      .all() as any[];
    return rows.map((r) => ({
      assignee: r.assignee,
      stage: r.stage as ProductionStage,
      orderId: r.order_id,
      orderNo: r.order_no,
      customerName: r.customer_name,
      dueDate: r.due_date || undefined,
      overdue: r.due_date && new Date(r.due_date) < new Date(),
      stageLabel: PRODUCTION_STAGE_LABELS[r.stage as ProductionStage] || r.stage,
    }));
  },
};

export const deliveryRepo = {
  getItemsByOrderId(orderId: string): DeliveryItem[] {
    const rows = db
      .prepare('SELECT * FROM delivery_items WHERE order_id = ? ORDER BY uploaded_at DESC')
      .all(orderId);
    return rows.map(mapDeliveryItem);
  },

  getStatus(orderId: string): { status: DeliveryStatus; signedAt?: string; signer?: string } {
    const row = db
      .prepare('SELECT * FROM delivery_status WHERE order_id = ?')
      .get(orderId) as any;
    if (!row) return { status: 'pending' };
    return {
      status: row.status as DeliveryStatus,
      signedAt: row.signed_at || undefined,
      signer: row.signer || undefined,
    };
  },

  addItem(
    orderId: string,
    type: DeliveryItemType,
    filename: string,
    uploadedBy: string,
    note?: string
  ): DeliveryItem {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO delivery_items (id, order_id, type, filename, url, uploaded_by, uploaded_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      orderId,
      type,
      filename,
      filename.startsWith('http') ? filename : `/api/uploads/${filename}`,
      uploadedBy,
      now,
      note ?? null
    );
    activityLogRepo.create(
      orderId,
      'delivery_uploaded',
      `上传交付资料：${filename}`,
      uploadedBy,
      { type, filename }
    );
    return {
      id,
      orderId,
      type,
      filename,
      url: filename.startsWith('http') ? filename : `/api/uploads/${filename}`,
      uploadedBy,
      uploadedAt: now,
      note,
    };
  },

  removeItem(id: string): boolean {
    const result = db.prepare('DELETE FROM delivery_items WHERE id = ?').run(id);
    return result.changes > 0;
  },

  updateStatus(
    orderId: string,
    status: DeliveryStatus,
    operator?: string,
    signer?: string
  ): boolean {
    const now = new Date().toISOString();
    const existing = db
      .prepare('SELECT order_id FROM delivery_status WHERE order_id = ?')
      .get(orderId);
    let result: any;
    if (existing) {
      result = db
        .prepare(
          'UPDATE delivery_status SET status = ?, signed_at = ?, signer = ? WHERE order_id = ?'
        )
        .run(
          status,
          status === 'signed' ? now : null,
          status === 'signed' ? signer ?? null : null,
          orderId
        );
    } else {
      result = db
        .prepare(
          'INSERT INTO delivery_status (order_id, status, signed_at, signer) VALUES (?, ?, ?, ?)'
        )
        .run(
          orderId,
          status,
          status === 'signed' ? now : null,
          status === 'signed' ? signer ?? null : null
        );
    }
    if (result.changes > 0) {
      const STATUS_LABELS: Record<DeliveryStatus, string> = {
        pending: '待交付',
        in_transit: '配送中',
        delivered: '已送达',
        signed: '已签收',
      };
      activityLogRepo.create(
        orderId,
        'delivery_receipt_updated',
        `交付状态更新为「${STATUS_LABELS[status]}」${signer ? ` - 签收人：${signer}` : ''}`,
        operator || '系统',
        { status, signer }
      );
    }
    return result.changes > 0;
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
    return rows.map((row: any) => buildOrderFromRow(row));
  },

  getById(id: string): Order | null {
    const row = db
      .prepare(
        `SELECT o.*, p.name as photographer_name
         FROM orders o LEFT JOIN photographers p ON o.photographer_id = p.id
         WHERE o.id = ?`
      )
      .get(id) as any;
    if (!row) return null;
    return buildOrderFromRow(row);
  },

  getByToken(token: string): Order | null {
    const row = db
      .prepare(
        `SELECT o.*, p.name as photographer_name
         FROM orders o LEFT JOIN photographers p ON o.photographer_id = p.id
         WHERE o.selection_token = ?`
      )
      .get(token) as any;
    if (!row) return null;
    return buildOrderFromRow(row);
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
    const orderNo = `HS${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(
      Math.floor(Math.random() * 900) + 100
    )}`;
    const token = `sel-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO orders (
        id, order_no, customer_name, customer_phone, photographer_id,
        shoot_date, package_name, album_count, retouch_count, status,
        selection_token, selection_link_created_at, selection_link_expires_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      orderNo,
      data.customerName,
      data.customerPhone,
      data.photographerId,
      data.shootDate,
      data.packageName,
      data.albumCount,
      data.retouchCount,
      'pending_selection',
      token,
      now,
      expiresAt,
      now,
      now
    );
    statusLogRepo.create(id, 'pending_selection', '系统', '订单创建');
    activityLogRepo.create(id, 'status_change', '订单创建，状态变更为「待选片」', '系统', {
      to: '待选片',
    });
    return this.getById(id)!;
  },

  updateStatus(id: string, status: OrderStatus, operator?: string, remark?: string): boolean {
    const now = new Date().toISOString();
    const result = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
    if (result.changes > 0) {
      statusLogRepo.create(id, status, operator, remark);
      const labelMap: Record<OrderStatus, string> = {
        pending_selection: '待选片',
        selecting: '选片中',
        selected: '已选片',
        retouching: '精修中',
        layouting: '排版中',
        producing: '相册制作中',
        shipping: '物流中',
        completed: '已完成',
      };
      activityLogRepo.create(
        id,
        'status_change',
        `状态变更为「${labelMap[status]}」${remark ? ` - ${remark}` : ''}`,
        operator,
        { to: labelMap[status], remark }
      );
      const PREV_STAGE: Partial<Record<OrderStatus, ProductionStage>> = {
        layouting: 'retouching',
        producing: 'layouting',
        shipping: 'producing',
      };
      if (status in PREV_STAGE && PREV_STAGE[status as OrderStatus]) {
        stageAssignmentRepo.markCompleted(id, PREV_STAGE[status as OrderStatus]!);
      }
      if (status === 'shipping') {
        deliveryRepo.updateStatus(id, 'in_transit', operator);
      }
      if (status === 'completed') {
        deliveryRepo.updateStatus(id, 'delivered', operator);
      }
    }
    return result.changes > 0;
  },

  updateRemark(id: string, remark: string, operator?: string): boolean {
    const now = new Date().toISOString();
    const cleaned = remark.trim();
    const result = db
      .prepare('UPDATE orders SET remark = ?, updated_at = ? WHERE id = ?')
      .run(cleaned || null, now, id);
    if (result.changes > 0) {
      activityLogRepo.create(
        id,
        'remark_updated',
        cleaned ? `更新备注：${cleaned}` : '清空订单备注',
        operator || '系统',
        { remark: cleaned }
      );
    }
    return result.changes > 0;
  },

  updateShipping(id: string, company: string, trackingNo: string): boolean {
    const now = new Date().toISOString();
    const result = db
      .prepare('UPDATE orders SET shipping_company = ?, shipping_tracking_no = ?, updated_at = ? WHERE id = ?')
      .run(company, trackingNo, now, id);
    if (result.changes > 0) {
      activityLogRepo.create(
        id,
        'shipping_updated',
        `物流信息已录入：${company} ${trackingNo}`,
        '客服',
        { company, trackingNo }
      );
    }
    return result.changes > 0;
  },

  updateSatisfaction(id: string, score: number): boolean {
    const now = new Date().toISOString();
    const result = db.prepare('UPDATE orders SET satisfaction = ?, updated_at = ? WHERE id = ?').run(score, now, id);
    if (result.changes > 0) {
      activityLogRepo.create(id, 'satisfaction_updated', `客户满意度评分：${score}星`, '系统', {
        satisfaction: score,
      });
    }
    return result.changes > 0;
  },

  updateSelectionLinkSent(id: string, sent: boolean, method: string = '微信', operator: string = '客服'): boolean {
    const now = new Date().toISOString();
    const result = db
      .prepare('UPDATE orders SET selection_link_sent = ?, updated_at = ? WHERE id = ?')
      .run(sent ? 1 : 0, now, id);
    if (result.changes > 0 && sent) {
      linkSendLogRepo.create(id, method, operator);
      activityLogRepo.create(id, 'link_sent', `选片链接已通过${method}发送给客户`, operator, {
        method,
      });
    }
    return result.changes > 0;
  },

  regenerateSelectionLink(id: string): Order | null {
    const order = this.getById(id);
    if (!order) return null;
    const newToken = `sel-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      'UPDATE orders SET selection_token = ?, selection_link_created_at = ?, selection_link_expires_at = ?, selection_link_sent = 0, updated_at = ? WHERE id = ?'
    ).run(newToken, now, expiresAt, now, id);
    activityLogRepo.create(id, 'link_regenerated', '选片链接已重新生成，有效期15天', '客服', {
      oldToken: order.selectionToken,
      newToken,
    });
    return this.getById(id);
  },

  isLinkExpired(expiresAt: string | undefined): boolean {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  },
};

export const statsRepo = {
  getPhotographerStats(month?: string): PhotographerStats[] {
    let dateFilter = '';
    let satDateFilter = '';
    const params: any[] = [];
    if (month) {
      dateFilter = " AND strftime('%Y-%m', o.created_at) = ?";
      satDateFilter = " AND strftime('%Y-%m', created_at) = ?";
      params.push(month);
    }
    const photographers = photographerRepo.listAll();
    return photographers
      .map((p) => {
        const orderRow = db
          .prepare(
            `SELECT
              COUNT(DISTINCT o.id) as order_count,
              COALESCE(SUM(CASE WHEN ph.mark = 'album' THEN 1 ELSE 0 END), 0) as total_photos,
              COALESCE(SUM(CASE WHEN ph.mark = 'retouch' THEN 1 ELSE 0 END), 0) as retouch_photos
            FROM orders o
            LEFT JOIN photos ph ON ph.order_id = o.id
            WHERE o.photographer_id = ? ${dateFilter}`
          )
          .get(p.id, ...params) as any;
        let satParams: any[] = [p.id];
        if (month) satParams.push(month);
        const satRow = db
          .prepare(
            `SELECT AVG(satisfaction) as avg_sat, COUNT(*) as rated_count
             FROM orders
             WHERE photographer_id = ? AND status = 'completed' AND satisfaction IS NOT NULL ${satDateFilter}`
          )
          .get(...satParams) as any;
        return {
          photographerId: p.id,
          photographerName: p.name,
          totalPhotos: orderRow?.total_photos ?? 0,
          retouchPhotos: orderRow?.retouch_photos ?? 0,
          avgSatisfaction: Math.round((satRow?.avg_sat ?? 0) * 10) / 10,
          orderCount: orderRow?.order_count ?? 0,
          ratedOrderCount: satRow?.rated_count ?? 0,
        };
      })
      .sort((a, b) => b.totalPhotos - a.totalPhotos);
  },
};
