// src/components/events/EventDetail.jsx
import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowLeft, FileText, Sheet, Image as ImageIcon, Trash2, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsAPI, filesAPI } from '../../utils/api';
import { getPreviewUrl, getDownloadUrl, isPdfFile } from '../../utils/fileUtils';
import useAuthStore from '../../store/authStore';

const TABS = [
  { id: 'documents',    label: 'Documents',      icon: FileText,  accept: '.pdf,.docx,.doc,.txt' },
  { id: 'spreadsheets', label: 'Excel / Data',   icon: Sheet,     accept: '.xlsx,.xls,.csv' },
  { id: 'images',       label: 'Photos & Media', icon: ImageIcon, accept: '.jpg,.jpeg,.png,.webp,.gif' },
];

const FILE_ICONS = {
  'application/pdf': { icon: '📕', color: 'bg-red-50 text-red-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📘', color: 'bg-blue-50 text-blue-500' },
  'text/plain': { icon: '📄', color: 'bg-gray-50 text-gray-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📗', color: 'bg-emerald-50 text-emerald-500' },
  'text/csv': { icon: '📊', color: 'bg-emerald-50 text-emerald-500' },
};

function UploadZone({ onDrop, accept, loading, progress }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { '*/*': accept.split(',') } : undefined,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-purple-400 bg-purple-50'
          : 'border-purple-200 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-300'
      }`}
    >
      <input {...getInputProps()} />
      <div className="text-3xl mb-2">⬆️</div>
      <p className="text-sm font-medium text-gray-600">
        <span className="text-purple-600 font-semibold">Drag & drop files here</span> or click to browse
      </p>
      <p className="text-xs text-gray-400 mt-1">Supported: {accept}</p>
      {loading && (
        <div className="mt-3">
          <div className="h-2 bg-purple-100 rounded-full overflow-hidden w-48 mx-auto">
            <motion.div
              className="h-full bg-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-purple-500 mt-1">Uploading... {progress}%</p>
        </div>
      )}
    </div>
  );
}

function FileRow({ file, onDelete, isAdmin }) {
  const meta = FILE_ICONS[file.mimeType] || { icon: '📄', color: 'bg-gray-50 text-gray-500' };
  const sizeKB = Number((file.size / 1024).toFixed(0));
  const sizeText = sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${meta.color}`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{file.originalName}</p>
        <p className="text-xs text-gray-400">
          {sizeText} · {format(new Date(file.createdAt), 'MMM d, yyyy')} · by {file.uploadedBy?.name}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <a
          href={getPreviewUrl(file)}
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-all"
          title={isPdfFile(file) ? 'View PDF' : 'Preview'}
        >
          <Eye size={14} />
        </a>
        <a
          href={getDownloadUrl(file)}
          download={file.originalName}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
          title="Download"
        >
          <Download size={14} />
        </a>
        {isAdmin && (
          <button
            onClick={() => onDelete(file.id)}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('documents');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const { data: event, isLoading, refetch } = useQuery(
    ['event', id],
    () => eventsAPI.get(id).then((r) => r.data),
    { staleTime: 0, refetchOnMount: true }
  );

  const uploadMutation = useMutation(
    ({ formData }) =>
      filesAPI.uploadMany(id, formData, (p) => setUploadProgress(p)),
    {
      onSuccess: () => {
        refetch();
        qc.invalidateQueries(['event', id]);
        toast.success('Files uploaded successfully!');
        setUploading(false);
        setUploadProgress(0);
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || 'Upload failed');
        setUploading(false);
      },
    }
  );

  const deleteMutation = useMutation(
    (fileId) => filesAPI.delete(fileId),
    {
      onSuccess: () => {
        refetch();
        qc.invalidateQueries(['event', id]);
        toast.success('File deleted');
      },
      onError: () => toast.error('Failed to delete file'),
    }
  );

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    const formData = new FormData();
    acceptedFiles.forEach((f) => formData.append('files', f));
    uploadMutation.mutate({ formData });
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="card h-40 animate-pulse bg-gray-100" />
        <div className="card h-80 animate-pulse bg-gray-100" />
      </div>
    );
  }

  if (!event) return <div className="text-center py-16 text-gray-400">Event not found</div>;

  const files = event.files || {};
  const tabFiles = {
    documents: files.documents || [],
    spreadsheets: files.spreadsheets || [],
    images: files.images || [],
  };

  const currentTab = TABS.find((t) => t.id === activeTab);

  return (
    <div className="space-y-5">
      <Link to="/events" className="inline-flex items-center gap-2 text-purple-500 text-sm font-semibold hover:underline">
        <ArrowLeft size={15} /> Back to Events
      </Link>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <span className="badge bg-purple-100 text-purple-700 mb-3">{event.category}</span>
            <h2 className="font-heading font-bold text-2xl text-gray-900 mb-3">{event.title}</h2>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                📅 {format(new Date(event.date), 'MMMM d, yyyy')}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                👤 {event.coordinator}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                🏢 {user?.organization?.name}
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">{event.description}</p>
            {event.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-purple-50 text-purple-600 font-semibold px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tabId
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon size={15} /> {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tabId ? 'bg-purple-400' : 'bg-gray-100 text-gray-500'
            }`}>
              {tabFiles[tabId]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="card p-5 space-y-4">
        <UploadZone
          onDrop={onDrop}
          accept={currentTab?.accept}
          loading={uploading}
          progress={uploadProgress}
        />

        {activeTab !== 'images' ? (
          <div className="space-y-2">
            {tabFiles[activeTab].length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No files uploaded yet</p>
            ) : (
              tabFiles[activeTab].map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  isAdmin={isAdmin}
                  onDelete={(fileId) => deleteMutation.mutate(fileId)}
                />
              ))
            )}
          </div>
        ) : (
          <div>
            {tabFiles.images.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No photos uploaded yet</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {tabFiles.images.map((file) => (
                  <div
                    key={file.id}
                    className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group cursor-pointer"
                  >
                    <img src={file.url} alt={file.originalName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-purple-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/40"
                      >
                        <Eye size={14} />
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => deleteMutation.mutate(file.id)}
                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}