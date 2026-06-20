import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Camera, Star, Users, Award, ChevronDown } from 'lucide-react';
import { api } from '@/api/client';
import type { PhotographerStats } from '@shared/types';
import Layout from '@/components/Layout';

const currentMonth = new Date().toISOString().slice(0, 7);

function generateMonthOptions() {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(d.toISOString().slice(0, 7));
  }
  return result;
}

export default function Statistics() {
  const [month, setMonth] = useState(currentMonth);
  const [stats, setStats] = useState<PhotographerStats[]>([]);
  const [loading, setLoading] = useState(true);

  const monthOptions = generateMonthOptions();

  useEffect(() => {
    setLoading(true);
    api
      .getStatistics(month)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [month]);

  const totals = stats.reduce(
    (acc, s) => ({
      orders: acc.orders + s.orderCount,
      photos: acc.photos + s.totalPhotos,
      retouch: acc.retouch + s.retouchPhotos,
      satSum: acc.satSum + s.avgSatisfaction * s.orderCount,
    }),
    { orders: 0, photos: 0, retouch: 0, satSum: 0 }
  );
  const avgSat = totals.orders > 0 ? (totals.satSum / totals.orders).toFixed(1) : '0.0';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="section-title">统计报表</h1>
            <p className="subtitle mt-1">按摄影顾问统计业绩数据</p>
          </div>
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-field appearance-none pr-10 py-2.5 bg-white min-w-[140px]"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m.replace('-', '年')}月
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ink-warm pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="订单总数"
            value={totals.orders}
            unit="单"
            gradient="from-champagne-400 to-champagne-600"
          />
          <StatCard
            icon={<Camera className="w-5 h-5" />}
            label="成片总数"
            value={totals.photos}
            unit="张"
            gradient="from-rose-300 to-rose-500"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="精修总数"
            value={totals.retouch}
            unit="张"
            gradient="from-amber-400 to-orange-500"
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label="平均满意度"
            value={avgSat}
            unit="分"
            gradient="from-violet-400 to-violet-600"
          />
        </div>

        <div className="card-gold overflow-hidden">
          <div className="px-6 py-4 border-b border-champagne-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-champagne-500" />
            <h2 className="font-display text-lg text-ink-charcoal">顾问业绩排行</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-ink-warm">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-champagne-50 to-rose-pale/30">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-ink-charcoal w-16">排名</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-ink-charcoal">摄影顾问</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-ink-charcoal">订单数</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-ink-charcoal">成片数</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-ink-charcoal">精修数</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-ink-charcoal">平均满意度</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, idx) => (
                    <tr key={s.photographerId} className={idx % 2 === 1 ? 'bg-ivory/40' : ''}>
                      <td className="px-6 py-4">
                        <RankBadge rank={idx + 1} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-champagne-300 to-champagne-500 text-white flex items-center justify-center font-display text-sm">
                            {s.photographerName.slice(0, 1)}
                          </div>
                          <span className="font-medium text-ink-charcoal">{s.photographerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-ink-charcoal">{s.orderCount}</td>
                      <td className="px-6 py-4 text-right font-mono text-ink-charcoal">{s.totalPhotos}</td>
                      <td className="px-6 py-4 text-right font-mono text-ink-charcoal">{s.retouchPhotos}</td>
                      <td className="px-6 py-4 text-right">
                        <SatisfactionStars score={s.avgSatisfaction} />
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-ink-warm">
                        暂无统计数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {stats.length > 0 && (
          <div className="card-gold p-6">
            <h2 className="font-display text-lg text-ink-charcoal mb-5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-champagne-500" />
              成片数对比
            </h2>
            <div className="space-y-4">
              {stats.map((s) => {
                const max = Math.max(...stats.map((x) => x.totalPhotos), 1);
                const pct = (s.totalPhotos / max) * 100;
                return (
                  <div key={s.photographerId}>
                    <div className="flex justify-between mb-1.5 text-sm">
                      <span className="text-ink-charcoal font-medium">{s.photographerName}</span>
                      <span className="font-mono text-ink-warm">{s.totalPhotos} 张</span>
                    </div>
                    <div className="h-3 bg-cream rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-champagne-400 to-champagne-600 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  gradient: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-warm mb-1">{label}</p>
          <p className="flex items-baseline gap-1">
            <span className={`font-display text-3xl font-semibold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {value}
            </span>
            <span className="text-sm text-ink-warm">{unit}</span>
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-soft`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-white flex items-center justify-center shadow-sm">
        <Award className="w-4 h-4" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-white flex items-center justify-center font-semibold text-sm">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 text-white flex items-center justify-center font-semibold text-sm">
        3
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-cream text-ink-warm flex items-center justify-center font-semibold text-sm">
      {rank}
    </div>
  );
}

function SatisfactionStars({ score }: { score: number }) {
  const full = Math.floor(score);
  return (
    <div className="flex items-center gap-1 justify-end">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= full ? 'text-champagne-500 fill-champagne-500' : 'text-champagne-200'}`}
        />
      ))}
      <span className="ml-1 font-mono text-sm text-ink-charcoal">{score.toFixed(1)}</span>
    </div>
  );
}
