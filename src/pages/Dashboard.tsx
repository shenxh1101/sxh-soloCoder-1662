import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  ImagePlus,
  Search,
  BarChart3,
  CheckCircle2,
  Star,
  Activity,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '@/api/client';
import { ORDER_STATUS_LABELS, type Order, type OrderStatus } from '@shared/types';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: string;
}

function StatCard({ icon, label, value, accent = 'from-champagne-500 to-champagne-600' }: StatCardProps) {
  return (
    <div className="card-gold p-5 relative overflow-hidden group">
      <div className={cn('absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity', accent)} />
      <div className="relative">
        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-3', accent)}>
          {icon}
        </div>
        <div className="text-sm text-ink-warm mb-1">{label}</div>
        <div className="font-display text-3xl font-semibold text-ink-charcoal">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrders().then((data) => {
      setOrders(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const inProgressCount = orders.filter((o) =>
    ['selecting', 'retouching', 'layouting', 'producing', 'shipping'].includes(o.status)
  ).length;

  const pendingSelectionCount = orders.filter((o) => o.status === 'pending_selection').length;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = orders.filter(
    (o) => o.status === 'completed' && new Date(o.updatedAt) >= thisMonthStart
  ).length;

  const completedOrders = orders.filter((o) => o.satisfaction !== undefined);
  const avgSatisfaction = completedOrders.length > 0
    ? (completedOrders.reduce((sum, o) => sum + (o.satisfaction || 0), 0) / completedOrders.length).toFixed(1)
    : '-';

  const recentActivities = [...orders]
    .flatMap((o) => o.statusHistory.map((log) => ({ ...log, orderId: o.id, customerName: o.customer.name, orderNo: o.orderNo })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const formatDate = (date: Date) => {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
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
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-champagne-500" />
            <span className="text-sm text-ink-warm">{formatDate(new Date())}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink-charcoal mb-1">
            欢迎回来，<span className="text-gradient-gold">典雅影像</span>
          </h1>
          <p className="text-ink-warm">今天也要用心记录每一份美好时光</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="进行中订单"
          value={loading ? '...' : inProgressCount}
          accent="from-champagne-500 to-champagne-600"
        />
        <StatCard
          icon={<ImagePlus className="w-5 h-5" />}
          label="待选片订单"
          value={loading ? '...' : pendingSelectionCount}
          accent="from-amber-400 to-amber-500"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="本月完成订单"
          value={loading ? '...' : completedThisMonth}
          accent="from-emerald-400 to-emerald-500"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="客户满意度均值"
          value={loading ? '...' : avgSatisfaction}
          accent="from-rose-400 to-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-children">
        <button
          onClick={() => navigate('/orders/new')}
          className="card-gold p-5 text-left group hover:border-champagne-400 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-champagne-500 to-champagne-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <ImagePlus className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-display text-lg font-semibold text-ink-charcoal mb-0.5">新建订单</div>
              <div className="text-sm text-ink-warm">快速创建客户订单</div>
            </div>
            <ArrowRight className="w-5 h-5 text-champagne-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => navigate('/orders')}
          className="card-gold p-5 text-left group hover:border-champagne-400 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Search className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-display text-lg font-semibold text-ink-charcoal mb-0.5">进度查询</div>
              <div className="text-sm text-ink-warm">追踪订单制作状态</div>
            </div>
            <ArrowRight className="w-5 h-5 text-champagne-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => navigate('/orders')}
          className="card-gold p-5 text-left group hover:border-champagne-400 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-display text-lg font-semibold text-ink-charcoal mb-0.5">统计报表</div>
              <div className="text-sm text-ink-warm">查看经营数据统计</div>
            </div>
            <ArrowRight className="w-5 h-5 text-champagne-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      <div className="card-gold p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-champagne-400 to-champagne-500 flex items-center justify-center text-white">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-charcoal">最近动态</h2>
              <p className="text-xs text-ink-warm">订单状态变更记录</p>
            </div>
          </div>
          <button onClick={() => navigate('/orders')} className="btn-ghost text-sm flex items-center gap-1">
            查看全部 <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="gold-divider mb-5" />

        {loading ? (
          <div className="py-12 text-center text-ink-warm">加载中...</div>
        ) : recentActivities.length === 0 ? (
          <div className="py-12 text-center text-ink-warm">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无动态记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((log, idx) => (
              <div
                key={`${log.orderId}-${idx}`}
                className="flex items-start gap-4 p-3 rounded-xl hover:bg-cream/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/orders/${log.orderId}`)}
              >
                <div className="relative mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-champagne-500 ring-4 ring-champagne-100" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-ink-charcoal">{log.customerName}</span>
                    <span className="text-xs text-ink-warm">{log.orderNo}</span>
                    <span className={cn('badge border', getStatusBadgeClass(log.status))}>
                      {ORDER_STATUS_LABELS[log.status]}
                    </span>
                  </div>
                  <p className="text-sm text-ink-warm">
                    订单状态更新为「{ORDER_STATUS_LABELS[log.status]}」
                    {log.operator && <span className="ml-2">· 操作人：{log.operator}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-ink-warm shrink-0">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {new Date(log.timestamp).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
}
