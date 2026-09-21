import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Award,
  Calendar,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Clock,
  BookOpen,
  Loader2,
  X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PaginationControls } from '../components/PaginationControls';

export const TrainingView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const isHRorAdmin = user?.role === 'ADMIN' || user?.role === 'HR_ADMIN';

  const [activeTab, setActiveTab] = useState<'PROGRAMS' | 'CERTIFICATIONS'>('PROGRAMS');

  // Loading
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Programs Data & Pagination
  const [programs, setPrograms] = useState<any[]>([]);
  const [programsSearch, setProgramsSearch] = useState('');
  const [programsCategory, setProgramsCategory] = useState('');
  const [programsPage, setProgramsPage] = useState(1);
  const [programsPageSize, setProgramsPageSize] = useState(10);
  const [programsTotal, setProgramsTotal] = useState(0);

  // Certifications Data & Pagination
  const [certifications, setCertifications] = useState<any[]>([]);
  const [certsSearch, setCertsSearch] = useState('');
  const [certsExpiringOnly, setCertsExpiringOnly] = useState(false);
  const [certsPage, setCertsPage] = useState(1);
  const [certsPageSize, setCertsPageSize] = useState(10);
  const [certsTotal, setCertsTotal] = useState(0);

  // Modals
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);
  const [isAddCertOpen, setIsAddCertOpen] = useState(false);
  const [selectedProgramEnrollments, setSelectedProgramEnrollments] = useState<any | null>(null);

  // Forms
  const [programForm, setProgramForm] = useState({
    title: '',
    category: 'TECHNICAL',
    trainerName: '',
    description: '',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxCapacity: 25
  });

  const [certForm, setCertForm] = useState({
    name: '',
    issuingOrg: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    credentialId: '',
    credentialUrl: ''
  });

  // Fetch Programs
  const fetchPrograms = async () => {
    try {
      setLoadingPrograms(true);
      const res = await api.get(
        `/training/programs?page=${programsPage}&limit=${programsPageSize}&search=${encodeURIComponent(programsSearch)}&category=${programsCategory}`
      );
      if (res.data.success) {
        setPrograms(res.data.data.programs);
        setProgramsTotal(res.data.data.pagination.totalEntries);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch training programs', 'danger');
    } finally {
      setLoadingPrograms(false);
    }
  };

  // Fetch Certifications
  const fetchCertifications = async () => {
    try {
      setLoadingCerts(true);
      const res = await api.get(
        `/training/certifications?page=${certsPage}&limit=${certsPageSize}&search=${encodeURIComponent(certsSearch)}&expiringSoon=${certsExpiringOnly}`
      );
      if (res.data.success) {
        setCertifications(res.data.data.certifications);
        setCertsTotal(res.data.data.pagination.totalEntries);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch certifications', 'danger');
    } finally {
      setLoadingCerts(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [programsPage, programsPageSize, programsCategory]);

  useEffect(() => {
    fetchCertifications();
  }, [certsPage, certsPageSize, certsExpiringOnly]);

  // Debounced search for programs
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgramsPage(1);
      fetchPrograms();
    }, 300);
    return () => clearTimeout(timer);
  }, [programsSearch]);

  // Debounced search for certs
  useEffect(() => {
    const timer = setTimeout(() => {
      setCertsPage(1);
      fetchCertifications();
    }, 300);
    return () => clearTimeout(timer);
  }, [certsSearch]);

  // Self-Enroll
  const handleEnroll = async (programId: string) => {
    try {
      setActionLoading(programId);
      const res = await api.post(`/training/programs/${programId}/enroll`, {});
      if (res.data.success) {
        addToast('Enrolled', 'Successfully registered for this training program', 'success');
        fetchPrograms();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Could not complete enrollment', 'danger');
    } finally {
      setActionLoading(null);
    }
  };

  // Create Program
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/training/programs', programForm);
      if (res.data.success) {
        addToast('Program Created', 'Training session published to corporate catalog', 'success');
        setIsCreateProgramOpen(false);
        fetchPrograms();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to create training program', 'danger');
    }
  };

  // Add Certification
  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/training/certifications', certForm);
      if (res.data.success) {
        addToast('Certification Added', 'Uploaded to corporate credential wallet', 'success');
        setIsAddCertOpen(false);
        fetchCertifications();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to add certification', 'danger');
    }
  };

  // Verify Certification (HR Admin)
  const handleVerifyCert = async (certId: string) => {
    try {
      const res = await api.patch(`/training/certifications/${certId}/verify`);
      if (res.data.success) {
        addToast('Verified', 'Certification verified and endorsed with official HR badge', 'success');
        fetchCertifications();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Could not verify certification', 'danger');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Training & Certs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Corporate Upskilling Catalog, Employee Certifications Wallet, and Compliance Tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('PROGRAMS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'PROGRAMS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Training Programs ({programsTotal})
            </button>
            <button
              onClick={() => setActiveTab('CERTIFICATIONS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'CERTIFICATIONS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Certifications & Compliance ({certsTotal})
            </button>
          </div>

          {activeTab === 'PROGRAMS' ? (
            isHRorAdmin && (
              <button
                onClick={() => setIsCreateProgramOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Program</span>
              </button>
            )
          ) : (
            <button
              onClick={() => setIsAddCertOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Certification</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: TRAINING PROGRAMS */}
      {activeTab === 'PROGRAMS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={programsSearch}
                onChange={e => setProgramsSearch(e.target.value)}
                placeholder="Search program title or trainer..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={programsCategory}
                onChange={e => setProgramsCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="">All Categories</option>
                <option value="TECHNICAL">Technical Architecture</option>
                <option value="COMPLIANCE">POSH & Compliance</option>
                <option value="LEADERSHIP">Leadership & Management</option>
                <option value="SOFT_SKILLS">Soft Skills & Communication</option>
              </select>
            </div>
          </div>

          {/* Programs Grid */}
          {loadingPrograms ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : programs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Training Sessions Found</h3>
              <p className="text-xs text-slate-400 mt-1">Check back later or change your category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map(prog => {
                const percentFilled = Math.min(100, Math.round((prog.enrolledCount / prog.maxCapacity) * 100));

                return (
                  <div
                    key={prog.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition flex flex-col justify-between shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                          {prog.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            prog.status === 'ONGOING'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200'
                              : prog.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                          }`}
                        >
                          {prog.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {prog.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Trainer: <span className="font-semibold text-slate-700 dark:text-slate-300">{prog.trainerName}</span>
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {prog.description || 'Corporate training workshop designed to elevate employee core competencies.'}
                      </p>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{prog.startDate} to {prog.endDate}</span>
                        </span>
                      </div>

                      {/* Capacity Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] font-medium text-slate-500">
                          <span>Capacity</span>
                          <span>{prog.enrolledCount} / {prog.maxCapacity} seats ({percentFilled}%)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              percentFilled >= 90 ? 'bg-rose-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${percentFilled}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {isHRorAdmin && (
                        <button
                          onClick={() => setSelectedProgramEnrollments(prog)}
                          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          View Roster ({prog.enrolledCount})
                        </button>
                      )}

                      {prog.isEnrolled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Enrolled</span>
                        </span>
                      ) : prog.enrolledCount >= prog.maxCapacity ? (
                        <span className="text-xs font-semibold text-slate-400 ml-auto">
                          Program Full
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEnroll(prog.id)}
                          disabled={actionLoading === prog.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition disabled:opacity-50 ml-auto"
                        >
                          {actionLoading === prog.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Enroll Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <PaginationControls
            currentPage={programsPage}
            pageSize={programsPageSize}
            totalEntries={programsTotal}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setProgramsPage}
            onPageSizeChange={size => {
              setProgramsPageSize(size);
              setProgramsPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 2: CERTIFICATIONS & COMPLIANCE */}
      {activeTab === 'CERTIFICATIONS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={certsSearch}
                onChange={e => setCertsSearch(e.target.value)}
                placeholder="Search certification or issuing org..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCertsExpiringOnly(!certsExpiringOnly)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
                  certsExpiringOnly
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-700 dark:text-amber-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Expiring Soon (&lt; 30d)</span>
              </button>
            </div>
          </div>

          {/* Certifications Table */}
          {loadingCerts ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : certifications.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Certifications Recorded</h3>
              <p className="text-xs text-slate-400 mt-1">Upload your industry certifications to verify compliance.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Certification Title</th>
                      <th className="py-3 px-4">Issuing Body</th>
                      <th className="py-3 px-4">Validity & Expiry</th>
                      <th className="py-3 px-4">Verification Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {certifications.map(cert => (
                      <tr key={cert.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {cert.user?.firstName} {cert.user?.lastName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {cert.user?.employeeCode} • {cert.user?.department?.name || 'General'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {cert.name}
                            </span>
                            {cert.credentialId && (
                              <span className="text-[10px] font-mono text-slate-400 block">
                                ID: {cert.credentialId}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium">
                          {cert.issuingOrg}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5 text-[11px]">
                            <span className="text-slate-500 block">Issued: {cert.issueDate}</span>
                            {cert.expiryDate ? (
                              <div className="flex items-center gap-1.5">
                                <span className={cert.isExpired ? 'text-rose-600 font-bold' : cert.isExpiringSoon ? 'text-amber-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                                  Expires: {cert.expiryDate}
                                </span>
                                {cert.isExpired && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                                    EXPIRED
                                  </span>
                                )}
                                {cert.isExpiringSoon && !cert.isExpired && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                                    EXPIRING SOON
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">No Expiration (Lifetime)</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {cert.verifiedByHR ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>HR Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending Verification</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {cert.credentialUrl && (
                              <a
                                href={cert.credentialUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                title="Open Credential Link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {isHRorAdmin && !cert.verifiedByHR && (
                              <button
                                onClick={() => handleVerifyCert(cert.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verify</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <PaginationControls
                currentPage={certsPage}
                pageSize={certsPageSize}
                totalEntries={certsTotal}
                pageSizeOptions={[10, 25, 50, 100]}
                onPageChange={setCertsPage}
                onPageSizeChange={size => {
                  setCertsPageSize(size);
                  setCertsPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* MODAL: Create Training Program */}
      {isCreateProgramOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Training Program</h3>
              <button onClick={() => setIsCreateProgramOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProgram} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Program Title *
                </label>
                <input
                  type="text"
                  value={programForm.title}
                  onChange={e => setProgramForm({ ...programForm, title: e.target.value })}
                  placeholder="e.g., Enterprise Microservices Security"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={programForm.category}
                    onChange={e => setProgramForm({ ...programForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="TECHNICAL">Technical Architecture</option>
                    <option value="COMPLIANCE">POSH & Compliance</option>
                    <option value="LEADERSHIP">Leadership & Management</option>
                    <option value="SOFT_SKILLS">Soft Skills & Communication</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trainer / Instructor *
                  </label>
                  <input
                    type="text"
                    value={programForm.trainerName}
                    onChange={e => setProgramForm({ ...programForm, trainerName: e.target.value })}
                    placeholder="e.g., Dr. Ananya Sengupta"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={programForm.startDate}
                    onChange={e => setProgramForm({ ...programForm, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={programForm.endDate}
                    onChange={e => setProgramForm({ ...programForm, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={programForm.maxCapacity}
                    onChange={e => setProgramForm({ ...programForm, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={programForm.description}
                  onChange={e => setProgramForm({ ...programForm, description: e.target.value })}
                  placeholder="Outline workshop outcomes..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateProgramOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Certification */}
      {isAddCertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Certification Credential</h3>
              <button onClick={() => setIsAddCertOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCert} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Certification Name *
                </label>
                <input
                  type="text"
                  value={certForm.name}
                  onChange={e => setCertForm({ ...certForm, name: e.target.value })}
                  placeholder="e.g., AWS Certified Solutions Architect"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issuing Organization *
                </label>
                <input
                  type="text"
                  value={certForm.issuingOrg}
                  onChange={e => setCertForm({ ...certForm, issuingOrg: e.target.value })}
                  placeholder="e.g., Amazon Web Services"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    value={certForm.issueDate}
                    onChange={e => setCertForm({ ...certForm, issueDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={certForm.expiryDate}
                    onChange={e => setCertForm({ ...certForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Credential ID
                </label>
                <input
                  type="text"
                  value={certForm.credentialId}
                  onChange={e => setCertForm({ ...certForm, credentialId: e.target.value })}
                  placeholder="e.g., AWS-SAA-98214"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Credential URL / Verification Link
                </label>
                <input
                  type="url"
                  value={certForm.credentialUrl}
                  onChange={e => setCertForm({ ...certForm, credentialUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCertOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  Upload Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: Program Roster */}
      {selectedProgramEnrollments && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Program Roster</h3>
                <p className="text-xs text-slate-500">{selectedProgramEnrollments.title}</p>
              </div>
              <button
                onClick={() => setSelectedProgramEnrollments(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedProgramEnrollments.enrollments?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No employees registered yet.</p>
              ) : (
                selectedProgramEnrollments.enrollments?.map((enr: any) => (
                  <div
                    key={enr.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {enr.user?.firstName} {enr.user?.lastName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {enr.user?.employeeCode}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {enr.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
