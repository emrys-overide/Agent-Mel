import React, { useState } from 'react';
import { AgentProfile, AccessClearanceLevel } from '../types.ts';
import { Bot, X, Wrench, Shield, ShieldCheck, Crown, Trash2, Check, Sparkles } from 'lucide-react';
import { GrokAvatar } from './GrokAvatar.tsx';

interface BotProfileModalProps {
  agent: AgentProfile;
  canDecommission: boolean;
  onClose: () => void;
  onUpdateAgent: (id: string, updates: Partial<AgentProfile>) => Promise<void>;
  onDeleteAgent?: (id: string) => Promise<void>;
}

export const BotProfileModal: React.FC<BotProfileModalProps> = ({
  agent,
  canDecommission,
  onClose,
  onUpdateAgent,
  onDeleteAgent,
}) => {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [title, setTitle] = useState(agent.title);
  const [color, setColor] = useState(agent.color);
  const [toolsString, setToolsString] = useState(agent.toolGrants.join(', '));
  const [maxModelCalls, setMaxModelCalls] = useState(agent.limits.maxModelCalls);
  const [taskReservationKes, setTaskReservationKes] = useState(agent.limits.normalTaskReservationKes);
  const [clearanceLevel, setClearanceLevel] = useState<AccessClearanceLevel>(
    agent.access?.clearanceLevel || (agent.isMainAgent ? 'ORCHESTRATOR' : 'TIER_2_STANDARD')
  );
  const [dailyBudget, setDailyBudget] = useState<number>(agent.access?.maxDailyBudgetKes || 40);
  const [canAccessVM, setCanAccessVM] = useState<boolean>(agent.access?.canAccessComputerVM ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toolGrants = toolsString.split(',').map(t => t.trim()).filter(Boolean);
      await onUpdateAgent(agent.id, {
        name: name.trim() || agent.name,
        role: role.trim() || agent.role,
        title: title.trim() || role.trim() || agent.title,
        color,
        toolGrants: toolGrants.length > 0 ? toolGrants : agent.toolGrants,
        limits: {
          ...agent.limits,
          maxModelCalls,
          normalTaskReservationKes: taskReservationKes,
        },
        access: {
          clearanceLevel,
          status: clearanceLevel === 'SUSPENDED' ? 'REVOKED' : 'ACTIVE',
          allowedTools: toolGrants.length > 0 ? toolGrants : agent.toolGrants,
          maxDailyBudgetKes: dailyBudget,
          canAccessComputerVM: canAccessVM,
          canSpawnAgents: agent.isMainAgent ? true : false,
          canWriteFiles: clearanceLevel === 'TIER_3_ELEVATED' || clearanceLevel === 'ORCHESTRATOR',
          designatedBy: agent.access?.designatedBy || 'Agent Alpha (Main Bot)',
          designatedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' EAT',
          notes: `Updated by administrator through Bot Profile Console.`,
        },
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteAgent) return;
    setIsSaving(true);
    try {
      await onDeleteAgent(agent.id);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const presetColors = ['#6366F1', '#059669', '#D97706', '#2563EB', '#9333EA', '#0D9488', '#E11D48'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#0c0f17] border border-[#20283a] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1c2333] pb-3.5">
          <div className="flex items-center gap-3">
            <GrokAvatar status={agent.status} size="lg" color={color} name={name} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">{name || 'Agent'}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182030] text-indigo-300 border border-[#26334d]">
                  {agent.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">{role || 'Unassigned Role'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#182030] rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-sans">
          {/* Identity & Role Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Agent Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Evelyn Mwangi"
                className="w-full bg-[#07090e] border border-[#1d2537] rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-all text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Display Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Chief of Staff / GM"
                className="w-full bg-[#07090e] border border-[#1d2537] rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-all text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Functional Role & Specialization</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g., Quality Auditor, Delivery Engineer, Research Analyst"
              className="w-full bg-[#07090e] border border-[#1d2537] rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-all text-xs"
            />
          </div>

          {/* Color Accent Picker */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Avatar Color Accent</label>
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

          {/* Tool Grants */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tool Grants (comma-separated)</span>
            </label>
            <input
              type="text"
              value={toolsString}
              onChange={e => setToolsString(e.target.value)}
              placeholder="e.g., analysis.calculate, browser.inspect, files.write"
              className="w-full bg-[#07090e] border border-[#1d2537] rounded-xl p-2.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Access Clearance Designation (Managed by Main Bot) */}
          <div className="p-3 bg-[#07090e] rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Security Clearance Tier</span>
              </label>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/40">
                Designated by: {agent.access?.designatedBy || 'Agent Alpha'}
              </span>
            </div>

            <select
              value={clearanceLevel}
              onChange={e => setClearanceLevel(e.target.value as AccessClearanceLevel)}
              className="w-full bg-[#0e121a] border border-[#222a3b] rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ORCHESTRATOR">👑 ORCHESTRATOR (Supreme Authority / Main Bot)</option>
              <option value="TIER_3_ELEVATED">🛡️ TIER_3_ELEVATED (Code, File Write, VM Execution)</option>
              <option value="TIER_2_STANDARD">⚡ TIER_2_STANDARD (Interactive Research & Analysis)</option>
              <option value="TIER_1_SANDBOXED">🔒 TIER_1_SANDBOXED (Read-only Inquiry)</option>
              <option value="SUSPENDED">⛔ SUSPENDED (Revoked pending security audit)</option>
            </select>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-slate-400 text-[10px] mb-1 font-mono uppercase">Daily Budget Limit (KES)</label>
                <input
                  type="number"
                  value={dailyBudget}
                  onChange={e => setDailyBudget(Number(e.target.value))}
                  className="w-full bg-[#0e121a] border border-[#222a3b] rounded-lg p-1.5 text-slate-100 font-mono text-xs"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canAccessVM}
                    onChange={e => setCanAccessVM(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Workstation VM</span>
                </label>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3 bg-[#07090e] p-3 rounded-xl border border-[#1c2333]">
            <div>
              <label className="block text-slate-400 font-semibold text-[11px] mb-1">Max Model Calls / Run</label>
              <input
                type="number"
                value={maxModelCalls}
                onChange={e => setMaxModelCalls(Number(e.target.value))}
                className="w-full bg-[#0e121a] border border-[#222a3b] rounded-lg p-2 text-slate-100 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold text-[11px] mb-1">Task Reservation (KES)</label>
              <input
                type="number"
                value={taskReservationKes}
                onChange={e => setTaskReservationKes(Number(e.target.value))}
                className="w-full bg-[#0e121a] border border-[#222a3b] rounded-lg p-2 text-slate-100 font-mono text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#1c2333]">
            <div>
              {canDecommission && onDeleteAgent && (
                <div>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isSaving}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                      title="Remove agent from office cluster"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Decommission Teammate</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#161c28] transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all text-xs"
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
