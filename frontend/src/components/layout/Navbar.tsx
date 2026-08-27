import React, { useState } from 'react';
import {
  AlertOctagon,
  LogOut,
  User as UserIcon,
  Phone,
  Shield,
  CheckCircle2,
  Coffee,
  PauseCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { EmergencyStopModal } from '../common/EmergencyStopModal';
import { ThemeToggle } from '../common/ThemeToggle';
import { AgentStatus } from '../../types';

export const Navbar: React.FC = () => {
  const { user, logout, isSupervisor, isAgent, updateAgentStatus } = useAuth();
  const { isConnected } = useSocket();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const agentStatus = user?.agentProfile?.status || 'OFFLINE';

  const handleStatusChange = (status: AgentStatus) => {
    updateAgentStatus(status);
  };

  return (
    <>
      <header className="h-16 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
        {/* Left Indicator */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {isConnected ? 'Real-Time Telemetry Connected' : 'Telemetry Reconnecting...'}
            </span>
          </div>

          {user?.agentProfile?.sipExtension && (
            <div className="hidden md:flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <Phone className="w-3 h-3 text-cyan-500 dark:text-cyan-400 mr-1" />
              <span>SIP: {user.agentProfile.sipExtension}</span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Agent Status Selector (if Agent) */}
          {isAgent && (
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
              <button
                onClick={() => handleStatusChange('AVAILABLE')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center transition-all ${
                  agentStatus === 'AVAILABLE'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Available
              </button>

              <button
                onClick={() => handleStatusChange('PAUSED')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center transition-all ${
                  agentStatus === 'PAUSED'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-500'
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5 mr-1" />
                Paused
              </button>

              <button
                onClick={() => handleStatusChange('BREAK')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center transition-all ${
                  agentStatus === 'BREAK'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-amber-500'
                }`}
              >
                <Coffee className="w-3.5 h-3.5 mr-1" />
                Break
              </button>
            </div>
          )}

          {/* Emergency Stop Button (Admin / Supervisor) */}
          {isSupervisor && (
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center shadow-sm"
              title="Emergency Stop all running campaigns"
            >
              <AlertOctagon className="w-4 h-4 mr-1.5" />
              EMERGENCY STOP
            </button>
          )}

          {/* Light / Dark Mode Toggle Button */}
          <ThemeToggle />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{user?.name}</p>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">{user?.role}</span>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <p className="text-slate-400">Signed in as</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.email}</p>
                </div>

                <a
                  href="/profile"
                  className="flex items-center px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setDropdownOpen(false)}
                >
                  <UserIcon className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  My Profile
                </a>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center px-4 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Emergency Stop Modal */}
      <EmergencyStopModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onSuccess={() => {
          // Toast or refresh
        }}
      />
    </>
  );
};
