import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  PhoneCall,
  Clock,
  TrendingUp,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { apiClient } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { useTheme } from '../context/ThemeContext';
import { ReportSummary, Campaign } from '../types';

export const ReportsPage: React.FC = () => {
  const { theme } = useTheme();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCampaign) params.append('campaignId', selectedCampaign);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [repRes, campRes] = await Promise.all([
        apiClient.get(`/reports/summary?${params.toString()}`),
        apiClient.get('/campaigns'),
      ]);

      if (repRes.data.success) setSummary(repRes.data.data);
      if (campRes.data.success) setCampaigns(campRes.data.data);
    } catch (err) {
      console.error('Error fetching reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedCampaign, startDate, endDate]);

  const handleExportCsv = () => {
    window.open('/api/reports/export-csv', '_blank');
  };

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

  const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#64748b'];

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Telephony Analytics & Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aggregated call KPIs, answer rates, hourly throughput, and disposition telemetry.</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center"
        >
          <Download className="w-4 h-4 mr-1.5" /> Export Full Report CSV
        </button>
      </div>

      {/* Date & Filter Bar */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between transition-colors">
        <div className="flex items-center space-x-3 text-xs">
          <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider">Campaign:</label>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider">Date Window:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Outbound Dials"
          value={metrics.totalCalls}
          subtitle={`${metrics.answeredCalls} Connected`}
          icon={PhoneCall}
          color="cyan"
        />
        <StatCard
          title="Answer Rate"
          value={`${metrics.answerRatePercent}%`}
          subtitle="Qualified connection ratio"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Average Talk Time"
          value={formatDuration(metrics.avgDurationSeconds)}
          subtitle="Per connected call"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Total Floor Time"
          value={formatDuration(metrics.totalTalkTimeSeconds)}
          subtitle="Cumulative agent talk"
          icon={BarChart3}
          color="purple"
        />
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Throughput Bar Chart */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Hourly Throughput</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Call distribution across business hours</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.hourlyData || []}>
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
                <Bar dataKey="total" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="answered" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dispositions Breakdown Pie Chart */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Disposition Distribution</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Post-call categorizations submitted by agents</p>

          <div className="h-64 flex items-center justify-center">
            {summary?.dispositionBreakdown && summary.dispositionBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.dispositionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="disposition"
                  >
                    {summary.dispositionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                  <Legend wrapperStyle={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#475569' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No disposition data logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
