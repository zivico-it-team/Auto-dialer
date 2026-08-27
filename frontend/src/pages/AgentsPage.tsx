import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Plus,
  Phone,
  Headphones,
  Clock,
  CheckCircle,
  Activity,
  Edit2,
  Trash2,
  Lock,
  Globe,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useSocket } from '../context/SocketContext';

export const AgentsPage: React.FC = () => {
  const { socket } = useSocket();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSipOpen, setIsSipOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Agent Form
  const [newAgent, setNewAgent] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    phone: '',
    sipExtension: '',
  });

  const [sipForm, setSipForm] = useState({
    sipExtension: '',
    sipUsername: '',
  });

  const fetchAgents = async () => {
    try {
      const res = await apiClient.get('/agents');
      if (res.data.success) {
        setAgents(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching agents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);

    if (socket) {
      socket.on('agent:status', fetchAgents);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('agent:status');
      }
    };
  }, [socket]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await apiClient.post('/agents', newAgent);
      if (res.data.success) {
        setIsAddOpen(false);
        setNewAgent({
          name: '',
          email: '',
          password: 'Password123!',
          phone: '',
          sipExtension: '',
        });
        fetchAgents();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to create agent');
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (window.confirm(`Are you sure you want to delete agent "${agentName}"? This will unassign their active station and remove access.`)) {
      try {
        const res = await apiClient.delete(`/agents/${agentId}`);
        if (res.data.success) {
          fetchAgents();
        }
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete agent');
      }
    }
  };

  const handleUpdateSip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    try {
      const res = await apiClient.put(`/agents/${selectedAgent.id}/sip`, sipForm);
      if (res.data.success) {
        setIsSipOpen(false);
        fetchAgents();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error updating SIP credentials');
    }
  };

  const openSipModal = (agent: any) => {
    setSelectedAgent(agent);
    setSipForm({
      sipExtension: agent.agentProfile?.sipExtension || '',
      sipUsername: agent.agentProfile?.sipUsername || '',
    });
    setIsSipOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Agent Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure softphone SIP extensions, monitor agent readiness, and manage team credentials.</p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add New Agent
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((agent) => {
          const status = agent.agentProfile?.status || 'OFFLINE';
          const extension = agent.agentProfile?.sipExtension;

          return (
            <div
              key={agent.id}
              className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge status={status} />
                  <div className="flex items-center space-x-1.5 font-mono text-xs bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold">
                    <Phone className="w-3 h-3" />
                    <span>{extension ? `Ext: ${extension}` : 'No SIP Ext'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 mt-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-base">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{agent.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{agent.email}</p>
                  </div>
                </div>

                {/* Active Call Alert (if on call) */}
                {agent.activeCall && (
                  <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 font-bold">
                      <span className="flex items-center">
                        <Activity className="w-3.5 h-3.5 mr-1 animate-pulse" /> Active Call
                      </span>
                      <span className="font-mono">{agent.activeCall.status}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-300">
                      Lead: <strong>{agent.activeCall.lead?.name}</strong> ({agent.activeCall.lead?.phone})
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">Campaign: {agent.activeCall.campaign?.name}</p>
                  </div>
                )}

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 text-[11px] block font-medium">Calls Today</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm">{agent.callsToday || 0}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 text-[11px] block font-medium">Answered</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{agent.answeredToday || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Action Controls: Configure SIP & Delete Agent */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Last seen: {agent.agentProfile?.lastSeenAt ? new Date(agent.agentProfile.lastSeenAt).toLocaleTimeString() : 'Never'}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openSipModal(agent)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center"
                    title="Configure ImpactPBX SIP Extension"
                  >
                    <Edit2 className="w-3 h-3 mr-1" /> Configure SIP
                  </button>

                  <button
                    onClick={() => handleDeleteAgent(agent.id, agent.name)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/20 font-bold text-xs transition-colors flex items-center"
                    title="Delete Agent Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Agent Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Agent">
        <form onSubmit={handleCreateAgent} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newAgent.name}
              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              placeholder="e.g. Yadhav (Mohan)"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address (Login Username) *
            </label>
            <input
              type="email"
              required
              value={newAgent.email}
              onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
              placeholder="e.g. yadhav@talkingwave.com"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                ImpactPBX Extension (e.g. 101, 102)
              </label>
              <input
                type="text"
                value={newAgent.sipExtension}
                onChange={(e) => setNewAgent({ ...newAgent, sipExtension: e.target.value })}
                placeholder="101"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Portal Login Password *
              </label>
              <input
                type="password"
                required
                value={newAgent.password}
                onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                placeholder="Min. 6 chars"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-800 dark:text-cyan-300">
            💡 <strong>Note on Passwords:</strong> The <strong>Password</strong> above is the password used by this agent to log in to this Auto-Dialer web app. Their softphone (Zoiper/ImpactPBX) uses their ImpactPBX extension password from <code className="font-mono font-bold">talkingwave.impactpbx.com</code>.
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
            >
              Create Agent
            </button>
          </div>
        </form>
      </Modal>

      {/* Configure SIP Modal */}
      <Modal isOpen={isSipOpen} onClose={() => setIsSipOpen(false)} title={`Configure ImpactPBX SIP — ${selectedAgent?.name}`}>
        <form onSubmit={handleUpdateSip} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
            <div className="text-slate-500 font-semibold">PBX Server Domain:</div>
            <div className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">talkingwave.impactpbx.com</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              SIP Extension Number *
            </label>
            <input
              type="text"
              required
              value={sipForm.sipExtension}
              onChange={(e) => setSipForm({ ...sipForm, sipExtension: e.target.value })}
              placeholder="e.g. 101"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              SIP Username / Auth ID
            </label>
            <input
              type="text"
              value={sipForm.sipUsername}
              onChange={(e) => setSipForm({ ...sipForm, sipUsername: e.target.value })}
              placeholder="e.g. 101"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 font-mono"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSipOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
