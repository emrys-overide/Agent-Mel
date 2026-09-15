import React, { useState } from 'react';
import { 
  Coins, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  X,
  Lock,
  Cpu,
  Receipt
} from 'lucide-react';
import { CompanyBudget, CompanyMetrics } from '../types.ts';

interface CompanyEconomicsModalProps {
  budget: CompanyBudget;
  metrics: CompanyMetrics;
  onClose: () => void;
}

export const CompanyEconomicsModal: React.FC<CompanyEconomicsModalProps> = ({
  budget,
  metrics,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'budget' | 'safeguards' | 'unit_economics'>('budget');

  const safeguards = [
    { name: 'Single Task Lease & Fencing Tokens', failure: 'Missing ownership / concurrent overwrite', status: 'ACTIVE' },
    { name: 'Immutable Role Boundaries', failure: 'Role creep / self-broadening permissions', status: 'ACTIVE' },
    { name: 'Bounded Delegation (Max 3 Hops)', failure: 'Infinite agent loops & cascade costs', status: 'ACTIVE' },
    { name: 'Durable LangGraph Checkpoints', failure: 'Lost conversational state on restart', status: 'ACTIVE' },
    { name: 'Independent Reviewer Sign-off', failure: 'Premature task completion declarations', status: 'ACTIVE' },
    { name: 'SHA-256 Input-Hash Bound Approvals', failure: 'Forged or altered external dispatch', status: 'ACTIVE' },
    { name: 'Zero Autonomous Money Movement', failure: 'Accidental or rogue financial transfers', status: 'ENFORCED' },
    { name: 'Host VM Secret Isolation', failure: 'Credentials leaking into prompts or logs', status: 'ENFORCED' },
    { name: 'Tenant Scoped Artifact Directories', failure: 'Cross-customer data retrieval', status: 'ENFORCED' },
    { name: 'Missed-Run Scheduler Coalescing', failure: 'Webhook / cron storms upon host wake', status: 'ACTIVE' },
    { name: 'Strict Pre-Dispatch Cost Reservations', failure: 'Budget depletion & runaway token spend', status: 'ACTIVE' },
    { name: 'Exclusive Human Screen Takeover', failure: 'Simultaneous bot/human click conflicts', status: 'ACTIVE' },
    { name: 'Typed Outbox with UNKNOWN_OUTCOME', failure: 'Silent third-party API timeout errors', status: 'ACTIVE' },
    { name: 'Stale Screenshot Click Invalidation', failure: 'Actions executed on outdated UI frames', status: 'ACTIVE' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Company Economics, Budget & Safeguards</h2>
              <p className="text-xs text-slate-400">
                Operating under Melch Tech fiscal charter • Nairobi, Kenya (EAT)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('budget')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeTab === 'budget' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Capital & Budget
              </button>
              <button
                onClick={() => setActiveTab('safeguards')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeTab === 'safeguards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                14 MAST Safeguards
              </button>
              <button
                onClick={() => setActiveTab('unit_economics')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeTab === 'unit_economics' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unit Economics
              </button>
            </div>

            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {activeTab === 'budget' && (
            <div className="space-y-6">
              {/* Primary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[11px] mb-1">Total Capital Ceiling</p>
                  <p className="text-lg font-bold font-mono text-white">
                    KES {budget.totalCapitalCeilingKes.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Founder cash boundary</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[11px] mb-1">Active Test Pool</p>
                  <p className="text-lg font-bold font-mono text-indigo-400">
                    KES {budget.testPoolKes.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">API & Tool Evaluation Fund</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[11px] mb-1">Daily Cap</p>
                  <p className="text-lg font-bold font-mono text-amber-300">
                    KES {budget.dailyCapKes.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-emerald-400 mt-1">
                    Spent: KES {budget.dailySpentKes.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[11px] mb-1">Task Reservation Ceiling</p>
                  <p className="text-lg font-bold font-mono text-emerald-400">
                    KES 25.00
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Max allocation per task</p>
                </div>
              </div>

              {/* Workload Cost Model */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  <span>Illustrative Monthly Workload Analysis (Grok 4.6 & Gemini 3.8 Flash)</span>
                </h3>
                <p className="text-slate-400 text-[11.5px] leading-relaxed">
                  Based on 300 monthly task units (8 model calls per unit, 3,000 input / 600 output tokens), 30 quality reviews, and 100 search tool calls:
                </p>

                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11.5px]">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Component</th>
                        <th className="p-2.5">Calculation</th>
                        <th className="p-2.5 font-mono">USD</th>
                        <th className="p-2.5 font-mono">KES (130/$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      <tr>
                        <td className="p-2.5 font-sans">Main Input Tokens</td>
                        <td className="p-2.5 text-slate-400">7.2M tokens @ $2.00/M</td>
                        <td className="p-2.5">$14.40</td>
                        <td className="p-2.5 text-slate-200">KES 1,872.00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans">Main Output Tokens</td>
                        <td className="p-2.5 text-slate-400">1.44M tokens @ $6.00/M</td>
                        <td className="p-2.5">$8.64</td>
                        <td className="p-2.5 text-slate-200">KES 1,123.20</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans">Review & Audit Calls</td>
                        <td className="p-2.5 text-slate-400">0.18M in + 0.045M out</td>
                        <td className="p-2.5">$0.63</td>
                        <td className="p-2.5 text-slate-200">KES 81.90</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans">Web Search Tool</td>
                        <td className="p-2.5 text-slate-400">100 calls @ $5/1,000</td>
                        <td className="p-2.5">$0.50</td>
                        <td className="p-2.5 text-slate-200">KES 65.00</td>
                      </tr>
                      <tr className="bg-slate-900/60 font-bold">
                        <td className="p-2.5 font-sans text-white">Baseline Subtotal</td>
                        <td className="p-2.5 text-slate-400">Direct Inference</td>
                        <td className="p-2.5 text-emerald-400">$24.17</td>
                        <td className="p-2.5 text-emerald-400">KES 3,142.10</td>
                      </tr>
                      <tr className="bg-indigo-950/40 font-bold text-indigo-300">
                        <td className="p-2.5 font-sans">With 30% Planning Allowance</td>
                        <td className="p-2.5 text-slate-400">+ Volatility buffer</td>
                        <td className="p-2.5 text-indigo-200">$31.42</td>
                        <td className="p-2.5 text-indigo-200">KES 4,084.73</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safeguards' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/30 border border-indigo-800/60 rounded-lg text-xs text-slate-300">
                <span className="font-semibold text-indigo-300">MAST Research Reference: </span>
                <span>The Multi-Agent Failure Taxonomy (Cemri et al., 2025) identified 14 failure modes across 1,600 traces. Melch Tech implements programmatic defenses against each:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {safeguards.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{item.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Defends against: <span className="text-amber-300/90 font-medium">{item.failure}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'unit_economics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[11px]">Human Supervision Saved</p>
                  <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {metrics.humanSupervisionHoursSaved} hrs
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Valued @ KES 500/hr: KES {(metrics.humanSupervisionHoursSaved * 500).toLocaleString()}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[11px]">Tasks Reconciled</p>
                  <p className="text-xl font-bold font-mono text-indigo-400 mt-1">
                    {metrics.completedTasksCount}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">100% column parity audit</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[11px]">Est. Contribution Margin</p>
                  <p className="text-xl font-bold font-mono text-white mt-1">
                    KES {metrics.contributionMarginKes.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Net of delivery compute</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 space-y-2">
                <h4 className="font-semibold text-white">Value Proposition & Verification</h4>
                <p className="text-[11.5px] leading-relaxed text-slate-400">
                  True business value is measured in customer time saved and defect-free closing operations, not artificial token volume.
                  Melch Tech guarantees that no money moves autonomously, every report carries verifiable source references, and external notifications require an exact, cryptographically bound human authorization.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
