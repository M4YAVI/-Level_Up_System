'use client';

import { Copy, Loader2, RefreshCw, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ResponsePage() {
  const [userPrompt, setUserPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash-latest');
  const [includeImage, setIncludeImage] = useState(true);
  const responseRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const models = [
    { id: 'gemini-2.5-flash', name: 'Flash' },
    { id: 'gemini-2.5-pro', name: 'Pro' },
    { id: 'gemini-2.5-flash-lite-preview-06-17', name: 'Lite' },
  ];

  useEffect(() => {
    if (!window.api) return;

    const unsubscribes: (() => void)[] = [];

    // Get initial model from input window
    const storedModel = localStorage.getItem('selectedModel');
    if (storedModel) {
      setSelectedModel(storedModel);
    }

    unsubscribes.push(
      window.api.on('ai-response-start', (data: { prompt: string }) => {
        setUserPrompt(data.prompt);
        setResponse('');
        setIsStreaming(true);
        setFollowUp('');
      }) as () => void
    );

    unsubscribes.push(
      window.api.on('ai-response-chunk', (chunk: string) => {
        setResponse((prev) => prev + chunk);
      }) as () => void
    );

    unsubscribes.push(
      window.api.on('ai-response-end', () => {
        setIsStreaming(false);
      }) as () => void
    );

    return () => {
      unsubscribes.forEach((fn) => fn?.());
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new content arrives
    if (responseRef.current && isStreaming) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response, isStreaming]);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollowUp = () => {
    if (followUp.trim() && !isStreaming) {
      // Send follow-up with the selected model and image preference
      window.api?.captureAndAsk({
        prompt: followUp.trim(),
        model: selectedModel,
        includeImage: includeImage,
      });
      setFollowUp('');
    }
  };

  const handleRegenerate = () => {
    if (!isStreaming && userPrompt) {
      // Regenerate with original prompt
      window.api?.captureAndAsk({
        prompt: userPrompt,
        model: selectedModel,
        includeImage: true, // Always include image for regeneration
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp();
    }
  };

  const handleClose = () => {
    window.api?.showInput();
    window.api?.closeResponse();
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black/90 backdrop-blur-xl rounded-xl flex flex-col border border-white/10 shadow-2xl"
      style={{
        minHeight: '300px',
        maxHeight: '80vh',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div className="flex-1 flex items-center gap-3">
          <div className="text-white/80 text-sm truncate max-w-md">
            {userPrompt || 'AI Response'}
          </div>
          {isStreaming && (
            <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={isStreaming || !userPrompt}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Regenerate response"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleCopy}
            disabled={!response}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Copy response"
          >
            {copied ? (
              <span className="text-green-400">✓</span>
            ) : (
              <Copy size={18} />
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Response Content with Scroll */}
      <div
        ref={responseRef}
        className="flex-1 overflow-y-auto p-6 text-white/90 whitespace-pre-wrap custom-scrollbar"
        style={{
          minHeight: '200px',
          maxHeight: 'calc(80vh - 140px)',
        }}
      >
        {response || (
          <div className="text-gray-500 italic">Waiting for response...</div>
        )}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-white/50 animate-pulse ml-1" />
        )}
      </div>

      {/* Follow-up Input */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              localStorage.setItem('selectedModel', e.target.value);
            }}
            className="bg-white/10 text-white text-xs px-2 py-2 rounded-md focus:outline-none hover:bg-white/15 transition-colors"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id} className="bg-gray-900">
                {model.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={includeImage}
              onChange={(e) => setIncludeImage(e.target.checked)}
              className="rounded bg-white/10 border-white/20"
            />
            New capture
          </label>

          <input
            type="text"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              includeImage
                ? 'Ask about new screen...'
                : 'Ask follow-up about the same screen...'
            }
            className="flex-1 bg-white/10 text-white placeholder-gray-500 px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white/30"
            disabled={isStreaming}
          />

          <button
            onClick={handleFollowUp}
            disabled={isStreaming || !followUp.trim()}
            className={`p-2 rounded-md transition-colors ${
              followUp.trim() && !isStreaming
                ? 'text-white bg-white/10 hover:bg-white/15'
                : 'text-gray-500 bg-white/5'
            } disabled:opacity-50`}
            title="Send follow-up (Enter)"
          >
            <Send size={18} />
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          {includeImage
            ? 'Will capture a new screenshot with your follow-up question'
            : 'Will use the same screenshot from the original question'}
        </div>
      </div>
    </div>
  );
}
