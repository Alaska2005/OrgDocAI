// src/components/events/EventsPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Search, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsAPI } from '../../utils/api';
import EventCard from './EventCard';

const CATEGORIES = ['All', 'Technology', 'Science', 'Arts', 'Sports', 'Workshop'];
const YEARS      = ['All', '2026', '2025', '2024', '2023'];

export default function EventsPage() {
  const qc = useQueryClient();
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('All');
  const [year,      setYear]      = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', date: '', category: 'Technology', coordinator: '', tags: '',
  });

  const { data, isLoading } = useQuery(
    ['events', search, category, year],
    () => eventsAPI.list({
      search:   search   || undefined,
      category: category !== 'All' ? category : undefined,
      year:     year     !== 'All' ? year     : undefined,
    }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    (data) => eventsAPI.create(data),
    {
      onSuccess: () => {
        qc.invalidateQueries('events');
        toast.success('Event created successfully');
        setShowModal(false);
        setForm({ title: '', description: '', date: '', category: 'Technology', coordinator: '', tags: '' });
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to create event'),
    }
  );

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      date: new Date(form.date).toISOString(),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  const events = data?.events || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl text-gray-900">Events</h2>
          <p className="text-gray-400 text-sm mt-0.5">{data?.pagination?.total || 0} events total</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Event
        </button>
      </div>

      {/* Filters */}
      <div className="card px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-48
                        focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            placeholder="Search events..."
            className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all
                                ${category === c
                                  ? 'bg-purple-500 text-white border-purple-500'
                                  : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-500'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Year chips */}
        <div className="ml-auto flex items-center gap-1.5">
          {YEARS.map((y) => (
            <button key={y} onClick={() => setYear(y)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all
                                ${year === y
                                  ? 'bg-purple-500 text-white border-purple-500'
                                  : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-52 animate-pulse bg-gray-100" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <CalendarDays size={24} className="text-gray-300" />
          </div>
          <p className="font-heading font-bold text-gray-600">No events found</p>
          <p className="text-sm text-gray-400 mt-1">Try changing your filters or create a new event.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {events.map((event, i) => (
            <motion.div key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}>
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-bold text-lg text-gray-900">Create New Event</h3>
                <button onClick={() => setShowModal(false)}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Event Title *</label>
                    <input className="input" placeholder="e.g. AI Workshop" required
                           value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Category *</label>
                    <select className="input" value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      {['Technology', 'Science', 'Arts', 'Sports', 'Workshop'].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Description *</label>
                  <textarea className="input min-h-20 resize-none" placeholder="Describe the event..." required
                            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Date *</label>
                    <input className="input" type="date" required
                           value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Coordinator *</label>
                    <input className="input" placeholder="e.g. Rahul Kumar" required
                           value={form.coordinator} onChange={(e) => setForm({ ...form, coordinator: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="label">Tags (comma-separated)</label>
                  <input className="input" placeholder="ML, Python, AI"
                         value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                  <button type="submit" className="btn-primary" disabled={createMutation.isLoading}>
                    {createMutation.isLoading ? 'Creating...' : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}