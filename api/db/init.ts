import db from './index.ts';
import { v4 as uuidv4 } from 'uuid';

const now = () => new Date().toISOString();

function columnExists(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

function tableExists(table: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(table) as { name?: string } | undefined;
  return !!row?.name;
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS photographers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_no TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        photographer_id TEXT NOT NULL,
        shoot_date TEXT NOT NULL,
        package_name TEXT NOT NULL,
        album_count INTEGER NOT NULL DEFAULT 0,
        retouch_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending_selection',
        selection_token TEXT NOT NULL UNIQUE,
        selection_link_created_at TEXT,
        selection_link_expires_at TEXT,
        shipping_company TEXT,
        shipping_tracking_no TEXT,
        satisfaction INTEGER,
        selection_link_sent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (photographer_id) REFERENCES photographers(id)
    );

    CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        mark TEXT,
        remark TEXT,
        uploaded_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS status_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        operator TEXT,
        remark TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        detail_json TEXT,
        operator TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS link_send_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        method TEXT NOT NULL,
        operator TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS delivery_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        type TEXT NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        note TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS stage_assignments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        assignee TEXT,
        due_date TEXT,
        completed_at TEXT,
        UNIQUE(order_id, stage),
        FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS delivery_status (
        order_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        signed_at TEXT,
        signer TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_photographer ON orders(photographer_id);
    CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(order_id);
    CREATE INDEX IF NOT EXISTS idx_status_logs_order ON status_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_order ON activity_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_link_send_logs_order ON link_send_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(selection_token);
    CREATE INDEX IF NOT EXISTS idx_delivery_items_order ON delivery_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_stage_assignments_order ON stage_assignments(order_id);
    CREATE INDEX IF NOT EXISTS idx_stage_assignments_assignee ON stage_assignments(assignee);
  `);

  runMigrations();

  const photographerCount = db.prepare('SELECT COUNT(*) as cnt FROM photographers').get() as { cnt: number };
  if (photographerCount.cnt === 0) {
    const insertPhotographer = db.prepare('INSERT INTO photographers (id, name) VALUES (?, ?)');
    insertPhotographer.run('p1', '李明辉');
    insertPhotographer.run('p2', '王小雅');
    insertPhotographer.run('p3', '张艺凡');
  }

  seedMockData();
}

function runMigrations() {
  if (!columnExists('orders', 'selection_link_created_at')) {
    db.exec('ALTER TABLE orders ADD COLUMN selection_link_created_at TEXT');
  }
  if (!columnExists('orders', 'selection_link_expires_at')) {
    db.exec('ALTER TABLE orders ADD COLUMN selection_link_expires_at TEXT');
  }
  if (!columnExists('orders', 'remark')) {
    db.exec('ALTER TABLE orders ADD COLUMN remark TEXT');
  }

  const ordersWithoutLink = db
    .prepare('SELECT id, created_at FROM orders WHERE selection_link_created_at IS NULL')
    .all() as { id: string; created_at: string }[];
  for (const o of ordersWithoutLink) {
    const created = new Date(o.created_at || Date.now());
    const expires = new Date(created.getTime() + 15 * 24 * 60 * 60 * 1000);
    db.prepare(
      'UPDATE orders SET selection_link_created_at=?, selection_link_expires_at=? WHERE id=?'
    ).run(created.toISOString(), expires.toISOString(), o.id);
  }

  if (!tableExists('activity_logs')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        detail_json TEXT,
        operator TEXT,
        timestamp TEXT NOT NULL
      )
    `);
    const statusLogs = db
      .prepare('SELECT order_id, status, timestamp, operator, remark FROM status_logs ORDER BY timestamp')
      .all() as { order_id: string; status: string; timestamp: string; operator?: string; remark?: string }[];
    const LABELS: Record<string, string> = {
      pending_selection: '待选片',
      selecting: '选片中',
      selected: '已选片',
      retouching: '精修中',
      layouting: '排版中',
      producing: '相册制作中',
      shipping: '物流中',
      completed: '已完成',
    };
    const insAct = db.prepare(
      'INSERT INTO activity_logs (id, order_id, type, content, detail_json, operator, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const sl of statusLogs) {
      insAct.run(
        uuidv4(),
        sl.order_id,
        'status_change',
        `状态变更为「${LABELS[sl.status] || sl.status}」`,
        JSON.stringify({ remark: sl.remark || '' }),
        sl.operator || '系统',
        sl.timestamp
      );
    }
  }

  if (!tableExists('link_send_logs')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS link_send_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        method TEXT NOT NULL,
        operator TEXT
      )
    `);
    const sentOrders = db
      .prepare("SELECT id, updated_at FROM orders WHERE selection_link_sent = 1")
      .all() as { id: string; updated_at: string }[];
    const insLog = db.prepare(
      'INSERT INTO link_send_logs (id, order_id, sent_at, method, operator) VALUES (?, ?, ?, ?, ?)'
    );
    const insAct = db.prepare(
      'INSERT INTO activity_logs (id, order_id, type, content, detail_json, operator, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const o of sentOrders) {
      const ts = o.updated_at || new Date().toISOString();
      insLog.run(uuidv4(), o.id, ts, '微信', '系统');
      const exists = db
        .prepare("SELECT COUNT(*) as cnt FROM activity_logs WHERE order_id=? AND type='link_sent'")
        .get(o.id) as { cnt: number };
      if (exists.cnt === 0) {
        insAct.run(
          uuidv4(),
          o.id,
          'link_sent',
          '选片链接已通过微信发送给客户',
          JSON.stringify({ method: '微信' }),
          '系统',
          ts
        );
      }
    }
  }

  if (!tableExists('delivery_items')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        type TEXT NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        note TEXT
      )
    `);
  }

  if (!tableExists('stage_assignments')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stage_assignments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        assignee TEXT,
        due_date TEXT,
        completed_at TEXT,
        UNIQUE(order_id, stage)
      )
    `);
  }

  if (!tableExists('delivery_status')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS delivery_status (
        order_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        signed_at TEXT,
        signer TEXT
      )
    `);
  }

  if (!columnExists('photos', 'mark')) {
    db.exec('ALTER TABLE photos ADD COLUMN mark TEXT');
  }
  if (!columnExists('photos', 'remark')) {
    db.exec('ALTER TABLE photos ADD COLUMN remark TEXT');
  }
}

