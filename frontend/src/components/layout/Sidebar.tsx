import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Users,
  UserCheck,
  PhoneCall,
  Activity,
  BarChart3,
  Settings,
  Headphones,
  Calendar,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, isSupervisor, isAgent } = useAuth();

  const links = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      to: '/agent-workspace',
      label: 'Softphone Workspace',
      icon: Headphones,
      badge: 'Live',
      roles: ['ADMIN', 'SUPERVISOR', 'AGENT'],
    },
    {
      to: '/live-monitor',
      label: 'Live Floor Telemetry',
      icon: Activity,
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      to: '/campaigns',
      label: 'Campaigns',
      icon: Megaphone,
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      to: '/leads',
      label: 'Leads & DNC',
      icon: Users,
      roles: ['ADMIN', 'SUPERVISOR', 'AGENT'],
    },
    {
      to: '/agents',
      label: 'Agent Roster',
      icon: UserCheck,
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      to: '/calls',
      label: 'Call History',
      icon: PhoneCall,
      roles: ['ADMIN', 'SUPERVISOR', 'AGENT'],
    },
    {
      to: '/qa-portal',
      label: 'QA & Call Quality',
      icon: ShieldCheck,
      badge: 'AI QA',
      roles: ['ADMIN', 'SUPERVISOR', 'QA_AUDITOR'],
    },
    {
      to: '/reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      to: '/settings',
      label: 'Settings & Audit',
      icon: Settings,
      roles: ['ADMIN', 'SUPERVISOR'],
    },
  ];

  const filteredLinks = links.filter((link) =>
    user ? link.roles.includes(user.role) : false
  );

  return (
    <aside className="w-64 bg-white dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen select-none transition-colors">
      {/* Brand Header with Official Talking Wave Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="Talking Wave Logo"
            className="w-10 h-10 object-contain rounded-xl shadow-sm"
          />
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight uppercase font-sans">
              TALKING WAVE
            </h1>
            <p className="text-[9px] text-cyan-600 dark:text-cyan-400 font-mono font-bold tracking-widest uppercase">
              SMART PBX SOLUTION
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 dark:border-cyan-500/20 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            PBX Engine Active
          </span>
          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
