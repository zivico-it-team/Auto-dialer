import React, { useEffect, useState } from 'react';
import {
  Headphones,
  Phone,
  PhoneOff,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  ShieldBan,
  Save,
  Radio,
  BellRing,
  PhoneCall,
  CalendarCheck,
  Flame,
  XCircle,
  Clock3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Call, Callback, AgentStatus } from '../types';

export const AgentWorkspacePage: React.FC = () => {
  const { user, updateAgentStatus } = useAuth();
  const { socket } = useSocket();

  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Disposition & Notes
  const [disposition, setDisposition] = useState('Interested');
  const [callNotes, setCallNotes] = useState('');
  const [showCallbackPicker, setShowCallbackPicker] = useState(false);
  const [callbackTime, setCallbackTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Callbacks & History
  const [myCallbacks, setMyCallbacks] = useState<Callback[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [activeTab, setActiveTab] = useState<'callbacks' | 'history'>('callbacks');
  const [dueCallbacks, setDueCallbacks] = useState<Callback[]>([]);

  const agentStatus: AgentStatus = user?.agentProfile?.status || 'OFFLINE';

  const fetchData = async () => {
    try {
      const [callsRes, callbacksRes] = await Promise.all([
        apiClient.get('/calls?limit=10'),
        apiClient.get('/callbacks?status=PENDING'),
      ]);

      if (callsRes.data.success) {
        setRecentCalls(callsRes.data.data);
        const ongoing = callsRes.data.data.find((c: Call) =>
          ['RINGING', 'ANSWERED', 'DIALING'].includes(c.status) && c.agentId === user?.id
        );
        if (ongoing && !activeCall) {
          setActiveCall(ongoing);
        }
      }

      if (callbacksRes.data.success) {
        setMyCallbacks(callbacksRes.data.data);
        // Check due callbacks
        const now = new Date().getTime();
        const due = callbacksRes.data.data.filter((cb: Callback) => {
          const sched = new Date(cb.scheduledTime).getTime();
          return sched <= now + 5 * 60 * 1000; // Due within next 5 mins or overdue
        });
        setDueCallbacks(due);
      }
    } catch (err) {
      console.error('Error fetching workspace data', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);

    if (socket) {
      socket.on('call:answered', (call: Call) => {
        if (call.agentId === user?.id) {
          setActiveCall(call);
          setCallDuration(0);
        }
      });

      socket.on('call:ended', (call: Call) => {
        if (activeCall?.callId === call.callId) {
          setActiveCall(call);
        }
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('call:answered');
        socket.off('call:ended');
      }
    };
  }, [socket, activeCall, user]);

  // Duration Timer
  useEffect(() => {
    if (activeCall && activeCall.status === 'ANSWERED') {
      const start = activeCall.answeredAt
        ? new Date(activeCall.answeredAt).getTime()
        : Date.now();

      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setCallDuration(Math.max(0, elapsed));
      }, 1000);

      setTimerInterval(timer);
      return () => clearInterval(timer);
    } else {
      if (timerInterval) clearInterval(timerInterval);
    }
  }, [activeCall?.status]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleHangup = async () => {
    if (!activeCall) return;
    try {
      await apiClient.post(`/calls/${activeCall.id || activeCall.callId}/hangup`);
    } catch (err) {
      console.error('Failed to hangup', err);
    }
  };

  // 1-Click Fast Disposition
  const handleQuickDisposition = async (disp: string) => {
    if (!activeCall) return;
    if (disp === 'Callback') {
      setDisposition('Callback');
      setShowCallbackPicker(true);
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.put(`/calls/${activeCall.id || activeCall.callId}/disposition`, {
        disposition: disp,
        notes: callNotes,
      });

      setActiveCall(null);
      setCallNotes('');
      setDisposition('Interested');
      fetchData();
    } catch (err) {
      console.error('Failed to submit quick disposition', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Manual Callback Dial
  const handle1ClickDialCallback = async (cb: Callback) => {
    try {
      await apiClient.post('/calls/manual-dial', {
        leadId: cb.leadId,
        callbackId: cb.id,
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initiate 1-click dial');
    }
  };

  const handleSubmitCustomDisposition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCall) return;

    setSubmitting(true);
    try {
      await apiClient.put(`/calls/${activeCall.id || activeCall.callId}/disposition`, {
        disposition,
        notes: callNotes,
      });

      if (disposition === 'Callback' && callbackTime) {
        await apiClient.post('/callbacks', {
          leadId: activeCall.leadId,
          campaignId: activeCall.campaignId,
          scheduledTime: new Date(callbackTime).toISOString(),
          notes: callNotes,
        });
      }

      setActiveCall(null);
      setCallNotes('');
      setDisposition('Interested');
      setShowCallbackPicker(false);
      fetchData();
    } catch (err) {
      console.error('Failed to submit disposition', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Due Callback Urgent Alert Banner */}
      {dueCallbacks.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-500/5 animate-soft-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                ⏰ {dueCallbacks.length} Scheduled Callback{dueCallbacks.length > 1 ? 's' : ''} Due Now!
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                Client: <strong>{dueCallbacks[0].lead?.name}</strong> ({dueCallbacks[0].lead?.phone}) — "{dueCallbacks[0].notes || 'Scheduled follow-up'}"
              </p>
            </div>
          </div>

          <button
            onClick={() => handle1ClickDialCallback(dueCallbacks[0])}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center transition-all"
          >
            <PhoneCall className="w-4 h-4 mr-1.5" /> 1-Click Call Now
          </button>
        </div>
      )}

      {/* Agent Status Bar */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-lg">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.name}</h2>
              <Badge status={agentStatus} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Softphone Extension: <strong className="text-cyan-600 dark:text-cyan-400">{user?.agentProfile?.sipExtension || '101'}</strong> (Impact PBX / Zoiper)
            </p>
          </div>
        </div>

        {/* Status Readiness Selector */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateAgentStatus('AVAILABLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center ${
              agentStatus === 'AVAILABLE'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-500'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Ready for Calls
          </button>

          <button
            onClick={() => updateAgentStatus('PAUSED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center ${
              agentStatus === 'PAUSED'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500'
            }`}
          >
            Paused
          </button>

          <button
            onClick={() => updateAgentStatus('BREAK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center ${
              agentStatus === 'BREAK'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500'
            }`}
          >
            Break
          </button>
        </div>
      </div>

      {/* Main Calling Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Live Call & 1-Click Actions */}
        <div className="lg:col-span-2 space-y-5">
          {activeCall ? (
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-colors">
              {/* Call Header */}
              <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold block mb-1">
                    Live Telephony Channel Active
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                    {activeCall.lead?.name || 'Customer Contact'}
                  </h3>
                  <p className="text-sm font-mono text-cyan-600 dark:text-cyan-300 mt-0.5">{activeCall.lead?.phone}</p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner inline-block">
                    {formatTimer(callDuration)}
                  </div>
                  <div className="mt-1">
                    <Badge status={activeCall.status} />
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* 1-Click Fast Disposition Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                    ⚡ 1-Click Quick Dispositions (Instant Result):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleQuickDisposition('Interested')}
                      className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
                      <span>Interested</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDisposition('Callback')}
                      className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-400 hover:text-slate-950 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <CalendarCheck className="w-4 h-4" />
                      <span>Schedule Callback</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDisposition('Not Interested')}
                      className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-700 dark:text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Not Interested</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDisposition('Busy')}
                      className="p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500 text-blue-700 dark:text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <Clock3 className="w-4 h-4" />
                      <span>Line Busy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDisposition('Do Not Call')}
                      className="p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500 text-purple-700 dark:text-purple-400 hover:text-white border border-purple-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <ShieldBan className="w-4 h-4" />
                      <span>Do Not Call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDisposition('Completed')}
                      className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-700 dark:text-cyan-400 hover:text-slate-950 border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolved / Done</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Disposition & Callback Form */}
                <form onSubmit={handleSubmitCustomDisposition} className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {showCallbackPicker && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                      <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                        📅 Schedule Next Call Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={callbackTime}
                        onChange={(e) => setCallbackTime(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Call Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      placeholder="Add customer requirements, price quotes, feedback..."
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Call Controls */}
                  <div className="flex items-center justify-between pt-2">
                    {['RINGING', 'ANSWERED', 'DIALING'].includes(activeCall.status) && (
                      <button
                        type="button"
                        onClick={handleHangup}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center"
                      >
                        <PhoneOff className="w-3.5 h-3.5 mr-1.5" />
                        Hang Up Call
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="ml-auto px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all flex items-center"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {submitting ? 'Saving...' : 'Save & Ready Next'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Standby State */
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm transition-colors">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Radio className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-200">Auto-Dialer Standby</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {agentStatus === 'AVAILABLE'
                    ? 'Dialer is matching eligible leads. When a client answers, call details will popup here with zero delay.'
                    : 'Your status is paused/offline. Click "Ready for Calls" above to begin receiving calls.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Callbacks & History Tabs */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-colors">
          <div>
            {/* Tab Selector */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <button
                onClick={() => setActiveTab('callbacks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center ${
                  activeTab === 'callbacks'
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5 mr-1.5" /> My Callbacks ({myCallbacks.length})
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center ${
                  activeTab === 'history'
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Call History
              </button>
            </div>

            {/* Tab 1: Callbacks List */}
            {activeTab === 'callbacks' && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {myCallbacks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No scheduled callbacks pending.</p>
                ) : (
                  myCallbacks.map((cb) => {
                    const isDue = new Date(cb.scheduledTime).getTime() <= Date.now() + 5 * 60 * 1000;

                    return (
                      <div
                        key={cb.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isDue
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {cb.lead?.name || 'Contact'}
                          </h4>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isDue
                                ? 'bg-amber-500 text-slate-950 animate-pulse'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {new Date(cb.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
                          {cb.lead?.phone}
                        </p>

                        {cb.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mb-2">
                            "{cb.notes}"
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => handle1ClickDialCallback(cb)}
                          className="w-full mt-1 py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow transition-all flex items-center justify-center space-x-1"
                        >
                          <PhoneCall className="w-3.5 h-3.5 mr-1" /> 1-Click Call Now
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Recent Call History */}
            {activeTab === 'history' && (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {recentCalls.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No recent call records.</p>
                ) : (
                  recentCalls.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{c.lead?.name || c.leadName || 'Contact'}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{c.lead?.phone || c.leadPhone}</div>
                      </div>

                      <div className="text-right">
                        <Badge status={c.status} size="sm" />
                        <div className="text-[10px] font-mono text-slate-400 mt-1">{c.durationSeconds}s</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
