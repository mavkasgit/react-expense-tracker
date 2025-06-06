import React from 'react';

interface LastUpdateTimeProps {
  timestamp: number;
}

const LastUpdateTime: React.FC<LastUpdateTimeProps> = ({ timestamp }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg text-sm text-gray-600 border border-gray-200">
      <span className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Последнее обновление: {formatTime(timestamp)}
      </span>
    </div>
  );
};

export default LastUpdateTime; 