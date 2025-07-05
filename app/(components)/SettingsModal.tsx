'use client';

import {
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Keyboard,
  Save,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'api' | 'shortcuts'>('api');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing API key
    if (window.api) {
      window.api.getApiKey().then((key) => {
        if (key) setApiKey(key);
      });
    }

    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        // Check if click is not on the input bar
        const inputBar = document.getElementById('input-bar');
        if (inputBar && !inputBar.contains(event.target as Node)) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key cannot be empty');
      return;
    }

    if (!apiKey.startsWith('AIza')) {
      setError('Invalid API key format');
      return;
    }

    try {
      window.api?.saveApiKey(apiKey);
      setSaved(true);
      setError('');
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to save API key');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTab === 'api') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-50">
      <div
        ref={panelRef}
        className="mx-auto w-[500px] bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden"
        style={{
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Header */}
        <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'api'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Key size={16} />
              API Key
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'shortcuts'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Keyboard size={16} />
              Shortcuts
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content with scroll area */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {activeTab === 'api' ? (
            <div className="p-6 space-y-4">
              {/* API Key Input */}
              <div className="space-y-3">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <span className="block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Google Gemini API Key
                </h3>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setError('');
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your API key (AIza...)"
                    className="w-full bg-white/5 text-white placeholder-gray-500 px-4 py-3 pr-12 rounded-lg border border-white/10 focus:border-white/30 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
                    <span className="block w-1 h-1 bg-red-400 rounded-full mt-1.5"></span>
                    {error}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <h4 className="text-white/80 text-sm font-medium">
                  How to get your API key:
                </h4>
                <ol className="space-y-2 text-gray-400 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-white/60">1.</span>
                    <span>Visit Google AI Studio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/60">2.</span>
                    <span>Sign in with your Google account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/60">3.</span>
                    <span>Click "Get API key" and create a new key</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white/60">4.</span>
                    <span>Copy and paste it here</span>
                  </li>
                </ol>
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-2"
                >
                  Open Google AI Studio
                  <ExternalLink size={14} />
                </a>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!apiKey.trim() || saved}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all transform active:scale-[0.98] ${
                  saved
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10 disabled:bg-white/5 disabled:text-gray-500'
                }`}
              >
                {saved ? (
                  <span className="flex items-center justify-center gap-2">
                    <Save size={18} />
                    Saved Successfully!
                  </span>
                ) : (
                  'Save API Key'
                )}
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="block w-2 h-2 bg-blue-400 rounded-full"></span>
                Keyboard Shortcuts
              </h3>

              <div className="space-y-2">
                {[
                  {
                    action: 'Show/Hide Assistant',
                    keys: ['Ctrl', '/'],
                    description: 'Toggle the input bar visibility',
                  },
                  {
                    action: 'Send Query',
                    keys: ['Enter'],
                    description: 'Send your question to AI',
                  },
                  {
                    action: 'New Line',
                    keys: ['Shift', 'Enter'],
                    description: 'Add a new line in input',
                  },
                  {
                    action: 'Clear & Reset',
                    keys: ['Ctrl', 'R'],
                    description: 'Clear all and return to input',
                  },
                  {
                    action: 'Close Settings',
                    keys: ['Esc'],
                    description: 'Close this settings panel',
                  },
                ].map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div>
                      <div className="text-white text-sm font-medium">
                        {shortcut.action}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {shortcut.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs text-white font-mono">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-gray-500 text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-sm">
                  💡 <span className="font-medium">Pro tip:</span> You can drag
                  the input bar anywhere on your screen for convenience.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
