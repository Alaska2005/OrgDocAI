// src/components/shared/AppLayout.jsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, FileText, BarChart2,
  Bot, LogOut, Bell, Search, Moon, Sun, ChevronLeft,
  ChevronRight, Menu,
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

const QUICK_LINKS = [
  { to: '/events?category=Technology', label: 'Tech Events',     emoji: '💻' },
  { to: '/events?category=Science',    label: 'Science Events',  emoji: '🔬' },
];

export default function AppLayout() {
  const [dark,      setDark]      = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { organization, user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  const initials = organization?.name
    ? organization.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'ORG';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Current page title for topbar
  const pageTitle = NAV_ITEMS.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label || 'Dashboard';

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>

      {/* ─── Sidebar ─────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 224 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="relative bg-white border-r border-gray-100 flex flex-col h-full z-20 flex-shrink-0 overflow-hidden"
      >
        {/* ── Logo ─────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 py-5 h-16 flex-shrink-0">
          <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white font-heading font-bold text-sm">O</span>
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{   opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-heading font-bold text-gray-900 whitespace-nowrap overflow-hidden"
              >
                OrgDoc <span className="text-purple-500">AI</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* ── Collapse toggle button ────────────────────── */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-14 w-6 h-6 bg-white border border-gray-200 rounded-full
                     flex items-center justify-center shadow-sm z-30
                     hover:bg-purple-50 hover:border-purple-300 hover:text-purple-500
                     text-gray-400 transition-all"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* ── Nav items ────────────────────────────────── */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-150 cursor-pointer group relative
                 ${isActive
                   ? 'bg-purple-500 text-white'
                   : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className="flex-shrink-0" />

                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{   opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {badge && !collapsed && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                      ${isActive ? 'bg-purple-400 text-white' : 'bg-purple-100 text-purple-600'}`}>
                      {badge}
                    </span>
                  )}

                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white
                                    text-xs font-medium rounded-lg whitespace-nowrap
                                    opacity-0 group-hover:opacity-100 pointer-events-none
                                    transition-opacity duration-150 z-50 shadow-lg">
                      {label}
                      {badge && (
                        <span className="ml-1.5 bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Quick Links section */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{   opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 pb-1">
                  <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider px-3">
                    Quick Links
                  </p>
                </div>
                {QUICK_LINKS.map(({ to, label, emoji }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                               text-gray-500 hover:bg-purple-50 hover:text-purple-600
                               transition-all duration-150 cursor-pointer"
                  >
                    <span className="text-base flex-shrink-0">{emoji}</span>
                    <span className="whitespace-nowrap">{label}</span>
                  </NavLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── Org footer ───────────────────────────────── */}
        <div className="p-2 border-t border-gray-100 flex-shrink-0">
          {/* Org pill */}
          <div className={`flex items-center gap-2.5 p-2.5 bg-purple-50 rounded-xl
                          cursor-pointer hover:bg-purple-100 transition-colors
                          ${collapsed ? 'justify-center' : ''}`}
               title={collapsed ? organization?.name : undefined}>
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center
                            justify-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{   opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0 overflow-hidden"
                >
                  <p className="text-xs font-semibold text-gray-900 truncate">{organization?.name}</p>
                  <p className="text-[10px] text-gray-400">{user?.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={`mt-1.5 w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium
                       text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all
                       ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={14} className="flex-shrink-0" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{   opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Sign out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* ─── Main ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center gap-4 px-6 flex-shrink-0">
          {/* Mobile menu / collapse toggle for small screens */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="md:hidden w-9 h-9 rounded-xl border border-gray-200 flex items-center
                       justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all"
          >
            <Menu size={16} />
          </button>

          <div className="flex-1">
            <h1 className="font-heading font-bold text-lg text-gray-900">
              {pageTitle}
            </h1>
          </div>

          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200
                          rounded-xl px-3 py-2 w-52
                          focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100
                          transition-all">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              placeholder="Search..."
              className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center
                         text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="relative w-9 h-9 rounded-xl border border-gray-200 flex items-center
                               justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border-2 border-white" />
            </button>

            <div className="hidden sm:flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full cursor-pointer">
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