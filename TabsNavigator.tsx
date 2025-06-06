
import React from 'react';
// AppView import might not be strictly necessary here if types are just strings
// but keeping for potential future use or clarity if some views are fixed by enum
// For now, all views are treated as strings.

interface TabsNavigatorProps {
  currentView: string; // Changed from AppView to string
  onSelectView: (view: string) => void; // Changed from AppView to string
  availableViews: string[]; // Changed from AppView[] to string[]
}

const TabsNavigator: React.FC<TabsNavigatorProps> = ({ currentView, onSelectView, availableViews }) => {
  return (
    <div className="mb-6 border-b border-gray-300">
      <nav className="-mb-px flex space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
        {availableViews.map((view) => (
          <button
            key={view}
            onClick={() => onSelectView(view)}
            className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm
              ${currentView === view
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {view}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabsNavigator;