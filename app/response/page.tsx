'use client';

import { Copy, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ResponsePage() {
  const [userPrompt, setUserPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [copied, setCopied] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.api) return;

    const unsubscribes: (() => void)[] = [];

    unsubscribes.push(
      window.api.on('ai-response-start', (data: { prompt: string }) => {
        setUserPrompt(data.prompt);
        setResponse('');
        setIsStreaming(true);
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
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollowUp = () => {
    if (followUp.trim()) {
      window.api?.showInput();
      window.api?.closeResponse();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp();
    }
  };

  return (
    <div className="w-full h-full bg-black/90 backdrop-blur-md rounded-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex-1 text-white/80 text-sm truncate pr-4">
          {userPrompt}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Copy response"
          >
            {copied ? '✓' : <Copy size={18} />}
          </button>
          <button
            onClick={() => window.api?.closeResponse()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Response Content */}
      <div
        ref={responseRef}
        className="flex-1 overflow-y-auto p-4 text-white/90 whitespace-pre-wrap"
      >
        {response}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-white/50 animate-pulse ml-1" />
        )}
      </div>

      {/* Follow-up Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            className="flex-1 bg-white/10 text-white placeholder-gray-500 px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white/30"
            disabled={isStreaming}
          />
          <button
            onClick={handleFollowUp}
            disabled={isStreaming || !followUp.trim()}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
