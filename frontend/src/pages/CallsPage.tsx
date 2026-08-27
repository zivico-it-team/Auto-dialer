import React, { useEffect, useState } from 'react';
import {
  PhoneCall,
  Search,
  Filter,
  Play,
  Pause,
  Clock,
  User,
  Megaphone,
  Volume2,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Call, Campaign } from '../types';

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCalls, setTotalCalls] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDisposition, setSelectedDisposition] = useState('');

  // Audio Playback
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.append('search', search);
      if (selectedCampaign) params.append('campaignId', selectedCampaign);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedDisposition) params.append('disposition', selectedDisposition);

      const res = await apiClient.get(`/calls?${params.toString()}`);
      if (res.data.success) {
        setCalls(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCalls(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Error fetching calls', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await apiClient.get('/campaigns');
      if (res.data.success) {
        setCampaigns(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching campaigns', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [page, selectedCampaign, selectedStatus, selectedDisposition]);

  const handlePlayRecording = (call: Call) => {
    if (currentPlayingId === call.callId && audioElement) {
      audioElement.pause();
      setCurrentPlayingId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(`/api/calls/${call.callId}/recording`);
    audio.onended = () => setCurrentPlayingId(null);
    audio.play().catch((err) => console.error('Audio playback error', err));

    setAudioElement(audio);
    setCurrentPlayingId(call.callId);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Call History & Recordings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Audit past outbound sessions, verify dispositions, and stream secure audio logs.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between transition-colors">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchCalls();
              }
            }}
            placeholder="Search by lead name, phone, session ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto overflow-x-auto text-xs">
          {/* Campaign Filter */}
          <select
            value={selectedCampaign}
            onChange={(e) => {
              setSelectedCampaign(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-300 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-300 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="">All States</option>
            <option value="ENDED">ENDED</option>
            <option value="ANSWERED">ANSWERED</option>
            <option value="NO_ANSWER">NO_ANSWER</option>
            <option value="BUSY">BUSY</option>
            <option value="FAILED">FAILED</option>
          </select>

          {/* Disposition Filter */}
          <select
            value={selectedDisposition}
            onChange={(e) => {
              setSelectedDisposition(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-300 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Dispositions</option>
            <option value="Interested">Interested</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Callback">Callback</option>
            <option value="No Answer">No Answer</option>
            <option value="Busy">Busy</option>
            <option value="Do Not Call">Do Not Call</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Session ID</th>
                <th className="px-5 py-3.5">Lead Contact</th>
                <th className="px-5 py-3.5">Campaign</th>
                <th className="px-5 py-3.5">Agent</th>
                <th className="px-5 py-3.5">Disposition / State</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Recording</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                    No calls found.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-cyan-600 dark:text-cyan-400 text-[11px] font-bold">
                      {call.callId}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{call.lead?.name || call.leadName || 'Contact'}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{call.lead?.phone || call.leadPhone}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {call.campaign?.name || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {call.agent?.name || 'Dialer Pool'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge status={call.status} size="sm" />
                        {call.disposition && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            {call.disposition}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(call.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {call.durationSeconds > 0 ? (
                        <button
                          onClick={() => handlePlayRecording(call)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all inline-flex items-center ${
                            currentPlayingId === call.callId
                              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 animate-pulse'
                              : 'bg-cyan-500/10 hover:bg-cyan-500 text-cyan-700 dark:text-cyan-400 hover:text-slate-950 border border-cyan-500/20'
                          }`}
                        >
                          {currentPlayingId === call.callId ? (
                            <>
                              <Pause className="w-3.5 h-3.5 mr-1" /> Pause Audio
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 mr-1" /> Play Audio
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No Audio</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Total Calls: <strong className="text-slate-900 dark:text-slate-100 font-mono">{totalCalls}</strong></span>

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
    </div>
  );
};
