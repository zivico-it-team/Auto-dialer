import React from 'react';

interface BadgeProps {
  status: string;
  variant?: 'solid' | 'subtle' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, variant = 'subtle', size = 'md' }) => {
  const getColors = (s: string) => {
    switch (s.toUpperCase()) {
      case 'RUNNING':
      case 'AVAILABLE':
      case 'ANSWERED':
      case 'ACTIVE':
      case 'COMPLETED':
      case 'CONNECTED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

      case 'DIALING':
      case 'RINGING':
      case 'CALLBACK':
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';

      case 'ON_CALL':
      case 'READY':
      case 'CONTACTED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';

      case 'PAUSED':
      case 'BREAK':
      case 'NEW':
      case 'QUEUED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';

      case 'DO_NOT_CALL':
      case 'FAILED':
      case 'BUSY':
      case 'NO_ANSWER':
      case 'STOPPED':
      case 'SUSPENDED':
      case 'INACTIVE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';

      case 'OFFLINE':
      case 'DRAFT':
      case 'ENDED':
      case 'CANCELLED':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${getColors(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
