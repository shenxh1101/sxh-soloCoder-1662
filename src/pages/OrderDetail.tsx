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
} from 'lucide-react';
import { api } from '@/api/client';
import {
  ORDER_STATUS_LABELS,
  PHOTO_MARK_LABELS,
  PRODUCTION_STATUSES,
  type Order,
  type OrderStatus,
  type PhotoMark,
  type ActivityLog,
} from '@shared/types';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import ProgressTimeline from '@/components/ProgressTimeline';
import SelectionSlip from '@/components/SelectionSlip';

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
};

const ACTIVITY_COLORS: Record<string, string> = {
  status_change: 'from-champagne-400 to-champagne-600',
  link_sent: 'from-blue-400 to-blue-600',
  link_regenerated: 'from-purple-400 to-purple-600',
  selection_submitted: 'from-rose-400 to-rose-600',
  shipping_updated: 'from-cyan-400 to-cyan-600',
  satisfaction_updated: 'from-amber-400 to-amber-600',
  remark_updated: 'from-emerald-400 to-emerald-600',
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
              onClick={() => window.print()}
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
      </div>
    </Layout>
  );
}
