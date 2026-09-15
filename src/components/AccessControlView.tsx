import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Crown, 
  Lock, 
  CheckCircle2, 
  Sliders, 
  Coins, 
  Terminal, 
  MessageSquare, 
  UserCheck, 
  Zap, 
  AlertTriangle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { AgentProfile, AccessClearanceLevel, BotAccessDesignation } from '../types.ts';
import { GrokAvatar } from './GrokAvatar.tsx';

interface AccessControlViewProps {
  agents: AgentProfile[];
  onDesignateAccess: (agentId: string, designation: Partial<BotAccessDesignation>) => Promise<void>;
  onConnectChat?: (agentId: string) => void;
  onOpenNewBotModal?: () => void;
  onOpenBotProfile?: (agent: AgentProfile) => void;
  onAskMainBot?: (prompt: string) => void;
  onSpawnNewBot?: () => void;
}

export const ALL_CAPABILITY_TOOLS = [
  { id: 'browser.inspect', label: 'Web Inspection & Research', desc: 'Inspect URLs, analyze search results' },
  { id: 'analysis.calculate', label: 'Mathematical & Logic Engine', desc: 'Execute computational arithmetic' },
  { id: 'files.read_task_inputs', label: 'File Read Access', desc: 'Read task artifacts and context docs' },
  { id: 'files.write_artifact', label: 'File Artifact Generation', desc: 'Create & write persistent deliverables' },
  { id: 'tasks.assign', label: 'Task Delegation', desc: 'Assign sub-tasks to teammate queue' },
  { id: 'terminal.execute', label: 'MicroVM Command Execution', desc: 'Run sandboxed CLI routines in workstation' },
];

export const CLEARANCE_CONFIG: Record<AccessClearanceLevel, {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: React.ElementType;
  description: string;
}> = {
  ORCHESTRATOR: {
    label: 'Orchestrator (Supreme Authority)',
    badgeBg: 'bg-indigo-950/60',
    badgeBorder: 'border-indigo-500/50',
    badgeText: 'text-indigo-300',
    icon: Crown,
    description: 'Main Bot privileges: Spawns bots, designates access, full cluster administration.',
  },
  TIER_3_ELEVATED: {
    label: 'Tier 3: Elevated Operator',
    badgeBg: 'bg-emerald-950/60',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-300',
    icon: ShieldCheck,
    description: 'Deep technical clearance: Write files, execute pipelines, run VM commands.',
  },
  TIER_2_STANDARD: {
    label: 'Tier 2: Standard Operator',
    badgeBg: 'bg-blue-950/60',
    badgeBorder: 'border-blue-500/50',
    badgeText: 'text-blue-300',
    icon: Zap,
    description: 'Standard domain clearance: Research, calculations, interactive analysis.',
  },
  TIER_1_SANDBOXED: {
    label: 'Tier 1: Sandboxed',
    badgeBg: 'bg-amber-950/60',
    badgeBorder: 'border-amber-500/50',
    badgeText: 'text-amber-300',
    icon: Lock,
    description: 'Isolated read-only clearance: Safe inquiry and basic conversation.',
  },
  SUSPENDED: {
    label: 'Suspended (Revoked)',
    badgeBg: 'bg-rose-950/60',
    badgeBorder: 'border-rose-500/50',
    badgeText: 'text-rose-300',
    icon: ShieldAlert,
    description: 'Deactivated by Main Bot pending security review.',
  },
};

