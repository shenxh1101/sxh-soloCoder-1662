import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Camera,
  CalendarDays,
  Package,
  Image as ImageIcon,
  FileImage,
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Star,
  MessageSquare,
  Tag,
  Loader2,
  Sparkles,
  Album,
  Wand2,
  Ban,
  Link2,
  Copy,
  ExternalLink,
  Send,
  Check,
  Pencil,
  Printer,
  RefreshCw,
  History,
  Heart,
  Zap,
  FileText,
  AlertTriangle,
  Upload,
  Trash2,
  UserCheck,
  FileUp,
  Receipt,
  ImagePlus,
  Calendar,
} from 'lucide-react';
import { api } from '@/api/client';
import {
  ORDER_STATUS_LABELS,
  PHOTO_MARK_LABELS,
  PRODUCTION_STATUSES,
  DELIVERY_ITEM_TYPE_LABELS,
  DELIVERY_STATUS_LABELS,
  PRODUCTION_STAGE_LABELS,
  type Order,
  type OrderStatus,
  type PhotoMark,
  type ActivityLog,
  type ProductionStage,
  type DeliveryItemType,
  type DeliveryStatus,
} from '@shared/types';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import ProgressTimeline from '@/components/ProgressTimeline';
import SelectionSlip, { printSelectionSlip } from '@/components/SelectionSlip';

function getStatusBadgeClass(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending_selection: 'bg-amber-50 text-amber-700 border-amber-200',
    selecting: 'bg-blue-50 text-blue-700 border-blue-200',
    selected: 'bg-purple-50 text-purple-700 border-purple-200',
    retouching: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    layouting: 'bg-violet-50 text-violet-700 border-violet-200',
    producing: 'bg-orange-50 text-orange-700 border-orange-200',
    shipping: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
  };
  return map[status];
}

function getMarkBadgeClass(mark: PhotoMark | null) {
  if (mark === 'album') return 'bg-champagne-50 text-champagne-700 border-champagne-200';
  if (mark === 'retouch') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-ink-warm/10 text-ink-warm border-ink-warm/20';
}

const STATUS_FLOW_ICONS: Record<OrderStatus, React.ReactNode> = {
  pending_selection: <ImageIcon className="w-4 h-4" />,
  selecting: <ImageIcon className="w-4 h-4" />,
  selected: <CheckCircle2 className="w-4 h-4" />,
  retouching: <Wand2 className="w-4 h-4" />,
  layouting: <FileImage className="w-4 h-4" />,
  producing: <Package className="w-4 h-4" />,
  shipping: <Truck className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  status_change: <Zap className="w-4 h-4" />,
  link_sent: <Send className="w-4 h-4" />,
  link_regenerated: <RefreshCw className="w-4 h-4" />,
  selection_submitted: <Heart className="w-4 h-4" />,
  shipping_updated: <Truck className="w-4 h-4" />,
  satisfaction_updated: <Star className="w-4 h-4" />,
  remark_updated: <Pencil className="w-4 h-4" />,
  delivery_uploaded: <Upload className="w-4 h-4" />,
  delivery_receipt_updated: <Check className="w-4 h-4" />,
  assignee_updated: <UserCheck className="w-4 h-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  status_change: 'from-champagne-400 to-champagne-600',
  link_sent: 'from-blue-400 to-blue-600',
  link_regenerated: 'from-purple-400 to-purple-600',
  selection_submitted: 'from-rose-400 to-rose-600',
  shipping_updated: 'from-cyan-400 to-cyan-600',
  satisfaction_updated: 'from-amber-400 to-amber-600',
  remark_updated: 'from-emerald-400 to-emerald-600',
  delivery_uploaded: 'from-teal-400 to-teal-600',
  delivery_receipt_updated: 'from-green-400 to-green-600',
  assignee_updated: 'from-sky-400 to-sky-600',
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending_selection: 'selecting',
  selecting: 'selected',
  selected: 'retouching',
  retouching: 'layouting',
  layouting: 'producing',
  producing: 'shipping',
  shipping: 'completed',
  completed: null,
};

function isLinkExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

