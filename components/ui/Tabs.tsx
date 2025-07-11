
import React, { useState } from 'react';

interface Tab {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
}

const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-700">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === index
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        {tabs[activeTab].content}
      </div>
    </div>
  );
};

export default Tabs;
