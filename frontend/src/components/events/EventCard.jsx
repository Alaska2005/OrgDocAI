// src/components/events/EventCard.jsx
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Sheet, Image, ArrowRight, Calendar } from 'lucide-react';

const CAT_STYLES = {
  Technology: 'bg-purple-100 text-purple-700',
  Science:    'bg-emerald-100 text-emerald-700',
  Arts:       'bg-pink-100 text-pink-700',
  Sports:     'bg-amber-100 text-amber-700',
  Workshop:   'bg-blue-100 text-blue-700',
};

const CAT_COLORS = {
  Technology: '#6C63FF',
  Science:    '#1D9E75',
  Arts:       '#D4537E',
  Sports:     '#BA7517',
  Workshop:   '#2563EB',
};

export default function EventCard({ event }) {
  const color    = CAT_COLORS[event.category] || '#6C63FF';
  const style    = CAT_STYLES[event.category]  || 'bg-gray-100 text-gray-700';
  const counts   = event.fileCounts || {};
  const initials = event.coordinator?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <Link to={`/events/${event.id}`}>
      <div className="card overflow-hidden hover:shadow-card-hover transition-all duration-200
                      hover:-translate-y-0.5 group cursor-pointer h-full flex flex-col">
        {/* Color bar */}
        <div className="h-1.5 w-full" style={{ background: color }} />

        <div className="p-4 flex flex-col flex-1">
          {/* Category + arrow row */}
          <div className="flex items-center justify-between mb-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${style}`}>
              {event.category}
            </span>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white
                             group-hover:rotate-45 transition-transform duration-200 flex-shrink-0"
                  style={{ background: color }}>
              <ArrowRight size={13} />
            </span>
          </div>

          {/* Title */}
          <h4 className="font-heading font-bold text-sm md:text-base text-gray-900 mb-1.5 leading-snug line-clamp-2">
            {event.title}
          </h4>

          {/* Description */}
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 flex-1 mb-3">
            {event.description}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
            <span className="flex items-center gap-1.5">
              <Calendar size={11} className="text-gray-300" />
              {format(new Date(event.date), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                   style={{ background: color }}>
                {initials}
              </div>
              <span className="truncate max-w-20">{event.coordinator?.split(' ')[0]}</span>
            </span>
          </div>

          {/* File counts */}
          {(counts.DOCUMENT > 0 || counts.SPREADSHEET > 0 || counts.IMAGE > 0) && (
            <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100">
              {(counts.DOCUMENT || 0) > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                  <FileText size={10} /> {counts.DOCUMENT}
                </span>
              )}
              {(counts.SPREADSHEET || 0) > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                  <Sheet size={10} /> {counts.SPREADSHEET}
                </span>
              )}
              {(counts.IMAGE || 0) > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                  <Image size={10} /> {counts.IMAGE}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}