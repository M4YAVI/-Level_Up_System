'use client';

import { Copy, Grip, Loader2, RefreshCw, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ResponsePage() {
  const [userPrompt, setUserPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [includeImage, setIncludeImage] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollowUp = () => {
    if (followUp.trim() && !isStreaming) {
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
      window.api?.captureAndAsk({
        prompt: userPrompt,
        model: selectedModel,
        includeImage: true,
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
      className="fixed mx-auto w-full max-w-3xl bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-2xl rounded-2xl flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden"
      style={{
        minHeight: '400px',
        maxHeight: '80vh',
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10">
        <div className="flex items-center gap-3 flex-1">
          <button
            onMouseDown={handleMouseDown}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-grab active:cursor-grabbing"
            title="Drag to move"
          >
            <Grip size={16} />
          </button>
          <div className="text-white/90 text-sm font-medium truncate max-w-md">
            {userPrompt || 'AI Response'}
          </div>
          {isStreaming && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400 animate-pulse">
                Streaming...
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={isStreaming || !userPrompt}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Regenerate response"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleCopy}
            disabled={!response}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy response"
          >
            {copied ? (
              <span className="text-emerald-400">✓</span>
            ) : (
              <Copy size={18} />
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Response Content with Markdown */}
      <div
        ref={responseRef}
        className="flex-1 overflow-y-auto p-6 custom-scrollbar"
        style={{
          minHeight: '250px',
          maxHeight: 'calc(80vh - 180px)',
        }}
      >
        {response ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="relative group">
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg !bg-gray-900/50 border border-white/5"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(String(children));
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/10 hover:bg-white/20 rounded text-white/60 hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ) : (
                    <code
                      className="bg-gray-800/50 px-1.5 py-0.5 rounded text-blue-300 text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-white/90 mb-4 mt-6">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-white/90 mb-3 mt-5">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-white/80 mb-3 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-white/80 mb-3 space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-white/80 mb-3 space-y-1">
                    {children}
                  </ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500/50 pl-4 italic text-white/70 my-3">
                    {children}
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-blue-400 hover:text-blue-300 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {response}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-5 bg-blue-400 animate-pulse ml-1" />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 italic">Waiting for response...</div>
          </div>
        )}
      </div>

      {/* Follow-up Input */}
      <div className="p-4 border-t border-white/10 bg-gradient-to-r from-white/5 to-white/10">
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              localStorage.setItem('selectedModel', e.target.value);
            }}
            className="bg-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none hover:bg-white/15 transition-all border border-white/10"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id} className="bg-gray-900">
                {model.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={includeImage}
              onChange={(e) => setIncludeImage(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
            />
            New capture
          </label>

          <div className="flex-1 relative">
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
              className="w-full bg-white/10 text-white placeholder-gray-500 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-white/10 transition-all"
              disabled={isStreaming}
            />
          </div>

          <button
            onClick={handleFollowUp}
            disabled={isStreaming || !followUp.trim()}
            className={`p-2.5 rounded-lg transition-all ${
              followUp.trim() && !isStreaming
                ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-lg'
                : 'text-gray-500 bg-white/5'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Send follow-up (Enter)"
          >
            <Send size={18} />
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500 text-center">
          {includeImage
            ? 'Will capture a new screenshot with your follow-up question'
            : 'Will use the same screenshot from the original question'}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
