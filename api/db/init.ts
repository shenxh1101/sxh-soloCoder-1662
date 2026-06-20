import db from './index.ts';
import { v4 as uuidv4 } from 'uuid';

const now = () => new Date().toISOString();

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

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_photographer ON orders(photographer_id);
    CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(order_id);
    CREATE INDEX IF NOT EXISTS idx_status_logs_order ON status_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(selection_token);
  `);

  const photographerCount = db.prepare('SELECT COUNT(*) as cnt FROM photographers').get() as { cnt: number };
  if (photographerCount.cnt === 0) {
    const insertPhotographer = db.prepare(
      'INSERT INTO photographers (id, name) VALUES (?, ?)'
    );
    insertPhotographer.run('p1', '李明辉');
    insertPhotographer.run('p2', '王小雅');
    insertPhotographer.run('p3', '张艺凡');
  }

  seedMockData();
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

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_no, customer_name, customer_phone, photographer_id,
      shoot_date, package_name, album_count, retouch_count, status,
      selection_token, satisfaction, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPhoto = db.prepare(`
    INSERT INTO photos (id, order_id, filename, mark, remark, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertStatusLog = db.prepare(`
    INSERT INTO status_logs (id, order_id, status, timestamp, operator)
    VALUES (?, ?, ?, ?, ?)
  `);

  const mockOrders = [
    {
      id: 'o1',
      orderNo: 'HS20260601001',
      customerName: '张伟 & 李娜',
      customerPhone: '13800138001',
      photographerId: 'p1',
      shootDate: '2026-06-15',
      packageName: '经典海景套餐',
      albumCount: 30,
      retouchCount: 50,
      status: 'completed' as const,
      token: 'sel-aabbcc',
      satisfaction: 5,
    },
    {
      id: 'o2',
      orderNo: 'HS20260601002',
      customerName: '王磊 & 陈静',
      customerPhone: '13800138002',
      photographerId: 'p2',
      shootDate: '2026-06-16',
      packageName: '奢华内景套餐',
      albumCount: 40,
      retouchCount: 80,
      status: 'shipping' as const,
      token: 'sel-ddeeff',
    },
    {
      id: 'o3',
      orderNo: 'HS20260601003',
      customerName: '刘洋 & 周婷',
      customerPhone: '13800138003',
      photographerId: 'p3',
      shootDate: '2026-06-17',
      packageName: '简约森系套餐',
      albumCount: 20,
      retouchCount: 40,
      status: 'producing' as const,
      token: 'sel-gghhii',
    },
    {
      id: 'o4',
      orderNo: 'HS20260601004',
      customerName: '陈晨 & 赵敏',
      customerPhone: '13800138004',
      photographerId: 'p1',
      shootDate: '2026-06-18',
      packageName: '城市旅拍套餐',
      albumCount: 25,
      retouchCount: 45,
      status: 'retouching' as const,
      token: 'sel-jjkkll',
    },
    {
      id: 'o5',
      orderNo: 'HS20260601005',
      customerName: '杨帆 & 黄丽',
      customerPhone: '13800138005',
      photographerId: 'p2',
      shootDate: '2026-06-19',
      packageName: '复古中式套餐',
      albumCount: 35,
      retouchCount: 60,
      status: 'selected' as const,
      token: 'sel-mmnnpp',
    },
    {
      id: 'o6',
      orderNo: 'HS20260601006',
      customerName: '黄磊 & 林芳',
      customerPhone: '13800138006',
      photographerId: 'p3',
      shootDate: '2026-06-20',
      packageName: '经典海景套餐',
      albumCount: 30,
      retouchCount: 50,
      status: 'pending_selection' as const,
      token: 'sel-qqrrss',
    },
  ];

  const allStatuses = ['pending_selection', 'selecting', 'selected', 'retouching', 'layouting', 'producing', 'shipping', 'completed'];

  for (const order of mockOrders) {
    const createdAt = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString();
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
      order.satisfaction ?? null,
      createdAt,
      now()
    );

    const currentIdx = allStatuses.indexOf(order.status);
    for (let i = 0; i <= currentIdx; i++) {
      const st = allStatuses[i];
      if (st === 'selecting' && order.status === 'pending_selection') continue;
      insertStatusLog.run(
        uuidv4(),
        order.id,
        st,
        new Date(Date.now() - (currentIdx - i) * 2 * 24 * 60 * 60 * 1000).toISOString(),
        '系统'
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

      insertPhoto.run(
        uuidv4(),
        order.id,
        photoUrl,
        mark,
        remark,
        createdAt
      );
    }
  }
}
