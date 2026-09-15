/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RosterSidebar } from './components/RosterSidebar.tsx';
import { TranscriptArea } from './components/TranscriptArea.tsx';
import { AgentComputerPanel } from './components/AgentComputerPanel.tsx';
import { RoutinesView } from './components/RoutinesView.tsx';
import { ArtifactsView } from './components/ArtifactsView.tsx';
import { CompanyEconomicsModal } from './components/CompanyEconomicsModal.tsx';
import { NewAgentModal } from './components/NewAgentModal.tsx';
import { BotProfileModal } from './components/BotProfileModal.tsx';
import { AccessControlView } from './components/AccessControlView.tsx';
import { PluginsView } from './components/PluginsView.tsx';
import { INITIAL_WORKSPACE_STATE } from './data/initialData.ts';
import { WorkspaceState, AgentProfile, BotAccessDesignation, Plugin, Skill } from './types.ts';
import { Monitor, RotateCcw, CheckCircle2, Sparkles, Plus, Bot, ShieldCheck } from 'lucide-react';

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(INITIAL_WORKSPACE_STATE);
  const [activeView, setActiveView] = useState<'chats' | 'access' | 'plugins' | 'routines' | 'artifacts' | 'economics'>('chats');
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-general');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | undefined>(undefined);
  const [selectedBotProfile, setSelectedBotProfile] = useState<AgentProfile | null>(null);
  const [isNewBotModalOpen, setIsNewBotModalOpen] = useState<boolean>(false);
  const [isEconomicsOpen, setIsEconomicsOpen] = useState<boolean>(false);
  const [showRightComputer, setShowRightComputer] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial workspace state from API
  useEffect(() => {
    fetch('/api/workspace')
      .then(res => res.json())
      .then(data => {
        if (data && data.agents) {
          setWorkspace(data);
          if (data.activeConversationId) {
            setActiveConversationId(data.activeConversationId);
          }
        }
      })
      .catch(err => {
        console.warn('Backend /api/workspace not yet ready, using client initial state:', err);
      });
  }, []);

  // Active conversation & active task
  const currentConversation = workspace.conversations.find(c => c.id === activeConversationId) || workspace.conversations[0];
  const activeTask = workspace.tasks.find(t => t.id === currentConversation?.activeTaskId) || workspace.tasks[0];
  const currentMessages = workspace.messages.filter(m => m.conversationId === currentConversation?.id);

  // Send message & trigger live LLM agent run
  const handleSendMessage = async (text: string, targetAgentId?: string) => {
    if (!currentConversation) return;
    setIsGenerating(true);

    try {
      const res = await fetch(`/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetAgentId,
          senderName: 'Paul (Founder)',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
        } else if (data.userMessage && data.agentMessage) {
          setWorkspace(prev => ({
            ...prev,
            messages: [...prev.messages, data.userMessage, data.agentMessage],
          }));
        }
      } else {
        // Fallback local append if network failure
        const fallbackMsg = {
          id: `msg-${Date.now()}`,
          conversationId: currentConversation.id,
          senderType: 'user' as const,
          senderName: 'Paul (Founder)',
          text,
          timestamp: new Date().toLocaleTimeString(),
        };
        setWorkspace(prev => ({
          ...prev,
          messages: [...prev.messages, fallbackMsg],
        }));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Decision on Approval Card
  const handleApproveAction = async (actionId: string, decision: 'APPROVE' | 'DENY', reason?: string) => {
    try {
      const res = await fetch(`/api/actions/${actionId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason, reviewer: 'Paul (Human Operator)' }),
      });

      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspace(wsData);
        }
        showToast(
          decision === 'APPROVE'
            ? 'Action approved! Signed cryptographic receipt dispatched.'
            : 'Action denied. Dispatch token revoked.'
        );
      }
    } catch (err) {
      console.error('Failed to approve action:', err);
    }
  };

  // Exclusive Human Takeover
  const handleTakeover = async () => {
    try {
      const res = await fetch('/api/computer/takeover', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(prev => ({ ...prev, computer: data.computer }));
        showToast('Exclusive Human Takeover acquired. Bot dispatch locked out.');
      }
    } catch (err) {
      console.error('Failed to takeover computer:', err);
    }
  };

  // Return control to bot
  const handleReleaseControl = async () => {
    try {
      const res = await fetch('/api/computer/release', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(prev => ({ ...prev, computer: data.computer }));
        showToast('Workstation control returned to autonomous agent.');
      }
    } catch (err) {
      console.error('Failed to release control:', err);
    }
  };

  // Select row in computer spreadsheet
  const handleSelectRow = async (rowIndex: number) => {
    try {
      const res = await fetch('/api/computer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'SELECT_ROW', rowIndex }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(prev => ({ ...prev, computer: data.computer }));
      }
    } catch (err) {
      console.error('Failed to select row:', err);
    }
  };

  // Execute terminal command
  const handleExecuteCommand = async (command: string) => {
    try {
      const res = await fetch('/api/computer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'EXECUTE_COMMAND', command }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(prev => ({ ...prev, computer: data.computer }));
      }
    } catch (err) {
      console.error('Failed to execute command:', err);
    }
  };

  // Trigger Routine
  const handleTriggerRoutine = async (routineId: string) => {
    try {
      const res = await fetch(`/api/routines/${routineId}/trigger`, { method: 'POST' });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspace(wsData);
        }
        showToast('Routine completed on Nairobi schedule.');
      }
    } catch (err) {
      console.error('Failed to trigger routine:', err);
    }
  };

  // Promote Skill
  const handlePromoteSkill = async (skillId: string) => {
    try {
      const res = await fetch(`/api/skills/${skillId}/promote`, { method: 'POST' });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspace(wsData);
        }
        showToast('Skill promoted to next lifecycle verification tier.');
      }
    } catch (err) {
      console.error('Failed to promote skill:', err);
    }
  };

  // Create Agent
  const handleCreateAgent = async (agentData: any) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspace(wsData);
        }
        showToast(`Agent "${agentData.name}" deployed to persistent harness cluster.`);
      }
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
  };

  // Update Agent
  const handleUpdateAgent = async (id: string, updates: Partial<AgentProfile>) => {
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspace(wsData);
        }
        showToast('Agent profile configuration saved.');
      }
    } catch (err) {
      console.error('Failed to update agent:', err);
    }
  };

  // Designate Access & Permissions (Main Bot Governance)
  const handleDesignateAccess = async (agentId: string, designation: Partial<BotAccessDesignation>) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/designate-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(designation),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
        }
        showToast(data.message || 'Access policy updated by Main Bot.');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Access designation rejected.');
      }
    } catch (err) {
      console.error('Failed to designate access:', err);
    }
  };

  // Delete/Decommission Agent
  const handleDeleteAgent = async (id: string) => {
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspace(wsData);
          if (activeConversationId === `conv-${id}`) {
            setActiveConversationId('conv-general');
          }
        }
        showToast('Agent decommissioned and removed from harness.');
      }
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  // Connect Plugin (Grokbot Architecture)
  const handleConnectPlugin = async (pluginId: string, config?: Record<string, any>) => {
    try {
      const res = await fetch(`/api/plugins/${pluginId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          setWorkspace(await wsRes.json());
        }
        showToast('Plugin connected & toolpack mounted into cloud runtime.');
      }
    } catch (err) {
      console.error('Failed to connect plugin:', err);
    }
  };

  // Disconnect Plugin
  const handleDisconnectPlugin = async (pluginId: string) => {
    try {
      const res = await fetch(`/api/plugins/${pluginId}/disconnect`, { method: 'POST' });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          setWorkspace(await wsRes.json());
        }
        showToast('Plugin disconnected from runtime.');
      }
    } catch (err) {
      console.error('Failed to disconnect plugin:', err);
    }
  };

  // Create Plugin
  const handleCreatePlugin = async (pluginData: Partial<Plugin>) => {
    try {
      const res = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pluginData),
      });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          setWorkspace(await wsRes.json());
        }
        showToast(`Plugin "${pluginData.name}" created and mounted.`);
      }
    } catch (err) {
      console.error('Failed to create plugin:', err);
    }
  };

  // Delete Plugin
  const handleDeletePlugin = async (pluginId: string) => {
    try {
      const res = await fetch(`/api/plugins/${pluginId}`, { method: 'DELETE' });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          setWorkspace(await wsRes.json());
        }
        showToast('Plugin deleted from cluster.');
      }
    } catch (err) {
      console.error('Failed to delete plugin:', err);
    }
  };

  // Create Skill
  const handleCreateSkill = async (skillData: Partial<Skill>) => {
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillData),
      });
      if (res.ok) {
        const wsRes = await fetch('/api/workspace');
        if (wsRes.ok) {
          setWorkspace(await wsRes.json());
        }
        showToast(`Skill "${skillData.name}" acquired and registered in cluster.`);
      }
    } catch (err) {
      console.error('Failed to create skill:', err);
    }
  };

  // Reset workspace state to demo
  const handleResetWorkspace = async () => {
    if (confirm('Reset workspace to initial single-agent seed state?')) {
      try {
        const res = await fetch('/api/workspace/reset', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setWorkspace(data.workspace);
          setActiveConversationId('conv-general');
          showToast('Workspace reset to baseline single-agent seed.');
        }
      } catch (err) {
        console.error('Failed to reset workspace:', err);
      }
    }
  };

  return (
    <div id="app-root-container" className="flex h-screen w-screen bg-[#06070b] text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. Left Persistent Roster Sidebar */}
      <RosterSidebar
        agents={workspace.agents}
        conversations={workspace.conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={id => {
          setActiveConversationId(id);
          setActiveView('chats');
        }}
        activeView={activeView}
        onChangeView={view => {
          if (view === 'economics') {
            setIsEconomicsOpen(true);
          } else {
            setActiveView(view);
          }
        }}
        onOpenNewBotModal={() => setIsNewBotModalOpen(true)}
        onOpenBotProfile={agent => setSelectedBotProfile(agent)}
        dailySpentKes={workspace.budget.dailySpentKes}
        dailyCapKes={workspace.budget.dailyCapKes}
      />

      {/* 2. Center Panel: Dynamic based on activeView */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden border-r border-[#161a26]">
        {/* Top Control Utility Bar - Grok Minimalist Style */}
        <div className="px-4 py-2 border-b border-[#161a26] bg-[#090b12] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold text-slate-100 tracking-tight">{workspace.companyName}</span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-indigo-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Harness: {workspace.agents.length} Agent{workspace.agents.length > 1 ? 's' : ''}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRightComputer(!showRightComputer)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                showRightComputer
                  ? 'bg-[#151c2d] text-indigo-300 border border-[#232f48]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101420]'
              }`}
              title="Toggle Agent Computer preview panel"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showRightComputer ? 'Hide Computer' : 'Show Computer'}</span>
            </button>

            <button
              onClick={handleResetWorkspace}
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-[#121624] transition-colors"
              title="Reset state to single-agent seed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Switch */}
        {activeView === 'chats' && (
          <TranscriptArea
            conversationTitle={currentConversation?.title || 'Office Channel'}
            isProjectGroup={currentConversation?.type === 'project'}
            messages={currentMessages}
            activeTask={activeTask}
            agents={workspace.agents}
            onSendMessage={handleSendMessage}
            onApproveAction={handleApproveAction}
            onSelectArtifact={id => {
              setSelectedArtifactId(id);
              setActiveView('artifacts');
            }}
            onSelectConversation={id => {
              setActiveConversationId(id);
              setActiveView('chats');
            }}
            onOpenBotProfile={agent => setSelectedBotProfile(agent)}
            isGenerating={isGenerating}
          />
        )}

        {activeView === 'access' && (
          <AccessControlView
            agents={workspace.agents}
            onDesignateAccess={handleDesignateAccess}
            onOpenBotProfile={agent => setSelectedBotProfile(agent)}
            onSpawnNewBot={() => setIsNewBotModalOpen(true)}
          />
        )}

        {activeView === 'plugins' && (
          <PluginsView
            plugins={workspace.plugins || []}
            onConnectPlugin={handleConnectPlugin}
            onDisconnectPlugin={handleDisconnectPlugin}
            onCreatePlugin={handleCreatePlugin}
            onDeletePlugin={handleDeletePlugin}
          />
        )}

        {activeView === 'routines' && (
          <RoutinesView
            routines={workspace.routines}
            skills={workspace.skills}
            agents={workspace.agents}
            onTriggerRoutine={handleTriggerRoutine}
            onPromoteSkill={handlePromoteSkill}
            onCreateSkill={handleCreateSkill}
          />
        )}

        {activeView === 'artifacts' && (
          <ArtifactsView
            artifacts={workspace.artifacts}
            selectedArtifactId={selectedArtifactId}
            onSelectArtifact={id => setSelectedArtifactId(id)}
          />
        )}
      </div>

      {/* 3. Right Agent Computer Panel */}
      {showRightComputer && (
        <AgentComputerPanel
          computer={workspace.computer}
          routines={workspace.routines}
          onTakeover={handleTakeover}
          onReleaseControl={handleReleaseControl}
          onSelectRow={handleSelectRow}
          onExecuteCommand={handleExecuteCommand}
        />
      )}

      {/* Company Economics Modal */}
      {isEconomicsOpen && (
        <CompanyEconomicsModal
          budget={workspace.budget}
          metrics={workspace.metrics}
          onClose={() => setIsEconomicsOpen(false)}
        />
      )}

      {/* New Agent Deployment Modal */}
      {isNewBotModalOpen && (
        <NewAgentModal
          onClose={() => setIsNewBotModalOpen(false)}
          onCreateAgent={handleCreateAgent}
        />
      )}

      {/* Bot Profile Configuration Modal */}
      {selectedBotProfile && (
        <BotProfileModal
          agent={selectedBotProfile}
          canDecommission={workspace.agents.length > 1}
          onClose={() => setSelectedBotProfile(null)}
          onUpdateAgent={handleUpdateAgent}
          onDeleteAgent={handleDeleteAgent}
        />
      )}

      {/* Action Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0e1320] border border-[#222e47] text-slate-100 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
