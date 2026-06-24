// src/components/shared/AppLayout.jsx
import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, FileText, BarChart2,
  Bot, LogOut, Bell, Search, Moon, Sun, ChevronLeft,
  ChevronRight, Menu, X, CalendarCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from 'react-query';
import useAuthStore from '../../store/authStore';
import { eventsAPI } from '../../utils/api';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/events',    label: 'Events',       icon: CalendarDays },
  { to: '/documents', label: 'Documents',    icon: FileText },
  { to: '/analytics', label: 'Analytics',    icon: BarChart2 },
  { to: '/chat',      label: 'AI Assistant', icon: Bot, badge: 'AI' },
];

const CAT_COLORS = {
  Technology: 'bg-purple-100 text-purple-700',
  Science:    'bg-emerald-100 text-emerald-700',
  Arts:       'bg-pink-100 text-pink-700',
  Sports:     'bg-amber-100 text-amber-700',
  Workshop:   'bg-blue-100 text-blue-700',
};

// ─── Global Search ────────────────────────────────────────
function GlobalSearch({ onClose }) {
  const [query,  setQuery]  = useState('');
  const [open,   setOpen]   = useState(false);
  const navigate            = useNavigate();
  const inputRef            = useRef(null);
  const wrapperRef          = useRef(null);

  const { data, isFetching } = useQuery(
    ['globalSearch', query],
    () => eventsAPI.list({ search: query, limit: 6 }).then((r) => r.data),
    { enabled: query.trim().length >= 2, keepPreviousData: true }
  );

  const results = data?.events || [];

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (eventId) => {
    navigate(`/events/${eventId}`);
    setQuery('');
    setOpen(false);
    onClose?.();
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className={`flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2 transition-all duration-200
                       ${open ? 'border-purple-400 ring-2 ring-purple-100 bg-white' : 'border-gray-200'}`}>
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search events..."
          className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="text-gray-300 hover:text-gray-500">
            <X size={13} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 w-full md:w-96"
          >
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isFetching ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
              </span>
              <Link to={`/events?search=${query}`} onClick={() => setOpen(false)}
                    className="text-xs text-purple-500 font-semibold hover:underline">
                View all →
              </Link>
            </div>

            {results.length === 0 && !isFetching ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-sm font-medium text-gray-500">No events found</p>
              </div>
            ) : (
              <div className="py-1.5 max-h-64 overflow-y-auto">
                {results.map((event) => {
                  const catStyle = CAT_COLORS[event.category] || 'bg-gray-100 text-gray-600';
                  return (
                    <button key={event.id} onClick={() => handleSelect(event.id)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-left group">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <CalendarCheck size={16} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${catStyle}`}>{event.category}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{event.description}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── App Layout ───────────────────────────────────────────
export default function AppLayout() {
  const [dark,        setDark]        = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const { organization, user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); setMobileSearch(false); }, [location.pathname]);

  const initials = organization?.name
    ? organization.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'ORG';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const pageTitle = NAV_ITEMS.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label || 'Dashboard';

  // Shared sidebar content
  const SidebarContent = ({ onNavClick }) => (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5 h-16 flex-shrink-0">
        <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-white font-heading font-bold text-sm">O</span>
        </div>
        {!collapsed && (
          <span className="font-heading font-bold text-gray-900 whitespace-nowrap">
            OrgDoc <span className="text-purple-500">AI</span>
          </span>
        )}
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end}
                   onClick={onNavClick}
                   className={({ isActive }) =>
                     `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group
                      ${isActive ? 'bg-purple-500 text-white' : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600'}`}>
            {({ isActive }) => (
              <>
                <Icon size={17} className="flex-shrink-0" />
                {!collapsed && <span className="flex-1 whitespace-nowrap">{label}</span>}
                {badge && !collapsed && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                    ${isActive ? 'bg-purple-400 text-white' : 'bg-purple-100 text-purple-600'}`}>{badge}</span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium
                                  rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">{label}</div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-100 flex-shrink-0">
        <div className={`flex items-center gap-2.5 p-2.5 bg-purple-50 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{organization?.name}</p>
              <p className="text-[10px] text-gray-400">{user?.role}</p>
            </div>
          )}
        </div>
        <button onClick={handleLogout}
                className={`mt-1.5 w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-400
                           hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={14} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 224 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex relative bg-white border-r border-gray-100 flex-col h-full z-20 flex-shrink-0 overflow-hidden"
      >
        <button onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-4 top-12 w-8 h-8 bg-purple-500 border-2 border-white rounded-full
                           flex items-center justify-center shadow-md z-30 hover:bg-purple-600 text-white transition-all">
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
        <SidebarContent />
      </motion.aside>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-30 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-64 bg-white z-40 flex flex-col md:hidden shadow-2xl"
            >
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 md:h-16 bg-white border-b border-gray-100 flex items-center gap-3 px-4 md:px-6 flex-shrink-0">
          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(true)}
                  className="md:hidden w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all flex-shrink-0">
            <Menu size={16} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-base md:text-lg text-gray-900 truncate">{pageTitle}</h1>
          </div>

          {/* Desktop search */}
          <div className="hidden md:block w-64">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Mobile search toggle */}
            <button onClick={() => setMobileSearch(!mobileSearch)}
                    className="md:hidden w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all">
              <Search size={16} />
            </button>

            <button onClick={() => setDark(!dark)}
                    className="hidden md:flex w-9 h-9 rounded-xl border border-gray-200 items-center justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="relative w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-500 transition-all">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border-2 border-white" />
            </button>

            <div className="hidden sm:flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full">
              <div className="w-7 h-7 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">{initials}</div>
              <span className="text-sm font-semibold text-gray-800 max-w-24 truncate hidden lg:block">{organization?.name}</span>
            </div>
          </div>
        </header>

        {/* Mobile search bar */}
        <AnimatePresence>
          {mobileSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-b border-gray-100 px-4 py-2 overflow-hidden"
            >
              <GlobalSearch onClose={() => setMobileSearch(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 bg-purple-50 pb-20 md:pb-6">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }} className="max-w-7xl mx-auto">
            <Outlet />
          </motion.div>
        </main>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 flex items-center justify-around px-2 py-2 safe-area-pb">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
                     className={({ isActive }) =>
                       `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                         isActive ? 'text-purple-600' : 'text-gray-400'
                       }`}>
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-purple-100' : ''
                  }`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-medium">{label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

      </div>
    </div>
  );
}