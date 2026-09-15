import React, { useState } from 'react';
import { Bot, X, Wrench, Shield, Sparkles, UserPlus } from 'lucide-react';
import { GrokAvatar } from './GrokAvatar.tsx';
import { AccessClearanceLevel, BotAccessDesignation } from '../types.ts';

interface NewAgentModalProps {
  onClose: () => void;
  onCreateAgent: (agentData: {
    name: string;
    role: string;
    title: string;
    color: string;
    toolGrants: string[];
    memoryScope: string[];
    access?: Partial<BotAccessDesignation>;
  }) => Promise<void>;
}

export const NewAgentModal: React.FC<NewAgentModalProps> = ({ onClose, onCreateAgent }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Delivery and Engineering');
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#059669');
  const [tools, setTools] = useState('files.read_task_inputs, analysis.calculate, browser.inspect');
  const [memory, setMemory] = useState('role.delivery, cluster.shared');
  const [clearanceLevel, setClearanceLevel] = useState<AccessClearanceLevel>('TIER_2_STANDARD');
  const [dailyBudget, setDailyBudget] = useState<number>(40);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presetRoles = [
    { label: 'Delivery Specialist', role: 'Delivery and Engineering', color: '#059669', tools: 'files.read_task_inputs, analysis.calculate', clearance: 'TIER_3_ELEVATED' as AccessClearanceLevel, budget: 60 },
    { label: 'Quality Auditor', role: 'Verification and Compliance', color: '#D97706', tools: 'audit.verify_parity, analysis.variance_check', clearance: 'TIER_3_ELEVATED' as AccessClearanceLevel, budget: 50 },
    { label: 'Research Analyst', role: 'Research and Intelligence', color: '#6366F1', tools: 'browser.inspect, search.query, docs.summarize', clearance: 'TIER_2_STANDARD' as AccessClearanceLevel, budget: 40 },
    { label: 'Finance Controller', role: 'Financial Operations', color: '#2563EB', tools: 'ledger.read, budget.calculate, report.generate', clearance: 'TIER_3_ELEVATED' as AccessClearanceLevel, budget: 60 },
  ];

  const presetColors = ['#059669', '#6366F1', '#D97706', '#2563EB', '#9333EA', '#0D9488', '#E11D48'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const toolGrants = tools.split(',').map(t => t.trim()).filter(Boolean);
      await onCreateAgent({
        name: name.trim(),
        role: role.trim(),
        title: title.trim() || role.trim(),
        color,
        toolGrants,
        memoryScope: memory.split(',').map(m => m.trim()).filter(Boolean),
        access: {
          clearanceLevel,
          status: 'ACTIVE',
          allowedTools: toolGrants,
          maxDailyBudgetKes: dailyBudget,
          canAccessComputerVM: true,
          canSpawnAgents: false,
          canWriteFiles: clearanceLevel === 'TIER_3_ELEVATED',
          designatedBy: 'Agent Alpha (Main Bot)',
          designatedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' EAT',
          notes: `Initial access policy designated by Main Bot upon deployment.`,
        },
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectRolePreset = (preset: typeof presetRoles[0]) => {
    setRole(preset.role);
    setTitle(preset.label);
    setColor(preset.color);
    setTools(preset.tools);
    setClearanceLevel(preset.clearance);
    setDailyBudget(preset.budget);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#0c0f17] border border-[#20283a] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c2333] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Spawn Agent Teammate</h3>
              <p className="text-[11px] text-slate-400">Scale the agentic harness with a new specialist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#182030] rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Grok Avatar Preview */}
        <div className="flex items-center gap-3 p-3 bg-[#07090e] border border-[#1a2130] rounded-xl">
          <GrokAvatar status="Working" size="lg" color={color} name={name || 'New Teammate'} />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">{name || 'Agent Name (e.g. Kiprono)'}</h4>
            <p className="text-[11px] text-indigo-400 truncate">{role}</p>
            <p className="text-[10px] text-slate-400 font-mono truncate">Ready to join cluster harness</p>
          </div>
        </div>

        {/* Quick Role Templates */}
        <div>
          <label className="block text-slate-400 font-semibold text-[10.5px] uppercase tracking-wider mb-1.5 font-mono">
            Role Archetypes
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {presetRoles.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleSelectRolePreset(preset)}
                className={`text-left p-2 rounded-xl border text-xs transition-all flex items-center justify-between ${
                  role === preset.role
                    ? 'bg-[#151c2c] border-indigo-500/60 text-white'
                    : 'bg-[#0a0d14] border-[#181f2f] text-slate-400 hover:text-slate-200 hover:border-[#222a3e]'
                }`}
              >
                <span className="font-semibold text-[11px]">{preset.label}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Kiprono Kip"
                className="w-full bg-[#07090e] border border-[#1d2537] rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-all text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Display Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Delivery Specialist"
                className="w-full bg-[#07090e] border border-[#1d2537] rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-all text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Role Description</label>
            <input
              type="text"
              required
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g., Delivery and Engineering"
              className="w-full bg-[#07090e] border border-[#1d2537] rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-all text-xs"
            />
          </div>

          {/* Color Accent Picker */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Avatar Accent</label>
            <div className="flex items-center gap-2">
              {presetColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0c0f17]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tool Grants</span>
            </label>
            <input
              type="text"
              value={tools}
              onChange={e => setTools(e.target.value)}
              className="w-full bg-[#07090e] border border-[#1d2537] rounded-xl p-2.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Initial Access Clearance Designated by Main Bot */}
          <div className="p-3 bg-[#07090e] border border-indigo-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Initial Security Clearance</span>
              </label>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/40">
                Designated by: Agent Alpha
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <select
                  value={clearanceLevel}
                  onChange={e => setClearanceLevel(e.target.value as AccessClearanceLevel)}
                  className="w-full bg-[#0e121a] border border-[#222a3b] rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="TIER_3_ELEVATED">🛡️ Tier 3 (Elevated)</option>
                  <option value="TIER_2_STANDARD">⚡ Tier 2 (Standard)</option>
                  <option value="TIER_1_SANDBOXED">🔒 Tier 1 (Sandboxed)</option>
                </select>
              </div>
              <div>
                <input
                  type="number"
                  value={dailyBudget}
                  onChange={e => setDailyBudget(Number(e.target.value))}
                  placeholder="Budget KES/day"
                  className="w-full bg-[#0e121a] border border-[#222a3b] rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Agent Alpha (Main Bot) will enforce this clearance ceiling and allocate microVM sandboxing immediately upon creation.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1c2333]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161c28] transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Spawning...' : 'Deploy Teammate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
