import React, { useState } from 'react';
import { 
  CalendarClock, 
  Play, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  ArrowUpRight, 
  BookOpen,
  Plus
} from 'lucide-react';
import { Routine, Skill, AgentProfile } from '../types.ts';
import { GrokAvatar } from './GrokAvatar.tsx';

interface RoutinesViewProps {
  routines: Routine[];
  skills: Skill[];
  agents: AgentProfile[];
  onTriggerRoutine: (routineId: string) => Promise<void>;
  onPromoteSkill: (skillId: string) => Promise<void>;
  onCreateSkill?: (skillData: Partial<Skill>) => Promise<void>;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  routines,
  skills,
  agents,
  onTriggerRoutine,
  onPromoteSkill,
  onCreateSkill,
}) => {
  const [activeTab, setActiveTab] = useState<'routines' | 'skills'>('routines');
  const [runningRoutineId, setRunningRoutineId] = useState<string | null>(null);
  const [isCreateSkillModalOpen, setIsCreateSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillSteps, setNewSkillSteps] = useState('');
  const [newSkillTools, setNewSkillTools] = useState('analysis.calculate, browser.inspect');

  const handleCreateSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName || !onCreateSkill) return;
    const stepsArray = newSkillSteps
      ? newSkillSteps.split('\n').map(s => s.trim()).filter(Boolean)
      : ['Analyze input criteria', 'Execute sandboxed tool calls', 'Validate deliverable integrity'];
    const toolsArray = newSkillTools
      ? newSkillTools.split(',').map(t => t.trim()).filter(Boolean)
      : ['analysis.calculate'];

    await onCreateSkill({
      name: newSkillName,
      description: newSkillDesc || 'Custom agent skill procedure.',
      steps: stepsArray,
      allowedTools: toolsArray,
      status: 'APPROVED',
    });

    setIsCreateSkillModalOpen(false);
    setNewSkillName('');
    setNewSkillDesc('');
    setNewSkillSteps('');
  };

  const handleRun = async (routineId: string) => {
    setRunningRoutineId(routineId);
    try {
      await onTriggerRoutine(routineId);
    } finally {
      setRunningRoutineId(null);
    }
  };

  const getOwnerAgent = (ownerId: string) => {
    return agents.find(a => a.id === ownerId);
  };

  const getSkillBadge = (status: Skill['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="text-[10.5px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
            APPROVED (PRODUCTION)
          </span>
        );
      case 'TESTED':
        return (
          <span className="text-[10.5px] font-semibold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800">
            TESTED (STAGING)
          </span>
        );
      case 'DRAFT':
        return (
          <span className="text-[10.5px] font-semibold text-slate-400 bg-[#161a24] px-2 py-0.5 rounded-full border border-[#252d40]">
            DRAFT
          </span>
        );
      default:
        return (
          <span className="text-[10.5px] text-slate-500 bg-[#10131d] px-2 py-0.5 rounded-full">
            RETIRED
          </span>
        );
    }
  };

  return (
    <div id="routines-skills-view" className="flex-1 flex flex-col h-full bg-[#08090d] text-slate-100 overflow-y-auto p-6 font-sans">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-[#181d29] pb-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-400" />
            <span>Routines & Reusable Skills</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Persisted background automation triggers, missed-run coalescing policies, and tested company SOPs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0d1017] p-1 rounded-xl border border-[#1b2234] text-xs">
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'routines' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Routines ({routines.length})
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'skills' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Promoted Skills ({skills.length})
          </button>
        </div>
      </div>

      {/* Skills Action Header if in skills tab */}
      {activeTab === 'skills' && (
        <div className="flex items-center justify-between bg-[#0e121d] p-4 rounded-2xl border border-[#1b2234] mb-4">
          <div>
            <span className="text-xs font-bold text-white block">Cluster Autonomous Skills</span>
            <span className="text-[11px] text-slate-400">Tested procedures and SOPs acquired by Agent Alpha or cluster agents.</span>
          </div>
          <button
            onClick={() => setIsCreateSkillModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Acquire New Skill</span>
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'routines' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {routines.map(routine => {
              const ownerAgent = getOwnerAgent(routine.ownerAgentId);

              return (
                <div
                  key={routine.id}
                  className="bg-[#0e121d] border border-[#1c2336] rounded-2xl p-5 space-y-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {ownerAgent && (
                        <GrokAvatar
                          status={ownerAgent.status}
                          size="md"
                          color={ownerAgent.color}
                          name={ownerAgent.name}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{routine.name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {routine.enabled ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{routine.description}</p>
                      </div>
                    </div>

                    <button
                      id={`btn-run-routine-${routine.id}`}
                      disabled={runningRoutineId === routine.id}
                      onClick={() => handleRun(routine.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{runningRoutineId === routine.id ? 'Executing...' : 'Run Now'}</span>
                    </button>
                  </div>

                  {/* Metadata Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#181f2f] text-xs">
                    <div className="bg-[#090b11] p-2.5 rounded-xl border border-[#161c2b]">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Cron Schedule</span>
                      <span className="font-semibold text-slate-200">{routine.scheduleDisplay}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{routine.timeZone}</span>
                    </div>

                    <div className="bg-[#090b11] p-2.5 rounded-xl border border-[#161c2b]">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Bound Skill</span>
                      <span className="font-semibold text-indigo-300 font-mono text-[11px]">{routine.skillVersion}</span>
                      <span className="text-[10px] text-slate-500 block">Audited SOP</span>
                    </div>

                    <div className="bg-[#090b11] p-2.5 rounded-xl border border-[#161c2b]">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Missed-Run Policy</span>
                      <span className="font-semibold text-amber-300 font-mono text-[11px]">{routine.concurrencyPolicy}</span>
                      <span className="text-[10px] text-slate-500 block">Prevents storms</span>
                    </div>

                    <div className="bg-[#090b11] p-2.5 rounded-xl border border-[#161c2b]">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Cost Ceiling</span>
                      <span className="font-semibold text-emerald-400 font-mono">KES {routine.costCeilingKes.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500 block">Strict limit</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Promoted Skills Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map(skill => (
              <div
                key={skill.id}
                className="bg-[#0e121d] border border-[#1c2336] rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{skill.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{skill.description}</p>
                  </div>
                  {getSkillBadge(skill.status)}
                </div>

                <div className="space-y-1 bg-[#090b11] p-3 rounded-xl border border-[#161c2b]">
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    SOP Verification Steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-xs text-slate-300">
                    {skill.steps.map((step, idx) => (
                      <li key={idx} className="text-[11.5px]">{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#181f2f] text-xs">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Allowed Tools: {skill.allowedTools.length}
                  </div>

                  {skill.status !== 'APPROVED' && (
                    <button
                      onClick={() => onPromoteSkill(skill.id)}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      <span>Promote Lifecycle</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Acquire / Synthesize New Skill */}
      {isCreateSkillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e16] border border-[#20293d] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#182133] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Synthesize & Acquire Skill</h3>
              </div>
              <button onClick={() => setIsCreateSkillModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSkillSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Skill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Autonomous Financial Reconcile, Deep Web Audit"
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  required
                  className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Operational objective and criteria..."
                  value={newSkillDesc}
                  onChange={e => setNewSkillDesc(e.target.value)}
                  className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Execution Steps (one per line)</label>
                <textarea
                  rows={3}
                  placeholder="1. Ingest inputs&#10;2. Run sandboxed verification&#10;3. Compile deliverable artifact"
                  value={newSkillSteps}
                  onChange={e => setNewSkillSteps(e.target.value)}
                  className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Allowed Tools (comma-separated)</label>
                <input
                  type="text"
                  placeholder="analysis.calculate, browser.inspect, files.write_artifact"
                  value={newSkillTools}
                  onChange={e => setNewSkillTools(e.target.value)}
                  className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#182133]">
                <button
                  type="button"
                  onClick={() => setIsCreateSkillModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#141926] hover:bg-[#1e263a] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  Acquire & Verify Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
