import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  AtSign, 
  ShieldAlert, 
  ArrowRight, 
  FileText, 
  Terminal, 
  Check, 
  Sparkles,
  Bot,
  Copy,
  CheckCheck,
  UserPlus,
  Sliders,
  Cpu,
  CornerDownLeft,
  ChevronDown,
  ChevronUp,
  StopCircle,
  Activity,
  Wifi,
  Puzzle,
  Zap,
  BookOpen,
  Layers
} from 'lucide-react';
import { 
  Message, 
  AgentProfile, 
  Task, 
  ApprovalCardData, 
  ToolEvent, 
  HandoffEvent, 
  Artifact 
} from '../types.ts';
import { GrokAvatar } from './GrokAvatar.tsx';

interface TranscriptAreaProps {
  conversationTitle: string;
  isProjectGroup: boolean;
  messages: Message[];
  activeTask?: Task;
  agents: AgentProfile[];
  onSendMessage: (text: string, targetAgentId?: string) => Promise<void>;
  onApproveAction: (actionId: string, decision: 'APPROVE' | 'DENY', reason?: string) => Promise<void>;
  onSelectArtifact: (artifactId: string) => void;
  onSelectConversation?: (id: string) => void;
  onOpenBotProfile?: (agent: AgentProfile) => void;
  onInterruptTask?: (taskId: string) => void;
  isGenerating?: boolean;
}

