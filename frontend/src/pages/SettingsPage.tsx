import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Phone,
  Server,
  Shield,
  History,
  HardDrive,
  Save,
  CheckCircle2,
  ExternalLink,
  Radio,
  Copy,
  Check,
  Globe,
  Key,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Badge } from '../components/common/Badge';
import { AuditLog } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('Talking Wave');
  const [globalMaxCalls, setGlobalMaxCalls] = useState(10);
  const [recordingRetention, setRecordingRetention] = useState(90);

  const fetchSettings = async () => {
    try {
      const [setRes, auditRes] = await Promise.all([
        apiClient.get('/settings'),
        apiClient.get('/settings/audit-logs?limit=25'),
      ]);

      if (setRes.data.success) {
        setSettings(setRes.data.data);
        if (setRes.data.data.customSettings?.company_name) {
          setCompanyName(setRes.data.data.customSettings.company_name);
        }
        if (setRes.data.data.concurrency?.globalMaxConcurrentCalls) {
          setGlobalMaxCalls(setRes.data.data.concurrency.globalMaxConcurrentCalls);
        }
      }

      if (auditRes.data.success) {
        setAuditLogs(auditRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/settings', {
        key: 'company_name',
        value: companyName,
        description: 'Company Brand Name',
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      fetchSettings();
    } catch (err) {
      console.error('Error saving setting', err);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">System Settings & Compliance</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure PBX telephony connections, concurrency gates, and inspect audit logs.</p>
      </div>

      {/* ImpactPBX Cloud PBX Integration Card */}
      <div className="bg-gradient-to-br from-cyan-500/10 via-white to-blue-500/5 dark:from-cyan-950/40 dark:via-slate-900/80 dark:to-blue-950/20 border border-cyan-500/30 dark:border-cyan-500/30 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Talking Wave ImpactPBX Cloud Engine</h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Primary Telephony Server: <strong className="font-mono text-cyan-700 dark:text-cyan-400">talkingwave.impactpbx.com</strong>
              </p>
            </div>
          </div>

          <a
            href="https://talkingwave.impactpbx.com/app/user_dashboard/user_dashboard.php"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center space-x-1.5"
          >
            <span>Open ImpactPBX Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Credentials & Telemetry quick-view */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-white/80 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">SIP Server Domain</span>
            <div className="flex items-center justify-between">
              <span className="text-slate-900 dark:text-slate-200 font-bold">talkingwave.impactpbx.com</span>
              <button
                onClick={() => handleCopy('talkingwave.impactpbx.com', 'sipDomain')}
                className="text-slate-400 hover:text-cyan-600 p-1"
                title="Copy Domain"
              >
                {copied === 'sipDomain' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">SIP Port (UDP/TCP)</span>
            <span className="text-slate-900 dark:text-slate-200 font-bold">5060 (Standard) / 5061 (TLS)</span>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">WebRTC WSS Port</span>
            <span className="text-slate-900 dark:text-slate-200 font-bold">7443 / 5066 (Secure WS)</span>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">DNC Engine Protection</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{settings?.compliance?.dncLeadsTotal || 0} Blocked</span>
          </div>
        </div>

        {/* Instructions Quick Box */}
        <div className="mt-4 p-4 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-slate-100">📌 ImpactPBX Setup & Softphone Configuration Guide:</p>
          <p>• <strong>Agent Softphones (Zoiper / MicroSIP / Impact Webphone)</strong>: Configure SIP Server / Domain as <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold text-cyan-700 dark:text-cyan-400">talkingwave.impactpbx.com</code> with Extension ID (e.g. 101, 102) and Extension Password.</p>
          <p>• <strong>Auto-Dialer Bridging</strong>: When an outbound customer answers, the dialer automatically connects the live audio channel directly to the assigned agent extension on your ImpactPBX PBX instance.</p>
        </div>
      </div>

      {/* Platform Settings Form */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Platform Configuration</h3>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center font-bold">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Settings updated successfully.
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Organization / Brand Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Global Max Concurrent Calls (Safety Gate)
              </label>
              <input
                type="number"
                disabled
                value={globalMaxCalls}
                className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400 opacity-80 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Configured via environment variable</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Audit Log Stream */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Security Audit Trail (Last 25 Events)
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      {log.action}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-300">
                      {log.entity}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">
                      {log.user?.name || 'System / Anonymous'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-[11px] font-mono max-w-xs truncate">
                      {log.details || '—'}
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
