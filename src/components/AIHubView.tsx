import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialIcon } from './MaterialIcon';
import { AIModelType, AIChatMessage, DiaryEntry, Task } from '../types';
import { sendAIChatMessage } from '../utils/ai';

interface AIHubViewProps {
  diaryEntries: DiaryEntry[];
  tasks: Task[];
}

const MODEL_CONFIGS: Record<
  AIModelType,
  { name: string; tag: string; provider: string; color: string; bgSoft: string; description: string }
> = {
  gemini: {
    name: 'Gemini 3.8 Flash',
    tag: 'Fast & Deep Reasoning',
    provider: 'Google DeepMind',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgSoft: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    description: 'Grounding in daily schedule, analytical reflection & charts',
  },
  chatgpt: {
    name: 'ChatGPT (GPT-4o)',
    tag: 'Empathetic & Editorial',
    provider: 'OpenAI Persona',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgSoft: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    description: 'Nuanced writing, structured outlines & mindful coaching',
  },
  grok: {
    name: 'Grok 3',
    tag: 'Direct & Pragmatic',
    provider: 'xAI Persona',
    color: 'text-amber-600 dark:text-amber-400',
    bgSoft: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    description: 'Crisp, no-nonsense accountability & high-momentum insights',
  },
};

const INITIAL_MESSAGES: AIChatMessage[] = [
  {
    id: 'msg-init-1',
    role: 'assistant',
    model: 'gemini',
    timestamp: 'Just now',
    content:
      'Welcome to your private AI Hub. I analyze your daily schedule, tasks, and personal diary without transmitting your raw data externally. How can I assist your clarity and focus today?',
    insightTitle: 'Weekly Momentum Baseline',
    chartData: [
      { label: 'Mon', value: 72 },
      { label: 'Tue', value: 85 },
      { label: 'Wed', value: 78 },
      { label: 'Thu', value: 92 },
      { label: 'Fri', value: 88 },
      { label: 'Sat', value: 95 },
      { label: 'Sun', value: 90 },
    ],
  },
];