function seedMockData() {
  const orderCount = db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number };
  if (orderCount.cnt > 0) return;

  const samplePhotos = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=800',
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
    'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800',
    'https://images.unsplash.com/photo-1594478547998-46e6eebcfa45?w=800',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800',
  ];

  const mockDeliveries = [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
    'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600',
  ];

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_no, customer_name, customer_phone, photographer_id,
      shoot_date, package_name, album_count, retouch_count, status,
      selection_token, selection_link_created_at, selection_link_expires_at,
      satisfaction, selection_link_sent, created_at, updated_at, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPhoto = db.prepare(`
    INSERT INTO photos (id, order_id, filename, mark, remark, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertStatusLog = db.prepare(`
    INSERT INTO status_logs (id, order_id, status, timestamp, operator, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activity_logs (id, order_id, type, content, detail_json, operator, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLinkSendLog = db.prepare(`
    INSERT INTO link_send_logs (id, order_id, sent_at, method, operator)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertStageAssignment = db.prepare(`
    INSERT OR REPLACE INTO stage_assignments (id, order_id, stage, assignee, due_date, completed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertDelivery = db.prepare(`
    INSERT INTO delivery_items (id, order_id, type, filename, url, uploaded_by, uploaded_at, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDeliveryStatus = db.prepare(`
    INSERT OR REPLACE INTO delivery_status (order_id, status, signed_at, signer)
    VALUES (?, ?, ?, ?)
  `);

  const assignees = ['精修师小林', '排版师阿杰', '制作主管老王'];

  const mockOrders = [
    { id: 'o1', orderNo: 'HS20260601001', customerName: '张伟 & 李娜', customerPhone: '13800138001', photographerId: 'p1', shootDate: '2026-06-15', packageName: '经典海景套餐', albumCount: 30, retouchCount: 50, status: 'completed' as const, token: 'sel-aabbcc', satisfaction: 5 },
    { id: 'o2', orderNo: 'HS20260601002', customerName: '王磊 & 陈静', customerPhone: '13800138002', photographerId: 'p2', shootDate: '2026-06-16', packageName: '奢华内景套餐', albumCount: 40, retouchCount: 80, status: 'shipping' as const, token: 'sel-ddeeff' },
    { id: 'o3', orderNo: 'HS20260601003', customerName: '刘洋 & 周婷', customerPhone: '13800138003', photographerId: 'p3', shootDate: '2026-06-17', packageName: '简约森系套餐', albumCount: 20, retouchCount: 40, status: 'producing' as const, token: 'sel-gghhii' },
    { id: 'o4', orderNo: 'HS20260601004', customerName: '陈晨 & 赵敏', customerPhone: '13800138004', photographerId: 'p1', shootDate: '2026-06-18', packageName: '城市旅拍套餐', albumCount: 25, retouchCount: 45, status: 'retouching' as const, token: 'sel-jjkkll' },
    { id: 'o5', orderNo: 'HS20260601005', customerName: '杨帆 & 黄丽', customerPhone: '13800138005', photographerId: 'p2', shootDate: '2026-06-19', packageName: '复古中式套餐', albumCount: 35, retouchCount: 60, status: 'selected' as const, token: 'sel-mmnnpp' },
    { id: 'o6', orderNo: 'HS20260601006', customerName: '黄磊 & 林芳', customerPhone: '13800138006', photographerId: 'p3', shootDate: '2026-06-20', packageName: '经典海景套餐', albumCount: 30, retouchCount: 50, status: 'pending_selection' as const, token: 'sel-qqrrss' },
  ];

  const allStatuses = ['pending_selection', 'selecting', 'selected', 'retouching', 'layouting', 'producing', 'shipping', 'completed'];
  const STAGES: Array<'retouching' | 'layouting' | 'producing'> = ['retouching', 'layouting', 'producing'];
  const ORDER_STATUS_LABELS: Record<string, string> = {
    pending_selection: '待选片',
    selecting: '选片中',
    selected: '已选片',
    retouching: '精修中',
    layouting: '排版中',
    producing: '相册制作中',
    shipping: '物流中',
    completed: '已完成',
  };

  for (const order of mockOrders) {
    const createdAt = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000);
    const linkCreatedAt = new Date(createdAt.getTime() + 1 * 60 * 60 * 1000);
    const linkExpiresAt = new Date(linkCreatedAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    const linkSent = order.status !== 'pending_selection' ? 1 : 0;

    insertOrder.run(
      order.id,
      order.orderNo,
      order.customerName,
      order.customerPhone,
      order.photographerId,
      order.shootDate,
      order.packageName,
      order.albumCount,
      order.retouchCount,
      order.status,
      order.token,
      linkCreatedAt.toISOString(),
      linkExpiresAt.toISOString(),
      order.satisfaction ?? null,
      linkSent,
      createdAt.toISOString(),
      now(),
      order.id === 'o1' ? '客户对海景部分特别满意，要求制作两幅放大相框' :
        order.id === 'o2' ? '加急订单，客户婚期在7月初，请优先处理' :
        order.id === 'o4' ? '客户希望精修时保留雀斑质感，不要过度磨皮' :
        null
    );

    const currentIdx = allStatuses.indexOf(order.status);
    for (let i = 0; i <= currentIdx; i++) {
      const st = allStatuses[i];
      if (st === 'selecting' && order.status === 'pending_selection') continue;
      const ts = new Date(Date.now() - (currentIdx - i) * 2 * 24 * 60 * 60 * 1000 - Math.random() * 3600000).toISOString();
      insertStatusLog.run(uuidv4(), order.id, st, ts, '系统', i === 0 ? '订单创建' : null);
      insertActivity.run(
        uuidv4(),
        order.id,
        'status_change',
        `状态变更为「${ORDER_STATUS_LABELS[st]}」`,
        JSON.stringify({ from: i > 0 ? ORDER_STATUS_LABELS[allStatuses[i - 1]] : '无', to: ORDER_STATUS_LABELS[st] }),
        '系统',
        ts
      );

      if (STAGES.includes(st as any)) {
        const stageIdx = STAGES.indexOf(st as any);
        const due = new Date(Date.now() + (2 + stageIdx) * 24 * 60 * 60 * 1000);
        const completed = i < currentIdx || order.status === 'completed' ? new Date(Date.now() - Math.random() * 24 * 3600000).toISOString() : null;
        insertStageAssignment.run(
          uuidv4(),
          order.id,
          st,
          assignees[stageIdx],
          due.toISOString(),
          completed
        );
        if (completed) {
          insertActivity.run(
            uuidv4(),
            order.id,
            'assignee_updated',
            `${ORDER_STATUS_LABELS[st]}阶段由 ${assignees[stageIdx]} 完成`,
            JSON.stringify({ stage: st, assignee: assignees[stageIdx] }),
            '系统',
            completed
          );
        } else {
          insertActivity.run(
            uuidv4(),
            order.id,
            'assignee_updated',
            `分配 ${ORDER_STATUS_LABELS[st]}：${assignees[stageIdx]}`,
            JSON.stringify({ stage: st, assignee: assignees[stageIdx], dueDate: due.toISOString() }),
            '系统',
            ts
          );
        }
      }
    }

    if (linkSent) {
      const sendTs = new Date(linkCreatedAt.getTime() + 2 * 3600000).toISOString();
      insertLinkSendLog.run(uuidv4(), order.id, sendTs, '微信', '系统');
      insertActivity.run(
        uuidv4(),
        order.id,
        'link_sent',
        '选片链接已通过微信发送给客户',
        JSON.stringify({ method: '微信' }),
        '系统',
        sendTs
      );
    }

    if (order.status === 'shipping') {
      const ts = new Date(Date.now() - Math.random() * 24 * 3600000).toISOString();
      insertActivity.run(
        uuidv4(),
        order.id,
        'shipping_updated',
        '物流信息已录入：顺丰速运 SF1234567890',
        JSON.stringify({ company: '顺丰速运', trackingNo: 'SF1234567890' }),
        '客服小王',
        ts
      );
      insertDelivery.run(
        uuidv4(),
        order.id,
        'final_package',
        '成片包_HS20260601002.zip',
        mockDeliveries[0],
        '客服小王',
        ts,
        '百度云盘下载，提取码 ab12'
      );
      insertDelivery.run(
        uuidv4(),
        order.id,
        'album_photo',
        '相册交付照_1.jpg',
        mockDeliveries[1],
        '客服小王',
        ts,
        '36寸烤瓷相册 x 2'
      );
      insertDeliveryStatus.run(order.id, 'in_transit', null, null);
    }

    if (order.status === 'completed') {
      const ts = new Date(Date.now() - Math.random() * 3 * 24 * 3600000).toISOString();
      insertDelivery.run(
        uuidv4(),
        order.id,
        'final_package',
        '成片包_HS20260601001.zip',
        mockDeliveries[0],
        '客服小王',
        ts,
        '包含40张精修 + 原始底片'
      );
      insertDelivery.run(
        uuidv4(),
        order.id,
        'receipt_proof',
        '签收单.jpg',
        mockDeliveries[1],
        '客服小王',
        new Date().toISOString(),
        '客户李娜本人签收'
      );
      insertDeliveryStatus.run(order.id, 'signed', new Date().toISOString(), '李娜');
    }

    if (order.satisfaction) {
      const ts = new Date(Date.now() - Math.random() * 12 * 3600000).toISOString();
      insertActivity.run(
        uuidv4(),
        order.id,
        'satisfaction_updated',
        `客户满意度评分：${order.satisfaction}星`,
        JSON.stringify({ satisfaction: order.satisfaction }),
        '系统',
        ts
      );
    }

    const photoCount = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < photoCount; i++) {
      const photoUrl = samplePhotos[i % samplePhotos.length];
      let mark: string | null = null;
      let remark: string | null = null;
      if (currentIdx >= allStatuses.indexOf('selected')) {
        const r = Math.random();
        if (r < 0.4) {
          mark = 'album';
          remark = Math.random() > 0.5 ? '修瘦一点' : null;
        } else if (r < 0.7) {
          mark = 'retouch';
          remark = Math.random() > 0.5 ? '色调偏暖' : null;
        } else {
          mark = 'none';
        }
      }
      insertPhoto.run(uuidv4(), order.id, photoUrl, mark, remark, createdAt.toISOString());
    }
  }
}