export const TranscriptArea: React.FC<TranscriptAreaProps> = ({
  conversationTitle,
  isProjectGroup,
  messages,
  activeTask,
  agents,
  onSendMessage,
  onApproveAction,
  onSelectArtifact,
  onSelectConversation,
  onOpenBotProfile,
  onInterruptTask,
  isGenerating = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [targetAgentId, setTargetAgentId] = useState<string | undefined>(undefined);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState(false);
  const [denialModalActionId, setDenialModalActionId] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ connected: boolean; latencyMs?: number; model?: string; reply?: string } | null>(null);

  const testLiveGemini = async () => {
    setIsTestingGemini(true);
    try {
      const res = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Ping live Gemini API.' }),
      });
      const data = await res.json();
      setGeminiStatus(data);
    } catch (e) {
      setGeminiStatus({ connected: false });
    } finally {
      setIsTestingGemini(false);
      setTimeout(() => setGeminiStatus(null), 8000);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;
    const textToSend = inputText;
    const target = targetAgentId;
    setInputText('');
    setTargetAgentId(undefined);
    setShowMentionMenu(false);
    await onSendMessage(textToSend, target);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectMentionAgent = (agent: AgentProfile) => {
    setTargetAgentId(agent.id);
    setInputText(prev => `${prev}@${agent.id} `);
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Find active bot profile for direct chat
  const activeAgent = !isProjectGroup 
    ? agents.find(a => conversationTitle.includes(a.name) || conversationTitle.includes(a.role) || conversationTitle.includes(a.id)) || agents[0]
    : undefined;

  // Starter prompts tailored to the agentic harness starting from 1 blank agent
  const isOnlyBlankAgent = agents.length === 1 && agents[0].role.includes('Blank');

  const starterPrompts = isOnlyBlankAgent
    ? [
        'Rename yourself to Agent Alpha and take the role of Lead Orchestrator',
        'Create a specialist agent named Kiprono Kip with Tier 3 clearance',
        'Spawn an auditor agent named Farah Abdi to verify financial data',
        'Designate Tier 3 clearance and tool grants to our team',
      ]
    : isProjectGroup
    ? [
        'Agent Alpha, designate Tier 3 Elevated clearance to Kiprono Kip',
        'Audit security permissions and tool grants across all available bots',
        'Create a research and intelligence bot with Tier 2 clearance',
        'Summarize today\'s active bot roster and designated budget limits',
      ]
    : activeAgent?.isMainAgent
    ? [
        'Agent Alpha, designate Tier 3 clearance and file writing to Evelyn Mwangi',
        'Spawn a new specialist bot named Amani to handle compliance auditing',
        'Audit access policies and show daily budget limits for all bots',
        'What clearance levels can you designate across our agent cluster?',
      ]
    : [
        `What capabilities are permitted under your designated clearance?`,
        `Are you interactive and connected to the office cluster?`,
        `Run analysis on our task dataset using your authorized tools`,
        `Ask Agent Alpha to elevate your permissions to Tier 3`,
      ];

  return (
    <main id="transcript-main-area" className="flex-1 flex flex-col h-full bg-[#07080c] text-slate-100 overflow-hidden relative font-sans select-none">
      {/* Conversation Header - Grokbot Minimalist Glass Style */}
      <header className="px-6 py-3 border-b border-[#181d29] bg-[#0c0f16]/90 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {activeAgent ? (
            <GrokAvatar
              status={activeAgent.status}
              size="md"
              color={activeAgent.color}
              name={activeAgent.name}
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center text-white font-mono font-bold text-sm shadow-lg shadow-indigo-600/20">
              #
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {conversationTitle}
              </h2>
              {isProjectGroup ? (
                <span className="text-[10.5px] font-semibold bg-[#182033] text-indigo-300 border border-indigo-700/50 px-2.5 py-0.5 rounded-full">
                  Team Cluster ({agents.length} Agents)
                </span>
              ) : (
                <span className="text-[10.5px] font-semibold text-slate-300 bg-[#131722] border border-[#232c3f] px-2.5 py-0.5 rounded-full">
                  {activeAgent?.role}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
              <span>
                {isProjectGroup 
                  ? 'Agentic Harness Active • Multi-agent orchestration enabled'
                  : activeAgent?.statusDetail || 'Ready to receive tasks or spawn teammates'}
              </span>
            </p>
          </div>
        </div>

        {/* Live LLM indicator badge & Live Ping Test */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10141f] border border-[#1e273a] text-[10.5px] font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span className="text-emerald-300 font-semibold">Gemini Live API</span>
            <span className="text-slate-600">•</span>
            <span className="text-indigo-300">gemini-3.6-flash</span>
          </div>

          <button
            onClick={testLiveGemini}
            disabled={isTestingGemini}
            className="px-2.5 py-1 rounded-lg bg-[#141b2c] hover:bg-[#1e2942] border border-[#253350] text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Execute live real-time API latency test against Google Gemini"
          >
            <Activity className={`w-3 h-3 text-emerald-400 ${isTestingGemini ? 'animate-spin' : ''}`} />
            <span>{isTestingGemini ? 'Testing...' : 'Test Gemini Ping'}</span>
          </button>

          {activeAgent && onOpenBotProfile && (
            <button
              onClick={() => onOpenBotProfile(activeAgent)}
              className="px-2.5 py-1 rounded-lg bg-[#141926] hover:bg-[#1f273b] border border-[#242e44] text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Configure Agent Identity & Role"
            >
              <Sliders className="w-3 h-3 text-indigo-400" />
              <span>Configure</span>
            </button>
          )}
        </div>
      </header>

      {/* Live Gemini Test Toast Banner */}
      {geminiStatus && (
        <div className={`px-6 py-2 border-b text-xs flex items-center justify-between font-mono animate-in fade-in ${
          geminiStatus.connected ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {geminiStatus.connected 
                ? `✓ Live Gemini API Connected: Model "${geminiStatus.model}" responded in ${geminiStatus.latencyMs}ms ("${geminiStatus.reply}")`
                : 'Gemini API connection check failed. Please verify API key.'}
            </span>
          </div>
          <button onClick={() => setGeminiStatus(null)} className="text-slate-400 hover:text-white ml-3">✕</button>
        </div>
      )}

      {/* Criteria Drawer if active task */}
      {expandedCriteria && activeTask && (
        <div className="bg-[#0b0e16] border-b border-[#1b2234] px-6 py-3 text-xs space-y-1.5 animate-in fade-in">
          <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px] font-mono">
            Independent Acceptance Criteria:
          </p>
          <ul className="space-y-1 text-slate-400">
            {activeTask.acceptanceCriteria.map((crit, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{crit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Blank Genesis State for single agent */}
        {messages.length <= 1 && (
          <div className="max-w-xl mx-auto my-4 p-6 rounded-2xl bg-[#0c0f17] border border-[#1b2233] text-center space-y-4 shadow-xl">
            <div className="flex justify-center">
              {activeAgent ? (
                <GrokAvatar
                  status={activeAgent.status}
                  size="xl"
                  color={activeAgent.color}
                  name={activeAgent.name}
                  className="shadow-2xl shadow-indigo-600/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
                  <Bot className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-[10.5px] font-mono text-indigo-300 mb-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Agentic Harness • Single Seed Genesis</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {activeAgent ? activeAgent.name : 'Melch Agent Office'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                You are starting with a single blank agent. You can configure this agent's identity and role, ask it to execute objectives, or instruct it to dynamically spawn specialist teammates to build your office cluster upwards.
              </p>
            </div>

            {/* Quick Starter Objective Buttons */}
            <div className="pt-2 text-left space-y-2">
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center">
                Suggested First Actions
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(prompt);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#101420] hover:bg-[#161c2c] border border-[#1e2537] hover:border-indigo-500/50 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span className="truncate">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 transition-colors ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map(msg => {
          const isUser = msg.senderType === 'user';
          const isSystem = msg.senderType === 'system';

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="max-w-2xl mx-auto my-3 px-4 py-2.5 rounded-xl bg-[#0d1018] border border-[#1d2537] text-xs text-slate-300 flex items-start gap-3 shadow-md"
              >
                <div className="p-1 rounded bg-indigo-950 text-indigo-400 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold text-slate-200 text-xs">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11.5px]">{msg.text}</p>
                </div>
              </div>
            );
          }

          const senderBot = !isUser ? agents.find(a => a.id === msg.senderId) : undefined;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Grok Avatar */}
              {isUser ? (
                <div className="w-8 h-8 rounded-xl bg-[#1e2638] flex items-center justify-center text-xs font-bold text-white shrink-0 border border-[#2b364e] shadow-sm">
                  P
                </div>
              ) : (
                <GrokAvatar
                  status={senderBot?.status || 'Done'}
                  size="md"
                  color={msg.senderColor || '#6366F1'}
                  name={msg.senderName}
                />
              )}

              {/* Message Bubble Container */}
              <div className={`max-w-2xl min-w-[280px] space-y-2.5 ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-semibold text-slate-200">{msg.senderName}</span>
                  {!isUser && senderBot?.isMainAgent && (
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-bold">
                      👑 MAIN BOT
                    </span>
                  )}
                  {!isUser && senderBot && !senderBot.isMainAgent && senderBot.access && (
                    <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-md bg-[#121927] text-emerald-300 border border-emerald-500/30">
                      {senderBot.access.clearanceLevel.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span className="text-[10.5px] text-slate-500 font-mono">{msg.timestamp}</span>
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10'
                      : 'bg-[#101420] border border-[#1e2538] rounded-tl-none text-slate-200 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</p>

                  {/* Grokbot Action Bar at bottom of agent message */}
                  {!isUser && (
                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#181f30] text-[10px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Cpu className="w-3 h-3 text-emerald-400" />
                        <span className="text-slate-300 font-medium">{msg.modelUsed || 'gemini-3.6-flash'}</span>
                        {msg.latencyMs && (
                          <span className="text-emerald-400 font-mono text-[9.5px]">
                            • {(msg.latencyMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                          LIVE
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.text)}
                        className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded hover:bg-[#182133] transition-colors"
                        title="Copy response text"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <CheckCheck className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Dynamic Spawned Agent Teammate Card */}
                {msg.spawnedAgent && (
                  <div className="bg-[#0e1320] border border-emerald-500/40 rounded-2xl p-4 text-xs space-y-3 shadow-lg animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-[#1b2538] pb-2">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white">New Specialist Agent Spawned</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Registered in Cluster
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <GrokAvatar
                        status={msg.spawnedAgent.status}
                        size="lg"
                        color={msg.spawnedAgent.color}
                        name={msg.spawnedAgent.name}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate">{msg.spawnedAgent.name}</h4>
                        <p className="text-xs text-indigo-300">{msg.spawnedAgent.role}</p>
                        <p className="text-[10.5px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>Clearance: {msg.spawnedAgent.access?.clearanceLevel?.replace(/_/g, ' ') || 'TIER 2 STANDARD'}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">Designated by Main Bot</span>
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          Tools: {msg.spawnedAgent.toolGrants.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#182133]">
                      {onOpenBotProfile && (
                        <button
                          onClick={() => onOpenBotProfile(msg.spawnedAgent!)}
                          className="px-3 py-1.5 rounded-xl bg-[#151c2c] hover:bg-[#1e273d] text-slate-300 hover:text-white border border-[#232f48] text-xs transition-colors"
                        >
                          Configure Role
                        </button>
                      )}
                      {onSelectConversation && (
                        <button
                          onClick={() => onSelectConversation(`conv-${msg.spawnedAgent!.id}`)}
                          className="px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 text-xs transition-colors flex items-center gap-1"
                        >
                          <span>Chat with {msg.spawnedAgent.name.split(' ')[0]}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Dynamic Acquired Skill Card (Grokbot Architecture) */}
                {msg.acquiredSkill && (
                  <div className="bg-[#0e1320] border border-indigo-500/40 rounded-2xl p-4 text-xs space-y-3 shadow-lg animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-[#1b2538] pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-white">New Skill Synthesized & Acquired</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {msg.acquiredSkill.status || 'APPROVED'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{msg.acquiredSkill.name}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{msg.acquiredSkill.description}</p>
                      {msg.acquiredSkill.steps && msg.acquiredSkill.steps.length > 0 && (
                        <div className="mt-2.5 p-2.5 bg-[#080b12] rounded-xl border border-[#161f30] space-y-1">
                          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Execution Steps:</span>
                          <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-300 font-mono">
                            {msg.acquiredSkill.steps.map((step, idx) => (
                              <li key={idx} className="truncate">{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dynamic Created/Connected Plugin Card (Grokbot Architecture) */}
                {msg.createdPlugin && (
                  <div className="bg-[#0e1320] border border-cyan-500/40 rounded-2xl p-4 text-xs space-y-3 shadow-lg animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-[#1b2538] pb-2">
                      <div className="flex items-center gap-2">
                        <Puzzle className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white">Plugin Mounted into Cluster</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {msg.createdPlugin.category} • {msg.createdPlugin.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{msg.createdPlugin.name}</h4>
                      <p className="text-xs text-slate-300 mt-1">{msg.createdPlugin.description}</p>
                      {msg.createdPlugin.tools && msg.createdPlugin.tools.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.createdPlugin.tools.map((t, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-[#101928] text-cyan-300 border border-cyan-800/40 text-[10px] font-mono">
                              ⚡ {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Executed Tools Cards */}
                {msg.toolEvents && msg.toolEvents.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
                      <Terminal className="w-3 h-3 text-indigo-400" />
                      <span>Tool Executions ({msg.toolEvents.length})</span>
                    </div>
                    {msg.toolEvents.map(tool => (
                      <div
                        key={tool.id}
                        className="bg-[#0a0d15] border border-[#1b2234] rounded-xl p-2.5 text-[11px] font-mono flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-400 font-bold">{tool.toolName}</span>
                            <span className="text-slate-400 truncate max-w-[240px]">→ {tool.target}</span>
                          </div>
                          <p className="text-slate-300 text-[10.5px]">{tool.resultSummary}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 block">
                            {tool.status}
                          </span>
                          {tool.costKes && (
                            <span className="text-[9.5px] text-slate-400 font-mono block mt-0.5">
                              KES {tool.costKes.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Handoff Event */}
                {msg.handoffEvent && (
                  <div className="bg-[#121724] border border-[#232d44] rounded-xl p-3 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span>Delegated to</span>
                          <span className="text-indigo-400 font-mono">
                            {agents.find(a => a.id === msg.handoffEvent?.toAgentId)?.name || msg.handoffEvent.toAgentId}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400">{msg.handoffEvent.reason}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Remaining: KES {msg.handoffEvent.remainingBudgetKes.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Generated Artifact Card */}
                {msg.artifactId && msg.artifactPreview && (
                  <div
                    onClick={() => onSelectArtifact(msg.artifactId!)}
                    className="bg-[#0f1422] border border-[#20293d] rounded-xl p-3 text-xs hover:border-indigo-500/70 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-100 truncate">{msg.artifactPreview.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{msg.artifactPreview.summary}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono shrink-0 ml-2">Inspect ↗</span>
                  </div>
                )}

                {/* Approval Card */}
                {msg.approvalCard && (
                  <div className="bg-[#121622] border border-[#2a354c] rounded-2xl p-4 text-xs space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#1e2638] pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-white">Human Approval Gateway Required</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                        {msg.approvalCard.actionClass}
                      </span>
                    </div>

                    <p className="text-slate-300 font-semibold">{msg.approvalCard.proposedAction || msg.approvalCard.proposedEffect}</p>

                    <div className="space-y-1 bg-[#090b11] p-2.5 rounded-lg border border-[#1a2130] font-mono text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Target:</span>
                        <span className="text-slate-200">{msg.approvalCard.target}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Evidence:</span>
                        <span className="text-slate-300">{msg.approvalCard.evidence}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cryptographic Hash:</span>
                        <span className="text-indigo-300">{msg.approvalCard.actionHash.slice(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. Tool Cost:</span>
                        <span className="text-emerald-400">KES {msg.approvalCard.estimatedCostKes.toFixed(2)}</span>
                      </div>
                    </div>

                    {msg.approvalCard.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setDenialModalActionId(msg.approvalCard!.id)}
                          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2130] border border-[#222a3d] transition-all"
                        >
                          Deny
                        </button>
                        <button
                          onClick={() => onApproveAction(msg.approvalCard!.id, 'APPROVE')}
                          className="px-4 py-1.5 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
                        >
                          Approve & Sign
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-[#0b0e16] text-[11px] flex items-center justify-between text-slate-400">
                        <span>Status: <strong className={msg.approvalCard.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}>{msg.approvalCard.status}</strong></span>
                        <span>Reviewer: {msg.approvalCard.reviewer || 'Paul'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Generating State */}
        {isGenerating && (
          <div className="flex items-center gap-3 animate-in fade-in">
            <GrokAvatar
              status="Working"
              size="md"
              color="#6366F1"
            />
            <div className="bg-[#101420] border border-[#1e2538] rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Reasoning with Gemini 3.8 Flash • Coordinating agent harness...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mention Menu */}
      {showMentionMenu && (
        <div className="absolute bottom-24 left-6 z-20 bg-[#0f131e] border border-[#1f2638] rounded-2xl shadow-2xl p-2 w-72 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider font-mono">
            Mention Teammate in Cluster
          </p>
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => selectMentionAgent(a)}
              className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-[#181f30] flex items-center gap-2.5 text-xs text-slate-200 transition-colors"
            >
              <GrokAvatar status={a.status} size="sm" color={a.color} />
              <div className="truncate min-w-0">
                <p className="font-semibold text-white truncate">{a.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{a.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Denial Reason Modal */}
      {denialModalActionId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101420] border border-[#222a3d] rounded-2xl max-w-md w-full p-5 space-y-3 text-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Deny Proposed Action</h3>
            <p className="text-xs text-slate-400">
              Provide feedback or instructions so the agent can revise its parameters safely:
            </p>
            <textarea
              value={denialReason}
              onChange={e => setDenialReason(e.target.value)}
              placeholder="e.g., Variance check must be verified against bank statements first..."
              rows={3}
              className="w-full bg-[#080a10] border border-[#1f2639] rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDenialModalActionId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-[#181f30]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onApproveAction(denialModalActionId, 'DENY', denialReason);
                  setDenialModalActionId(null);
                  setDenialReason('');
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Message Input Bar - Grokbot Floating Style */}
      <div className="p-4 border-t border-[#181d29] bg-[#090b11]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto relative bg-[#0e121a] border border-[#1e2536] rounded-2xl p-2 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/40 transition-all shadow-xl">
          <textarea
            ref={inputRef}
            id="chat-message-input"
            rows={2}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeAgent
                ? `Message ${activeAgent.name}... (e.g., "Spawn a new agent", "Rename yourself", or assign a task)`
                : `Message the office or use @agent to assign an objective...`
            }
            className="w-full bg-transparent text-xs text-slate-100 px-3 py-1.5 focus:outline-none resize-none placeholder-slate-500 leading-relaxed font-sans"
          />

          <div className="flex items-center justify-between pt-1 border-t border-[#181f2f]/80 px-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMentionMenu(!showMentionMenu)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-[#192030] transition-colors"
                title="Mention agent teammate"
              >
                <AtSign className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mention</span>
              </button>

              {targetAgentId && (
                <span className="text-[10.5px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-800 font-mono">
                  Target: @{targetAgentId}
                </span>
              )}

              <div className="hidden sm:flex items-center gap-1.5 text-[10.5px] font-mono text-slate-400">
                <span>Model:</span>
                <span className="text-slate-300">gemini-3.8-flash</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-send-message"
                onClick={handleSend}
                disabled={!inputText.trim() || isGenerating}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  inputText.trim() && !isGenerating
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-[#181f30] text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Send</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
