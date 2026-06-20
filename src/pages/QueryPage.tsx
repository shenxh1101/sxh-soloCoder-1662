import { useState } from 'react';
import { Search, Phone, User, FileText, Calendar, Package, Truck, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Order } from '@shared/types';
import { ORDER_STATUS_LABELS } from '@shared/types';
import StatusBadge from '@/components/StatusBadge';
import Layout from '@/components/Layout';

export default function QueryPage() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.queryOrders(keyword.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="section-title">进度查询</h1>
          <p className="subtitle mt-1">按客户姓名、手机号或订单号搜索查询制作进度</p>
        </div>

        <div className="card-gold p-6">
          <div className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-champagne-400" />
              <input
                type="text"
                placeholder="输入客户姓名 / 手机号 / 订单号"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input-field pl-12 pr-4 py-3 text-base"
              />
            </div>
            <button onClick={handleSearch} className="btn-primary px-8 py-3" disabled={loading}>
              {loading ? '查询中...' : '查询'}
            </button>
          </div>
        </div>

        {searched && !loading && (
          <div className="space-y-4 stagger-children">
            {results === null || results.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-champagne-300 mb-3" />
                <p className="text-ink-warm">未找到匹配的订单</p>
              </div>
            ) : (
              results.map((order) => (
                <OrderResultCard key={order.id} order={order} />
              ))
            )}
          </div>
        )}

        {!searched && (
          <div className="card p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-champagne-50 mb-4">
              <Search className="w-7 h-7 text-champagne-500" />
            </div>
            <h3 className="font-display text-lg text-ink-charcoal mb-1">输入关键字开始查询</h3>
            <p className="text-sm text-ink-warm">
              支持客户姓名、联系电话、订单编号进行搜索
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function OrderResultCard({ order }: { order: Order }) {
  return (
    <div className="card-gold overflow-hidden">
      <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={order.status} />
            <span className="font-mono text-sm text-ink-warm">{order.orderNo}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <InfoItem icon={<User className="w-4 h-4" />} label="客户" value={order.customer.name} />
            <InfoItem icon={<Phone className="w-4 h-4" />} label="电话" value={order.customer.phone} />
            <InfoItem icon={<Calendar className="w-4 h-4" />} label="拍摄日期" value={order.shootDate} />
            <InfoItem icon={<Package className="w-4 h-4" />} label="套餐" value={order.packageInfo.name} />
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-warm">
            <span>当前状态：</span>
            <span className="text-ink-charcoal font-medium">{ORDER_STATUS_LABELS[order.status]}</span>
            {order.statusHistory.length > 0 && (
              <>
                <span>·</span>
                <span>最近更新：{new Date(order.statusHistory[order.statusHistory.length - 1].timestamp).toLocaleString('zh-CN')}</span>
              </>
            )}
            {order.shipping && (
              <>
                <span>·</span>
                <Truck className="w-3.5 h-3.5" />
                <span>{order.shipping.company} {order.shipping.trackingNo}</span>
              </>
            )}
          </div>
        </div>
        <Link to={`/orders/${order.id}`} className="btn-secondary flex items-center gap-1.5 justify-center lg:w-auto">
          查看详情
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="bg-champagne-50/50 px-5 py-3 border-t border-champagne-100">
        <div className="flex items-center gap-6 flex-wrap text-xs">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-champagne-500" />
            照片总数 <span className="font-mono font-semibold">{order.photos.length}</span> 张
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-champagne-500" />
            入册 <span className="font-mono font-semibold text-champagne-600">{order.photos.filter(p => p.mark === 'album').length}</span> 张
          </span>
          <span className="flex items-center gap-1.5">
            <SparkleIcon className="w-3.5 h-3.5 text-rose-400" />
            精修 <span className="font-mono font-semibold text-rose-400">{order.photos.filter(p => p.mark === 'retouch').length}</span> 张
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-champagne-500">{icon}</span>
      <span className="text-ink-warm">{label}：</span>
      <span className="text-ink-charcoal font-medium truncate">{value}</span>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2L12 3z" />
    </svg>
  );
}
