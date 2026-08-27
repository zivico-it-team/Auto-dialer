import React, { useState } from 'react';
import { AlertOctagon, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { apiClient } from '../../services/api';

interface EmergencyStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EmergencyStopModal: React.FC<EmergencyStopModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmergencyStop = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/campaigns/emergency-stop');
      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to trigger emergency stop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Emergency Stop All Campaigns" maxWidth="md">
      <div className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
          <AlertOctagon className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <h4 className="text-lg font-bold text-rose-600 dark:text-rose-400">Halt All Active Dialing?</h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
            This will immediately pause <strong>all running campaigns</strong> across the entire system.
            No new outbound calls will be initiated. Ongoing connected calls will be preserved.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-300 font-bold">
            {error}
          </div>
        )}

        <div className="pt-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleEmergencyStop}
            disabled={loading}
            className="px-5 py-2 text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Emergency Stop
          </button>
        </div>
      </div>
    </Modal>
  );
};
