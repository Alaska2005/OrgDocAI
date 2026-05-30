// src/components/analytics/AnalyticsPage.jsx
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsAPI } from '../../utils/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#6C63FF','#F472B6','#1D9E75','#BA7517','#2563EB'];

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb > 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 / 1024;
  if (mb > 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery('analytics', () =>
    analyticsAPI.get().then((r) => r.data)
  );

  const summary = data?.summary || {};
  const filesByType = data?.filesByType || [];
  const eventsByCategory = (data?.eventsByCategory || []).map((e) => ({
    name: e.category,
    value: Number(e._count),
  }));
  const monthlyEvents = (data?.monthlyEvents || []).map((m) => ({
    month: MONTHS[Number(m.month) - 1],
    events: Number(m.count),
  }));

  const storageData = filesByType.map((f) => ({
    type: f.type,
    count: f._count,
    size: formatBytes(f._sum.size),
    rawSize: f._sum.size || 0,
  }));

  const totalStorage = storageData.reduce((acc, f) => acc + f.rawSize, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card h-48 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-gray-900">Analytics</h2>
        <p className="text-gray-400 text-sm mt-0.5">Organization insights and usage statistics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Events',   value: summary.totalEvents   || 0, icon: '📅', color: 'purple' },
          { label: 'Documents',      value: summary.totalFiles    || 0, icon: '📄', color: 'pink'   },
          { label: 'Members',        value: summary.totalMembers  || 0, icon: '👥', color: 'green'  },
          { label: 'Storage Used',   value: formatBytes(totalStorage), icon: '💾', color: 'amber'  },
        ].map(({ label, value, icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="card p-4">
              <span className="text-2xl">{icon}</span>
              <p className="text-xs text-gray-400 mt-2 font-medium">{label}</p>
              <p className="font-heading font-bold text-2xl text-gray-900 mt-0.5">{value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Monthly Events Bar Chart */}
        <div className="card p-5">
          <h3 className="font-heading font-bold text-sm text-gray-900 mb-4">Events per Month (2025)</h3>
          {monthlyEvents.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyEvents} barSize={18}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                  cursor={{ fill: '#EEEDFE' }}
                />
                <Bar dataKey="events" fill="#6C63FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Events by Category Pie */}
        <div className="card p-5">
          <h3 className="font-heading font-bold text-sm text-gray-900 mb-4">Events by Category</h3>
          {eventsByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={eventsByCategory}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {eventsByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Storage by File Type */}
      <div className="card p-5">
        <h3 className="font-heading font-bold text-sm text-gray-900 mb-4">Storage Breakdown</h3>
        {storageData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No files uploaded yet</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {storageData.map((item, i) => {
              const icons = { DOCUMENT: '📄', SPREADSHEET: '📊', IMAGE: '🖼️', VIDEO: '🎥' };
              const colors = ['bg-purple-50 border-purple-100', 'bg-emerald-50 border-emerald-100', 'bg-pink-50 border-pink-100', 'bg-amber-50 border-amber-100'];
              return (
                <div key={item.type} className={`p-4 rounded-xl border text-center ${colors[i % colors.length]}`}>
                  <div className="text-2xl mb-1">{icons[item.type] || '📁'}</div>
                  <p className="font-heading font-bold text-lg text-gray-900">{item.size}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.type}</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">{item.count} files</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
