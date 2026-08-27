import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Upload,
  Download,
  Plus,
  Filter,
  ShieldBan,
  Trash2,
  Phone,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Lead, Campaign } from '../types';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Single Lead Form
  const [newLead, setNewLead] = useState({
    campaignId: '',
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  // Import Form
  const [importCampaignId, setImportCampaignId] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.append('search', search);
      if (selectedCampaign) params.append('campaignId', selectedCampaign);
      if (selectedStatus) params.append('status', selectedStatus);

      const [leadsRes, campsRes] = await Promise.all([
        apiClient.get(`/leads?${params.toString()}`),
        apiClient.get('/campaigns'),
      ]);

      if (leadsRes.data.success) {
        setLeads(leadsRes.data.data);
        setTotalPages(leadsRes.data.pagination.totalPages || 1);
        setTotalLeads(leadsRes.data.pagination.total || 0);
      }
      if (campsRes.data.success) {
        setCampaigns(campsRes.data.data);
        if (!newLead.campaignId && campsRes.data.data.length > 0) {
          setNewLead((prev) => ({ ...prev, campaignId: campsRes.data.data[0].id }));
          setImportCampaignId(campsRes.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching leads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, selectedCampaign, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/leads', newLead);
      if (res.data.success) {
        setIsCreateOpen(false);
        setNewLead({
          campaignId: campaigns[0]?.id || '',
          name: '',
          phone: '',
          email: '',
          notes: '',
        });
        fetchLeads();
      }
    } catch (err) {
      console.error('Error creating lead', err);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile || !importCampaignId) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('campaignId', importCampaignId);

    try {
      const res = await apiClient.post('/leads/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setImportResult(res.data.data);
        fetchLeads();
      }
    } catch (err: any) {
      setImportResult({ error: err.response?.data?.error || 'Failed to upload CSV.' });
    } finally {
      setImporting(false);
    }
  };

  const handleMarkDnc = async (leadId: string) => {
    try {
      await apiClient.post(`/leads/${leadId}/dnc`);
      fetchLeads();
    } catch (err) {
      console.error('Error marking DNC', err);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (window.confirm('Delete this lead? Call logs will be preserved.')) {
      try {
        await apiClient.delete(`/leads/${leadId}`);
        fetchLeads();
      } catch (err) {
        console.error('Error deleting lead', err);
      }
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedCampaign) params.append('campaignId', selectedCampaign);
    if (selectedStatus) params.append('status', selectedStatus);
    window.open(`/api/leads/export-csv?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Leads & DNC Compliance</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage contact records, batch CSV imports, deduplication, and Do Not Call restrictions.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm transition-all flex items-center"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Export CSV
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-bold text-xs shadow-sm transition-all flex items-center"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Import CSV
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Single Lead
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between transition-colors">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
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
            <option value="">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="QUEUED">QUEUED</option>
            <option value="ANSWERED">ANSWERED</option>
            <option value="NO_ANSWER">NO_ANSWER</option>
            <option value="BUSY">BUSY</option>
            <option value="CALLBACK">CALLBACK</option>
            <option value="FAILED">FAILED</option>
            <option value="DO_NOT_CALL">DO_NOT_CALL</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Lead Name</th>
                <th className="px-5 py-3.5">Phone Number</th>
                <th className="px-5 py-3.5">Campaign</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Attempts</th>
                <th className="px-5 py-3.5">Last Attempt</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                    No leads found matching current query.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{lead.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{lead.email || '—'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                      {lead.phone}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {lead.campaign?.name || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={lead.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {lead.attempts} attempts
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {lead.lastAttemptAt ? new Date(lead.lastAttemptAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {!lead.optedOut && lead.status !== 'DO_NOT_CALL' ? (
                          <button
                            onClick={() => handleMarkDnc(lead.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white text-[11px] font-bold transition-all flex items-center border border-rose-500/20"
                            title="Add to Do Not Call List"
                          >
                            <ShieldBan className="w-3 h-3 mr-1" /> DNC
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-500">Opted Out</span>
                        )}

                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Total Records: <strong className="text-slate-900 dark:text-slate-100 font-mono">{totalLeads}</strong></span>

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

      {/* Add Single Lead Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Single Lead">
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Select Campaign *
            </label>
            <select
              required
              value={newLead.campaignId}
              onChange={(e) => setNewLead({ ...newLead, campaignId: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={newLead.notes}
              onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
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

      {/* Import CSV Modal */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Leads from CSV" maxWidth="lg">
        <form onSubmit={handleImportCsv} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Target Campaign *
            </label>
            <select
              required
              value={importCampaignId}
              onChange={(e) => setImportCampaignId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-cyan-500 rounded-2xl text-center bg-slate-50/80 dark:bg-slate-950/60 transition-colors">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-cyan-600 dark:text-cyan-400 mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Choose a CSV file with headers (name, phone, email, notes)</p>
            <input
              type="file"
              accept=".csv,text/csv"
              required
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="mt-3 text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 dark:file:bg-slate-800 file:text-cyan-700 dark:file:text-cyan-400 hover:file:bg-slate-300 dark:hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          {importResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-1 ${
              importResult.error
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              {importResult.error ? (
                <p><strong>Error:</strong> {importResult.error}</p>
              ) : (
                <>
                  <p className="font-bold">✅ Import Summary:</p>
                  <p>• Successfully Imported: {importResult.importedCount}</p>
                  <p>• Skipped Duplicate Numbers: {importResult.batchDuplicates + importResult.databaseDuplicates}</p>
                  <p>• Invalid/Malformed Rows: {importResult.invalidRowsCount}</p>
                </>
              )}
            </div>
          )}

          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={importing || !csvFile}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {importing ? 'Processing CSV...' : 'Start Import'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
