// src/components/layout/Navbar.jsx
import { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut, User as UserIcon, Clock3, Flame } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setMobileNavOpen } from '../../redux/uiSlice';
import { logout } from '../../redux/authSlice';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../common/ThemeToggle';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt md:hidden"
          onClick={() => dispatch(setMobileNavOpen(true))}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="gradient-brand flex h-7 w-7 items-center justify-center rounded-md text-white shadow-sm">
            <Clock3 size={16} />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-ink">
            Timeliner
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface-alt"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary">
              <UserIcon size={14} />
            </span>
            <span className="hidden max-w-[10rem] truncate sm:inline">{user?.name}</span>
            <ChevronDown size={14} className="text-ink-muted" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface py-1 shadow-popover animate-fade-in">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/settings');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-alt"
              >
                <UserIcon size={15} /> Profile &amp; settings
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/leetcode');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-alt"
              >
                <Flame size={15} className="text-flame" /> LeetCode reminder
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-urgent hover:bg-surface-alt"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
