// src/components/shared/AppLayout.jsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, FileText, BarChart2,
  Bot, Settings, LogOut, Bell, Search, Moon, Sun,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/events',    label: 'Events',       icon: CalendarDays },
  { to: '/documents', label: 'Documents',    icon: FileText },
  { to: '/analytics', label: 'Analytics',    icon: BarChart2 },
  { to: '/chat',      label: 'AI Assistant', icon: Bot, badge: 'AI' },
];

export default function AppLayout() {
  const [dark, setDark] = useState(false);
  const { organization, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials = organization?.name
    ? organization.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'ORG';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>
      {/* ─── Sidebar ───────────────────────────────────── */}
      <aside className="w-56 min-w-56 bg-white border-r border-gray-100 flex flex-col h-full z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-heading font-bold text-sm">O</span>
          </div>
          <span className="font-heading font-bold text-gray-900">
            OrgDoc <span className="text-purple-500">AI</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="bg-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}

          <div className="pt-3 pb-1">
            <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider px-3">
              Quick Links
            </p>
          </div>
          <NavLink to="/events?category=Technology" className="nav-link">
            <span className="text-base">💻</span> Tech Events
          </NavLink>
          <NavLink to="/events?category=Science" className="nav-link">
            <span className="text-base">🔬</span> Science Events
          </NavLink>
        </nav>

        {/* Org footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 p-2.5 bg-purple-50 rounded-xl cursor-pointer hover:bg-purple-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{organization?.name}</p>
              <p className="text-[10px] text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center gap-4 px-6 flex-shrink-0">
          <div className="flex-1">
            <h1 className="font-heading font-bold text-lg text-gray-900" id="page-title">
              Dashboard
            </h1>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-52 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              placeholder="Search..."
              className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="relative w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">
                {initials}
              </div>
              <span className="text-sm font-semibold text-gray-800 max-w-24 truncate">
                {organization?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-purple-50">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
