import { NavLink } from 'react-router-dom';
import { Home, FileText, Search, BarChart3, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '工作台', icon: Home },
  { path: '/orders', label: '订单管理', icon: FileText },
  { path: '/query', label: '进度查询', icon: Search },
  { path: '/statistics', label: '统计报表', icon: BarChart3 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-ivory">
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-champagne-100 shrink-0">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-champagne-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-champagne-400 to-champagne-600 shadow-soft">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-ink-charcoal leading-tight">光影纪</h1>
            <p className="text-xs text-ink-warm">婚纱摄影</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-champagne-50 to-champagne-100 text-champagne-700 shadow-soft'
                    : 'text-ink-warm hover:bg-cream hover:text-ink-charcoal'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-champagne-100">
          <div className="text-xs text-ink-warm/60">© 光影纪 · 婚纱摄影</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-h-full p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
