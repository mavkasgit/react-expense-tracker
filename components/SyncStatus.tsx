import React from 'react';

interface SyncStatusProps {
  status: 'idle' | 'syncing' | 'error';
  error: string | null;
  lastSyncTime: number;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ status, error, lastSyncTime }) => {
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-3 h-3 rounded-full ${
        status === 'syncing' ? 'bg-yellow-500 animate-pulse' :
        status === 'error' ? 'bg-red-500' :
        'bg-green-500'
      }`} />
      <span className="text-gray-600">
        {status === 'syncing' ? 'Syncing...' :
         status === 'error' ? `Error: ${error}` :
         `Last sync: ${formatTime(lastSyncTime)}`}
      </span>
    </div>
  );
};

export default SyncStatus; 