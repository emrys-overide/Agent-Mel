import React, { useState } from 'react';
import { 
  Monitor, 
  Lock, 
  RotateCw, 
  UserCheck, 
  Bot, 
  Terminal, 
  Table, 
  ShieldCheck, 
  Globe,
  HardDrive,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { ComputerSession, Routine } from '../types.ts';

interface AgentComputerPanelProps {
  computer: ComputerSession;
  routines: Routine[];
  onTakeover: () => Promise<void>;
  onReleaseControl: () => Promise<void>;
  onSelectRow: (rowIndex: number) => Promise<void>;
  onExecuteCommand: (command: string) => Promise<void>;
}

export const AgentComputerPanel: React.FC<AgentComputerPanelProps> = ({
  computer,
  routines,
  onTakeover,
  onReleaseControl,
  onSelectRow,
  onExecuteCommand,
}) => {
  const [activeTab, setActiveTab] = useState<'screen' | 'terminal' | 'files' | 'logs'>('screen');
  const [cliInput, setCliInput] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isHumanTakeover = computer.status === 'HUMAN_TAKEOVER';

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    const cmd = cliInput;
    setCliInput('');
    await onExecuteCommand(cmd);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 350);
  };

  return (
    <aside
      id="agent-computer-panel"
      className="w-96 bg-[#090b10] border-l border-[#1a1f2c] flex flex-col h-full select-none text-slate-300 z-10 shrink-0 font-sans"
    >
      {/* Cloud Computer Header */}
      <div className="p-3.5 border-b border-[#1a1f2c] bg-[#0c0e14] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#141926] border border-[#232c3f] flex items-center justify-center text-indigo-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 tracking-tight">
              AGENT COMPUTER
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              VM-Sandbox-01 • {computer.lastFrameTimestamp}
            </p>
          </div>
        </div>

        {/* Exclusive Takeover / Release Control button */}
        {isHumanTakeover ? (
          <button
            id="btn-release-control"
            onClick={onReleaseControl}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 transition-all"
            title="Return workstation to autonomous bot"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Return Control</span>
          </button>
        ) : (
          <button
            id="btn-take-control"
            onClick={onTakeover}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#1a2133] hover:bg-[#25304a] text-slate-100 hover:text-white border border-[#2b3752] font-semibold transition-all shadow-sm"
            title="Acquire exclusive human takeover lease (locks out bot)"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Take Control</span>
          </button>
        )}
      </div>

      {/* Control Lease Status Banner */}
      <div
        className={`px-3 py-1.5 text-[10.5px] font-medium flex items-center justify-between border-b ${
          isHumanTakeover
            ? 'bg-amber-950/60 text-amber-200 border-amber-800/60'
            : 'bg-[#0b0e16] text-slate-400 border-[#181d29]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {isHumanTakeover ? (
            <>
              <Lock className="w-3 h-3 text-amber-400" />
              <span className="font-bold">Exclusive Human Takeover Active</span>
            </>
          ) : (
            <>
              <Bot className="w-3 h-3 text-indigo-400" />
              <span>Machine Lease: <strong className="text-slate-200">Autonomous Agent</strong></span>
            </>
          )}
        </div>
        <span className="text-[10px] font-mono text-slate-500">Ubuntu 24.04</span>
      </div>

      {/* Virtual Browser URL Bar */}
      <div className="p-2 border-b border-[#1a1f2c] bg-[#0c0e14] flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className={`p-1 text-slate-400 hover:text-white rounded ${isRefreshing ? 'animate-spin' : ''}`}
          title="Refresh screen frame"
        >
          <RotateCw className="w-3 h-3" />
        </button>

        <div className="flex-1 bg-[#10141f] rounded-lg px-2.5 py-1 text-[11px] text-slate-300 flex items-center gap-1.5 border border-[#1d2436] truncate font-mono">
          <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
          <span className="truncate">{computer.viewportData.url}</span>
        </div>
      </div>

      {/* Screen Tabs */}
      <div className="flex items-center border-b border-[#1a1f2c] bg-[#0c0f16] text-xs px-2 pt-1 gap-1">
        <button
          onClick={() => setActiveTab('screen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium text-xs transition-colors border-t border-x ${
            activeTab === 'screen'
              ? 'bg-[#08090d] text-white border-[#1a1f2c] border-b-transparent font-bold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Screen</span>
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium text-xs transition-colors border-t border-x ${
            activeTab === 'terminal'
              ? 'bg-[#08090d] text-white border-[#1a1f2c] border-b-transparent font-bold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Terminal</span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium text-xs transition-colors border-t border-x ${
            activeTab === 'files'
              ? 'bg-[#08090d] text-white border-[#1a1f2c] border-b-transparent font-bold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Task Files</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium text-xs transition-colors border-t border-x ${
            activeTab === 'logs'
              ? 'bg-[#08090d] text-white border-[#1a1f2c] border-b-transparent font-bold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Logs</span>
        </button>
      </div>

      {/* Screen Viewport Content */}
      <div className={`flex-1 overflow-y-auto p-3 bg-[#08090d] text-xs transition-all ${
        isHumanTakeover ? 'ring-2 ring-amber-500/40 ring-inset' : ''
      }`}>
        {activeTab === 'screen' && (
          <div className="space-y-3">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-1.5">
              {computer.viewportData.summaryStats?.map((stat, idx) => (
                <div key={idx} className="bg-[#0f131f] border border-[#1b2234] p-2 rounded-xl">
                  <p className="text-[9.5px] text-slate-400 truncate">{stat.label}</p>
                  <p className="text-[11px] font-bold text-white font-mono mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Live Rendered View */}
            {computer.viewportData.tableRows && computer.viewportData.tableRows.length > 0 ? (
              <div className="border border-[#1b2234] rounded-xl overflow-hidden bg-[#0e121d]">
                <div className="px-2.5 py-1.5 bg-[#121624] border-b border-[#1b2234] text-[10.5px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>{computer.viewportData.statusBadge}</span>
                  <span className="font-mono text-emerald-400 text-[10px]">Parity Audit</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#0c0f18] text-slate-400 font-mono text-[10px] border-b border-[#1b2234]">
                      <tr>
                        <th className="p-2">Ref</th>
                        <th className="p-2">Channel</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b2234] font-mono text-slate-300">
                      {computer.viewportData.tableRows.map((row, idx) => (
                        <tr
                          key={idx}
                          onClick={() => isHumanTakeover && onSelectRow(idx)}
                          className={`transition-colors ${
                            row.flagged
                              ? 'bg-rose-950/20 text-rose-200'
                              : 'hover:bg-[#151b2a]'
                          } ${isHumanTakeover ? 'cursor-pointer hover:bg-[#1a2236]' : ''}`}
                        >
                          <td className="p-2 text-indigo-300 font-bold">{row.id}</td>
                          <td className="p-2 text-slate-400 font-sans">{row.channel}</td>
                          <td className="p-2 font-bold">{row.amount}</td>
                          <td className="p-2">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                              row.flagged
                                ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                                : 'text-emerald-400'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Standby / Empty Screen */
              <div className="border border-[#1b2234] rounded-2xl p-6 text-center space-y-3 bg-[#0d1017]">
                <div className="w-12 h-12 rounded-2xl bg-[#141a27] border border-[#20293d] flex items-center justify-center mx-auto text-indigo-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">Isolated VM Standby</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    The virtual desktop session is initialized and awaiting an active task lease. Assign a task in the chat to start browser or script execution.
                  </p>
                </div>
                <div className="pt-2 text-[10px] font-mono text-slate-500">
                  Container IP: 10.244.0.42 • Headless Display: 1280x800
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal Shell Tab */}
        {activeTab === 'terminal' && (
          <div className="h-full flex flex-col font-mono text-[11px] space-y-2">
            <div className="flex-1 bg-[#050608] border border-[#1a1f2c] rounded-xl p-3 overflow-y-auto space-y-1 text-slate-300">
              {computer.viewportData.terminalLines?.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.startsWith('$') || line.startsWith('[VM')
                      ? 'text-indigo-300 font-bold'
                      : line.includes('SUCCESS') || line.includes('zero variance')
                      ? 'text-emerald-400'
                      : line.includes('WARNING') || line.includes('UNLINKED')
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }
                >
                  {line}
                </div>
              ))}
            </div>

            <form onSubmit={handleCommandSubmit} className="flex gap-2">
              <input
                type="text"
                value={cliInput}
                onChange={e => setCliInput(e.target.value)}
                placeholder={isHumanTakeover ? "Execute command (e.g. status, ls, python3 reconcile.py)..." : "Take control to type..."}
                disabled={!isHumanTakeover}
                className="flex-1 bg-[#0d1017] border border-[#1b2234] rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isHumanTakeover || !cliInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold disabled:opacity-40"
              >
                Run
              </button>
            </form>
          </div>
        )}

        {/* Task Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-2">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              /workspace/staged/
            </div>
            <div className="space-y-1">
              <div className="bg-[#0e121d] border border-[#1a2131] rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="truncate">
                  <p className="font-mono text-slate-200">daily_batches_20260914.csv</p>
                  <p className="text-[10px] text-slate-500">1,420 rows • KES 1,842,500.00 volume</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">READY</span>
              </div>

              <div className="bg-[#0e121d] border border-[#1a2131] rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="truncate">
                  <p className="font-mono text-slate-200">coop_bank_statement_sept14.pdf</p>
                  <p className="text-[10px] text-slate-500">Nairobi Main Branch export • 4.2 MB</p>
                </div>
                <span className="text-[10px] font-mono text-indigo-400">AUTHENTICATED</span>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-[#050608] border border-[#1a1f2c] rounded-xl p-3 font-mono text-[11px] text-slate-400 space-y-1.5">
            {computer.consoleLogs?.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-600">[{idx + 1}]</span>
                <span className="text-slate-300">{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Computer Footer */}
      <div className="p-2.5 border-t border-[#1a1f2c] bg-[#0c0e14] flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Display: 60 FPS (WebRTC)</span>
        </span>
        <span>Resolution: 1280x800</span>
      </div>
    </aside>
  );
};
