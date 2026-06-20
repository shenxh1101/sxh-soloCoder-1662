import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  User,
  Phone,
  Camera,
  Package,
  CalendarDays,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { api } from '@/api/client';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEP,
  type Order,
  type OrderStatus,
  type Photographer,
} from '@shared/types';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';

const STATUS_FLOW: OrderStatus[] = [
  'pending_selection',
  'retouching',
  'layouting',
  'producing',
  'shipping',
  'completed',
];

const STATUS_LABELS_SHORT: Record<OrderStatus, string> = {
  pending_selection: '待选片',
  selecting: '选片',
  selected: '已选片',
  retouching: '精修',
  layouting: '排版',
  producing: '制作',
  shipping: '物流',
  completed: '完成',
};

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

function getProgress(order: Order): number {
  const step = ORDER_STATUS_STEP[order.status];
  return Math.round((step / 5) * 100);
}

export default function OrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [photographerFilter, setPhotographerFilter] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPhotographerDropdown, setShowPhotographerDropdown] = useState(false);

  useEffect(() => {
    api.getPhotographers().then(setPhotographers).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const filters: { status?: OrderStatus; photographerId?: string; keyword?: string } = {};
    if (statusFilter) filters.status = statusFilter;
    if (photographerFilter) filters.photographerId = photographerFilter;
    if (keyword.trim()) filters.keyword = keyword.trim();

    api.getOrders(filters)
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter, photographerFilter, keyword]);

  const filteredOrders = orders;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-semibold text-ink-charcoal">订单管理</h1>
          <p className="text-sm text-ink-warm mt-0.5">查看和管理所有客户订单</p>
        </div>
        <button onClick={() => navigate('/orders/new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4.5 h-4.5" />
          新建订单
        </button>
      </div>

      <div className="card-gold p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-warm" />
            <input
              type="text"
              placeholder="搜索客户姓名、手机号、订单号..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowPhotographerDropdown(false);
              }}
              className="btn-secondary flex items-center gap-2 min-w-[160px] justify-between"
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                {statusFilter ? ORDER_STATUS_LABELS[statusFilter] : '全部状态'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-champagne-200 shadow-soft z-20 py-1.5">
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setShowStatusDropdown(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-cream transition-colors',
                    !statusFilter && 'text-champagne-700 bg-champagne-50'
                  )}
                >
                  全部状态
                </button>
                {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setShowStatusDropdown(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-cream transition-colors',
                      statusFilter === s && 'text-champagne-700 bg-champagne-50'
                    )}
                  >
                    {ORDER_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowPhotographerDropdown(!showPhotographerDropdown);
                setShowStatusDropdown(false);
              }}
              className="btn-secondary flex items-center gap-2 min-w-[160px] justify-between"
            >
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {photographerFilter
                  ? photographers.find((p) => p.id === photographerFilter)?.name || '全部摄影顾问'
                  : '全部摄影顾问'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showPhotographerDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-champagne-200 shadow-soft z-20 py-1.5">
                <button
                  onClick={() => {
                    setPhotographerFilter('');
                    setShowPhotographerDropdown(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-cream transition-colors',
                    !photographerFilter && 'text-champagne-700 bg-champagne-50'
                  )}
                >
                  全部摄影顾问
                </button>
                {photographers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPhotographerFilter(p.id);
                      setShowPhotographerDropdown(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-cream transition-colors',
                      photographerFilter === p.id && 'text-champagne-700 bg-champagne-50'
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink-warm">加载中...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="card-gold py-20 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-20 text-champagne-500" />
          <p className="text-ink-warm">暂无订单数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="card-gold p-5 cursor-pointer group hover:border-champagne-400 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-display text-lg font-semibold text-ink-charcoal flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-champagne-500" />
                    {order.customer.name}
                  </div>
                  <div className="text-xs text-ink-warm mt-0.5">{order.orderNo}</div>
                </div>
                <span className={cn('badge border', getStatusBadgeClass(order.status))}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-ink-warm">
                  <Phone className="w-4 h-4" />
                  {order.customer.phone}
                </div>
                <div className="flex items-center gap-2 text-ink-warm">
                  <Camera className="w-4 h-4" />
                  {order.photographerName || '未指派'}
                </div>
                <div className="flex items-center gap-2 text-ink-warm">
                  <Package className="w-4 h-4" />
                  {order.packageInfo.name}
                </div>
                <div className="flex items-center gap-2 text-ink-warm">
                  <CalendarDays className="w-4 h-4" />
                  {new Date(order.shootDate).toLocaleDateString('zh-CN')}
                </div>
              </div>

              <div className="gold-divider my-4" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-ink-warm">制作进度</span>
                  <span className="text-xs font-medium text-champagne-700">{getProgress(order)}%</span>
                </div>
                <div className="relative h-2 rounded-full bg-cream overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-champagne-400 to-champagne-500 transition-all duration-500"
                    style={{ width: `${getProgress(order)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {STATUS_FLOW.map((s, idx) => (
                    <div
                      key={s}
                      className={cn(
                        'text-[10px] text-center',
                        ORDER_STATUS_STEP[order.status] >= ORDER_STATUS_STEP[s]
                          ? 'text-champagne-700 font-medium'
                          : 'text-ink-warm/50'
                      )}
                    >
                      {STATUS_LABELS_SHORT[s]}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-champagne-50 text-xs text-ink-warm">
                创建于 {new Date(order.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </Layout>
  );
}
