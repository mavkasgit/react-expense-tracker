import React from 'react';
import { Category } from '../types';

interface TabsNavigatorProps {
  currentView: string;
  onViewChange: (view: string) => void;
  categories: Category[];
}

const TabsNavigator: React.FC<TabsNavigatorProps> = ({ currentView, onViewChange, categories }) => {
  const views = ['Management', 'All Expenses', ...categories.map(cat => cat.name)];

  return (
    <div className="flex space-x-2 mb-6 overflow-x-auto">
      {views.map((view) => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === view
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          {view}
        </button>
      ))}
    </div>
  );
};

export default TabsNavigator;