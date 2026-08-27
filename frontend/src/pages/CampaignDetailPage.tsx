import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Users,
  Clock,
  PhoneCall,
  ShieldAlert,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Campaign, Lead } from '../types';

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', notes: '' });

  const fetchCampaign = async () => {
    if (!id) return;
    try {
      const [campRes, leadsRes] = await Promise.all([
        apiClient.get(`/campaigns/${id}`),
        apiClient.get(`/leads?campaignId=${id}&limit=50`),
      ]);
      if (campRes.data.success) setCampaign(campRes.data.data);
      if (leadsRes.data.success) setLeads(leadsRes.data.data);
    } catch (err) {
      console.error('Error fetching campaign details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const handleAction = async (action: 'start' | 'pause' | 'stop') => {
    if (!id) return;
    try {
      await apiClient.post(`/campaigns/${id}/${action}`);
      fetchCampaign();
    } catch (err) {
      console.error(`Error executing ${action}`, err);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const res = await apiClient.post('/leads', { ...newLead, campaignId: id });
      if (res.data.success) {
        setIsAddLeadOpen(false);
        setNewLead({ name: '', phone: '', email: '', notes: '' });
        fetchCampaign();
      }
    } catch (err) {
      console.error('Error adding lead to campaign', err);
    }
  };

  const handleMarkDnc = async (leadId: string) => {
    try {
      await apiClient.post(`/leads/${leadId}/dnc`);
      fetchCampaign();
    } catch (err) {
      console.error('Error marking lead DNC', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-mono text-xs">Loading Campaign Details...</div>;
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Campaign not found.</p>
        <Link to="/campaigns" className="text-xs text-cyan-600 dark:text-cyan-400 mt-2 inline-block font-bold">
          ← Back to Campaigns
        </Link>
      </div>
    );
  }

  const breakdown = campaign.leadBreakdown || {};

  return (
    <div className="space-y-6">
      {/* Back link & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/campaigns"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{campaign.name}</h1>
              <Badge status={campaign.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{campaign.description || 'No description'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {campaign.status === 'RUNNING' ? (
            <button
              onClick={() => handleAction('pause')}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-400 hover:text-slate-950 font-bold text-xs transition-all flex items-center border border-amber-500/30"
            >
              <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause Campaign
            </button>
          ) : (
            <button
              onClick={() => handleAction('start')}
              className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-400 hover:text-white font-bold text-xs transition-all flex items-center border border-emerald-500/30"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" /> Start Dialer Run
            </button>
          )}

          {campaign.status !== 'STOPPED' && (
            <button
              onClick={() => handleAction('stop')}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 text-xs font-bold transition-all flex items-center"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
            </button>
          )}

          <button
            onClick={() => setIsAddLeadOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Lead
          </button>
        </div>
      </div>

      {/* Rules & Telemetry Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Max Concurrency</span>
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">{campaign.maxConcurrentCalls} calls</h4>
        </div>
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Retry Policy</span>
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">{campaign.retryLimit} max attempts</h4>
        </div>
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Calling Schedule</span>
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {campaign.callingStartTime} - {campaign.callingEndTime} ({campaign.timezone})
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Call Recording</span>
          <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {campaign.recordCalls ? 'Enabled' : 'Disabled'}
          </h4>
        </div>
      </div>

      {/* Lead Status Breakdown Matrix */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Lead Status Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries({
            NEW: breakdown['NEW'] || 0,
            QUEUED: breakdown['QUEUED'] || 0,
            ANSWERED: breakdown['ANSWERED'] || 0,
            NO_ANSWER: breakdown['NO_ANSWER'] || 0,
            BUSY: breakdown['BUSY'] || 0,
            FAILED: breakdown['FAILED'] || 0,
            DO_NOT_CALL: breakdown['DO_NOT_CALL'] || 0,
          }).map(([key, count]) => (
            <div key={key} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 text-center">
              <Badge status={key} size="sm" />
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2 font-mono">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Leads in this Campaign ({leads.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Lead Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Attempts</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
                    No leads assigned yet. Click "Add Lead" or import a CSV on the Leads page.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">{l.name}</td>
                    <td className="px-5 py-3 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{l.phone}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{l.email || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge status={l.status} />
                    </td>
                    <td className="px-5 py-3 font-mono">{l.attempts} / {campaign.retryLimit}</td>
                    <td className="px-5 py-3 text-right">
                      {!l.optedOut && l.status !== 'DO_NOT_CALL' && (
                        <button
                          onClick={() => handleMarkDnc(l.id)}
                          className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold"
                        >
                          Mark DNC
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

      {/* Add Lead Modal */}
      <Modal isOpen={isAddLeadOpen} onClose={() => setIsAddLeadOpen(false)} title="Add Lead to Campaign">
        <form onSubmit={handleAddLead} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Lead Name *
            </label>
            <input
              type="text"
              required
              value={newLead.name}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              placeholder="e.g. Kasun Perera"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              required
              value={newLead.phone}
              onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              placeholder="+94771234567"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={newLead.email}
              onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddLeadOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
            >
              Save Lead
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