export function AccessControlView({
  agents,
  onDesignateAccess,
  onConnectChat,
  onOpenNewBotModal,
  onOpenBotProfile,
  onAskMainBot,
  onSpawnNewBot,
}: AccessControlViewProps) {
  const mainBot = agents.find(a => a.isMainAgent || a.id === 'agent-1') || agents[0];
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit State
  const [editTier, setEditTier] = useState<AccessClearanceLevel>('TIER_2_STANDARD');
  const [editTools, setEditTools] = useState<string[]>([]);
  const [editBudget, setEditBudget] = useState<number>(40);
  const [editVmAccess, setEditVmAccess] = useState<boolean>(true);
  const [editWriteFiles, setEditWriteFiles] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>('');

  const handleOpenEditor = (bot: AgentProfile) => {
    setSelectedBotId(bot.id);
    setEditTier(bot.access?.clearanceLevel || 'TIER_2_STANDARD');
    setEditTools(bot.toolGrants || ['analysis.calculate']);
    setEditBudget(bot.access?.maxDailyBudgetKes || 40);
    setEditVmAccess(bot.access?.canAccessComputerVM ?? true);
    setEditWriteFiles(bot.access?.canWriteFiles ?? false);
    setEditNotes(bot.access?.notes || `Access designated by ${mainBot?.name || 'Agent Alpha'}`);
  };

  const handleToggleTool = (toolId: string) => {
    if (editTools.includes(toolId)) {
      setEditTools(editTools.filter(t => t !== toolId));
    } else {
      setEditTools([...editTools, toolId]);
    }
  };

  const handleSaveDesignation = async () => {
    if (!selectedBotId) return;
    setIsSaving(true);
    try {
      await onDesignateAccess(selectedBotId, {
        clearanceLevel: editTier,
        allowedTools: editTools,
        maxDailyBudgetKes: editBudget,
        canAccessComputerVM: editVmAccess,
        canWriteFiles: editWriteFiles,
        notes: editNotes,
        status: editTier === 'SUSPENDED' ? 'REVOKED' : 'ACTIVE',
      });
      const targetAgent = agents.find(a => a.id === selectedBotId);
      setSuccessToast(`Security policy updated for ${targetAgent?.name || 'bot'} by ${mainBot?.name || 'Main Bot'}.`);
      setSelectedBotId(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to designate access:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const totalAllocatedBudget = agents.reduce((sum, a) => sum + (a.access?.maxDailyBudgetKes || 30), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-200 overflow-y-auto font-sans select-none">
      {/* View Header */}
      <div className="p-6 border-b border-[#161c2b] bg-gradient-to-r from-[#0b0f19] via-[#0e1322] to-[#0b0f19]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-950/40 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Main Bot Access Governance Center</h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Authority: {mainBot?.name || 'Agent Alpha'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                As the primary orchestrator, <strong className="text-indigo-300">{mainBot?.name}</strong> holds exclusive authority to deploy interactive bots and designate their operational clearance tiers, permitted tool grants, and unit compute budgets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onAskMainBot && (
              <button
                onClick={() => onAskMainBot("Agent Alpha, please conduct a security access audit of all available bots in the office and report your recommendations.")}
                className="px-3.5 py-2 rounded-xl bg-[#131929] hover:bg-[#1a233a] border border-[#232f4c] text-xs font-semibold text-slate-200 transition-all flex items-center gap-2 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ask Main Bot for Audit</span>
              </button>
            )}
            <button
              onClick={() => {
                if (onSpawnNewBot) onSpawnNewBot();
                else if (onOpenNewBotModal) onOpenNewBotModal();
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deploy New Bot</span>
            </button>
          </div>
        </div>

        {/* Cluster Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3 rounded-xl bg-[#0e1320] border border-[#1a2236]">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Main Gatekeeper</span>
              <Crown className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-white truncate">{mainBot?.name || 'Agent Alpha'}</p>
            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Online & Authoritative</p>
          </div>

          <div className="p-3 rounded-xl bg-[#0e1320] border border-[#1a2236]">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Interactive Bots</span>
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-sm font-bold text-white">{agents.length} Bots Registered</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{agents.length - 1} Sub-bots Managed</p>
          </div>

          <div className="p-3 rounded-xl bg-[#0e1320] border border-[#1a2236]">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Active Clearances</span>
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {agents.filter(a => a.access?.clearanceLevel === 'TIER_3_ELEVATED').length} Elevated
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-bold text-blue-400 font-mono">
                {agents.filter(a => a.access?.clearanceLevel === 'TIER_2_STANDARD').length} Standard
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0e1320] border border-[#1a2236]">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span>Total Compute Cap</span>
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-sm font-bold text-white font-mono">KES {totalAllocatedBudget.toFixed(2)}/day</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Fenced by Unit Budget Limit</p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white text-xs font-mono">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Bot Governance Cards */}
      <div className="p-6 space-y-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Roster Access Designations ({agents.length} Available Bots)
          </h2>
          <span className="text-[11px] text-slate-400">
            Click &quot;Designate Access&quot; to reassign clearances through Main Bot authority
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {agents.map(bot => {
            const isMain = bot.isMainAgent || bot.id === 'agent-1';
            const clearance = bot.access?.clearanceLevel || (isMain ? 'ORCHESTRATOR' : 'TIER_2_STANDARD');
            const cfg = CLEARANCE_CONFIG[clearance] || CLEARANCE_CONFIG.TIER_2_STANDARD;
            const Icon = cfg.icon;
            const isEditing = selectedBotId === bot.id;

            return (
              <div
                key={bot.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isMain 
                    ? 'bg-gradient-to-r from-[#0d1222] to-[#090d18] border-indigo-500/40 shadow-lg shadow-indigo-950/20' 
                    : isEditing
                    ? 'bg-[#0f1424] border-indigo-500/70 shadow-xl'
                    : 'bg-[#0a0d16] border-[#181f30] hover:border-[#222c44]'
                }`}
              >
                {/* Bot Profile Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#161c2b]">
                  <div className="flex items-center gap-3">
                    <GrokAvatar
                      status={bot.status}
                      size="lg"
                      color={bot.color}
                      name={bot.name}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{bot.name}</h3>
                        {isMain ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 font-mono">
                            <Crown className="w-2.5 h-2.5" />
                            MAIN BOT • LEAD ORCHESTRATOR
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected & Interactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{bot.role} • {bot.title}</p>
                    </div>
                  </div>

                  {/* Clearance Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cfg.label}</span>
                    </div>

                    <button
                      onClick={() => onConnectChat(bot.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#131929] hover:bg-[#1a233a] border border-[#24304e] text-xs font-medium text-indigo-300 hover:text-white transition-all flex items-center gap-1.5"
                      title="Open 1-on-1 Chat Stream"
                    >
                      <MessageSquare className="w-3 h-3 text-indigo-400" />
                      <span>Chat</span>
                    </button>

                    {!isMain && (
                      <button
                        onClick={() => handleOpenEditor(bot)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isEditing
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-[#141b2c] hover:bg-[#1c263e] border-[#253250] text-slate-200'
                        }`}
                      >
                        <Sliders className="w-3 h-3 text-indigo-400" />
                        <span>{isEditing ? 'Editing Access...' : 'Designate Access'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Details / Read Mode */}
                {!isEditing && (
                  <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Access Provenance */}
                    <div className="p-3 rounded-xl bg-[#080b13] border border-[#141a29]">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Access Provenance
                      </span>
                      <p className="text-xs font-medium text-slate-200">
                        Designated by: <strong className="text-indigo-300">{bot.access?.designatedBy || 'Agent Alpha (Main Bot)'}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Effective: {bot.access?.designatedAt || 'Active Session'}
                      </p>
                      {bot.access?.notes && (
                        <p className="text-[11px] text-slate-400 italic mt-1.5 border-t border-[#171e2e] pt-1">
                          &quot;{bot.access.notes}&quot;
                        </p>
                      )}
                    </div>

                    {/* Allowed Tools */}
                    <div className="p-3 rounded-xl bg-[#080b13] border border-[#141a29]">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Permitted Tool Grants ({bot.toolGrants.length})
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bot.toolGrants.map(tool => (
                          <span
                            key={tool}
                            className="px-2 py-0.5 rounded-md bg-[#121828] text-slate-300 border border-[#1f283e] text-[10px] font-mono flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-indigo-400" />
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Operational Boundaries */}
                    <div className="p-3 rounded-xl bg-[#080b13] border border-[#141a29]">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                        Governance Fencing
                      </span>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Daily Budget Ceiling:</span>
                          <span className="font-mono font-bold text-amber-300">
                            KES {(bot.access?.maxDailyBudgetKes || 40).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">MicroVM Workstation:</span>
                          <span className={bot.access?.canAccessComputerVM ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                            {bot.access?.canAccessComputerVM ? 'Granted' : 'Restricted'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Bot Creation Authority:</span>
                          <span className={isMain ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
                            {isMain ? 'Supreme Authority' : 'Main Bot Exclusive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Access Designation Editor */}
                {isEditing && (
                  <div className="mt-4 p-4 rounded-xl bg-[#080b14] border border-indigo-500/40 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-[#161c2c]">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">
                          Designate Access for {bot.name} (Authorized by {mainBot?.name || 'Agent Alpha'})
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedBotId(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* 1. Clearance Level Selector */}
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase">
                        1. Security Clearance Tier
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['TIER_3_ELEVATED', 'TIER_2_STANDARD', 'TIER_1_SANDBOXED', 'SUSPENDED'] as AccessClearanceLevel[]).map(tier => {
                          const isSel = editTier === tier;
                          const tcfg = CLEARANCE_CONFIG[tier];
                          const TIcon = tcfg.icon;
                          return (
                            <button
                              key={tier}
                              type="button"
                              onClick={() => {
                                setEditTier(tier);
                                if (tier === 'TIER_3_ELEVATED') {
                                  setEditTools(['analysis.calculate', 'files.read_task_inputs', 'files.write_artifact', 'browser.inspect']);
                                  setEditBudget(60);
                                  setEditWriteFiles(true);
                                } else if (tier === 'TIER_2_STANDARD') {
                                  setEditTools(['browser.inspect', 'analysis.calculate', 'tasks.assign']);
                                  setEditBudget(40);
                                  setEditWriteFiles(false);
                                } else if (tier === 'TIER_1_SANDBOXED') {
                                  setEditTools(['analysis.calculate']);
                                  setEditBudget(15);
                                  setEditWriteFiles(false);
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all ${
                                isSel
                                  ? 'bg-indigo-950/70 border-indigo-500 shadow-md text-white'
                                  : 'bg-[#0c101a] border-[#182132] text-slate-300 hover:border-[#222d44]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <TIcon className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-xs font-bold">{tcfg.label.split(':')[0]}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-2">{tcfg.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Permitted Capability Tools */}
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase">
                        2. Permitted Capability Tools
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {ALL_CAPABILITY_TOOLS.map(tool => {
                          const isChecked = editTools.includes(tool.id);
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => handleToggleTool(tool.id)}
                              className={`p-2 rounded-lg border text-left flex items-start gap-2 transition-all ${
                                isChecked
                                  ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                                  : 'bg-[#0b0e17] border-[#161d2c] text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                                isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'
                              }`}>
                                {isChecked && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                              <div>
                                <span className="text-xs font-medium block">{tool.label}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{tool.id}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Budget & Policies */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">
                          Daily Budget Ceiling (KES)
                        </label>
                        <input
                          type="number"
                          value={editBudget}
                          onChange={e => setEditBudget(Number(e.target.value))}
                          className="w-full bg-[#0c101b] border border-[#1a2336] rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0c101b] border border-[#1a2336] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editVmAccess}
                            onChange={e => setEditVmAccess(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-300">Grant MicroVM Workstation Access</span>
                        </label>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0c101b] border border-[#1a2336] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editWriteFiles}
                            onChange={e => setEditWriteFiles(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-300">Grant File Creation Privileges</span>
                        </label>
                      </div>
                    </div>

                    {/* 4. Policy Directives Notes */}
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase">
                        Main Bot Policy Directive Notes
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="e.g. Access upgraded for comprehensive Q3 market analysis"
                        className="w-full bg-[#0c101b] border border-[#1a2336] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#161c2c]">
                      <button
                        type="button"
                        onClick={() => setSelectedBotId(null)}
                        className="px-3 py-1.5 rounded-lg border border-[#20293d] text-xs text-slate-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDesignation}
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                      >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>Apply Main Bot Designation</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
