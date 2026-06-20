import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  orderRepo,
  photoRepo,
  photographerRepo,
  statsRepo,
  activityLogRepo,
  linkSendLogRepo,
  stageAssignmentRepo,
  deliveryRepo,
} from '../repositories/index.ts';
import type { OrderStatus, PhotoMark, DeliveryItemType, ProductionStage, DeliveryStatus } from '../../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.get('/photographers', (_req: Request, res: Response) => {
  res.json(photographerRepo.listAll());
});

router.get('/orders', (req: Request, res: Response) => {
  const { status, photographerId, keyword } = req.query;
  const orders = orderRepo.listAll({
    status: status as OrderStatus | undefined,
    photographerId: photographerId as string | undefined,
    keyword: keyword as string | undefined,
  });
  res.json(orders);
});

router.post('/orders', (req: Request, res: Response) => {
  const { customerName, customerPhone, photographerId, shootDate, packageName, albumCount, retouchCount } = req.body;
  if (!customerName || !customerPhone || !photographerId || !shootDate || !packageName) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const order = orderRepo.create({
    customerName,
    customerPhone,
    photographerId,
    shootDate,
    packageName,
    albumCount: Number(albumCount) || 0,
    retouchCount: Number(retouchCount) || 0,
  });
  res.status(201).json(order);
});

router.get('/orders/:id', (req: Request, res: Response) => {
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(order);
});

router.post('/orders/:id/photos', upload.array('photos', 200), (req: Request, res: Response) => {
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: '未收到文件' });
  }

  const photos = files.map((f) => photoRepo.create(req.params.id, f.filename));
  res.status(201).json(photos);
});

