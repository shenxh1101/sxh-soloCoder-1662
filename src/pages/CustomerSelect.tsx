import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  Heart,
  XCircle,
  MessageSquarePlus,
  ZoomIn,
  Send,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookHeart,
  X,
  AlertCircle,
  Album,
  Wand2,
  Ban,
  MessageSquare,
  Tag,
  Clock,
  Printer,
  FileText,
} from 'lucide-react';
import { api } from '@/api/client';
import type { Order, Photo, PhotoMark } from '@shared/types';
import { PHOTO_MARK_LABELS } from '@shared/types';
import SelectionSlip, { printSelectionSlip } from '@/components/SelectionSlip';

type SelectionMap = Record<string, { mark: PhotoMark; remark: string }>;

export default function CustomerSelect() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [selections, setSelections] = useState<SelectionMap>({});
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getSelection(token)
      .then((o) => {
        setOrder(o);
        const init: SelectionMap = {};
        o.photos.forEach((p) => {
          init[p.id] = {
            mark: (p.mark as PhotoMark) || 'none',
            remark: p.remark || '',
          };
        });
        setSelections(init);
        if (o.status === 'selected' || o.status === 'retouching' || o.status === 'layouting' || o.status === 'producing' || o.status === 'shipping' || o.status === 'completed') {
          setSubmitted(true);
        }
      })
      .catch(async (e) => {
        if (e.message === '选片链接已过期') {
          setLinkExpired(true);
          try {
            const res = await fetch(`/api/selection/${token}`);
            if (res.status === 410) {
              const data = await res.json();
              setExpiresAt(data.expiresAt || null);
            }
          } catch {}
        }
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const stats = useMemo(() => {
    const vals = Object.values(selections);
    return {
      album: vals.filter((v) => v.mark === 'album').length,
      retouch: vals.filter((v) => v.mark === 'retouch').length,
      none: vals.filter((v) => v.mark === 'none').length,
      total: vals.length,
    };
  }, [selections]);

  const setMark = (id: string, mark: PhotoMark) => {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], mark } }));
  };

  const setRemark = (id: string, remark: string) => {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], remark } }));
  };

  const handleSubmit = async () => {
    if (!token || !order) return;
    const hasSelection = Object.values(selections).some((v) => v.mark === 'album' || v.mark === 'retouch');
    if (!hasSelection) {
      alert('请至少选择一张入册或精修的照片');
      return;
    }
    setSubmitting(true);
    try {
      const data = Object.entries(selections).map(([id, v]) => ({
        id,
        mark: v.mark,
        remark: v.remark || undefined,
      }));
      await api.submitSelection(token, data);
      setSubmitted(true);
      setShowConfirm(false);
    } catch (e: any) {
      alert(e.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-ink-warm flex items-center gap-2">
          <Sparkles className="w-5 h-5 animate-spin text-champagne-500" />
          <span>正在加载选片数据...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    if (linkExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ivory p-8">
          <div className="card-gold p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="font-display text-xl text-ink-charcoal mb-2">选片链接已过期</h2>
            <p className="text-ink-warm text-sm mb-2">
              此选片链接已失效，请联系客服获取新的选片链接。
            </p>
            {expiresAt && (
              <p className="text-xs text-ink-warm/70">
                有效期至：{new Date(expiresAt).toLocaleDateString('zh-CN')}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory p-8">
        <div className="card-gold p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-rose-400 mb-4" />
          <h2 className="font-display text-xl text-ink-charcoal mb-2">链接无效</h2>
          <p className="text-ink-warm text-sm">{error || '无法加载选片数据'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-champagne-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-5 h-5 text-champagne-500" />
                <h1 className="font-display text-xl text-ink-charcoal">
                  {order.customer.name} 的选片
                </h1>
              </div>
              <p className="text-sm text-ink-warm">
                订单号 {order.orderNo} · 套餐 {order.packageInfo.name} · 拍摄日期 {order.shootDate}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatBadge icon={<BookHeart className="w-4 h-4" />} label="入册" value={stats.album} color="bg-champagne-500" />
              <StatBadge icon={<Sparkles className="w-4 h-4" />} label="精修" value={stats.retouch} color="bg-rose-400" />
              <StatBadge icon={<XCircle className="w-4 h-4" />} label="不选" value={stats.none} color="bg-gray-400" />
              <div className="h-8 w-px bg-champagne-200" />
              <span className="text-sm text-ink-warm">
                共 <span className="font-mono text-champagne-600 font-semibold">{stats.total}</span> 张
              </span>
              {!submitted && (
                <button onClick={() => setShowConfirm(true)} className="btn-primary flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  提交选片
                </button>
              )}
              {submitted && (
                <span className="badge bg-champagne-100 text-champagne-700">
                  <CheckCircle2 className="w-4 h-4" />
                  选片已提交
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {submitted && (
        <div className="max-w-4xl mx-auto px-6 pb-2 pt-6">
          <div className="card-gold p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-champagne-600" />
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-charcoal">选片已确认提交</h3>
                  <p className="text-sm text-ink-warm">您的选片结果已发送至工作室，我们将尽快开始精修制作</p>
                </div>
              </div>
              <button
                onClick={() => printSelectionSlip(order, order.photos.map((p) => ({
                  ...p,
                  mark: (selection[p.id]?.mark ?? p.mark ?? 'none') as PhotoMark,
                  remark: selection[p.id]?.remark ?? p.remark ?? null,
                })))}
                className="btn-secondary flex items-center gap-2 text-sm py-2"
              >
                <Printer className="w-4 h-4" />
                打印确认单
              </button>
            </div>
            <div className="gold-divider mb-5" />
            <SelectionSlip
              order={order}
              photos={order.photos.map((p) => ({
                ...p,
                mark: (selections[p.id]?.mark as PhotoMark) || p.mark || null,
                remark: selections[p.id]?.remark || p.remark || null,
              }))}
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
          {order.photos.map((photo, idx) => {
            const sel = selections[photo.id] || { mark: 'none' as PhotoMark, remark: '' };
            return (
              <PhotoCard
                key={photo.id}
                photo={photo}
                selection={sel}
                index={idx}
                disabled={submitted}
                onMark={(m) => setMark(photo.id, m)}
                onRemark={(r) => setRemark(photo.id, r)}
                onPreview={() => setPreviewPhoto(photo)}
              />
            );
          })}
        </div>
      </div>

      {previewPhoto && (
        <PhotoPreview
          photo={previewPhoto}
          selection={selections[previewPhoto.id] || { mark: 'none' as PhotoMark, remark: '' }}
          disabled={submitted}
          onClose={() => setPreviewPhoto(null)}
          onMark={(m) => setMark(previewPhoto.id, m)}
          onRemark={(r) => setRemark(previewPhoto.id, r)}
          onPrev={() => {
            const idx = order!.photos.findIndex((p) => p.id === previewPhoto.id);
            const prev = order!.photos[(idx - 1 + order!.photos.length) % order!.photos.length];
            setPreviewPhoto(prev);
          }}
          onNext={() => {
            const idx = order!.photos.findIndex((p) => p.id === previewPhoto.id);
            const next = order!.photos[(idx + 1) % order!.photos.length];
            setPreviewPhoto(next);
          }}
        />
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-ink-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-gold p-6 max-w-md w-full">
            <h3 className="font-display text-xl text-ink-charcoal mb-2">确认提交选片？</h3>
            <p className="text-sm text-ink-warm mb-4">
              提交后将无法再修改选片结果，请确认所有照片都已正确标记。
            </p>
            <div className="bg-cream rounded-lg p-4 mb-5 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-warm">入册照片</span>
                <span className="font-mono font-semibold text-champagne-600">{stats.album} 张</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-warm">精修照片</span>
                <span className="font-mono font-semibold text-rose-400">{stats.retouch} 张</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-warm">不选照片</span>
                <span className="font-mono font-semibold text-gray-500">{stats.none} 张</span>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                返回修改
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '提交中...' : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cream border border-champagne-100">
      <span className={`${color} text-white p-0.5 rounded-full`}>{icon}</span>
      <span className="text-sm text-ink-warm">{label}</span>
      <span className="font-mono font-semibold text-ink-charcoal">{value}</span>
    </div>
  );
}

function PhotoCard({
  photo,
  selection,
  index,
  disabled,
  onMark,
  onRemark,
  onPreview,
}: {
  photo: Photo;
  selection: { mark: PhotoMark; remark: string };
  index: number;
  disabled: boolean;
  onMark: (m: PhotoMark) => void;
  onRemark: (r: string) => void;
  onPreview: () => void;
}) {
  const borderColor =
    selection.mark === 'album'
      ? 'border-champagne-500 ring-2 ring-champagne-500/30'
      : selection.mark === 'retouch'
        ? 'border-rose-400 ring-2 ring-rose-400/30'
        : selection.mark === 'none'
          ? 'border-gray-300 opacity-70'
          : 'border-champagne-100';

  return (
    <div
      className={`card overflow-hidden group ${borderColor} border-2`}
      style={{ animationDelay: `${index * 20}ms` }}
    >
      <div className="relative aspect-square overflow-hidden bg-cream">
        <img
          src={photo.url}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <button
          onClick={onPreview}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        {selection.mark && selection.mark !== 'none' && (
          <div className={`absolute top-2 left-2 badge text-white ${selection.mark === 'album' ? 'bg-champagne-500' : 'bg-rose-400'}`}>
            {PHOTO_MARK_LABELS[selection.mark]}
          </div>
        )}
        {selection.remark && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded truncate">
            💬 {selection.remark}
          </div>
        )}
      </div>
      {!disabled && (
        <div className="p-3 space-y-2">
          <div className="flex gap-1.5">
            <MarkButton active={selection.mark === 'album'} color="champagne" onClick={() => onMark('album')}>
              <BookHeart className="w-3.5 h-3.5" />
              <span className="text-xs">入册</span>
            </MarkButton>
            <MarkButton active={selection.mark === 'retouch'} color="rose" onClick={() => onMark('retouch')}>
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs">精修</span>
            </MarkButton>
            <MarkButton active={selection.mark === 'none'} color="gray" onClick={() => onMark('none')}>
              <XCircle className="w-3.5 h-3.5" />
              <span className="text-xs">不选</span>
            </MarkButton>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="修图备注（如：修瘦一点）"
              value={selection.remark}
              onChange={(e) => onRemark(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-champagne-100 bg-ivory/50 focus:outline-none focus:border-champagne-400"
            />
            <MessageSquarePlus className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-champagne-400" />
          </div>
        </div>
      )}
    </div>
  );
}

function MarkButton({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: 'champagne' | 'rose' | 'gray';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeClass =
    color === 'champagne'
      ? 'bg-champagne-500 text-white border-champagne-500'
      : color === 'rose'
        ? 'bg-rose-400 text-white border-rose-400'
        : 'bg-gray-500 text-white border-gray-500';
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border transition-all ${
        active ? activeClass : 'bg-white border-champagne-200 text-ink-warm hover:border-champagne-400'
      }`}
    >
      {children}
    </button>
  );
}

function PhotoPreview({
  photo,
  selection,
  disabled,
  onClose,
  onMark,
  onRemark,
  onPrev,
  onNext,
}: {
  photo: Photo;
  selection: { mark: PhotoMark; remark: string };
  disabled: boolean;
  onClose: () => void;
  onMark: (m: PhotoMark) => void;
  onRemark: (r: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink-charcoal/90 flex items-center justify-center p-4 lg:p-10">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="w-5 h-5" />
      </button>
      <button
        onClick={onPrev}
        className="absolute left-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={onNext}
        className="absolute right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      <div className="max-w-6xl w-full grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="bg-black rounded-2xl overflow-hidden flex items-center justify-center aspect-square lg:aspect-auto">
          <img src={photo.url} alt="" className="max-w-full max-h-[80vh] object-contain" />
        </div>
        {!disabled && (
          <div className="card-gold p-5 h-fit space-y-4">
            <h3 className="font-display text-lg text-ink-charcoal">照片标记</h3>
            <div className="flex gap-2">
              <MarkButton active={selection.mark === 'album'} color="champagne" onClick={() => onMark('album')}>
                <BookHeart className="w-4 h-4" />
                <span>入册</span>
              </MarkButton>
              <MarkButton active={selection.mark === 'retouch'} color="rose" onClick={() => onMark('retouch')}>
                <Sparkles className="w-4 h-4" />
                <span>精修</span>
              </MarkButton>
              <MarkButton active={selection.mark === 'none'} color="gray" onClick={() => onMark('none')}>
                <XCircle className="w-4 h-4" />
                <span>不选</span>
              </MarkButton>
            </div>
            <div>
              <label className="input-label">修图备注</label>
              <textarea
                value={selection.remark}
                onChange={(e) => onRemark(e.target.value)}
                placeholder="如：修瘦一点、色调偏暖、去掉路人..."
                rows={4}
                className="input-field resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
