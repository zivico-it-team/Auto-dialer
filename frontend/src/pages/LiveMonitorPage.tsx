import React, { useEffect, useState } from 'react';
import {
  Activity,
  Headphones,
  PhoneCall,
  Clock,
  Radio,
  AlertOctagon,
  PhoneOff,
  User,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Badge } from '../components/common/Badge';
import { EmergencyStopModal } from '../components/common/EmergencyStopModal';

export const LiveMonitorPage: React.FC = () => {
  const { socket } = useSocket();
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const fetchLiveSnapshot = async () => {
    try {
      const res = await apiClient.get('/monitoring/live');
      if (res.data.success) {
        setSnapshot(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching live snapshot', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveSnapshot();
    const interval = setInterval(fetchLiveSnapshot, 3000);

    if (socket) {
      socket.on('agent:status', fetchLiveSnapshot);
      socket.on('call:queued', fetchLiveSnapshot);
      socket.on('call:ringing', fetchLiveSnapshot);
      socket.on('call:answered', fetchLiveSnapshot);
      socket.on('call:ended', fetchLiveSnapshot);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('agent:status');
        socket.off('call:queued');
        socket.off('call:ringing');
        socket.off('call:answered');
        socket.off('call:ended');
      }
    };
  }, [socket]);

  const summary = snapshot?.summary || {
    totalAgents: 0,
    agentsOnline: 0,
    agentsOnCall: 0,
    agentsAvailable: 0,
    activeCallsCount: 0,
    activeCampaignsCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Supervisor Live Monitor</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time floor telemetry, agent activity matrix, and active telephony channels.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center shadow-lg shadow-rose-500/10"
          >
            <AlertOctagon className="w-4 h-4 mr-2" />
            EMERGENCY HALT
          </button>
        </div>
      </div>

      {/* Real-time Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold block">Total Agents</span>
          <strong className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 block">{summary.totalAgents}</strong>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
          <span className="text-emerald-600 dark:text-emerald-400 text-[11px] uppercase tracking-wider font-bold block">Available</span>
          <strong className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">{summary.agentsAvailable}</strong>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
          <span className="text-cyan-600 dark:text-cyan-400 text-[11px] uppercase tracking-wider font-bold block">On Call</span>
          <strong className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-1 block">{summary.agentsOnCall}</strong>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
          <span className="text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider font-bold block">Online Total</span>
          <strong className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1 block">{summary.agentsOnline}</strong>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
          <span className="text-purple-600 dark:text-purple-400 text-[11px] uppercase tracking-wider font-bold block">Active Calls</span>
          <strong className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono mt-1 block">{summary.activeCallsCount}</strong>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
          <span className="text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-wider font-bold block">Running Campaigns</span>
          <strong className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono mt-1 block">{summary.activeCampaignsCount}</strong>
        </div>
      </div>

      {/* Agent Roster Live Matrix */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-4 flex items-center">
          <Headphones className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-400" />
          Live Agent Stations ({snapshot?.agents?.length || 0})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {snapshot?.agents?.map((agent: any) => {
            const isOnCall = agent.status === 'ON_CALL';
            const isRinging = agent.status === 'RINGING';
            const isAvailable = agent.status === 'AVAILABLE';

            return (
              <div
                key={agent.id}
                className={`bg-white dark:bg-slate-900/90 border rounded-2xl p-4 transition-all relative overflow-hidden shadow-sm ${
                  isOnCall
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/10'
                    : isRinging
                    ? 'border-amber-500 shadow-lg shadow-amber-500/10 animate-soft-pulse'
                    : isAvailable
                    ? 'border-emerald-500/40'
                    : 'border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{agent.name}</h4>
                      <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">Ext: {agent.sipExtension || '—'}</span>
                    </div>
                  </div>
                  <Badge status={agent.status} size="sm" />
                </div>

                {/* Call Info Banner if on call */}
                {agent.currentCall ? (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                      <span>Connected Lead:</span>
                      <span className="font-mono">{agent.currentCall.status}</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-slate-200">{agent.currentCall.lead?.name}</p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{agent.currentCall.lead?.phone}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Campaign: {agent.currentCall.campaign?.name}</p>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800/40 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Station Standby
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Channels Grid */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm transition-colors">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Live Telephony Channels ({snapshot?.activeCalls?.length || 0})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Session ID</th>
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {!snapshot?.activeCalls || snapshot.activeCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
                    No active channels at this instant.
                  </td>
                </tr>
              ) : (
                snapshot.activeCalls.map((call: any) => (
                  <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{call.callId}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">{call.campaign?.name}</td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-slate-900 dark:text-slate-200">{call.lead?.name}</span> ({call.lead?.phone})
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {call.agent?.name || 'Dialer Pool'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge status={call.status} size="sm" />
                    </td>
                    <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {call.answeredAt
                        ? `${Math.max(1, Math.round((Date.now() - new Date(call.answeredAt).getTime()) / 1000))}s`
                        : 'Dialing...'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmergencyStopModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onSuccess={fetchLiveSnapshot}
      />
    </div>
  );
};
