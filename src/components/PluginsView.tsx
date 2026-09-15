import React, { useState } from 'react';
import { 
  Puzzle, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Zap, 
  Code, 
  Globe, 
  Server, 
  GitBranch, 
  Play, 
  Trash2, 
  Settings, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { Plugin, PluginCategory, PluginTool } from '../types.ts';

interface PluginsViewProps {
  plugins: Plugin[];
  onConnectPlugin: (pluginId: string, config?: Record<string, any>) => Promise<void>;
  onDisconnectPlugin: (pluginId: string) => Promise<void>;
  onCreatePlugin: (pluginData: Partial<Plugin>) => Promise<void>;
  onDeletePlugin: (pluginId: string) => Promise<void>;
}

export const PluginsView: React.FC<PluginsViewProps> = ({
  plugins,
  onConnectPlugin,
  onDisconnectPlugin,
  onCreatePlugin,
  onDeletePlugin,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTestToolModalOpen, setIsTestToolModalOpen] = useState(false);
  const [testingPlugin, setTestingPlugin] = useState<Plugin | null>(null);
  const [selectedTool, setSelectedTool] = useState<PluginTool | null>(null);
  const [toolInput, setToolInput] = useState('');
  const [toolOutput, setToolOutput] = useState<string | null>(null);
  const [isExecutingTool, setIsExecutingTool] = useState(false);

  // New Plugin Form state
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginCategory, setNewPluginCategory] = useState<PluginCategory>('SEARCH');
  const [newPluginDesc, setNewPluginDesc] = useState('');
  const [newPluginEndpoint, setNewPluginEndpoint] = useState('');
  const [newToolName, setNewToolName] = useState('');
  const [newToolDesc, setNewToolDesc] = useState('');
  const [customTools, setCustomTools] = useState<PluginTool[]>([]);

  // Filter plugins
  const filteredPlugins = plugins.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tools.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const connectedCount = plugins.filter(p => p.status === 'CONNECTED').length;
  const totalToolsCount = plugins.reduce((acc, p) => acc + p.tools.length, 0);

  const handleAddToolToNewPlugin = () => {
    if (!newToolName) return;
    setCustomTools(prev => [...prev, { name: newToolName.trim(), description: newToolDesc.trim() || 'Autonomous tool action' }]);
    setNewToolName('');
    setNewToolDesc('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPluginName) return;

    const toolsToSubmit = customTools.length > 0 
      ? customTools 
      : [{ name: `${newPluginName.toLowerCase().replace(/\s+/g, '_')}.execute`, description: 'Execute action via custom plugin' }];

    await onCreatePlugin({
      name: newPluginName,
      category: newPluginCategory,
      description: newPluginDesc || 'Custom plugin for Grokbot multi-agent cluster.',
      endpointUrl: newPluginEndpoint,
      tools: toolsToSubmit,
    });

    setIsCreateModalOpen(false);
    setNewPluginName('');
    setNewPluginDesc('');
    setNewPluginEndpoint('');
    setCustomTools([]);
  };

  const handleRunToolTest = async () => {
    if (!selectedTool) return;
    setIsExecutingTool(true);
    setToolOutput(null);

    // Simulate real cloud MicroVM execution of plugin tool
    setTimeout(() => {
      let output = '';
      if (selectedTool.name.includes('search') || selectedTool.name.includes('crawl')) {
        output = `[Firecrawl Engine 200 OK]\nCrawled 4 target documents for query: "${toolInput || 'Default agent query'}"\n- Title: "Autonomous Systems Architecture 2026"\n- Extracted: 4,820 tokens of verified markdown text.\n- Parity Asserted: 100% clean markdown.`;
      } else if (selectedTool.name.includes('python') || selectedTool.name.includes('execute')) {
        output = `[Python Sandbox Pyodide/MicroVM]\n>>> import math, statistics\n>>> input_spec = "${toolInput || '50 * 1.16'}"\nOutput: [OK] Result: 58.00\nExecution Time: 42ms | Memory: 14.2 MB`;
      } else if (selectedTool.name.includes('mcp')) {
        output = `[Model Context Protocol Client]\nHandshake completed with endpoint.\nExposed capabilities: 6 methods.\nTool invocation "${selectedTool.name}" completed with status: SUCCESS.`;
      } else {
        output = `[Plugin Tool: ${selectedTool.name}]\nExecuted on Grokbot MicroVM.\nInputs: "${toolInput || 'Standard agent payload'}"\nResult: 200 OK • Completed successfully in 68ms.`;
      }
      setToolOutput(output);
      setIsExecutingTool(false);
    }, 600);
  };

  const getCategoryIcon = (category: PluginCategory) => {
    switch (category) {
      case 'SEARCH':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'CODE':
        return <Code className="w-4 h-4 text-emerald-400" />;
      case 'INTEGRATION':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'MCP_SERVER':
        return <Server className="w-4 h-4 text-purple-400" />;
      default:
        return <Puzzle className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div id="plugins-ecosystem-view" className="flex-1 flex flex-col h-full bg-[#08090d] text-slate-100 overflow-y-auto p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#181d29] pb-4 mb-6 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Puzzle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Plugins & Extensible Tools Ecosystem</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#121927] text-cyan-300 border border-cyan-800/60 font-semibold">
                  Grokbot Architecture
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect web search engines, Python sandboxes, GitHub, and Model Context Protocol (MCP) servers to empower autonomous agents.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Build New Plugin</span>
        </button>
      </div>

      {/* Architecture & Cluster Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 bg-[#0d1017] rounded-xl border border-[#1b2234]">
          <span className="text-[10.5px] uppercase font-mono text-slate-500 font-semibold block">Connected Plugins</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-400">{connectedCount}</span>
            <span className="text-xs text-slate-500 font-mono">/ {plugins.length} installed</span>
          </div>
        </div>
        <div className="p-3.5 bg-[#0d1017] rounded-xl border border-[#1b2234]">
          <span className="text-[10.5px] uppercase font-mono text-slate-500 font-semibold block">Cluster Tools Available</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-cyan-300">{totalToolsCount}</span>
            <span className="text-xs text-slate-500 font-mono">invocable tools</span>
          </div>
        </div>
        <div className="p-3.5 bg-[#0d1017] rounded-xl border border-[#1b2234]">
          <span className="text-[10.5px] uppercase font-mono text-slate-500 font-semibold block">Runtime MicroVM</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">Sandboxed & Active</span>
          </div>
        </div>
        <div className="p-3.5 bg-[#0d1017] rounded-xl border border-[#1b2234]">
          <span className="text-[10.5px] uppercase font-mono text-slate-500 font-semibold block">Model Context Protocol</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xs font-mono text-purple-300 font-bold">MCP SSE Ready</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 p-1 bg-[#0d1017] rounded-xl border border-[#1b2234] text-xs">
          {['ALL', 'SEARCH', 'CODE', 'INTEGRATION', 'MCP_SERVER', 'CUSTOM'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#1a2337] text-white shadow-sm border border-[#2b3957]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search plugins or tools..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1017] text-xs text-slate-200 pl-8 pr-3 py-2 rounded-xl border border-[#1b2234] focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map(plugin => {
          const isConnected = plugin.status === 'CONNECTED';
          return (
            <div
              key={plugin.id}
              className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                isConnected
                  ? 'bg-[#0b0e16] border-[#1f293d] hover:border-cyan-500/40 shadow-sm'
                  : 'bg-[#07090f] border-[#151924] opacity-80'
              }`}
            >
              <div>
                {/* Header: Icon, Name, Category, Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#121623] border border-[#1e2638] flex items-center justify-center shrink-0">
                      {getCategoryIcon(plugin.category)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{plugin.name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span className="text-slate-500">{plugin.version}</span>
                        <span>•</span>
                        <span className="text-slate-400">{plugin.author}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                      isConnected
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-[#121520] text-slate-400 border-[#1f2638]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{plugin.status}</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed mt-2 line-clamp-2">
                  {plugin.description}
                </p>

                {/* Endpoint preview if MCP or custom */}
                {plugin.endpointUrl && (
                  <div className="mt-2 text-[10px] font-mono text-purple-300 bg-[#121020] px-2 py-1 rounded border border-purple-900/40 truncate">
                    Host: {plugin.endpointUrl}
                  </div>
                )}

                {/* Tools List */}
                <div className="mt-3 pt-3 border-t border-[#141a27] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                    Exported Tools ({plugin.tools.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {plugin.tools.map((tool, idx) => (
                      <span
                        key={idx}
                        className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-[#101522] text-cyan-300 border border-[#1b253b]"
                        title={tool.description}
                      >
                        ⚡ {tool.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#141a27]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTestingPlugin(plugin);
                      setSelectedTool(plugin.tools[0] || null);
                      setToolOutput(null);
                      setToolInput('');
                      setIsTestToolModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#141a28] hover:bg-[#1d273c] text-xs text-slate-300 hover:text-white border border-[#232f48] flex items-center gap-1 transition-colors"
                    title="Test tool in sandbox"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Test Tool</span>
                  </button>

                  {plugin.isCustom && (
                    <button
                      onClick={() => onDeletePlugin(plugin.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Delete custom plugin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isConnected ? (
                  <button
                    onClick={() => onDisconnectPlugin(plugin.id)}
                    className="px-3 py-1 rounded-lg bg-[#1a1c24] hover:bg-[#252834] text-xs font-semibold text-slate-300 hover:text-white border border-[#2b3040] transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => onConnectPlugin(plugin.id)}
                    className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-sm shadow-cyan-600/30 transition-colors"
                  >
                    Connect Plugin
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Build New Custom Plugin */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e16] border border-[#20293d] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#182133] pb-3">
              <div className="flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Build & Connect New Plugin</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Plugin Name</label>
                <input
                  type="text"
                  placeholder="e.g. Postgres Analytics Connector, Twitter/X Scraper"
                  value={newPluginName}
                  onChange={e => setNewPluginName(e.target.value)}
                  required
                  className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newPluginCategory}
                    onChange={e => setNewPluginCategory(e.target.value as PluginCategory)}
                    className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SEARCH">Search Engine</option>
                    <option value="CODE">Code & Runtime</option>
                    <option value="INTEGRATION">Integration / API</option>
                    <option value="MCP_SERVER">Model Context Protocol (MCP)</option>
                    <option value="CUSTOM">Custom Toolpack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Endpoint URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://api.example.com or SSE"
                    value={newPluginEndpoint}
                    onChange={e => setNewPluginEndpoint(e.target.value)}
                    className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Purpose, capability scope, and guidelines for autonomous agents using this plugin..."
                  value={newPluginDesc}
                  onChange={e => setNewPluginDesc(e.target.value)}
                  className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Add Custom Tools */}
              <div className="p-3 bg-[#080b12] rounded-xl border border-[#182133] space-y-2">
                <span className="text-[11px] font-bold text-indigo-300 block">Define Exported Tools:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tool name (e.g. pg.query)"
                    value={newToolName}
                    onChange={e => setNewToolName(e.target.value)}
                    className="flex-1 bg-[#111624] text-slate-200 px-2.5 py-1.5 rounded-lg border border-[#20293d] font-mono text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newToolDesc}
                    onChange={e => setNewToolDesc(e.target.value)}
                    className="flex-1 bg-[#111624] text-slate-200 px-2.5 py-1.5 rounded-lg border border-[#20293d] text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddToolToNewPlugin}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    Add
                  </button>
                </div>

                {customTools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {customTools.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-[#131b2d] text-indigo-300 border border-indigo-800 text-[10px] font-mono">
                        ⚡ {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#182133]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#141926] hover:bg-[#1e263a] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  Mount & Connect Plugin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Test Tool in Cloud MicroVM */}
      {isTestToolModalOpen && testingPlugin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e16] border border-[#20293d] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#182133] pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Execute Tool Test: {testingPlugin.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Isolated Cloud MicroVM Sandbox</p>
                </div>
              </div>
              <button onClick={() => setIsTestToolModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono text-[10.5px] uppercase mb-1">Select Tool</label>
                <select
                  value={selectedTool?.name || ''}
                  onChange={e => setSelectedTool(testingPlugin.tools.find(t => t.name === e.target.value) || null)}
                  className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] font-mono text-xs"
                >
                  {testingPlugin.tools.map((t, idx) => (
                    <option key={idx} value={t.name}>
                      {t.name} — {t.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono text-[10.5px] uppercase mb-1">Input Parameters / Query</label>
                <input
                  type="text"
                  placeholder="e.g. search query, python expression, or payload..."
                  value={toolInput}
                  onChange={e => setToolInput(e.target.value)}
                  className="w-full bg-[#111624] text-slate-200 px-3 py-2 rounded-xl border border-[#20293d] font-mono text-xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleRunToolTest}
                  disabled={isExecutingTool}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isExecutingTool ? 'animate-spin' : ''}`} />
                  <span>{isExecutingTool ? 'Executing on MicroVM...' : 'Run Tool Test'}</span>
                </button>
              </div>

              {toolOutput && (
                <div className="mt-3">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Execution Terminal Output:</span>
                  <pre className="p-3 bg-[#06080e] rounded-xl border border-[#161d2d] text-emerald-400 font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {toolOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
