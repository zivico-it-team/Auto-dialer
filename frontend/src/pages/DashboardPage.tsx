import React, { useEffect, useState } from 'react';
import {
  Users,
  Megaphone,
  PhoneCall,
  CheckCircle,
  PhoneOff,
  Clock,
  TrendingUp,
  Headphones,
  Radio,
  Play,
  Pause,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { apiClient } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { Campaign, ReportSummary } from '../types';

export const DashboardPage: React.FC = () => {
  const { socket } = useSocket();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [campRes, reportRes, monitorRes] = await Promise.all([
        apiClient.get('/campaigns'),
        apiClient.get('/reports/summary'),
        apiClient.get('/monitoring/live'),
      ]);

      if (campRes.data.success) setCampaigns(campRes.data.data);
      if (reportRes.data.success) setSummary(reportRes.data.data);
      if (monitorRes.data.success) setLiveSnapshot(monitorRes.data.data);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto poll every 8 seconds or listen on socket events
    const interval = setInterval(fetchData, 8000);

    if (socket) {
      socket.on('call:queued', fetchData);
      socket.on('call:answered', fetchData);
      socket.on('call:ended', fetchData);
      socket.on('campaign:status_changed', fetchData);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('call:queued');
        socket.off('call:answered');
        socket.off('call:ended');
        socket.off('campaign:status_changed');
      }
    };
  }, [socket]);

  const metrics = summary?.metrics || {
    totalCalls: 0,
    answeredCalls: 0,
    noAnswerCalls: 0,
    busyCalls: 0,
    failedCalls: 0,
    avgDurationSeconds: 0,
    totalTalkTimeSeconds: 0,
    answerRatePercent: 0,
  };

  const totalLeads = campaigns.reduce((sum, c) => sum + (c.totalLeads || 0), 0);
  const completedLeads = campaigns.reduce((sum, c) => sum + (c.completedLeads || 0), 0);
  const leadsRemaining = Math.max(0, totalLeads - completedLeads);
  const activeCampaignsCount = campaigns.filter((c) => c.status === 'RUNNING').length;

  const pieData = [
    { name: 'Answered', value: metrics.answeredCalls, color: '#10b981' },
    { name: 'No Answer', value: metrics.noAnswerCalls, color: '#f59e0b' },
    { name: 'Busy', value: metrics.busyCalls, color: '#06b6d4' },
    { name: 'Failed', value: metrics.failedCalls, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Call Center Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time dialer telemetry, lead sequencing, and performance metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs shadow-sm">
            <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <span className="text-slate-600 dark:text-slate-300">
              Active Mode: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{liveSnapshot?.telephonyProvider || 'Mock Engine'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Leads"
          value={totalLeads}
          subtitle={`${leadsRemaining} Remaining`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Campaigns"
          value={activeCampaignsCount}
          subtitle={`${campaigns.length} Total`}
          icon={Megaphone}
          color="cyan"
        />
        <StatCard
          title="Agents Online"
          value={liveSnapshot?.summary?.agentsOnline || 0}
          subtitle={`${liveSnapshot?.summary?.agentsOnCall || 0} On Call`}
          icon={Headphones}
          color="emerald"
        />
        <StatCard
          title="Total Calls"
          value={metrics.totalCalls}
          subtitle={`${metrics.answeredCalls} Connected`}
          icon={PhoneCall}
          color="purple"
        />
        <StatCard
          title="Answer Rate"
          value={`${metrics.answerRatePercent}%`}
          subtitle="Target: >65%"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Avg Call Time"
          value={formatDuration(metrics.avgDurationSeconds)}
          subtitle={`Total: ${formatDuration(metrics.totalTalkTimeSeconds)}`}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Call Traffic */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Hourly Call Volume</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total outbound calls and connected calls by hour</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 mr-1.5" /> Total Dials
              </span>
              <span className="flex items-center text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" /> Answered
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.hourlyData || []}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ansGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} />
                <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#06b6d4" fillOpacity={1} fill="url(#totalGrad)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="answered" stroke="#10b981" fillOpacity={1} fill="url(#ansGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcome Breakdown Pie */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm flex flex-col justify-between transition-colors">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Call Outcomes</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Disposition and state distribution</p>
          </div>

          <div className="h-48 flex items-center justify-center my-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No call data available yet</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Answered</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{metrics.answeredCalls}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">No Answer</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{metrics.noAnswerCalls}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Busy</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{metrics.busyCalls}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">Failed</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{metrics.failedCalls}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Campaigns Table */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Campaign Overview</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time dialer progress and campaign execution state</p>
          </div>
          <a
            href="/campaigns"
            className="inline-flex items-center text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Manage Campaigns <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Campaign</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Progress</th>
                <th className="px-6 py-3.5">Concurrency</th>
                <th className="px-6 py-3.5">Calling Hours</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                    No campaigns created yet.
                  </td>
                </tr>
              ) : (
                campaigns.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{c.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={c.status} />
                    </td>
                    <td className="px-6 py-4 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-600 dark:text-slate-400">{c.completedLeads || 0} / {c.totalLeads || 0}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{c.progressPercent || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                          style={{ width: `${c.progressPercent || 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {c.activeCalls || 0} / {c.maxConcurrentCalls} calls
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                      {c.callingStartTime} - {c.callingEndTime} ({c.timezone})
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.status === 'RUNNING' ? (
                        <button
                          onClick={async () => {
                            await apiClient.post(`/campaigns/${c.id}/pause`);
                            fetchData();
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white font-bold transition-all inline-flex items-center border border-amber-500/20"
                        >
                          <Pause className="w-3 h-3 mr-1" /> Pause
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await apiClient.post(`/campaigns/${c.id}/start`);
                            fetchData();
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold transition-all inline-flex items-center border border-emerald-500/20"
                        >
                          <Play className="w-3 h-3 mr-1" /> Start
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