router.delete('/orders/:id/photos/:photoId', (req: Request, res: Response) => {
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  const photo = order.photos.find((p) => p.id === req.params.photoId);
  if (!photo) return res.status(404).json({ error: '照片不存在' });

  if (!photo.filename.startsWith('http')) {
    const fp = path.join(uploadDir, photo.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  photoRepo.delete(req.params.photoId);
  res.json({ success: true });
});

router.get('/orders/:id/selection-link', (req: Request, res: Response) => {
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  const link = `${req.protocol}://${req.get('host')}/#/select/${order.selectionToken}`;
  res.json({ token: order.selectionToken, link });
});

router.get('/selection/:token', (req: Request, res: Response) => {
  const order = orderRepo.getByToken(req.params.token);
  if (!order) return res.status(404).json({ error: '选片链接无效' });
  if (orderRepo.isLinkExpired(order.selectionLinkExpiresAt)) {
    return res.status(410).json({ error: '选片链接已过期', expired: true, expiresAt: order.selectionLinkExpiresAt });
  }
  res.json(order);
});

router.post('/selection/:token', (req: Request, res: Response) => {
  const order = orderRepo.getByToken(req.params.token);
  if (!order) return res.status(404).json({ error: '选片链接无效' });
  if (orderRepo.isLinkExpired(order.selectionLinkExpiresAt)) {
    return res.status(410).json({ error: '选片链接已过期', expired: true, expiresAt: order.selectionLinkExpiresAt });
  }
  if (order.status === 'selected') {
    return res.status(400).json({ error: '选片已提交，无法重复提交' });
  }

  const { selections }: { selections: { id: string; mark: PhotoMark; remark?: string }[] } = req.body;
  if (!Array.isArray(selections)) {
    return res.status(400).json({ error: '参数错误' });
  }

  for (const sel of selections) {
    photoRepo.updateMark(sel.id, sel.mark, sel.remark ?? null);
  }

  const albumCount = selections.filter((s) => s.mark === 'album').length;
  const retouchCount = selections.filter((s) => s.mark === 'retouch').length;
  orderRepo.updateStatus(order.id, 'selected', '客户', `客户完成选片：入册${albumCount}张，精修${retouchCount}张`);
  activityLogRepo.create(
    order.id,
    'selection_submitted',
    `客户完成选片：入册${albumCount}张，精修${retouchCount}张`,
    '客户',
    { albumCount, retouchCount }
  );

  const updated = orderRepo.getById(order.id);
  res.json(updated);
});

router.patch('/orders/:id/status', (req: Request, res: Response) => {
  const { status, operator, remark }: { status: OrderStatus; operator?: string; remark?: string } = req.body;
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  orderRepo.updateStatus(req.params.id, status, operator, remark);

  if (status === 'shipping' && req.body.shipping) {
    orderRepo.updateShipping(req.params.id, req.body.shipping.company, req.body.shipping.trackingNo);
  }

  if (req.body.satisfaction) {
    orderRepo.updateSatisfaction(req.params.id, Number(req.body.satisfaction));
  }

  res.json(orderRepo.getById(req.params.id));
});

router.patch('/orders/:id/selection-link-sent', (req: Request, res: Response) => {
  const { sent, method } = req.body;
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  orderRepo.updateSelectionLinkSent(req.params.id, !!sent);
  res.json(orderRepo.getById(req.params.id));
});

router.post('/orders/:id/regenerate-selection-link', (req: Request, res: Response) => {
  const order = orderRepo.regenerateSelectionLink(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(order);
});

router.get('/orders/:id/link-send-logs', (req: Request, res: Response) => {
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(linkSendLogRepo.getByOrderId(req.params.id));
});

router.get('/orders/:id/activities', (req: Request, res: Response) => {
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(activityLogRepo.getByOrderId(req.params.id));
});

router.get('/query', (req: Request, res: Response) => {
  const { keyword } = req.query;
  if (!keyword) return res.json([]);
  const orders = orderRepo.listAll({ keyword: String(keyword) });
  res.json(orders);
});

router.get('/statistics', (req: Request, res: Response) => {
  const { month } = req.query;
  res.json(statsRepo.getPhotographerStats(month as string | undefined));
});

router.get('/photos/:filename', (req: Request, res: Response) => {
  const fp = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(fp)) {
    res.sendFile(fp);
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

router.get('/uploads/:filename', (req: Request, res: Response) => {
  const fp = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(fp)) {
    res.sendFile(fp);
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

router.post('/orders/:id/remark', (req: Request, res: Response) => {
  const { remark, operator } = req.body;
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  orderRepo.updateRemark(req.params.id, String(remark ?? ''), operator ? String(operator) : undefined);
  res.json(orderRepo.getById(req.params.id));
});

router.patch('/orders/:id/assignments', (req: Request, res: Response) => {
  const { stage, assignee, dueDate, operator } = req.body;
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  const validStages: ProductionStage[] = ['retouching', 'layouting', 'producing'];
  if (!validStages.includes(stage)) return res.status(400).json({ error: '阶段参数错误' });
  stageAssignmentRepo.upsert(req.params.id, stage, {
    assignee: assignee ? String(assignee) : undefined,
    dueDate: dueDate ? String(dueDate) : undefined,
  });
  activityLogRepo.create(
    req.params.id,
    'assignee_updated',
    `更新${stage === 'retouching' ? '精修' : stage === 'layouting' ? '排版' : '相册制作'}${
      assignee ? `负责人：${assignee}` : '信息'
    }${dueDate ? `，预计完成：${new Date(dueDate).toLocaleDateString('zh-CN')}` : ''}`,
    operator ? String(operator) : '系统',
    { stage, assignee, dueDate }
  );
  res.json(orderRepo.getById(req.params.id));
});

router.get('/assignments/todos', (_req: Request, res: Response) => {
  res.json(stageAssignmentRepo.listTodos());
});

router.post('/orders/:id/delivery-items', upload.single('file'), (req: Request, res: Response) => {
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  const { type, uploadedBy, note } = req.body;
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  const validTypes: DeliveryItemType[] = ['final_package', 'album_photo', 'receipt'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: '文件类型错误' });
  const item = deliveryRepo.addItem(
    req.params.id,
    type as DeliveryItemType,
    req.file.filename,
    uploadedBy ? String(uploadedBy) : '客服',
    note ? String(note) : undefined
  );
  res.status(201).json(item);
});

router.delete('/delivery-items/:itemId', (req: Request, res: Response) => {
  deliveryRepo.removeItem(req.params.itemId);
  res.json({ success: true });
});

router.patch('/orders/:id/delivery-status', (req: Request, res: Response) => {
  const order = orderRepo.getById(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  const { status, operator, signer } = req.body;
  const validStatuses: DeliveryStatus[] = ['pending', 'in_transit', 'delivered', 'signed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: '状态参数错误' });
  deliveryRepo.updateStatus(
    req.params.id,
    status as DeliveryStatus,
    operator ? String(operator) : undefined,
    signer ? String(signer) : undefined
  );
  res.json(orderRepo.getById(req.params.id));
});

export default router;
