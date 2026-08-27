import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  Clock,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Campaign } from '../types';

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxConcurrentCalls: 5,
    retryLimit: 3,
    retryDelaySeconds: 3600,
    callingStartTime: '09:00',
    callingEndTime: '18:00',
    timezone: 'Asia/Colombo',
    recordCalls: true,
  });

  const fetchCampaigns = async () => {
    try {
      const res = await apiClient.get('/campaigns');
      if (res.data.success) {
        setCampaigns(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await apiClient.post('/campaigns', formData);
      if (res.data.success) {
        setIsCreateOpen(false);
        setFormData({
          name: '',
          description: '',
          maxConcurrentCalls: 5,
          retryLimit: 3,
          retryDelaySeconds: 3600,
          callingStartTime: '09:00',
          callingEndTime: '18:00',
          timezone: 'Asia/Colombo',
          recordCalls: true,
        });
        fetchCampaigns();
      }
    } catch (err) {
      console.error('Error creating campaign', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'start' | 'pause' | 'stop') => {
    try {
      await apiClient.post(`/campaigns/${id}/${action}`);
      fetchCampaigns();
    } catch (err) {
      console.error(`Error executing ${action}`, err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign? All leads and queue entries will be deleted.')) return;
    try {
      await apiClient.delete(`/campaigns/${id}`);
      fetchCampaigns();
    } catch (err) {
      console.error('Error deleting campaign', err);
    }
  };

  const filteredCampaigns = filterStatus === 'ALL'
    ? campaigns
    : campaigns.filter((c) => c.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Campaigns</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure calling rules, retry algorithms, concurrency thresholds, and schedules.</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Campaign
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto text-xs">
        {['ALL', 'RUNNING', 'READY', 'PAUSED', 'COMPLETED', 'STOPPED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterStatus === st
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCampaigns.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <Megaphone className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No campaigns found</h3>
            <p className="text-xs text-slate-500 mt-1">Click "Create New Campaign" to set up your first dialing run.</p>
          </div>
        ) : (
          filteredCampaigns.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge status={c.status} />
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {c.callingStartTime} - {c.callingEndTime}
                  </span>
                </div>

                <Link to={`/campaigns/${c.id}`}>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                    {c.name}
                  </h3>
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                  {c.description || 'No description provided.'}
                </p>

                {/* Progress Bar */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Lead Progress</span>
                    <span className="font-bold text-slate-900 dark:text-slate-200 font-mono">
                      {c.completedLeads || 0} / {c.totalLeads || 0} ({c.progressPercent || 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${c.progressPercent || 0}%` }}
                    />
                  </div>
                </div>

                {/* Rules Summary */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Max Concurrency</span>
                    <strong className="text-slate-800 dark:text-slate-200">{c.maxConcurrentCalls} calls</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Retry Limit</span>
                    <strong className="text-slate-800 dark:text-slate-200">{c.retryLimit} attempts</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {c.status === 'RUNNING' ? (
                    <button
                      onClick={() => handleAction(c.id, 'pause')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white font-bold text-xs transition-all flex items-center border border-amber-500/20"
                    >
                      <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(c.id, 'start')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white font-bold text-xs transition-all flex items-center border border-emerald-500/20"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" /> Start
                    </button>
                  )}

                  {c.status !== 'STOPPED' && (
                    <button
                      onClick={() => handleAction(c.id, 'stop')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Stop Campaign"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <Link
                    to={`/campaigns/${c.id}`}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline px-2 py-1"
                  >
                    Details →
                  </Link>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Campaign"
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Q3 Sales Outreach - Sri Lanka"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Campaign objective and target demographic..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Max Concurrent Calls
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={formData.maxConcurrentCalls}
                onChange={(e) => setFormData({ ...formData, maxConcurrentCalls: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Retry Limit
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={formData.retryLimit}
                onChange={(e) => setFormData({ ...formData, retryLimit: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Calling Start Time
              </label>
              <input
                type="time"
                value={formData.callingStartTime}
                onChange={(e) => setFormData({ ...formData, callingStartTime: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Calling End Time
              </label>
              <input
                type="time"
                value={formData.callingEndTime}
                onChange={(e) => setFormData({ ...formData, callingEndTime: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
