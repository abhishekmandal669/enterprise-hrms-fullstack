import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Search,
  Trash2,
  Loader2,
  X,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PaginationControls } from '../components/PaginationControls';
import { CustomSelect } from '../components/CustomSelect';

interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  category: 'ID_PROOF' | 'OFFER_LETTER' | 'NDA' | 'EXPERIENCE_CERT' | 'MEDICAL_CERTIFICATE' | 'OTHER';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation: string;
    department?: { name: string };
  };
}

export const DocumentsView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const isHRorAdmin = ['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  // Main State
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalEntries, setTotalEntries] = useState<number>(0);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('ID_PROOF');
  const [targetUserId, setTargetUserId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const res = await api.get(`/documents?${params.toString()}`);
      if (res.data.success) {
        setDocuments(res.data.data);
        setTotalEntries(res.data.pagination.total);
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      addToast('Failed to load document vault.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Employees for HR Admin
  const fetchEmployees = async () => {
    try {
      const res = await api.get('/master/employees');
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    if (isHRorAdmin) {
      fetchEmployees();
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory, page, pageSize]);

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle File Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast('Please select a file to upload.', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadTitle || selectedFile.name);
      formData.append('category', uploadCategory);
      if (targetUserId) {
        formData.append('targetUserId', targetUserId);
      }

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        addToast('Document successfully uploaded to vault.', 'success');
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setUploadTitle('');
        setTargetUserId('');
        setUploadCategory('ID_PROOF');
        fetchDocuments();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to upload document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/documents/${id}`);
      if (res.data.success) {
        addToast('Document deleted.', 'success');
        fetchDocuments();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete document.', 'error');
    }
  };

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper for Category Badge
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'ID_PROOF':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Government ID
          </span>
        );
      case 'OFFER_LETTER':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Offer Letter
          </span>
        );
      case 'NDA':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            Confidentiality NDA
          </span>
        );
      case 'MEDICAL_CERTIFICATE':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            Medical Fitness
          </span>
        );
      case 'EXPERIENCE_CERT':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            Experience Proof
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            General Document
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Document Vault & Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Secure enterprise repository for employment contracts, government IDs, NDAs, and medical records.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search document title, filename, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'ALL', label: 'All Vault' },
            { id: 'ID_PROOF', label: 'Government ID' },
            { id: 'OFFER_LETTER', label: 'Offer Letters' },
            { id: 'NDA', label: 'NDAs' },
            { id: 'MEDICAL_CERTIFICATE', label: 'Medical Records' },
            { id: 'EXPERIENCE_CERT', label: 'Experience' },
            { id: 'OTHER', label: 'Other' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Document Title & File</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Associated Staff</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Accessing encrypted document vault...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No documents found in this view.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="font-semibold text-slate-800 dark:text-slate-100 block">
                            {doc.title}
                          </strong>
                          <span className="font-mono text-[10px] text-slate-400">
                            {doc.fileName}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getCategoryBadge(doc.category)}
                    </td>

                    <td className="py-3.5 px-4">
                      <strong className="font-semibold text-slate-800 dark:text-slate-100 block">
                        {doc.user.firstName} {doc.user.lastName}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        {doc.user.employeeCode} · {doc.user.designation}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {formatBytes(doc.fileSize)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(doc.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`http://localhost:5000${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Open Document"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {(isHRorAdmin || doc.userId === user?.id) && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Configurable Pagination Controls (10, 25, 50, 100) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <PaginationControls
            currentPage={page}
            pageSize={pageSize}
            totalEntries={totalEntries}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      </div>

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Upload to Vault</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add secure PDF or scanned record to profile.</p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passport Copy, Signed Offer Letter, Medical Fitness"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Category *
                </label>
                <CustomSelect
                  value={uploadCategory}
                  onChange={(val) => setUploadCategory(val)}
                  options={[
                    { value: 'ID_PROOF', label: 'Government Identity Proof (Aadhaar / Passport)' },
                    { value: 'OFFER_LETTER', label: 'Employment Agreement & Offer Letter' },
                    { value: 'NDA', label: 'Non-Disclosure Agreement (NDA)' },
                    { value: 'MEDICAL_CERTIFICATE', label: 'Medical Fitness Certificate' },
                    { value: 'EXPERIENCE_CERT', label: 'Previous Experience Certificate' },
                    { value: 'OTHER', label: 'Other Official Document' },
                  ]}
                />
              </div>

              {isHRorAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Associate with Staff Member (Optional)
                  </label>
                  <CustomSelect
                    value={targetUserId}
                    onChange={(val) => setTargetUserId(val)}
                    placeholder="-- Upload for Myself --"
                    options={[
                      { value: '', label: '-- Upload for Myself --' },
                      ...employees.map((emp) => ({
                        value: emp.id,
                        label: `${emp.firstName} ${emp.lastName}`,
                        sublabel: emp.employeeCode || emp.designation || undefined
                      }))
                    ]}
                  />
                </div>
              )}

              {/* File Drag / Drop Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  File Attachment * (PDF, PNG, JPG, DOCX - max 15MB)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/50 transition group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        if (!uploadTitle) {
                          setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc"
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition mb-2" />
                  {selectedFile ? (
                    <div className="text-center">
                      <span className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 block">
                        {selectedFile.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatBytes(selectedFile.size)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Click or drag file here to upload
                      </span>
                      <span className="text-[10px] text-slate-400">Supported: PDF, JPG, PNG, DOCX</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Upload to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