export const AIHubView: React.FC<AIHubViewProps> = ({ diaryEntries, tasks }) => {
  const [selectedModel, setSelectedModel] = useState<AIModelType>('gemini');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<AIChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue.trim();
    if (!textToSend || isLoading) return;

    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      model: selectedModel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAIChatMessage({
        message: textToSend,
        model: selectedModel,
        history: historyPayload,
        corpus: {
          recentTasksCount: tasks.length,
          completedTasks: tasks.filter(t => t.completed).length,
          recentDiaryCount: diaryEntries.length,
          recentEntries: diaryEntries.slice(0, 3).map(e => ({
            date: e.date,
            title: e.title,
            mood: e.mood,
            body: e.body.slice(0, 200),
          })),
        },
      });

      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        model: selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chartData: res.chartData,
        insightTitle: res.insightTitle,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error contacting AI copilot:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: 'I was unable to establish connection. Your offline fallback patterns remain available.',
          model: selectedModel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES);
  };

  // Render an SVG Chart for insight data
  // Render an SVG Chart for insight data with realistic product analytics metrics & threshold
  const renderChart = (data: { label: string; value: number }[], title?: string) => {
    const maxValue = 100;
    const chartHeight = 110;
    const chartWidth = 280;
    const padding = 20;
    const avgValue = Math.round(data.reduce((acc, d) => acc + d.value, 0) / (data.length || 1));

    return (
      <div className="mt-3 p-3.5 bg-white/70 dark:bg-stone-900/80 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MaterialIcon name="analytics" size={18} className="text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              {title || 'Visual Momentum Analytics'}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => setChartType('bar')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition ${chartType === 'bar' ? 'bg-white dark:bg-stone-700 shadow-2xs font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-500'}`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition ${chartType === 'line' ? 'bg-white dark:bg-stone-700 shadow-2xs font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-500'}`}
            >
              Line
            </button>
          </div>
        </div>

        {/* Real KPI Summary Row */}
        <div className="grid grid-cols-3 gap-1.5 py-1 px-1 bg-stone-50 dark:bg-stone-950/40 rounded-xl border border-stone-100 dark:border-stone-800/80 text-center font-mono">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-stone-400 block">Avg Consistency</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{avgValue}%</span>
          </div>
          <div className="border-x border-stone-200/70 dark:border-stone-800">
            <span className="text-[9px] uppercase tracking-wider text-stone-400 block">Target Threshold</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">80%</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-stone-400 block">Peak Rhythm</span>
            <span className="text-xs font-bold text-stone-700 dark:text-stone-200">Sat (95%)</span>
          </div>
        </div>

        {chartType === 'bar' ? (
          <div className="relative h-24 pt-2">
            {/* 80% Benchmark Reference Line */}
            <div
              className="absolute left-0 right-0 border-b border-dashed border-emerald-500/50 z-0 flex justify-end"
              style={{ bottom: '80%' }}
            >
              <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 -mt-3.5 pr-0.5">
                80% Goal
              </span>
            </div>

            <div className="flex items-end justify-between gap-1.5 h-full relative z-10">
              {data.map((item, idx) => {
                const heightPercent = Math.min(100, Math.max(12, item.value));
                const isOverGoal = item.value >= 80;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[9px] font-mono font-medium text-stone-500 dark:text-stone-400">
                      {item.value}%
                    </span>
                    <div
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 shadow-2xs ${
                        isOverGoal
                          ? 'bg-linear-to-t from-amber-600 to-amber-400 dark:from-amber-600 dark:to-amber-300'
                          : 'bg-linear-to-t from-stone-400 to-stone-300 dark:from-stone-600 dark:to-stone-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] text-stone-600 dark:text-stone-400 font-medium">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-24 pt-2 flex flex-col justify-end">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Reference Grid & 80% Benchmark */}
              <line x1="0" y1={chartHeight - padding} x2={chartWidth} y2={chartHeight - padding} stroke="currentColor" strokeOpacity="0.1" />
              <line
                x1="0"
                y1={(chartHeight - padding) - (80 / maxValue) * (chartHeight - padding - 10)}
                x2={chartWidth}
                y2={(chartHeight - padding) - (80 / maxValue) * (chartHeight - padding - 10)}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3,3"
                strokeOpacity="0.6"
              />

              {/* Line path */}
              {(() => {
                const step = (chartWidth - padding * 2) / Math.max(1, data.length - 1);
                const points = data.map((d, i) => {
                  const x = padding + i * step;
                  const y = (chartHeight - padding) - (d.value / maxValue) * (chartHeight - padding - 10);
                  return `${x},${y}`;
                });
                const dPath = `M ${points.join(' L ')}`;
                const areaPath = `${dPath} L ${padding + (data.length - 1) * step},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#chartGradient)" />
                    <path d={dPath} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {data.map((d, i) => {
                      const x = padding + i * step;
                      const y = (chartHeight - padding) - (d.value / maxValue) * (chartHeight - padding - 10);
                      return (
                        <circle key={i} cx={x} cy={y} r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
            <div className="flex justify-between px-2 text-[10px] text-stone-500 font-medium mt-1">
              {data.map((d, i) => (
                <span key={i}>{d.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentConfig = MODEL_CONFIGS[selectedModel];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Top MD3 Model Selector Banner */}
      <div className="relative mb-4" ref={dropdownRef}>
        <div className="p-3 bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 md3-elevation-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${currentConfig.bgSoft} flex items-center justify-center`}>
              <MaterialIcon name="auto_awesome" size={22} filled className={currentConfig.color} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {currentConfig.name}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {currentConfig.provider}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {currentConfig.tag}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              aria-label="Switch AI Persona"
            >
              <span>Switch</span>
              <MaterialIcon
                name="expand_more"
                size={18}
                className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer flex items-center justify-center"
              title="Reset conversation"
            >
              <MaterialIcon name="refresh" size={18} />
            </button>
          </div>
        </div>

        {/* Model Switcher Dropdown */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl p-2 space-y-1.5"
            >
              {(Object.keys(MODEL_CONFIGS) as AIModelType[]).map(key => {
                const conf = MODEL_CONFIGS[key];
                const isSelected = selectedModel === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedModel(key);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${conf.bgSoft} flex items-center justify-center`}>
                        <MaterialIcon name="psychology" size={18} className={conf.color} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                            {conf.name}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            • {conf.provider}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {conf.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        {[
          { label: '📊 Weekly Mood Trend', prompt: 'Analyze my weekly mood trend from my diary entries and show a visual chart.' },
          { label: '⚡ Focus & Productivity', prompt: 'Show my task completion and focus patterns over this week.' },
          { label: '🧘 Evening Reflection', prompt: 'Provide a compassionate reflection on today’s priorities and habits.' },
          { label: '🎯 Adjust Routines', prompt: 'What habits or schedule blocks should I tweak for better stillness and output?' },
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip.prompt)}
            disabled={isLoading}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[#18181B] border border-stone-200/90 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-300 transition shadow-2xs disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-1">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          const msgConfig = MODEL_CONFIGS[msg.model];

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msgConfig.bgSoft} mt-0.5`}>
                  <MaterialIcon name="smart_toy" size={18} className={msgConfig.color} />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 md3-elevation-1 ${
                  isUser
                    ? 'bg-amber-600 text-white rounded-br-xs'
                    : 'bg-white dark:bg-[#18181B] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-800 rounded-bl-xs'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-stone-400 font-mono">
                    <span className="font-semibold text-stone-600 dark:text-stone-300">
                      {msgConfig.name}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                )}

                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Optional Visual SVG Insight Chart */}
                {msg.chartData && renderChart(msg.chartData, msg.insightTitle)}

                {isUser && (
                  <div className="mt-1 text-right text-[10px] text-amber-100 font-mono">
                    {msg.timestamp}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 mt-0.5">
                  <MaterialIcon name="person" size={18} className="text-amber-700 dark:text-amber-300" />
                </div>
              )}
            </motion.div>
          );
        })}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 text-stone-500 text-xs p-2"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${currentConfig.bgSoft}`}>
              <MaterialIcon name="progress_activity" size={18} className={`animate-spin ${currentConfig.color}`} />
            </div>
            <span className="font-medium animate-pulse">
              {currentConfig.name} is synthesizing insights...
            </span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="sticky bottom-20 pt-2">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 p-1.5 pl-4 bg-white dark:bg-[#18181B] rounded-full border border-stone-300 dark:border-stone-700 md3-elevation-2 focus-within:border-amber-500 dark:focus-within:border-amber-400 transition"
        >
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={`Ask ${currentConfig.name} or type "trend"...`}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
            aria-label="Send message"
          >
            <MaterialIcon name="send" size={18} />
          </button>
        </form>
        <p className="text-center text-[10px] text-stone-400 mt-1.5">
          Local offline storage • AI grounded in your private notes & schedule
        </p>
      </div>
    </div>
  );
};
