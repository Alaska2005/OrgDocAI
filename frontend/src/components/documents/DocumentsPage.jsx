// src/components/documents/DocumentsPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import { Eye, Download, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { filesAPI } from '../../utils/api';
import { getPreviewUrl, getDownloadUrl, isPdfFile } from '../../utils/fileUtils';
import useAuthStore from '../../store/authStore';

const TYPE_FILTERS = [
  { value: '',            label: 'All Files' },
  { value: 'DOCUMENT',   label: '📄 Documents' },
  { value: 'SPREADSHEET',label: '📊 Spreadsheets' },
  { value: 'IMAGE',      label: '🖼️ Images' },
];

const FILE_ICONS = {
  'application/pdf': '📕',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'text/plain': '📄',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📗',
  'text/csv': '📊',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
};

export default function DocumentsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading } = useQuery(
    ['allFiles', search, type],
    () => filesAPI.getAll({ search: search || undefined, type: type || undefined }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(
    (id) => filesAPI.delete(id),
    {
      onSuccess: () => { qc.invalidateQueries('allFiles'); toast.success('File deleted'); },
      onError: () => toast.error('Failed to delete'),
    }
  );

  const files = data?.files || [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-2xl text-gray-900">Documents</h2>
        <p className="text-gray-400 text-sm mt-0.5">All uploaded files across events</p>
      </div>

      {/* Filters */}
      <div className="card px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-52 focus-within:border-purple-400 transition-all">
          <Search size={13} className="text-gray-400" />
          <input
            placeholder="Search files..."
            className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setType(f.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                type === f.value
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* File Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : files.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="font-heading font-bold text-gray-600">No files found</p>
            <p className="text-sm text-gray-400 mt-1">Upload files inside an event to see them here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-purple-600 px-4 py-3">File</th>
                <th className="text-left text-xs font-semibold text-purple-600 px-4 py-3">Event</th>
                <th className="text-left text-xs font-semibold text-purple-600 px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-purple-600 px-4 py-3">Size</th>
                <th className="text-left text-xs font-semibold text-purple-600 px-4 py-3">Uploaded</th>
                <th className="text-left text-xs font-semibold text-purple-600 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {files.map((file) => {
                const sizeKB = file.size / 1024;
                return (
                  <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{FILE_ICONS[file.mimeType] || '📄'}</span>
                        <span className="font-medium text-gray-800 truncate max-w-48">{file.originalName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-500 text-xs">{file.event?.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${
                        file.type === 'DOCUMENT' ? 'bg-blue-50 text-blue-600'
                        : file.type === 'SPREADSHEET' ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-purple-50 text-purple-600'
                      }`}>
                        {file.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {sizeKB < 1024 ? `${sizeKB.toFixed(0)} KB` : `${(sizeKB / 1024).toFixed(1)} MB`}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {format(new Date(file.createdAt), 'MMM d, yyyy')}
                      <span className="block text-gray-300">{file.uploadedBy?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <a href={getPreviewUrl(file)} target="_blank" rel="noreferrer"
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-all"
                          title={isPdfFile(file) ? 'View PDF' : 'Preview'}>
                          <Eye size={13} />
                        </a>
                        <a href={getDownloadUrl(file)} download={file.originalName}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                          title="Download">
                          <Download size={13} />
                        </a>
                        {isAdmin && (
                          <button onClick={() => deleteMutation.mutate(file.id)}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
