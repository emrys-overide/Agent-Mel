import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  CalendarClock, 
  FolderArchive, 
  Coins, 
  Search, 
  ChevronRight, 
  Sparkles, 
  Command,
  Sliders,
  Bot,
  Shield,
  ShieldCheck,
  Puzzle
} from 'lucide-react';
import { AgentProfile, AgentStatus, Conversation } from '../types.ts';
import { GrokAvatar } from './GrokAvatar.tsx';

interface RosterSidebarProps {
  agents: AgentProfile[];
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  activeView: 'chats' | 'access' | 'plugins' | 'routines' | 'artifacts' | 'economics';
  onChangeView: (view: 'chats' | 'access' | 'plugins' | 'routines' | 'artifacts' | 'economics') => void;
  onOpenNewBotModal: () => void;
  onOpenBotProfile: (agent: AgentProfile) => void;
  dailySpentKes: number;
  dailyCapKes: number;
}

export const RosterSidebar: React.FC<RosterSidebarProps> = ({
  agents,
  conversations,
  activeConversationId,
  onSelectConversation,
  activeView,
  onChangeView,
  onOpenNewBotModal,
  onOpenBotProfile,
  dailySpentKes,
  dailyCapKes,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusLabel = (status: AgentStatus) => {
    switch (status) {
      case 'Working':
        return <span className="text-emerald-400 font-medium">Working...</span>;
      case 'Waiting for you':
        return <span className="text-amber-300 font-medium">Needs you</span>;
      case 'Done':
        return <span className="text-blue-400">Done</span>;
      case 'Paused':
        return <span className="text-orange-400">Paused</span>;
      case 'Blocked':
        return <span className="text-rose-400">Blocked</span>;
      default:
        return <span className="text-slate-400">Idle</span>;
    }
  };

  const filteredAgents = agents.filter(
    a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const projectConversations = conversations.filter(c => c.type === 'project');

  return (
    <aside
      id="roster-sidebar"
      className="w-72 bg-[#07090e] border-r border-[#171b26] flex flex-col h-full select-none text-slate-300 z-10 shrink-0 font-sans"
    >
      {/* Workspace Header */}
      <div className="p-3.5 border-b border-[#171b26] bg-[#090c13]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-600/20">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight">MELTECH OFFICE</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                <span className="font-mono text-[9.5px] text-slate-400">Gemini Live • Grok Style</span>
              </div>
            </div>
          </div>
          <button
            onClick={onOpenNewBotModal}
            className="p-1.5 rounded-lg bg-[#121622] hover:bg-[#1c2336] text-slate-300 hover:text-white border border-[#20293d] transition-all flex items-center gap-1 text-[11px]"
            title="Deploy New Bot"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation Tabs - Grok Minimalist Pill Style */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-[#05070a] rounded-xl border border-[#161a26] text-[10px] font-medium mt-2">
          <button
            onClick={() => onChangeView('chats')}
            className={`py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
              activeView === 'chats'
                ? 'bg-[#151c2d] text-white shadow-sm font-semibold border border-[#222c42]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Active Chat Streams"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => onChangeView('access')}
            className={`py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
              activeView === 'access'
                ? 'bg-[#151c2d] text-indigo-300 shadow-sm font-semibold border border-[#222c42]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Main Bot Access & Clearance Governance"
          >
            <ShieldCheck className="w-3 h-3 text-indigo-400" />
            <span>Access</span>
          </button>
          <button
            onClick={() => onChangeView('plugins')}
            className={`py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
              activeView === 'plugins'
                ? 'bg-[#151c2d] text-cyan-300 shadow-sm font-semibold border border-[#222c42]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Grokbot Plugins & Extensible Tools"
          >
            <Puzzle className="w-3 h-3 text-cyan-400" />
            <span>Plugins</span>
          </button>
          <button
            onClick={() => onChangeView('routines')}
            className={`py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
              activeView === 'routines'
                ? 'bg-[#151c2d] text-white shadow-sm font-semibold border border-[#222c42]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Automated Routines & Skills"
          >
            <CalendarClock className="w-3 h-3" />
            <span>Skills</span>
          </button>
          <button
            onClick={() => onChangeView('artifacts')}
            className={`py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
              activeView === 'artifacts'
                ? 'bg-[#151c2d] text-white shadow-sm font-semibold border border-[#222c42]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Generated Deliverables"
          >
            <FolderArchive className="w-3 h-3" />
            <span>Artifacts</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-[#171b26] bg-[#080a0f]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            id="roster-search-input"
            type="text"
            placeholder="Search bots & channels..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e121a] text-xs text-slate-200 pl-8 pr-7 py-1.5 rounded-lg border border-[#1b2233] focus:outline-none focus:border-indigo-500 placeholder-slate-400 transition-all font-sans"
          />
          <span className="absolute right-2 text-[9px] text-slate-400 font-mono flex items-center">
            <Command className="w-2.5 h-2.5 mr-0.5" />K
          </span>
        </div>
      </div>

      {/* Roster & Channel Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {/* Project Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Collaboration Channels</span>
            <span className="text-[9px] text-slate-400 font-mono">{projectConversations.length} Active</span>
          </div>
          <div className="space-y-1">
            {projectConversations.map(conv => {
              const isActive = activeConversationId === conv.id && activeView === 'chats';
              return (
                <button
                  key={conv.id}
                  id={`channel-btn-${conv.id}`}
                  onClick={() => {
                    onChangeView('chats');
                    onSelectConversation(conv.id);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-[#131926] text-white border border-indigo-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-[#0e121a]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-indigo-400 font-mono text-xs font-bold">#</span>
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate text-slate-100">{conv.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">Multi-agent delegation hub</p>
                    </div>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Agent Harness Roster */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Agent Harness ({filteredAgents.length})</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onChangeView('access')}
                title="Manage Access & Clearances (Main Bot Governance)"
                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded-md hover:bg-[#141926] flex items-center gap-0.5 text-[10px] font-mono"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Access</span>
              </button>
              <button
                id="btn-add-agent"
                onClick={onOpenNewBotModal}
                title="Spawn New Bot Teammate"
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-[#141926]"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {filteredAgents.map(agent => {
              const directConvId = `conv-${agent.id}`;
              const isSelected = activeConversationId === directConvId && activeView === 'chats';

              return (
                <div
                  key={agent.id}
                  id={`agent-card-${agent.id}`}
                  onClick={() => {
                    onChangeView('chats');
                    onSelectConversation(directConvId);
                  }}
                  className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#131926] border-indigo-500/60 shadow-md shadow-indigo-950/20'
                      : 'bg-[#0a0d14] border-[#161a26] hover:bg-[#0f131f] hover:border-[#1f2638]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GrokAvatar
                        status={agent.status}
                        size="md"
                        color={agent.color}
                        name={agent.name}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-100 truncate group-hover:text-white">
                            {agent.name}
                          </p>
                          {agent.isMainAgent ? (
                            <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 shrink-0">
                              👑 Main
                            </span>
                          ) : agent.access ? (
                            <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-[#121a2a] text-emerald-300 border border-emerald-500/30 shrink-0">
                              {agent.access.clearanceLevel === 'TIER_3_ELEVATED'
                                ? 'T3'
                                : agent.access.clearanceLevel === 'TIER_1_SANDBOXED'
                                ? 'T1'
                                : 'T2'}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {agent.role}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[9.5px] block">
                        {getStatusLabel(agent.status)}
                      </span>
                    </div>
                  </div>

                  {/* Agent status message & config button */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#171b26] text-[10px] text-slate-400 font-sans">
                    <span className="truncate max-w-[170px]">
                      {agent.statusDetail || 'Ready for assignment'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBotProfile(agent);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-400 hover:text-indigo-300 font-mono ml-1 transition-opacity flex items-center gap-0.5"
                    >
                      <Sliders className="w-2.5 h-2.5" />
                      <span>Config</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Gemini Connection Pill */}
      <div className="px-3 py-1.5 border-t border-[#171b26] bg-[#07090e] flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
          <span className="text-slate-300">Live Gemini API</span>
        </div>
        <span className="text-indigo-400 font-semibold">gemini-3.6-flash</span>
      </div>

      {/* Founder & Budget Footer Bar */}
      <div className="p-3 border-t border-[#171b26] bg-[#090c13] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#141926] flex items-center justify-center text-[11px] font-bold text-slate-200 border border-[#20293d]">
            P
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Paul (Founder)</p>
            <p className="text-[10px] text-slate-400 font-mono">Operator Leaseholder</p>
          </div>
        </div>

        <button
          onClick={() => onChangeView('economics')}
          className="text-right p-1.5 rounded-lg hover:bg-[#121622] transition-colors"
          title="View Company Budget & 14 MAST Safeguards"
        >
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">Today's Cap</span>
          <span className="text-xs font-mono font-bold text-amber-300">
            KES {dailySpentKes.toFixed(2)} / {dailyCapKes.toFixed(0)}
          </span>
        </button>
      </div>
    </aside>
  );
};
