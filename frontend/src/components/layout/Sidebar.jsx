// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutList, CalendarDays, BarChart3, Trash2, Settings, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setMobileNavOpen } from '../../redux/uiSlice';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutList, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/trash', label: 'Trash', icon: Trash2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-l-primary bg-primary-soft text-primary'
                : 'border-l-transparent text-ink-muted hover:bg-surface-alt hover:text-ink'
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const mobileNavOpen = useSelector((state) => state.ui.mobileNavOpen);
  const dispatch = useDispatch();
  const close = () => dispatch(setMobileNavOpen(false));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface py-6 md:flex">
        <NavItems />
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={close} />
          <div className="absolute left-0 top-0 h-full w-64 bg-surface py-6 shadow-popover animate-slide-up">
            <div className="mb-4 flex items-center justify-between px-4">
              <span className="font-display text-sm font-semibold text-ink">Menu</span>
              <button onClick={close} className="rounded-md p-1 text-ink-muted hover:bg-surface-alt">
                <X size={18} />
              </button>
            </div>
            <NavItems onNavigate={close} />
          </div>
        </div>
      )}
    </>
  );
}
