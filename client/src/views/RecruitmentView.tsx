import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Search,
  Plus,
  Award,
  XCircle,
  Video,
  ChevronRight,
  Loader2,
  Building2
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { PaginationControls } from '../components/PaginationControls';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { OfferLetterModal } from '../components/OfferLetterModal';

export const RecruitmentView: React.FC = () => {
  const { addToast } = useSocket();

  const [activeTab, setActiveTab] = useState<'JOBS' | 'PIPELINE'>('JOBS');

  // Loading states
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingPipeline, setLoadingPipeline] = useState(false);

  // Data states
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [stageMetrics, setStageMetrics] = useState<any>({
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    OFFER: 0,
    JOINED: 0,
    REJECTED: 0
  });

  // Filter & Pagination - Jobs
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('');
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState(10);
  const [jobsTotal, setJobsTotal] = useState(0);

  // Filter & Pagination - Pipeline
  const [selectedJobFilter, setSelectedJobFilter] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [pipelinePage, setPipelinePage] = useState(1);
  const [pipelinePageSize, setPipelinePageSize] = useState(10);
  const [pipelineTotal, setPipelineTotal] = useState(0);

  // Modals
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isCreateOfferOpen, setIsCreateOfferOpen] = useState(false);

  // Selected item states
  const [selectedAppForInterview, setSelectedAppForInterview] = useState<any | null>(null);
  const [selectedAppForOffer, setSelectedAppForOffer] = useState<any | null>(null);
  const [activeOfferDetails, setActiveOfferDetails] = useState<any | null>(null);

  // Forms
  const [jobForm, setJobForm] = useState({
    title: '',
    location: 'Bangalore / Hybrid',
    jobType: 'FULL_TIME',
    experienceLevel: 'MID_LEVEL',
    openPositions: 1,
    salaryMin: 1200000,
    salaryMax: 2000000,
    deadline: '2026-11-30',
    description: '',
    requirements: ''
  });

  const [candidateForm, setCandidateForm] = useState({
    jobId: '',
    fullName: '',
    email: '',
    phone: '',
    currentCompany: '',
    currentCtc: 1200000,
    expectedCtc: 1600000,
    noticePeriodDays: 30,
    resumeUrl: '',
    notes: ''
  });

  const [offerForm, setOfferForm] = useState({
    offeredRole: '',
    offeredCtc: 1800000,
    joiningDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    letterContent: ''
  });

  // Fetch Jobs
  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const res = await api.get(
        `/recruitment/jobs?page=${jobsPage}&limit=${jobsPageSize}&search=${encodeURIComponent(jobSearch)}&status=${jobStatusFilter}`
      );
      if (res.data.success) {
        setJobs(res.data.data.jobs);
        setJobsTotal(res.data.data.pagination.totalEntries);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch job openings', 'danger');
    } finally {
      setLoadingJobs(false);
    }
  };

  // Fetch Pipeline
  const fetchPipeline = async () => {
    try {
      setLoadingPipeline(true);
      const res = await api.get(
        `/recruitment/pipeline?page=${pipelinePage}&limit=${pipelinePageSize}&jobId=${selectedJobFilter}&stage=${selectedStageFilter}&search=${encodeURIComponent(candidateSearch)}`
      );
      if (res.data.success) {
        setApplications(res.data.data.applications);
        setPipelineTotal(res.data.data.pagination.totalEntries);
        setStageMetrics(res.data.data.metrics);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch candidate pipeline', 'danger');
    } finally {
      setLoadingPipeline(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [jobsPage, jobsPageSize, jobStatusFilter]);

  useEffect(() => {
    fetchPipeline();
  }, [pipelinePage, pipelinePageSize, selectedJobFilter, selectedStageFilter]);

  // Debounced search for Jobs
  useEffect(() => {
    const timer = setTimeout(() => {
      setJobsPage(1);
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [jobSearch]);

  // Debounced search for Pipeline
  useEffect(() => {
    const timer = setTimeout(() => {
      setPipelinePage(1);
      fetchPipeline();
    }, 300);
    return () => clearTimeout(timer);
  }, [candidateSearch]);

  // Handle Create Job Opening
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/recruitment/jobs', jobForm);
      if (res.data.success) {
        addToast('Success', 'Job opening published successfully', 'success');
        setIsCreateJobOpen(false);
        fetchJobs();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to create job', 'danger');
    }
  };

  // Handle Add Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/recruitment/candidates', candidateForm);
      if (res.data.success) {
        addToast('Candidate Added', 'Application entered into recruitment pipeline', 'success');
        setIsAddCandidateOpen(false);
        fetchPipeline();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to add candidate', 'danger');
    }
  };

  // Handle Stage Transition
  const handleStageChange = async (appId: string, newStage: string) => {
    try {
      const res = await api.patch(`/recruitment/applications/${appId}/stage`, {
        stage: newStage
      });
      if (res.data.success) {
        addToast('Stage Updated', `Candidate advanced to ${newStage}`, 'success');
        fetchPipeline();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Could not update stage', 'danger');
    }
  };

  // View Existing Offer Letter
  const handleViewOffer = async (appId: string) => {
    try {
      const res = await api.get(`/recruitment/applications/${appId}/offer-letter`);
      if (res.data.success) {
        setActiveOfferDetails(res.data.data);
        setIsOfferModalOpen(true);
      }
    } catch (err: any) {
      addToast('Notice', err.response?.data?.message || 'Offer letter is not generated yet.', 'info');
    }
  };

  // Submit Create Offer Letter
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForOffer) return;

    try {
      const res = await api.post(`/recruitment/applications/${selectedAppForOffer.id}/offer`, offerForm);
      if (res.data.success) {
        addToast('Offer Generated', 'Official offer letter generated and ready to print.', 'success');
        setIsCreateOfferOpen(false);
        fetchPipeline();
        // Immediately view generated letter
        handleViewOffer(selectedAppForOffer.id);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to generate offer', 'danger');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Recruitment & ATS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Talent Acquisition, Candidate Pipeline Tracking, and Offer Generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('JOBS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'JOBS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Job Openings ({jobsTotal})
            </button>
            <button
              onClick={() => setActiveTab('PIPELINE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'PIPELINE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Candidate Pipeline ({pipelineTotal})
            </button>
          </div>

          {activeTab === 'JOBS' ? (
            <button
              onClick={() => setIsCreateJobOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Opening</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddCandidateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: JOB OPENINGS */}
      {activeTab === 'JOBS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value)}
                placeholder="Search job title or location..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={jobStatusFilter}
                onChange={e => setJobStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open & Active</option>
                <option value="DRAFT">Draft</option>
                <option value="CLOSED">Closed / Filled</option>
              </select>
            </div>
          </div>

          {/* Job Listings Grid */}
          {loadingJobs ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Job Openings Found</h3>
              <p className="text-xs text-slate-400 mt-1">Post your first job opening to start receiving candidates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map(job => (
                <div
                  key={job.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        {job.department?.name || 'General'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          job.status === 'OPEN'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {job.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.jobType.replace('_', ' ')}</span>
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        ₹{((job.salaryMin || 0) / 100000).toFixed(1)}L - ₹{((job.salaryMax || 0) / 100000).toFixed(1)}L
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {job.openPositions} {job.openPositions > 1 ? 'Positions' : 'Position'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{job.applicationsCount} Candidates</span>
                    </span>

                    <button
                      onClick={() => {
                        setSelectedJobFilter(job.id);
                        setActiveTab('PIPELINE');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                      <span>View Pipeline</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <PaginationControls
            currentPage={jobsPage}
            pageSize={jobsPageSize}
            totalEntries={jobsTotal}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setJobsPage}
            onPageSizeChange={size => {
              setJobsPageSize(size);
              setJobsPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 2: CANDIDATE PIPELINE */}
      {activeTab === 'PIPELINE' && (
        <div className="space-y-4">
          {/* Stage KPI Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { stage: 'APPLIED', label: 'Applied', count: stageMetrics.APPLIED, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
              { stage: 'SCREENING', label: 'Screening', count: stageMetrics.SCREENING, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
              { stage: 'INTERVIEW', label: 'Interview', count: stageMetrics.INTERVIEW, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
              { stage: 'OFFER', label: 'Offer Stage', count: stageMetrics.OFFER, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
              { stage: 'JOINED', label: 'Hired / Joined', count: stageMetrics.JOINED, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
              { stage: 'REJECTED', label: 'Rejected', count: stageMetrics.REJECTED, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' }
            ].map(item => (
              <button
                key={item.stage}
                onClick={() => setSelectedStageFilter(selectedStageFilter === item.stage ? '' : item.stage)}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedStageFilter === item.stage
                    ? 'ring-2 ring-indigo-500 ' + item.color
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {item.label}
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 block">
                  {item.count || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={candidateSearch}
                onChange={e => setCandidateSearch(e.target.value)}
                placeholder="Search candidate name or org..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedJobFilter}
                onChange={e => setSelectedJobFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="">All Job Openings</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>

              {selectedStageFilter && (
                <button
                  onClick={() => setSelectedStageFilter('')}
                  className="px-2.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                >
                  Clear Stage
                </button>
              )}
            </div>
          </div>

          {/* Candidates Table */}
          {loadingPipeline ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Candidates in this Stage</h3>
              <p className="text-xs text-slate-400 mt-1">Add a candidate or clear your active filters.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Role Applied</th>
                      <th className="py-3 px-4">Compensation & Notice</th>
                      <th className="py-3 px-4">Current Stage</th>
                      <th className="py-3 px-4">Interviews / Offer</th>
                      <th className="py-3 px-4 text-right">Pipeline Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {applications.map(app => (
                      <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {app.candidate?.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {app.candidate?.email} • {app.candidate?.phone || 'No Phone'}
                            </span>
                            {app.candidate?.currentCompany && (
                              <span className="text-[10px] text-slate-400 block">
                                Currently: {app.candidate.currentCompany}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-900 dark:text-slate-200 block">
                              {app.job?.title}
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              {app.job?.department?.name || 'General'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5 text-[11px]">
                            <div>
                              <span className="text-slate-400">Current: </span>
                              <span className="font-mono">₹{((app.candidate?.currentCtc || 0) / 100000).toFixed(1)}L</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Expected: </span>
                              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                ₹{((app.candidate?.expectedCtc || 0) / 100000).toFixed(1)}L
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              Notice: {app.candidate?.noticePeriodDays} Days
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              app.stage === 'JOINED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : app.stage === 'OFFER'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400'
                                : app.stage === 'INTERVIEW'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-400'
                                : app.stage === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400'
                            }`}
                          >
                            {app.stage}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {app.interviews?.length > 0 ? (
                            <div className="space-y-1">
                              {app.interviews.map((inv: any) => (
                                <div key={inv.id} className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                  <Video className="w-3 h-3 text-indigo-500" />
                                  <span>{inv.interviewType}</span>
                                  <span className="font-mono text-slate-400">
                                    ({new Date(inv.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">No rounds yet</span>
                          )}

                          {app.offerLetter && (
                            <button
                              onClick={() => handleViewOffer(app.id)}
                              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <Award className="w-3 h-3" />
                              <span>View Offer Letter</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Schedule Interview */}
                            <button
                              onClick={() => {
                                setSelectedAppForInterview(app);
                                setIsScheduleOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                              title="Schedule Interview"
                            >
                              <Video className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </button>

                            {/* Create Offer */}
                            {app.stage !== 'JOINED' && (
                              <button
                                onClick={() => {
                                  setSelectedAppForOffer(app);
                                  setOfferForm({
                                    offeredRole: app.job?.title || 'Engineer',
                                    offeredCtc: app.candidate?.expectedCtc || 2000000,
                                    joiningDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    letterContent: ''
                                  });
                                  setIsCreateOfferOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 transition"
                                title="Issue Offer Letter"
                              >
                                <Award className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Move to Joined */}
                            {app.stage === 'OFFER' && (
                              <button
                                onClick={() => handleStageChange(app.id, 'JOINED')}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold transition"
                              >
                                Mark Joined
                              </button>
                            )}

                            {/* Quick Reject */}
                            {app.stage !== 'REJECTED' && app.stage !== 'JOINED' && (
                              <button
                                onClick={() => handleStageChange(app.id, 'REJECTED')}
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                                title="Reject Application"
                              >
                                <XCircle className="w-3.5 h-3.5" />
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
                currentPage={pipelinePage}
                pageSize={pipelinePageSize}
                totalEntries={pipelineTotal}
                pageSizeOptions={[10, 25, 50, 100]}
                onPageChange={setPipelinePage}
                onPageSizeChange={size => {
                  setPipelinePageSize(size);
                  setPipelinePage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* MODAL: Post Job Opening */}
      {isCreateJobOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Post New Job Opening</h3>
              <button onClick={() => setIsCreateJobOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={e => setJobForm({ ...jobForm, title: e.target.value })}
                  placeholder="e.g., Senior Frontend Engineer"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job Type
                  </label>
                  <select
                    value={jobForm.jobType}
                    onChange={e => setJobForm({ ...jobForm, jobType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Experience Level
                  </label>
                  <select
                    value={jobForm.experienceLevel}
                    onChange={e => setJobForm({ ...jobForm, experienceLevel: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="ENTRY">Entry Level (0-2 yrs)</option>
                    <option value="MID_LEVEL">Mid Level (3-5 yrs)</option>
                    <option value="SENIOR">Senior (5-8 yrs)</option>
                    <option value="LEAD">Lead / Architect (8+ yrs)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min CTC (₹ Annual)
                  </label>
                  <input
                    type="number"
                    value={jobForm.salaryMin}
                    onChange={e => setJobForm({ ...jobForm, salaryMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max CTC (₹ Annual)
                  </label>
                  <input
                    type="number"
                    value={jobForm.salaryMax}
                    onChange={e => setJobForm({ ...jobForm, salaryMax: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  value={jobForm.description}
                  onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Key responsibilities and day-to-day work..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateJobOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  Publish Opening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Candidate */}
      {isAddCandidateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Candidate to Pipeline</h3>
              <button onClick={() => setIsAddCandidateOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCandidate} className="p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Job Opening *
                </label>
                <select
                  value={candidateForm.jobId}
                  onChange={e => setCandidateForm({ ...candidateForm, jobId: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">Select Opening...</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    value={candidateForm.fullName}
                    onChange={e => setCandidateForm({ ...candidateForm, fullName: e.target.value })}
                    required
                    placeholder="e.g., Ananya Verma"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={e => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    required
                    placeholder="ananya@example.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Org
                  </label>
                  <input
                    type="text"
                    value={candidateForm.currentCompany}
                    onChange={e => setCandidateForm({ ...candidateForm, currentCompany: e.target.value })}
                    placeholder="e.g., Tech Innovations"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected CTC (₹ Annual)
                  </label>
                  <input
                    type="number"
                    value={candidateForm.expectedCtc}
                    onChange={e => setCandidateForm({ ...candidateForm, expectedCtc: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCandidateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Generate Offer Letter Form */}
      {isCreateOfferOpen && selectedAppForOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Offer Package
              </h3>
              <button onClick={() => setIsCreateOfferOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOffer} className="p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedAppForOffer.candidate?.fullName}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Offered Designation / Role *
                </label>
                <input
                  type="text"
                  value={offerForm.offeredRole}
                  onChange={e => setOfferForm({ ...offerForm, offeredRole: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Offered Annual CTC (₹ INR) *
                </label>
                <input
                  type="number"
                  value={offerForm.offeredCtc}
                  onChange={e => setOfferForm({ ...offerForm, offeredCtc: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    value={offerForm.joiningDate}
                    onChange={e => setOfferForm({ ...offerForm, joiningDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Offer Expiry Date
                  </label>
                  <input
                    type="date"
                    value={offerForm.expiryDate}
                    onChange={e => setOfferForm({ ...offerForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOfferOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                >
                  Generate Official Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        application={selectedAppForInterview}
        onSuccess={() => fetchPipeline()}
      />

      {/* VIEW OFFER LETTER MODAL */}
      <OfferLetterModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        offerData={activeOfferDetails}
      />
    </div>
  );
};
