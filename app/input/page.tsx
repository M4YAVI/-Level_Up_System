'use client';

import { Camera, CameraOff, Send, SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import Settings from '../(components)/SettingsModal';

const models = [
  { id: 'gemini-1.5-flash-latest', name: 'Flash' },
  { id: 'gemini-1.5-pro-latest', name: 'Pro' },
  { id: 'gemini-2.0-flash-exp', name: 'Flash 2.0' },
];

export default function InputPage() {
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash-latest');
  const [includeImage, setIncludeImage] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if API key exists
    if (window.api) {
      window.api.getApiKey().then((key) => {
        setHasApiKey(!!key);
        // Auto-show settings if no API key
        if (!key) {
          setTimeout(() => setShowSettings(true), 500);
        }
      });

      // Listen for clear input event
      const unsubscribe = window.api.on('clear-input', () => {
        setQuery('');
        setError('');
        setShowSettings(false);
      });

      // Listen for errors
      const errorUnsubscribe = window.api.on('error', (message: string) => {
        setError(message);
        setTimeout(() => setError(''), 5000);
      });

      return () => {
        unsubscribe?.();
        errorUnsubscribe?.();
      };
    }
  }, []);

  const handleSubmit = () => {
    if (!hasApiKey) {
      setShowSettings(true);
      return;
    }

    if (!query.trim() && !includeImage) {
      setError('Please enter a question or enable image capture');
      return;
    }

    window.api?.captureAndAsk({
      prompt: query.trim() || 'Analyze this',
      model: selectedModel,
      includeImage,
    });
    setQuery('');
    setError('');
    setShowSettings(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full h-full">
      <div
        id="input-bar"
        className="w-full h-full bg-black/80 backdrop-blur-xl rounded-lg flex items-center px-4 gap-3 draggable border border-white/10"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            includeImage ? 'Ask about your screen...' : 'Ask a question...'
          }
          className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none no-drag text-sm"
          autoFocus
        />

        <div className="flex items-center gap-2 no-drag">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-white/10 text-white text-xs px-2 py-1.5 rounded-md focus:outline-none hover:bg-white/15 transition-colors cursor-pointer"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id} className="bg-gray-900">
                {model.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIncludeImage(!includeImage)}
            className={`p-1.5 rounded-md transition-all ${
              includeImage
                ? 'text-white bg-white/10 hover:bg-white/15'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title={includeImage ? 'Image capture on' : 'Image capture off'}
          >
            {includeImage ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md transition-all ${
              showSettings
                ? 'text-white bg-white/20'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>

          <button
            onClick={handleSubmit}
            disabled={!hasApiKey && !showSettings}
            className={`p-1.5 rounded-md transition-all ${
              query.trim() || includeImage
                ? 'text-white bg-white/10 hover:bg-white/15'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            } disabled:opacity-50`}
            title="Send (Enter)"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute -bottom-14 left-0 right-0 mx-auto w-fit bg-red-500/20 backdrop-blur-md text-red-400 text-sm px-4 py-2 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      {/* Settings dropdown panel */}
      {showSettings && (
        <Settings
          onClose={() => {
            setShowSettings(false);
            // Recheck API key after settings close
            window.api?.getApiKey().then((key) => {
              setHasApiKey(!!key);
            });
          }}
        />
      )}
    </div>
  );
}