function daysUntilExpire(expiresAt: string | undefined): number {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceRemark, setAdvanceRemark] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [shippingTrackingNo, setShippingTrackingNo] = useState('');
  const [satisfaction, setSatisfaction] = useState(5);
  const [copied, setCopied] = useState(false);
  const [linkSentUpdating, setLinkSentUpdating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [remarkValue, setRemarkValue] = useState('');
  const [remarkUpdating, setRemarkUpdating] = useState(false);
  const [assigneeUpdating, setAssigneeUpdating] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryItemType>('final_package');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [uploadingDelivery, setUploadingDelivery] = useState(false);
  const [deliveryStatusUpdating, setDeliveryStatusUpdating] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [assigneeInput, setAssigneeInput] = useState<Record<ProductionStage, string>>({
    retouching: '',
    layouting: '',
    producing: '',
  });
  const [dueDateInput, setDueDateInput] = useState<Record<ProductionStage, string>>({
    retouching: '',
    layouting: '',
    producing: '',
  });

  const refreshOrder = async () => {
    if (!id) return;
    const data = await api.getOrder(id);
    setOrder(data);
    if (data.activities) {
      setActivities(data.activities);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getOrder(id)])
      .then(([orderData]) => {
        setOrder(orderData);
        if (orderData.activities) setActivities(orderData.activities);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const selectionLink = order
    ? `${window.location.origin}${window.location.pathname}#/select/${order.selectionToken}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(selectionLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = selectionLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMarkLinkSent = async () => {
    if (!order) return;
    setLinkSentUpdating(true);
    try {
      const updated = await api.markSelectionLinkSent(order.id, !order.selectionLinkSent, '微信');
      setOrder(updated);
      if (updated.activities) setActivities(updated.activities);
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLinkSentUpdating(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!order) return;
    if (!confirm('确定要重新生成选片链接吗？原链接将失效。')) return;
    setRegenerating(true);
    try {
      const updated = await api.regenerateSelectionLink(order.id);
      setOrder(updated);
      if (updated.activities) setActivities(updated.activities);
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setRegenerating(false);
    }
  };

  const handleOpenAdvanceModal = () => {
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;
    setAdvanceRemark('');
    setShippingCompany('');
    setShippingTrackingNo('');
    setSatisfaction(5);
    setShowAdvanceModal(true);
  };

  const handleConfirmAdvance = async () => {
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    if (nextStatus === 'shipping' && (!shippingCompany.trim() || !shippingTrackingNo.trim())) {
      alert('请填写快递公司和单号');
      return;
    }

    setUpdating(true);
    try {
      const payload: any = {
        status: nextStatus,
        remark: advanceRemark.trim() || undefined,
      };
      if (nextStatus === 'shipping') {
        payload.shipping = { company: shippingCompany.trim(), trackingNo: shippingTrackingNo.trim() };
      }
      if (nextStatus === 'completed') {
        payload.satisfaction = satisfaction;
      }
      const updated = await api.updateOrderStatus(order.id, payload);
      setOrder(updated);
      if (updated.activities) setActivities(updated.activities);
      setShowAdvanceModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenRemarkModal = () => {
    setRemarkValue(order?.remark || '');
    setShowRemarkModal(true);
  };

  const handleUpdateRemark = async () => {
    if (!order) return;
    setRemarkUpdating(true);
    try {
      const updated = await api.updateRemark(order.id, remarkValue.trim());
      setOrder(updated);
      if (updated.activities) setActivities(updated.activities);
      setShowRemarkModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
    } finally {
      setRemarkUpdating(false);
    }
  };

  const handleUpdateAssignee = async (stage: ProductionStage) => {
    if (!order) return;
    setAssigneeUpdating(stage);
    try {
      const updated = await api.updateAssignment(order.id, {
        stage,
        assignee: assigneeInput[stage]?.trim() || undefined,
        dueDate: dueDateInput[stage] || undefined,
      });
      setOrder(updated);
      if (updated.activities) setActivities(updated.activities);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
    } finally {
      setAssigneeUpdating(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDelivery(true);
    try {
      await api.uploadDeliveryItem(order.id, file, deliveryType, '客服', deliveryNote.trim() || undefined);
      const updated = await api.getOrder(order.id);
      setOrder(updated);
      if (updated.activities) setActivities(updated.activities);
      setDeliveryNote('');
      e.target.value = '';
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingDelivery(false);
    }
  };

  const handleDeleteDeliveryItem = async (itemId: string) => {
    if (!order || !confirm('确定要删除该交付资料吗？')) return;
    try {
      await api.deleteDeliveryItem(itemId);
      const updated = await api.getOrder(order.id);
      setOrder(updated);
      if (updated.activities) setActivities(updated.activities);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleUpdateDeliveryStatus = async (status: DeliveryStatus) => {
    if (!order) return;
    if (status === 'signed' && !signerName.trim()) {
      alert('请填写签收人姓名');
      return;
    }
    setDeliveryStatusUpdating(true);
    try {
      const updated = await api.updateDeliveryStatus(
        order.id,
        status,
        '客服',
        status === 'signed' ? signerName.trim() : undefined
      );
      setOrder(updated);
      if (updated.activities) setActivities(updated.activities);
      setSignerName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
    } finally {
      setDeliveryStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-champagne-500" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="card-gold p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-20 text-champagne-500" />
            <p className="text-ink-warm mb-4">订单不存在</p>
            <button onClick={() => navigate('/orders')} className="btn-secondary">返回列表</button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentStatusIndex = PRODUCTION_STATUSES.indexOf(order.status);
  const nextStatus = NEXT_STATUS[order.status];
  const linkExpired = isLinkExpired(order.selectionLinkExpiresAt);
  const daysLeft = daysUntilExpire(order.selectionLinkExpiresAt);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/orders')} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink-charcoal truncate">
              {order.customer.name} 的订单
            </h1>
            <span className={cn('badge border', getStatusBadgeClass(order.status))}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className="text-sm text-ink-warm mt-0.5">订单号：{order.orderNo}</p>
        </div>
        <div className="flex gap-2">
          {order.status === 'selected' || currentStatusIndex >= 0 ? (
            <button
              onClick={() => printSelectionSlip(order)}
              className="btn-secondary flex items-center gap-2"
              title="打印选片确认单"
            >
              <Printer className="w-4 h-4" />
              打印确认单
            </button>
          ) : null}
          {nextStatus && (
            <button onClick={handleOpenAdvanceModal} className="btn-primary flex items-center gap-2" disabled={updating}>
              <ChevronRight className="w-4.5 h-4.5" />
              进入下一阶段
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card-gold p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <User className="w-4.5 h-4.5 text-champagne-500" />
              <h3 className="font-display text-lg font-semibold text-ink-charcoal">客户信息</h3>
            </div>
            <div className="gold-divider mb-4" />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-champagne-50 flex items-center justify-center text-champagne-600">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs text-ink-warm">客户姓名</div>
                  <div className="font-medium text-ink-charcoal">{order.customer.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-champagne-50 flex items-center justify-center text-champagne-600">
                  <Phone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs text-ink-warm">联系电话</div>
                  <div className="font-medium text-ink-charcoal">{order.customer.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-champagne-50 flex items-center justify-center text-champagne-600">
                  <Camera className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs text-ink-warm">摄影顾问</div>
                  <div className="font-medium text-ink-charcoal">{order.photographerName || '未指派'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-champagne-50 flex items-center justify-center text-champagne-600">
                  <CalendarDays className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs text-ink-warm">拍摄日期</div>
                  <div className="font-medium text-ink-charcoal">
                    {new Date(order.shootDate).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-gold p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Package className="w-4.5 h-4.5 text-champagne-500" />
              <h3 className="font-display text-lg font-semibold text-ink-charcoal">套餐信息</h3>
            </div>
            <div className="gold-divider mb-4" />
            <div className="space-y-3">
              <div>
                <div className="text-xs text-ink-warm mb-0.5">套餐名称</div>
                <div className="font-medium text-ink-charcoal">{order.packageInfo.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-cream/50 text-center">
                  <div className="text-xs text-ink-warm mb-0.5">入册张数</div>
                  <div className="font-display text-xl font-semibold text-champagne-700">
                    {order.packageInfo.albumCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-cream/50 text-center">
                  <div className="text-xs text-ink-warm mb-0.5">精修张数</div>
                  <div className="font-display text-xl font-semibold text-indigo-600">
                    {order.packageInfo.retouchCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-gold p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Link2 className="w-4.5 h-4.5 text-champagne-500" />
              <h3 className="font-display text-lg font-semibold text-ink-charcoal">选片链接</h3>
              {order.selectionLinkSent && (
                <span className="badge bg-green-50 text-green-700 border-0 text-xs ml-auto">已发送</span>
              )}
            </div>
            <div className="gold-divider mb-4" />

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-warm">生成时间</span>
                <span className="text-ink-charcoal">
                  {order.selectionLinkCreatedAt
                    ? new Date(order.selectionLinkCreatedAt).toLocaleDateString('zh-CN')
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-warm">有效期至</span>
                <span className={cn(
                  'font-medium',
                  linkExpired ? 'text-red-600' : 'text-ink-charcoal'
                )}>
                  {order.selectionLinkExpiresAt
                    ? `${new Date(order.selectionLinkExpiresAt).toLocaleDateString('zh-CN')} ${linkExpired ? '（已过期）' : `（剩 ${daysLeft} 天）`}`
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-warm">发送次数</span>
                <span className="text-ink-charcoal font-medium">{order.linkSendCount || 0} 次</span>
              </div>
              {order.lastLinkSentAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-warm">最近发送</span>
                  <span className="text-ink-charcoal">
                    {new Date(order.lastLinkSentAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-ivory/80 border border-champagne-100 mb-4">
              <p className="text-sm text-ink-charcoal break-all font-mono leading-relaxed">{selectionLink}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCopyLink}
                className={cn(
                  'flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                  copied
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-champagne-50 text-champagne-700 border border-champagne-200 hover:bg-champagne-100'
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制'}
              </button>
              <a
                href={`#/select/${order.selectionToken}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                预览
              </a>
              <button
                onClick={handleMarkLinkSent}
                disabled={linkSentUpdating}
                className={cn(
                  'flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                  order.selectionLinkSent
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                )}
              >
                {order.selectionLinkSent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                {order.selectionLinkSent ? '已发送' : '标记已发'}
              </button>
            </div>
            <button
              onClick={handleRegenerateLink}
              disabled={regenerating}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-ink-warm border border-dashed border-champagne-200 hover:bg-champagne-50 hover:text-champagne-700 transition-all"
            >
              {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              重新生成链接
            </button>
          </div>

          <div className="card-gold p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <MessageSquare className="w-4.5 h-4.5 text-champagne-500" />
              <h3 className="font-display text-lg font-semibold text-ink-charcoal">订单备注</h3>
              <button
                onClick={handleOpenRemarkModal}
                className="ml-auto flex items-center gap-1 text-xs text-champagne-700 hover:text-champagne-800"
              >
                <Pencil className="w-3 h-3" />
                修改
              </button>
            </div>
            <div className="gold-divider mb-4" />
            <div className="text-sm text-ink-charcoal whitespace-pre-wrap leading-relaxed min-h-[40px]">
              {order.remark ? (
                <p>{order.remark}</p>
              ) : (
                <p className="text-ink-warm italic">暂无备注，点击右上角"修改"添加</p>
              )}
            </div>
          </div>

          {['selected', 'retouching', 'layouting', 'producing', 'shipping', 'completed'].includes(order.status) && (
            <div className="card-gold p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <UserCheck className="w-4.5 h-4.5 text-champagne-500" />
                <h3 className="font-display text-lg font-semibold text-ink-charcoal">制作阶段负责人</h3>
              </div>
              <div className="gold-divider mb-4" />
              <div className="space-y-3">
                {(['retouching', 'layouting', 'producing'] as ProductionStage[]).map((stage) => {
                  const stageIdx = PRODUCTION_STATUSES.indexOf(stage);
                  const isStageDone = currentStatusIndex > stageIdx;
                  const isCurrent = currentStatusIndex === stageIdx;
                  const saved = order.assignments?.[stage];
                  const assigneeVal = assigneeInput[stage] || (saved?.assignee ?? '') || '';
                  const dueVal =
                    dueDateInput[stage] ||
                    (saved?.dueDate ? saved.dueDate.slice(0, 10) : '') ||
                    '';
                  const isOverdue = saved?.dueDate && !saved?.completedAt && new Date(saved.dueDate) < new Date();
                  return (
                    <div key={stage} className="p-3 rounded-xl bg-cream/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              isStageDone ? 'text-ink-warm/60 line-through' : 'text-ink-charcoal',
                              isCurrent && 'text-champagne-700'
                            )}
                          >
                            {PRODUCTION_STAGE_LABELS[stage]}
                          </span>
                          {isCurrent && (
                            <span className="badge bg-champagne-100 text-champagne-700 border-0 text-[10px] py-0 px-2">
                              当前阶段
                            </span>
                          )}
                          {isStageDone && saved?.completedAt && (
                            <span className="text-[11px] text-green-600">
                              ✔ {new Date(saved.completedAt).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                        {isOverdue && !isStageDone && (
                          <span className="badge bg-red-50 text-red-700 border-red-200 text-[10px] py-0 px-2">
                            已超期
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="relative">
                          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-warm/60" />
                          <input
                            type="text"
                            placeholder="负责人姓名"
                            value={assigneeVal}
                            disabled={isStageDone}
                            onChange={(e) =>
                              setAssigneeInput((prev) => ({ ...prev, [stage]: e.target.value }))
                            }
                            className="w-full h-8 pl-8 pr-3 rounded-lg border border-champagne-100 bg-white text-sm text-ink-charcoal placeholder:text-ink-warm/50 focus:outline-none focus:ring-2 focus:ring-champagne-200 disabled:bg-cream/60 disabled:text-ink-warm/60"
                          />
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-warm/60" />
                          <input
                            type="date"
                            value={dueVal}
                            disabled={isStageDone}
                            onChange={(e) =>
                              setDueDateInput((prev) => ({ ...prev, [stage]: e.target.value }))
                            }
                            className="w-full h-8 pl-8 pr-3 rounded-lg border border-champagne-100 bg-white text-sm text-ink-charcoal focus:outline-none focus:ring-2 focus:ring-champagne-200 disabled:bg-cream/60 disabled:text-ink-warm/60"
                          />
                        </div>
                      </div>
                      {!isStageDone && (
                        <button
                          onClick={() => handleUpdateAssignee(stage)}
                          disabled={assigneeUpdating === stage}
                          className="w-full h-7 rounded-md text-xs font-medium text-champagne-700 bg-champagne-50 hover:bg-champagne-100 border border-champagne-200 transition-all disabled:opacity-50"
                        >
                          {assigneeUpdating === stage ? (
                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                          ) : (
                            '保存'
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStatusIndex >= 6 || order.status === 'shipping' || order.status === 'completed' ? (
            <div className="card-gold p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Receipt className="w-4.5 h-4.5 text-champagne-500" />
                <h3 className="font-display text-lg font-semibold text-ink-charcoal">交付验收</h3>
                {order.delivery?.status && (
                  <span
                    className={cn(
                      'badge ml-auto',
                      order.delivery.status === 'signed'
                        ? 'bg-green-50 text-green-700 border-0'
                        : order.delivery.status === 'in_transit'
                        ? 'bg-cyan-50 text-cyan-700 border-0'
                        : order.delivery.status === 'delivered'
                        ? 'bg-blue-50 text-blue-700 border-0'
                        : 'bg-ink-warm/10 text-ink-warm border-0'
                    )}
                  >
                    {DELIVERY_STATUS_LABELS[order.delivery.status]}
                  </span>
                )}
              </div>
              <div className="gold-divider mb-4" />

              {(order.status === 'shipping' || order.status === 'completed') && (
                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={deliveryType}
                      onChange={(e) => setDeliveryType(e.target.value as DeliveryItemType)}
                      className="h-9 px-3 rounded-lg border border-champagne-100 bg-white text-sm text-ink-charcoal focus:outline-none focus:ring-2 focus:ring-champagne-200"
                    >
                      <option value="final_package">最终成片包</option>
                      <option value="album_photo">相册交付照片</option>
                      <option value="receipt">签收凭证</option>
                    </select>
                    <input
                      type="text"
                      placeholder="备注（可选）"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-champagne-100 bg-white text-sm text-ink-charcoal placeholder:text-ink-warm/50 focus:outline-none focus:ring-2 focus:ring-champagne-200"
                    />
                  </div>
                  <label className="block">
                    <input
                      type="file"
                      accept="*/*"
                      disabled={uploadingDelivery}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="delivery-upload"
                    />
                    <div className="w-full h-10 rounded-lg border-2 border-dashed border-champagne-200 bg-cream/40 hover:bg-cream hover:border-champagne-300 flex items-center justify-center gap-2 text-sm text-champagne-700 cursor-pointer transition-all disabled:opacity-50">
                      {uploadingDelivery ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          点击选择文件上传
                        </>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {order.delivery?.items && order.delivery.items.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="text-xs font-medium text-ink-warm mb-1">
                    已上传 ({order.delivery.items.length})
                  </div>
                  <div className="space-y-2">
                    {order.delivery.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-cream/40"
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0',
                            item.type === 'final_package'
                              ? 'bg-gradient-to-br from-indigo-400 to-indigo-600'
                              : item.type === 'album_photo'
                              ? 'bg-gradient-to-br from-rose-400 to-rose-600'
                              : 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                          )}
                        >
                          {item.type === 'final_package' ? (
                            <FileUp className="w-3.5 h-3.5" />
                          ) : item.type === 'album_photo' ? (
                            <ImagePlus className="w-3.5 h-3.5" />
                          ) : (
                            <Receipt className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-ink-warm">
                            {DELIVERY_ITEM_TYPE_LABELS[item.type]}
                          </div>
                          <div className="text-sm text-ink-charcoal truncate">{item.filename}</div>
                          {item.note && (
                            <div className="text-xs text-ink-warm mt-0.5">{item.note}</div>
                          )}
                          {!item.storedFilename && (
                            <div className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              文件缺失
                            </div>
                          )}
                        </div>
                        {item.storedFilename ? (
                          <a
                            href={`/api/uploads/${encodeURIComponent(item.storedFilename)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-champagne-700 hover:bg-champagne-100 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span
                            title="文件缺失"
                            className="p-1.5 rounded-lg text-ink-warm/40 opacity-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteDeliveryItem(item.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!order.delivery?.items || order.delivery.items.length === 0) && (
                <div className="py-6 text-center text-ink-warm text-sm mb-4">
                  暂未上传交付资料
                </div>
              )}

              {(order.status === 'shipping' || order.status === 'completed') && (
                <>
                  <div className="gold-divider mb-4" />
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-ink-warm mb-1">更新交付状态</div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleUpdateDeliveryStatus('in_transit')}
                        disabled={deliveryStatusUpdating}
                        className={cn(
                          'h-9 rounded-lg text-xs font-medium transition-all',
                          order.delivery?.status === 'in_transit'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                        )}
                      >
                        配送中
                      </button>
                      <button
                        onClick={() => handleUpdateDeliveryStatus('delivered')}
                        disabled={deliveryStatusUpdating}
                        className={cn(
                          'h-9 rounded-lg text-xs font-medium transition-all',
                          order.delivery?.status === 'delivered'
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        )}
                      >
                        已送达
                      </button>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="签收人"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          className="flex-1 min-w-0 h-9 px-2 rounded-lg border border-champagne-100 bg-white text-xs text-ink-charcoal placeholder:text-ink-warm/50 focus:outline-none focus:ring-2 focus:ring-champagne-200"
                        />
                        <button
                          onClick={() => handleUpdateDeliveryStatus('signed')}
                          disabled={deliveryStatusUpdating}
                          className={cn(
                            'h-9 px-3 rounded-lg text-xs font-medium transition-all shrink-0',
                            order.delivery?.status === 'signed'
                              ? 'bg-green-500 text-white'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          )}
                        >
                          签收
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {order.delivery?.signedAt && (
                <div className="mt-4 text-xs text-ink-warm space-y-1 pt-3 border-t border-champagne-100">
                  <div>签收时间：{new Date(order.delivery.signedAt).toLocaleString('zh-CN')}</div>
                  {order.delivery.signer && <div>签收人：{order.delivery.signer}</div>}
                </div>
              )}
            </div>
          ) : null}

          {order.shipping && (
            <div className="card-gold p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Truck className="w-4.5 h-4.5 text-champagne-500" />
                <h3 className="font-display text-lg font-semibold text-ink-charcoal">物流信息</h3>
              </div>
              <div className="gold-divider mb-4" />
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-ink-warm mb-0.5">快递公司</div>
                  <div className="font-medium text-ink-charcoal">{order.shipping.company}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-warm mb-0.5">物流单号</div>
                  <div className="font-medium text-ink-charcoal font-mono">{order.shipping.trackingNo}</div>
                </div>
              </div>
            </div>
          )}

          {order.satisfaction !== undefined && (
            <div className="card-gold p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Star className="w-4.5 h-4.5 text-champagne-500" />
                <h3 className="font-display text-lg font-semibold text-ink-charcoal">客户评价</h3>
              </div>
              <div className="gold-divider mb-4" />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      'w-6 h-6',
                      n <= order.satisfaction! ? 'text-champagne-500 fill-champagne-500' : 'text-champagne-200'
                    )}
                  />
                ))}
                <span className="ml-2 font-display text-2xl font-semibold text-champagne-700">
                  {order.satisfaction}.0
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card-gold p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <Clock className="w-4.5 h-4.5 text-champagne-500" />
              <h3 className="font-display text-lg font-semibold text-ink-charcoal">制作进度</h3>
            </div>
            <div className="gold-divider mb-6" />

            <div className="relative">
              <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-champagne-200 via-champagne-200 to-champagne-100" />
              <div className="space-y-0">
                {PRODUCTION_STATUSES.map((status, idx) => {
                  const isDone = currentStatusIndex > idx;
                  const isCurrent = currentStatusIndex === idx;
                  const log = order.statusHistory.find((h) => h.status === status);

                  return (
                    <div key={status} className="relative flex gap-4 pb-6 last:pb-0">
                      <div
                        className={cn(
                          'relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
                          isDone && 'bg-gradient-to-br from-champagne-500 to-champagne-600 text-white shadow-glow',
                          isCurrent && 'bg-gradient-to-br from-champagne-400 to-champagne-500 text-white ring-4 ring-champagne-100',
                          !isDone && !isCurrent && 'bg-cream text-ink-warm/50'
                        )}
                      >
                        {STATUS_FLOW_ICONS[status]}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'font-medium',
                            (isDone || isCurrent) ? 'text-ink-charcoal' : 'text-ink-warm/50'
                          )}>
                            {ORDER_STATUS_LABELS[status]}
                          </span>
                          {isCurrent && (
                            <span className="badge bg-champagne-100 text-champagne-700 border-0">进行中</span>
                          )}
                          {isDone && (
                            <span className="badge bg-green-50 text-green-700 border-0">已完成</span>
                          )}
                        </div>
                        {log && (
                          <div className="mt-1 text-xs text-ink-warm">
                            {new Date(log.timestamp).toLocaleString('zh-CN')}
                            {log.operator && <span className="ml-2">· {log.operator}</span>}
                          </div>
                        )}
                        {log?.remark && (
                          <div className="mt-1.5 text-xs text-ink-charcoal bg-cream/70 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                            <Pencil className="w-3 h-3 text-champagne-500" />
                            {log.remark}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {order.status === 'selected' || currentStatusIndex >= 0 ? (
            <div className="card-gold p-5">
              <div className="flex items-center gap-2.5 mb-5">
                <Sparkles className="w-4.5 h-4.5 text-champagne-500" />
                <h3 className="font-display text-lg font-semibold text-ink-charcoal">选片确认单</h3>
              </div>
              <div className="gold-divider mb-5" />
              <SelectionSlip order={order} showPrint />
            </div>
          ) : null}

          <div className="card-gold p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <History className="w-4.5 h-4.5 text-champagne-500" />
              <h3 className="font-display text-lg font-semibold text-ink-charcoal">操作日志</h3>
            </div>
            <div className="gold-divider mb-5" />

            {activities.length === 0 ? (
              <div className="py-10 text-center">
                <History className="w-10 h-10 mx-auto mb-2 opacity-20 text-champagne-500" />
                <p className="text-sm text-ink-warm">暂无操作记录</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-champagne-200 to-cream" />
                <div className="space-y-4">
                  {activities.slice(0, 20).map((act) => (
                    <div key={act.id} className="relative flex gap-3">
                      <div
                        className={cn(
                          'relative z-10 w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center shrink-0 shadow-soft',
                          ACTIVITY_COLORS[act.type] || 'from-champagne-400 to-champagne-600'
                        )}
                      >
                        {ACTIVITY_ICONS[act.type] || <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-ink-charcoal">{act.content}</span>
                        </div>
                        <div className="text-xs text-ink-warm mt-0.5">
                          {new Date(act.timestamp).toLocaleString('zh-CN')}
                          {act.operator && <span className="ml-2">· {act.operator}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card-gold p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-4.5 h-4.5 text-champagne-500" />
                <h3 className="font-display text-lg font-semibold text-ink-charcoal">照片列表</h3>
              </div>
              <span className="text-sm text-ink-warm">共 {order.photos.length} 张</span>
            </div>
            <div className="gold-divider mb-5" />

            {order.photos.length === 0 ? (
              <div className="py-16 text-center">
                <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-20 text-champagne-500" />
                <p className="text-ink-warm">暂无照片</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {order.photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-cream">
                    <img
                      src={photo.url}
                      alt={photo.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                      {photo.mark && (
                        <span className={cn('badge border backdrop-blur-sm bg-white/90', getMarkBadgeClass(photo.mark))}>
                          {PHOTO_MARK_LABELS[photo.mark]}
                        </span>
                      )}
                    </div>
                    {photo.remark && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2.5">
                        <p className="text-xs text-white line-clamp-2">{photo.remark}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdvanceModal && nextStatus && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-gold w-full max-w-md p-6">
            <div className="flex items-center gap-2.5 mb-5">
              {nextStatus === 'shipping' ? (
                <Truck className="w-5 h-5 text-champagne-500" />
              ) : nextStatus === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-champagne-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-champagne-500" />
              )}
              <h3 className="font-display text-xl font-semibold text-ink-charcoal">
                进入「{ORDER_STATUS_LABELS[nextStatus]}」阶段
              </h3>
            </div>
            <div className="gold-divider mb-5" />

            <div className="space-y-4">
              {nextStatus === 'shipping' && (
                <>
                  <div>
                    <label className="input-label">快递公司</label>
                    <input
                      type="text"
                      value={shippingCompany}
                      onChange={(e) => setShippingCompany(e.target.value)}
                      placeholder="如：顺丰速运、京东物流等"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="input-label">物流单号</label>
                    <input
                      type="text"
                      value={shippingTrackingNo}
                      onChange={(e) => setShippingTrackingNo(e.target.value)}
                      placeholder="请输入物流单号"
                      className="input-field"
                    />
                  </div>
                </>
              )}

              {nextStatus === 'completed' && (
                <div>
                  <label className="input-label">客户满意度评分</label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSatisfaction(n)}
                        className="p-0.5 transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            'w-8 h-8 transition-colors',
                            n <= satisfaction ? 'text-champagne-500 fill-champagne-500' : 'text-champagne-200'
                          )}
                        />
                      </button>
                    ))}
                    <span className="ml-2 font-display text-xl font-semibold text-champagne-700">{satisfaction}.0</span>
                  </div>
                </div>
              )}

              <div>
                <label className="input-label">阶段备注（选填）</label>
                <textarea
                  value={advanceRemark}
                  onChange={(e) => setAdvanceRemark(e.target.value)}
                  placeholder="如：精修重点调整肤色、排版确认初稿、客户要求加急等"
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="btn-secondary"
                disabled={updating}
              >
                取消
              </button>
              <button onClick={handleConfirmAdvance} className="btn-primary flex items-center gap-2" disabled={updating}>
                {updating ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4.5 h-4.5" />
                )}
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemarkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-gold w-full max-w-md p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <MessageSquare className="w-5 h-5 text-champagne-500" />
              <h3 className="font-display text-xl font-semibold text-ink-charcoal">修改订单备注</h3>
            </div>
            <div className="gold-divider mb-5" />
            <textarea
              value={remarkValue}
              onChange={(e) => setRemarkValue(e.target.value)}
              placeholder="记录订单相关的补充信息、特殊要求等"
              rows={5}
              className="input-field resize-none"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRemarkModal(false)}
                className="btn-secondary"
                disabled={remarkUpdating}
              >
                取消
              </button>
              <button
                onClick={handleUpdateRemark}
                className="btn-primary flex items-center gap-2"
                disabled={remarkUpdating}
              >
                {remarkUpdating ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4.5 h-4.5" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}
