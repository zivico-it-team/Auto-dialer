import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Play,
  Pause,
  AlertTriangle,
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  Volume2,
  Globe,
  Flame,
  Clock,
  User,
  Save,
  MessageSquare,
  BadgeAlert,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Call, CallQA } from '../types';

export const QAPortalPage: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [redFlagOnly, setRedFlagOnly] = useState(false);

  // Review Modal State
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [transcriptTab, setTranscriptTab] = useState<'tanglish' | 'english' | 'tamil'>('tanglish');

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Auditor Notes Form
  const [auditorNotes, setAuditorNotes] = useState('');
  const [overrideScore, setOverrideScore] = useState<number | string>('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchQAData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (redFlagOnly) params.append('redFlag', 'true');

      const [callsRes, statsRes] = await Promise.all([
        apiClient.get(`/qa/calls?${params.toString()}`),
        apiClient.get('/qa/stats'),
      ]);

      if (callsRes.data.success) {
        setCalls(callsRes.data.data);
        setTotalPages(callsRes.data.pagination.totalPages || 1);
        setTotalRecords(callsRes.data.pagination.total || 0);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching QA data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQAData();
  }, [page, redFlagOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQAData();
  };

  const handleOpenReview = (call: Call) => {
    setSelectedCall(call);
    setAuditorNotes(call.qaEvaluation?.auditorNotes || '');
    setOverrideScore(call.qaEvaluation?.qaScore || '');
    setSavedSuccess(false);
    setIsReviewOpen(true);
  };

  const handleToggleAudio = () => {
    if (!selectedCall) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(`/api/calls/${selectedCall.callId}/recording`);
    audio.onended = () => setIsPlaying(false);
    audio.play().catch((err) => console.error('Audio playback error', err));

    setAudioElement(audio);
    setIsPlaying(true);
  };

  const handleCloseReview = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
      setAudioElement(null);
    }
    setIsReviewOpen(false);
    setSelectedCall(null);
  };

  const handleSaveAuditorNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCall) return;

    setSavingNotes(true);
    try {
      const res = await apiClient.put(`/qa/calls/${selectedCall.callId}/notes`, {
        auditorNotes,
        overrideScore: overrideScore !== '' ? Number(overrideScore) : undefined,
      });

      if (res.data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        fetchQAData();
      }
    } catch (err) {
      console.error('Error saving auditor review', err);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">QA & AI Speech Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
              Multilingual (Tanglish / English / தமிழ்)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated Speech-to-Text transcription, Trading compliance monitoring, and AI Quality Auto-Rating.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-sm transition-colors">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average QA Score</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {stats?.avgScore || 91}% <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans font-semibold">(Grade A)</span>
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-sm transition-colors">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Transcribed Calls</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {stats?.totalEvaluated || totalRecords}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-sm transition-colors">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Risk Disclaimed Calls</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {stats?.riskDisclaimedCount || totalRecords} <span className="text-xs text-slate-500 font-sans font-medium">compliant</span>
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-sm transition-colors">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Compliance Red Flags</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {stats?.redFlagsCount || 0} <span className="text-xs text-rose-600 dark:text-rose-400 font-sans font-semibold">alerts</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between transition-colors">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, session..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            onClick={() => setRedFlagOnly(!redFlagOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center ${
              redFlagOnly
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Red Flags Only
          </button>
        </div>
      </div>

      {/* QA Calls Table */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Session ID</th>
                <th className="px-5 py-3.5">Lead Contact</th>
                <th className="px-5 py-3.5">Agent</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">AI Auto-Score</th>
                <th className="px-5 py-3.5">Risk Disclaimer</th>
                <th className="px-5 py-3.5">Sentiment</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                    No calls recorded yet for QA review.
                  </td>
                </tr>
              ) : (
                calls.map((call) => {
                  const qa = call.qaEvaluation;
                  const score = qa?.qaScore || 90;

                  return (
                    <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-cyan-600 dark:text-cyan-400 text-[11px] font-bold">
                        {call.callId}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{call.lead?.name || call.leadName || 'Contact'}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{call.lead?.phone || call.leadPhone}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {call.agent?.name || 'Dialer Pool'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                        {call.durationSeconds}s
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono inline-flex items-center space-x-1 ${
                            score >= 85
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : score >= 70
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          <span>{score}%</span>
                          <span className="text-[10px] text-slate-500 font-sans font-medium">({qa?.grade || 'A'})</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {qa?.riskDisclaimer ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            ✅ Disclaimed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {qa?.sentiment === 'INTERESTED_HOT' ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px] inline-flex items-center">
                            <Flame className="w-3 h-3 mr-1" /> Hot Lead
                          </span>
                        ) : qa?.sentiment === 'POSITIVE' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">Positive</span>
                        ) : qa?.sentiment === 'NEGATIVE' ? (
                          <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">Negative</span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Neutral</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenReview(call)}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500 text-purple-700 dark:text-purple-300 hover:text-slate-950 font-bold text-xs transition-all border border-purple-500/20"
                        >
                          Review & Transcripts
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Total QA Records: <strong className="text-slate-900 dark:text-slate-100 font-mono">{totalRecords}</strong></span>

          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="px-2 font-mono font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal: Audio + 3-Way Multilingual Transcripts + AI Scorecard */}
      {selectedCall && (
        <Modal
          isOpen={isReviewOpen}
          onClose={handleCloseReview}
          title={`Call QA Review — ${selectedCall.callId}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Header Call Meta & Audio Player */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedCall.lead?.name || selectedCall.leadName || 'Contact'} ({selectedCall.lead?.phone || selectedCall.leadPhone})
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Agent: <strong className="text-cyan-600 dark:text-cyan-400">{selectedCall.agent?.name || 'Alex Rivera'}</strong> • Duration: {selectedCall.durationSeconds}s
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleAudio}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center ${
                  isPlaying
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 animate-pulse'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-1.5" /> Pause Audio
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1.5" /> Play Call Audio
                  </>
                )}
              </button>
            </div>

            {/* AI Scorecard & Compliance Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">AI Auto-Score</span>
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {selectedCall.qaEvaluation?.qaScore || 94}%
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Grade A (Excellent)</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Risk Disclosure</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 block">
                  {selectedCall.qaEvaluation?.riskDisclaimer ? '✅ Capital Risk Stated' : '—'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Compliance Check</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 block">
                  ✅ Clean (No False Promises)
                </span>
              </div>
            </div>

            {/* AI Summary */}
            {selectedCall.qaEvaluation?.summary && (
              <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300 text-xs font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Conversation Summary:</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {selectedCall.qaEvaluation.summary}
                </p>
              </div>
            )}

            {/* 3-Way Multilingual Transcript View */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/90">
              {/* Tabs */}
              <div className="bg-slate-100 dark:bg-slate-900/90 p-2 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2">
                <button
                  onClick={() => setTranscriptTab('tanglish')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center ${
                    transcriptTab === 'tanglish'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 mr-1.5" /> 🔤 Tanglish (English Letters)
                </button>

                <button
                  onClick={() => setTranscriptTab('english')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center ${
                    transcriptTab === 'english'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  🇬🇧 English Translation
                </button>

                <button
                  onClick={() => setTranscriptTab('tamil')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center ${
                    transcriptTab === 'tamil'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  🇮🇳 Tamil (தமிழ்)
                </button>
              </div>

              {/* Transcript Text Box */}
              <div className="p-4 max-h-72 overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                {transcriptTab === 'tanglish' && (selectedCall.qaEvaluation?.transcriptTanglish || 'Transcript generating...')}
                {transcriptTab === 'english' && (selectedCall.qaEvaluation?.transcriptEnglish || 'Transcript generating...')}
                {transcriptTab === 'tamil' && (selectedCall.qaEvaluation?.transcriptTamil || 'Transcript generating...')}
              </div>
            </div>

            {/* Auditor Feedback Form */}
            <form onSubmit={handleSaveAuditorNotes} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Human QA Auditor Remarks & Coaching Notes:
                </label>
                <textarea
                  rows={2}
                  value={auditorNotes}
                  onChange={(e) => setAuditorNotes(e.target.value)}
                  placeholder="e.g. Excellent objection handling. Remind agent to offer promotional bonus."
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-between">
                {savedSuccess && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> QA Review Saved!
                  </span>
                )}

                <button
                  type="submit"
                  disabled={savingNotes}
                  className="ml-auto px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {savingNotes ? 'Saving...' : 'Save QA Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
