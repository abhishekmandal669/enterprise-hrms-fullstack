import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { PaginationControls } from '../components/PaginationControls';
import {
  mailApi,
  InternalEmailItem,
  MailDirectoryUser,
  EmailAttachment
} from '../services/mailApi';
import {
  Mail,
  Inbox,
  Send,
  Star,
  Trash2,
  FileText,
  Plus,
  Search,
  RefreshCw,
  Reply,
  Paperclip,
  X,
  Copy,
  Check,
  Megaphone,
  Calendar,
  Clock,
  Briefcase,
  Shield,
  ChevronDown,
  ChevronLeft
} from 'lucide-react';

type FolderType = 'inbox' | 'sent' | 'starred' | 'drafts' | 'trash';

export const WebmailView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  // Delete Confirmation Modal State
  const [deleteEmailId, setDeleteEmailId] = useState<string | null>(null);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);

  // Active folder & selection state
  const [currentFolder, setCurrentFolder] = useState<FolderType>('inbox');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<InternalEmailItem | null>(null);
  const [showAllRecipients, setShowAllRecipients] = useState(false);

  // Draggable Split Pane Width State (default 380px)
  const [listWidth, setListWidth] = useState<number>(380);
  const isDraggingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = listWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 260), 750);
      setListWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Data states
  const [emails, setEmails] = useState<InternalEmailItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Pagination states (10, 25, 50, 100)
  const [mailPage, setMailPage] = useState(1);
  const [mailPageSize, setMailPageSize] = useState(10);

  useEffect(() => {
    setMailPage(1);
  }, [currentFolder, categoryFilter, searchQuery]);

  const paginatedEmails = emails.slice(
    (mailPage - 1) * mailPageSize,
    mailPage * mailPageSize
  );

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState<MailDirectoryUser[]>([]);
  const [composeCc, setComposeCc] = useState<MailDirectoryUser[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeCategory, setComposeCategory] = useState<'GENERAL' | 'ANNOUNCEMENT' | 'LEAVE' | 'ATTENDANCE' | 'TIMESHEET' | 'POLICY'>('GENERAL');
  const [composeAttachments, setComposeAttachments] = useState<EmailAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Autocomplete directory search
  const [directoryResults, setDirectoryResults] = useState<MailDirectoryUser[]>([]);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showCcDropdown, setShowCcDropdown] = useState(false);

  // Quick Inline Reply
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Fetch emails based on folder
  const loadEmails = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      if (currentFolder === 'inbox') {
        const res = await mailApi.getInbox({
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          search: searchQuery || undefined
        });
        setEmails(res.emails);
      } else if (currentFolder === 'sent') {
        const res = await mailApi.getSent({ search: searchQuery || undefined });
        setEmails(res.emails);
      } else if (currentFolder === 'starred') {
        const data = await mailApi.getStarred();
        setEmails(data);
      } else if (currentFolder === 'drafts') {
        const data = await mailApi.getDrafts();
        setEmails(data);
      } else if (currentFolder === 'trash') {
        const data = await mailApi.getTrash();
        setEmails(data);
      }

      // Refresh unread counter
      const uc = await mailApi.getUnreadCount();
      setUnreadCount(uc);
    } catch (err: any) {
      console.error('Failed to load emails:', err);
      setErrorMsg('Failed to load messages. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [currentFolder, categoryFilter]);

  // Handle Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      loadEmails(true);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Autocomplete directory search
  useEffect(() => {
    if (toInput.trim().length > 0) {
      mailApi.getDirectory(toInput).then(users => {
        setDirectoryResults(users.filter(u => u.id !== user?.id && !composeTo.some(t => t.id === u.id)));
        setShowToDropdown(true);
      });
    } else {
      setShowToDropdown(false);
    }
  }, [toInput]);

  useEffect(() => {
    if (ccInput.trim().length > 0) {
      mailApi.getDirectory(ccInput).then(users => {
        setDirectoryResults(users.filter(u => u.id !== user?.id && !composeCc.some(c => c.id === u.id)));
        setShowCcDropdown(true);
      });
    } else {
      setShowCcDropdown(false);
    }
  }, [ccInput]);

  // Open email detail
  const handleOpenEmail = async (emailItem: InternalEmailItem) => {
    try {
      const full = await mailApi.getEmailById(emailItem.id);
      setSelectedEmail(full);

      // Update local unread state
      setEmails(prev => prev.map(e => e.id === emailItem.id ? { ...e, isRead: true } : e));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to get email details:', err);
    }
  };

  // Toggle Star
  const handleToggleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const nextStar = await mailApi.toggleStar(id);
      setEmails(prev => prev.map(item => item.id === id ? { ...item, isStarred: nextStar } : item));
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, isStarred: nextStar } : null);
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  // Toggle Trash
  const handleToggleTrash = async (id: string) => {
    try {
      await mailApi.toggleTrash(id);
      setEmails(prev => prev.filter(item => item.id !== id));
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail(null);
      }
      loadEmails(true);
    } catch (err) {
      console.error('Failed to toggle trash:', err);
    }
  };

  // Permanent Delete
  const handleDeletePermanent = (id: string) => {
    setDeleteEmailId(id);
  };

  const executeDeletePermanent = async () => {
    if (!deleteEmailId) return;
    try {
      setIsDeletingEmail(true);
      await mailApi.deletePermanently(deleteEmailId);
      setEmails(prev => prev.filter(item => item.id !== deleteEmailId));
      if (selectedEmail && selectedEmail.id === deleteEmailId) {
        setSelectedEmail(null);
      }
      addToast('Email Deleted', 'Email permanently removed from records.', 'info');
      setDeleteEmailId(null);
    } catch (err: any) {
      console.error('Failed to delete email permanently:', err);
      addToast('Error', err.response?.data?.message || 'Failed to delete email permanently.', 'danger');
    } finally {
      setIsDeletingEmail(false);
    }
  };

  // Mark Read / Unread
  const handleToggleRead = async (id: string, currentRead: boolean) => {
    try {
      await mailApi.markRead(id, !currentRead);
      setEmails(prev => prev.map(item => item.id === id ? { ...item, isRead: !currentRead } : item));
      setUnreadCount(prev => currentRead ? prev + 1 : Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read/unread:', err);
    }
  };

  // Send Email
  const handleSendEmail = async () => {
    if (composeTo.length === 0) {
      addToast('Recipient Required', 'Please specify at least one recipient.', 'warning');
      return;
    }
    if (!composeSubject.trim()) {
      addToast('Subject Required', 'Subject line cannot be empty.', 'warning');
      return;
    }

    setIsSending(true);
    try {
      await mailApi.sendEmail({
        toUserIds: composeTo.map(u => u.id),
        ccUserIds: composeCc.map(u => u.id),
        subject: composeSubject.trim(),
        body: composeBody,
        category: composeCategory,
        attachments: composeAttachments
      });

      // Reset modal
      setIsComposeOpen(false);
      setComposeTo([]);
      setComposeCc([]);
      setComposeSubject('');
      setComposeBody('');
      setComposeAttachments([]);

      addToast('Message Dispatched', 'Your email has been sent successfully.', 'success');

      if (currentFolder === 'sent') {
        loadEmails();
      }
    } catch (err: any) {
      addToast('Dispatch Error', err.response?.data?.message || 'Failed to dispatch email.', 'danger');
    } finally {
      setIsSending(false);
    }
  };

  // Quick Reply inside reader
  const handleSendQuickReply = async () => {
    if (!selectedEmail || !quickReplyText.trim()) return;

    setIsReplying(true);
    try {
      const recipientId = selectedEmail.sender.id === user?.id
        ? selectedEmail.recipients?.[0]?.user?.id || ''
        : selectedEmail.sender.id;

      if (!recipientId) return;

      await mailApi.sendEmail({
        toUserIds: [recipientId],
        subject: selectedEmail.subject.startsWith('Re: ') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
        body: `<p>${quickReplyText.replace(/\n/g, '<br/>')}</p><br/><hr/><p style="color:#64748b;font-size:12px;">On ${new Date(selectedEmail.createdAt).toLocaleString()}, ${selectedEmail.sender.firstName} wrote:<br/>${selectedEmail.body}</p>`,
        category: selectedEmail.category,
        threadId: selectedEmail.threadId
      });

      setQuickReplyText('');
      addToast('Reply Sent', 'Reply dispatched successfully!', 'success');
      loadEmails(true);
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to send reply.', 'danger');
    } finally {
      setIsReplying(false);
    }
  };

  // Copy official email
  const handleCopyEmail = () => {
    if (user?.officialEmail) {
      navigator.clipboard.writeText(user.officialEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Category Badge Colors
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'ANNOUNCEMENT':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20"><Megaphone className="w-2.5 h-2.5" /> Announcement</span>;
      case 'LEAVE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20"><Calendar className="w-2.5 h-2.5" /> Leave</span>;
      case 'ATTENDANCE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20"><Clock className="w-2.5 h-2.5" /> Attendance</span>;
      case 'TIMESHEET':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><Briefcase className="w-2.5 h-2.5" /> Timesheet</span>;
      case 'POLICY':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20"><Shield className="w-2.5 h-2.5" /> Policy</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20"><Mail className="w-2.5 h-2.5" /> General</span>;
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 overflow-hidden">
      {/* Top Header / Status Strip */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Nexus Company Webmail
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Internal Network
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Official corporate communication & automated HR notification system
            </p>
          </div>
        </div>

        {/* User Official Email Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
            {user?.officialEmail || `${user?.email?.split('@')[0]}@nexus.internal`}
          </span>
          <button
            onClick={handleCopyEmail}
            title="Copy Official Work Email"
            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Mail Grid Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Left Folder Sidebar */}
        <div className="hidden lg:flex w-56 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex-col justify-between shrink-0">
          <div className="space-y-4">
            {/* Primary Compose Button */}
            <button
              onClick={() => setIsComposeOpen(true)}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Email</span>
            </button>

            {/* Folder Navigation List */}
            <nav className="space-y-1 text-xs">
              <button
                onClick={() => { setCurrentFolder('inbox'); setSelectedEmail(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentFolder === 'inbox'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setCurrentFolder('starred'); setSelectedEmail(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentFolder === 'starred'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Starred</span>
                </div>
              </button>

              <button
                onClick={() => { setCurrentFolder('sent'); setSelectedEmail(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentFolder === 'sent'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4" />
                  <span>Sent Messages</span>
                </div>
              </button>

              <button
                onClick={() => { setCurrentFolder('drafts'); setSelectedEmail(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentFolder === 'drafts'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>Drafts</span>
                </div>
              </button>

              <button
                onClick={() => { setCurrentFolder('trash'); setSelectedEmail(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentFolder === 'trash'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4" />
                  <span>Trash</span>
                </div>
              </button>
            </nav>

            {/* Category Quick Tags (for Inbox) */}
            {currentFolder === 'inbox' && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-2">
                  Filter by Category
                </p>
                <div className="space-y-0.5 text-xs">
                  {['ALL', 'ANNOUNCEMENT', 'LEAVE', 'ATTENDANCE', 'GENERAL'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium text-[11px] transition ${
                        categoryFilter === cat
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {cat === 'ALL' ? '● All Emails' : `● ${cat}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Help / Security Card */}
          <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
              <Shield className="w-3.5 h-3.5" /> Official Network
            </div>
            Corporate webmail is protected and strictly isolated within Nexus HRMS.
          </div>
        </div>

        {/* 2. Middle Column: Email List */}
        <div
          style={{ width: selectedEmail ? `${listWidth}px` : undefined }}
          className={`flex flex-col border-r border-slate-200 dark:border-slate-800 ${
            selectedEmail ? 'hidden lg:flex shrink-0' : 'flex-1 w-full'
          }`}
        >
          {/* Mobile Folder & Quick Compose Bar */}
          <div className="lg:hidden flex items-center justify-between gap-2 p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 overflow-x-auto shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => { setCurrentFolder('inbox'); setSelectedEmail(null); }}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition shrink-0 ${
                  currentFolder === 'inbox'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Inbox {unreadCount > 0 ? `(${unreadCount})` : ''}
              </button>
              <button
                onClick={() => { setCurrentFolder('sent'); setSelectedEmail(null); }}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition shrink-0 ${
                  currentFolder === 'sent'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Sent
              </button>
              <button
                onClick={() => { setCurrentFolder('drafts'); setSelectedEmail(null); }}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition shrink-0 ${
                  currentFolder === 'drafts'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Drafts
              </button>
              <button
                onClick={() => { setCurrentFolder('trash'); setSelectedEmail(null); }}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition shrink-0 ${
                  currentFolder === 'trash'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Trash
              </button>
            </div>
            <button
              onClick={() => setIsComposeOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compose</span>
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search mail by subject, sender, content..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/70 border border-transparent focus:border-indigo-500 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => loadEmails()}
              title="Refresh Mailbox"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 mx-3 mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="p-0.5 hover:opacity-75">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Email Item Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading && emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mb-2 text-indigo-500" />
                Loading messages...
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs px-6 text-center">
                <Inbox className="w-8 h-8 mb-2 opacity-30" />
                <p className="font-semibold text-slate-500 dark:text-slate-400">No emails in {currentFolder}</p>
                <p className="text-[11px] text-slate-400 mt-1">Your corporate inbox is tidy and all caught up.</p>
              </div>
            ) : (
              paginatedEmails.map(mail => {
                const isSelected = selectedEmail?.id === mail.id;
                const isUnread = currentFolder === 'inbox' && !mail.isRead;

                return (
                  <div
                    key={mail.id}
                    onClick={() => handleOpenEmail(mail)}
                    className={`p-3 cursor-pointer transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                        : isUnread
                        ? 'bg-slate-50/80 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Star toggle */}
                    <button
                      onClick={e => handleToggleStar(e, mail.id)}
                      className="mt-0.5 text-slate-300 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400 transition"
                    >
                      <Star className={`w-3.5 h-3.5 ${mail.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>

                    {/* Sender Info & Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                          {currentFolder === 'sent'
                            ? (mail.recipients && mail.recipients.length > 2
                                ? `To: ${mail.recipients[0]?.user?.firstName}, ${mail.recipients[1]?.user?.firstName} +${mail.recipients.length - 2} more`
                                : `To: ${mail.recipients?.[0]?.user?.firstName || 'Colleague'}`)
                            : `${mail.sender?.firstName} ${mail.sender?.lastName}`}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                          {new Date(mail.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        {getCategoryBadge(mail.category)}
                        {mail.attachments && mail.attachments.length > 0 && (
                          <Paperclip className="w-2.5 h-2.5 text-slate-400" />
                        )}
                      </div>

                      <p className={`text-xs truncate ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {mail.subject}
                      </p>

                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {mail.snippet || 'No preview text'}
                      </p>
                    </div>

                    {/* Unread blue dot */}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <PaginationControls
              currentPage={mailPage}
              pageSize={mailPageSize}
              totalEntries={emails.length}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={setMailPage}
              onPageSizeChange={(newSize) => {
                setMailPageSize(newSize);
                setMailPage(1);
              }}
            />
          </div>
        </div>

        {/* Draggable Column Splitter */}
        {selectedEmail && (
          <div
            onMouseDown={handleMouseDown}
            title="Drag left/right to resize mail list"
            className="hidden lg:flex w-2 -ml-1 cursor-col-resize hover:bg-indigo-500/80 active:bg-indigo-600 bg-transparent transition-colors z-20 items-center justify-center group select-none shrink-0"
          >
            <div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 group-hover:bg-white rounded-full transition-colors" />
          </div>
        )}

        {/* 3. Right Column: Email Reader Pane */}
        {selectedEmail ? (
          <div className="flex-1 w-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            {/* Reader Header Actions */}
            <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 lg:bg-transparent"
                  title="Back to messages"
                >
                  <ChevronLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-semibold">Back</span>
                </button>

                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

                <button
                  onClick={e => handleToggleStar(e, selectedEmail.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 text-xs flex items-center gap-1"
                >
                  <Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
                  <span className="hidden sm:inline">{selectedEmail.isStarred ? 'Starred' : 'Star'}</span>
                </button>

                {currentFolder === 'trash' ? (
                  <button
                    onClick={() => handleDeletePermanent(selectedEmail.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleTrash(selectedEmail.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Trash</span>
                  </button>
                )}

                {currentFolder === 'inbox' && (
                  <button
                    onClick={() => {
                      handleToggleRead(selectedEmail.id, selectedEmail.isRead ?? true);
                      setSelectedEmail(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 text-xs flex items-center gap-1"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Mark Unread</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400">
                {new Date(selectedEmail.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* Email Message Content View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Subject & Category Banner */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {getCategoryBadge(selectedEmail.category)}
                  {selectedEmail.isSystemEmail && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      System Notification
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedEmail.subject}
                </h2>
              </div>

              {/* Sender & Recipient Metadata Card */}
              <div className="bg-slate-50/70 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-sm shrink-0">
                      {selectedEmail.sender.firstName[0]}{selectedEmail.sender.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {selectedEmail.sender.firstName} {selectedEmail.sender.lastName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {selectedEmail.sender.officialEmail || selectedEmail.sender.email}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {selectedEmail.sender.role} • {selectedEmail.sender.designation}
                      </p>
                    </div>
                  </div>

                  {/* Smart Collapsible Recipient Display */}
                  <div className="text-right text-xs shrink-0 self-start">
                    {(() => {
                      const recs = selectedEmail.recipients || [];
                      if (recs.length === 0) {
                        return <span className="text-[11px] text-slate-400 font-medium">To: Me</span>;
                      }
                      if (recs.length <= 3) {
                        return (
                          <div className="text-[11px] text-slate-400 font-medium">
                            To: <span className="text-slate-700 dark:text-slate-200">{recs.map(r => r.user.firstName).join(', ')}</span>
                          </div>
                        );
                      }
                      const firstThree = recs.slice(0, 3).map(r => r.user.firstName).join(', ');
                      const remainingCount = recs.length - 3;
                      return (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium">
                            To: <span className="text-slate-700 dark:text-slate-200">{firstThree}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllRecipients(!showAllRecipients)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                          >
                            <span>+{remainingCount} more</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showAllRecipients ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Expanded All Recipients Tray */}
                {showAllRecipients && selectedEmail.recipients && selectedEmail.recipients.length > 3 && (
                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 animate-in fade-in duration-150">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      All Recipients ({selectedEmail.recipients.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedEmail.recipients.map(r => (
                        <div
                          key={r.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300"
                        >
                          <span className="font-semibold">{r.user.firstName} {r.user.lastName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({r.user.officialEmail || 'Internal'})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Body Content */}
              <div
                className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-2"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
              />

              {/* Attachments Section */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    Attachments ({selectedEmail.attachments.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-medium">{att.fileName}</span>
                        <span className="text-[10px] text-slate-400">({Math.round(att.fileSize / 1024)} KB)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Reply Box */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <Reply className="w-3.5 h-3.5 text-indigo-600" />
                    Quick Reply to {selectedEmail.sender.firstName}
                  </div>
                  <textarea
                    rows={3}
                    value={quickReplyText}
                    onChange={e => setQuickReplyText(e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSendQuickReply}
                      disabled={isReplying || !quickReplyText.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                    >
                      <Send className="w-3 h-3" />
                      {isReplying ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-900/30 text-slate-400 text-xs p-6 text-center">
            <Mail className="w-12 h-12 mb-3 opacity-20 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Select an email to view thread</h3>
            <p className="text-[11px] text-slate-400 max-w-sm mt-1">
              Choose a message from the list on the left to read full conversation details, reply, or download attachments.
            </p>
          </div>
        )}
      </div>

      {/* 4. Compose Modal */}
      {isComposeOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  New Corporate Message
                </h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Inputs */}
            <div className="p-5 flex-1 overflow-y-auto space-y-3 text-xs">
              {/* Recipient `To:` with Autocomplete */}
              <div className="relative">
                <div className="flex items-center gap-2 flex-wrap min-h-[38px] p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-slate-400 font-semibold w-8">To:</span>
                  {composeTo.map(u => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium"
                    >
                      <span>{u.firstName} {u.lastName}</span>
                      <button
                        onClick={() => setComposeTo(prev => prev.filter(item => item.id !== u.id))}
                        className="hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={toInput}
                    onChange={e => setToInput(e.target.value)}
                    placeholder={composeTo.length === 0 ? "Search employee name, role, or official email..." : ""}
                    className="flex-1 min-w-[140px] bg-transparent border-none text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 ml-auto"
                    >
                      Cc
                    </button>
                  )}
                </div>

                {/* Directory Autocomplete Dropdown */}
                {showToDropdown && directoryResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                    {directoryResults.map(u => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setComposeTo(prev => [...prev, u]);
                          setToInput('');
                          setShowToDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between border-b border-slate-100 dark:border-slate-700/40 last:border-0"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {u.officialEmail || u.email}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional `Cc:` */}
              {showCc && (
                <div className="relative">
                  <div className="flex items-center gap-2 flex-wrap min-h-[38px] p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="text-slate-400 font-semibold w-8">Cc:</span>
                    {composeCc.map(u => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        <span>{u.firstName} {u.lastName}</span>
                        <button
                          onClick={() => setComposeCc(prev => prev.filter(item => item.id !== u.id))}
                          className="hover:text-rose-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={ccInput}
                      onChange={e => setCcInput(e.target.value)}
                      placeholder="Add CC recipients..."
                      className="flex-1 min-w-[140px] bg-transparent border-none text-xs focus:outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  {showCcDropdown && directoryResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                      {directoryResults.map(u => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setComposeCc(prev => [...prev, u]);
                            setCcInput('');
                            setShowCcDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between border-b border-slate-100 dark:border-slate-700/40 last:border-0"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">{u.firstName} {u.lastName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.officialEmail || u.email}</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {u.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subject & Category Row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Subject line"
                  className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />

                <select
                  value={composeCategory}
                  onChange={e => setComposeCategory(e.target.value as any)}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 text-xs focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="GENERAL">General</option>
                  {(user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') && (
                    <option value="ANNOUNCEMENT">Announcement</option>
                  )}
                  <option value="LEAVE">Leave Matter</option>
                  <option value="ATTENDANCE">Attendance</option>
                  <option value="TIMESHEET">Timesheet</option>
                  <option value="POLICY">Policy Inquiry</option>
                </select>
              </div>

              {/* Message Body Textarea */}
              <textarea
                rows={8}
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Write your email body here..."
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 resize-none font-sans leading-relaxed"
              />

              {/* Uploaded Attachments Pill List */}
              {composeAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {composeAttachments.map((att, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                    >
                      <Paperclip className="w-3 h-3 text-indigo-500" />
                      <span>{att.fileName}</span>
                      <button
                        type="button"
                        onClick={() => setComposeAttachments(prev => prev.filter((_, i) => i !== index))}
                        className="hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="shrink-0 px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <label className="cursor-pointer text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 text-xs font-semibold">
                <Paperclip className="w-4 h-4" />
                <span>Attach File</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setComposeAttachments(prev => [
                        ...prev,
                        {
                          fileName: file.name,
                          fileUrl: URL.createObjectURL(file),
                          fileSize: file.size,
                          mimeType: file.type
                        }
                      ]);
                    }
                  }}
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  Discard
                </button>

                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition transform active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Permanent Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteEmailId}
        title="Permanently Delete Email"
        message="Are you sure you want to permanently delete this email? This action is irreversible and the message cannot be recovered."
        confirmText="Yes, Delete Permanently"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingEmail}
        onConfirm={executeDeletePermanent}
        onCancel={() => setDeleteEmailId(null)}
      />

    </div>
  );
};
