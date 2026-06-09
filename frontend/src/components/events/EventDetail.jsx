// src/components/events/EventDetail.jsx
import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft, FileText, Sheet, Image as ImageIcon, Trash2,
  Download, Eye, X, ChevronLeft, ChevronRight, ZoomIn,
  Calendar, User, Building2, Tag, UploadCloud, File,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsAPI, filesAPI } from '../../utils/api';
import useAuthStore from '../../store/authStore';

const TABS = [
  { id: 'documents',    label: 'Documents',      icon: FileText,   accept: '.pdf,.docx,.doc,.txt' },
  { id: 'spreadsheets', label: 'Excel / Data',   icon: Sheet,      accept: '.xlsx,.xls,.csv' },
  { id: 'images',       label: 'Photos & Media', icon: ImageIcon,  accept: '.jpg,.jpeg,.png,.webp,.gif' },
];

const FILE_META = {
  'application/pdf': { label: 'PDF', color: 'bg-red-50 text-red-600 border-red-100' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  'application/msword': { label: 'DOC', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  'text/plain': { label: 'TXT', color: 'bg-gray-50 text-gray-600 border-gray-100' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'XLSX', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  'application/vnd.ms-excel': { label: 'XLS', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  'text/csv': { label: 'CSV', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
};

// ─── Lightbox ─────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const file = images[current];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25
                         flex items-center justify-center text-white transition-all z-10">
        <X size={20} />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
        {current + 1} / {images.length}
      </div>

      {/* Filename */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center px-4 max-w-sm truncate">
        {file.originalName}
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full
                           bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all">
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Main image */}
      <motion.img
        key={current}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        src={file.url}
        alt={file.originalName}
        className="max-w-[88vw] max-h-[82vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full
                           bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all">
          <ChevronRight size={24} />
        </button>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[88vw] px-2 pb-1">
          {images.map((img, i) => (
            <button key={img.id} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                    className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all
                                ${i === current ? 'border-purple-400 scale-110' : 'border-white/20 opacity-50 hover:opacity-80'}`}>
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────
function UploadZone({ onDrop, accept, loading, progress }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { '*/*': accept.split(',') } : undefined,
    multiple: true,
  });

  return (
    <div {...getRootProps()}
         className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                     ${isDragActive
                       ? 'border-purple-400 bg-purple-50 scale-[1.01]'
                       : 'border-purple-200 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300'}`}>
      <input {...getInputProps()} />
      <UploadCloud size={28} className="mx-auto text-purple-400 mb-2" />
      <p className="text-sm font-medium text-gray-600">
        <span className="text-purple-600 font-semibold">Drag & drop</span> or{' '}
        <span className="text-purple-600 font-semibold">click to browse</span>
      </p>
      <p className="text-xs text-gray-400 mt-1">Supported: {accept}</p>
      {loading && (
        <div className="mt-3">
          <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden w-48 mx-auto">
            <motion.div className="h-full bg-purple-500 rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-purple-500 mt-1">Uploading... {progress}%</p>
        </div>
      )}
    </div>
  );
}

// ─── File Row ─────────────────────────────────────────────
function FileRow({ file, onDelete, isAdmin }) {
  const meta   = FILE_META[file.mimeType] || { label: 'FILE', color: 'bg-gray-50 text-gray-600 border-gray-100' };
  const sizeKB = file.size / 1024;
  const sizeTxt = sizeKB < 1024 ? `${sizeKB.toFixed(0)} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100
                           hover:bg-white hover:shadow-sm transition-all group">
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center
                      justify-center flex-shrink-0 shadow-sm">
        <File size={18} className="text-gray-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{file.originalName}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.color}`}>
            {meta.label}
          </span>
          <span className="text-xs text-gray-400">{sizeTxt}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
          {file.uploadedBy?.name && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">by {file.uploadedBy.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={file.url} target="_blank" rel="noreferrer"
           className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
                      text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-all" title="Preview">
          <Eye size={14} />
        </a>
        <a href={file.url} download={file.originalName}
           className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
                      text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all" title="Download">
          <Download size={14} />
        </a>
        {isAdmin && (
          <button onClick={() => onDelete(file.id)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
                             text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState({ label }) {
  return (
    <div className="text-center py-10">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <File size={20} className="text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500">No {label} uploaded yet</p>
      <p className="text-xs text-gray-400 mt-1">Drag and drop files above to get started</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function EventDetail() {
  const { id }   = useParams();
  const qc       = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin  = user?.role === 'ADMIN';

  const [activeTab,      setActiveTab]      = useState('documents');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading,      setUploading]      = useState(false);
  const [lightboxIndex,  setLightboxIndex]  = useState(null);

  const { data: event, isLoading } = useQuery(
    ['event', id],
    () => eventsAPI.get(id).then((r) => r.data)
  );

  const uploadMutation = useMutation(
    ({ formData }) => filesAPI.uploadMany(id, formData, (p) => setUploadProgress(p)),
    {
      onSuccess: () => { qc.invalidateQueries(['event', id]); toast.success('Files uploaded!'); setUploading(false); setUploadProgress(0); },
      onError:   (err) => { toast.error(err.response?.data?.error || 'Upload failed'); setUploading(false); },
    }
  );

  const deleteMutation = useMutation(
    (fileId) => filesAPI.delete(fileId),
    {
      onSuccess: () => { qc.invalidateQueries(['event', id]); toast.success('File deleted'); },
      onError:   () => toast.error('Failed to delete file'),
    }
  );

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    const formData = new FormData();
    acceptedFiles.forEach((f) => formData.append('files', f));
    uploadMutation.mutate({ formData });
  }, [id]);

  if (isLoading) return (
    <div className="space-y-4">
      <div className="card h-40 animate-pulse bg-gray-100" />
      <div className="card h-80 animate-pulse bg-gray-100" />
    </div>
  );

  if (!event) return <div className="text-center py-16 text-gray-400">Event not found</div>;

  const files    = event.files || {};
  const tabFiles = {
    documents:    files.documents    || [],
    spreadsheets: files.spreadsheets || [],
    images:       files.images       || [],
  };

  const currentTab = TABS.find((t) => t.id === activeTab);

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link to="/events"
            className="inline-flex items-center gap-1.5 text-purple-500 text-sm font-semibold hover:underline">
        <ArrowLeft size={15} /> Back to Events
      </Link>

      {/* Event Header */}
      <div className="card p-6">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                         bg-purple-100 text-purple-700 mb-3">
          {event.category}
        </span>
        <h2 className="font-heading font-bold text-2xl text-gray-900 mb-4">{event.title}</h2>

        <div className="flex items-center gap-3 flex-wrap mb-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
            <Calendar size={12} /> {format(new Date(event.date), 'MMMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
            <User size={12} /> {event.coordinator}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
            <Building2 size={12} /> {user?.organization?.name}
          </span>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed mb-4">{event.description}</p>

        {event.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Tag size={13} className="text-gray-300 mt-0.5" />
            {event.tags.map((tag) => (
              <span key={tag}
                    className="text-xs bg-purple-50 text-purple-600 font-semibold px-2.5 py-1 rounded-full border border-purple-100">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* File Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} onClick={() => setActiveTab(tabId)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold
                              rounded-lg transition-all
                              ${activeTab === tabId
                                ? 'bg-purple-500 text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
            <Icon size={15} />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                              ${activeTab === tabId ? 'bg-purple-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {tabFiles[tabId]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Upload + Files */}
      <div className="card p-5 space-y-4">
        <UploadZone
          onDrop={onDrop}
          accept={currentTab?.accept}
          loading={uploading}
          progress={uploadProgress}
        />

        {/* Documents / Spreadsheets */}
        {activeTab !== 'images' && (
          <div className="space-y-2">
            {tabFiles[activeTab].length === 0
              ? <EmptyState label={activeTab} />
              : tabFiles[activeTab].map((file) => (
                  <FileRow key={file.id} file={file} isAdmin={isAdmin}
                           onDelete={(fileId) => deleteMutation.mutate(fileId)} />
                ))
            }
          </div>
        )}

        {/* Photo Gallery */}
        {activeTab === 'images' && (
          <div>
            {tabFiles.images.length === 0 ? (
              <EmptyState label="photos" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500">
                    {tabFiles.images.length} photo{tabFiles.images.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400">Click any photo to view fullscreen</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {tabFiles.images.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group cursor-pointer"
                      onClick={() => setLightboxIndex(index)}
                    >
                      <img src={file.url} alt={file.originalName}
                           className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-purple-900/55 opacity-0 group-hover:opacity-100
                                      transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5">
                        <ZoomIn size={20} className="text-white" />
                        <p className="text-white text-[10px] font-medium text-center truncate w-full px-2">
                          {file.originalName}
                        </p>
                      </div>

                      {/* Delete on hover (admin only) */}
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(file.id); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40
                                     flex items-center justify-center text-white
                                     opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={tabFiles.images}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}