// src/components/dashboard/Dashboard.jsx
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, FileText, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { analyticsAPI, eventsAPI } from '../../utils/api';
import useAuthStore from '../../store/authStore';
import EventCard from '../events/EventCard';

const STAT_CARDS = [
  { key: 'totalEvents',  label: 'Total Events', icon: CalendarDays, color: 'purple', link: '/events' },
  { key: 'totalFiles',   label: 'Documents',    icon: FileText,     color: 'pink',   link: '/documents' },
  { key: 'totalMembers', label: 'Members',      icon: Users,        color: 'green',  link: null },
];

const colorMap = {
  purple: 'bg-purple-100 text-purple-600',
  pink:   'bg-pink-100 text-pink-600',
  green:  'bg-emerald-100 text-emerald-600',
};

export default function Dashboard() {
  const { organization } = useAuthStore();

  const { data: analytics } = useQuery('analytics', () =>
    analyticsAPI.get().then((r) => r.data)
  );

  const { data: eventsData } = useQuery('recentEvents', () =>
    eventsAPI.list({ limit: 6 }).then((r) => r.data)
  );

  const events = eventsData?.events || [];
  const summary = analytics?.summary || {};
  const recentActivity = analytics?.recentActivity || [];

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h2 className="font-heading font-bold text-xl md:text-2xl text-gray-900">
          Welcome back, {organization?.name}
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Here's an overview of your organization's documentation.
        </p>
      </div>

      {/* Stat Cards — 3 cols on desktop, 1 row scrollable on mobile */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, link }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link to={link || '#'} className="block">
              <div className="card p-3 md:p-5 hover:shadow-card-hover transition-shadow cursor-pointer">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 md:mb-3 ${colorMap[color]}`}>
                  <Icon size={16} className="md:hidden" />
                  <Icon size={20} className="hidden md:block" />
                </div>
                <p className="text-[10px] md:text-xs font-medium text-gray-400 mb-1">{label}</p>
                <p className="font-heading font-bold text-2xl md:text-3xl text-gray-900">
                  {summary[key] ?? '—'}
                </p>
                <p className="text-[10px] md:text-xs text-emerald-500 mt-1 flex items-center gap-1">
                  <TrendingUp size={10} /> Today
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent Events — 1 col on mobile, 3 on desktop */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-base text-gray-900">Recent Events</h3>
          <Link to="/events" className="text-purple-500 text-xs font-semibold flex items-center gap-1 hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {events.slice(0, 3).map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div>
        <h3 className="font-heading font-bold text-base text-gray-900 mb-3">Recent Activity</h3>
        <div className="card p-4 md:p-5 space-y-4">
          {recentActivity.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
          )}
          {recentActivity.map((log, i) => (
            <div key={log.id} className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-xs flex-shrink-0 relative">
                {''}
                {i < recentActivity.length - 1 && (
                  <span className="absolute top-full left-1/2 -translate-x-1/2 w-px h-4 bg-gray-100" />
                )}
              </div>
              <div className="flex-1 pt-0.5 min-w-0">
                <p className="text-sm font-medium text-gray-800">{log.details || log.action}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(log.createdAt), 'MMM d · h:mm a')} · {log.user?.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}