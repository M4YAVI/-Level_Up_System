'use client';

import { ChevronDown } from 'lucide-react';
import React from 'react';

const models = [
  { id: 'gemini-2.flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite-preview-06-17', name: 'Gemini 2.5 lite' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
];

interface ModelDropdownProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ModelDropdown: React.FC<ModelDropdownProps> = ({
  selectedModel,
  setSelectedModel,
}) => {
  return (
    <div className="relative">
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="w-full pl-4 pr-10 py-1.5 rounded-full text-sm font-medium text-gray-300 bg-gray-800 bg-opacity-25 shadow-inner shadow-white/5 ring-1 ring-inset ring-white/10 border border-gray-700/50 hover:bg-opacity-40 transition duration-300 ease-in-out hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer"
      >
        {models.map((model) => (
          <option
            key={model.id}
            value={model.id}
            className="bg-gray-900 text-white"
          >
            {model.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
};

export default ModelDropdown;
