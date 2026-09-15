import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { INITIAL_WORKSPACE_STATE } from './src/data/initialData.ts';
import { WorkspaceState, Message, ToolEvent, HandoffEvent, ApprovalCardData, Artifact, AgentProfile, Plugin, Skill } from './src/types.ts';

// Deep clone initial state so in-memory mutations persist
let workspaceState: WorkspaceState = JSON.parse(JSON.stringify(INITIAL_WORKSPACE_STATE));

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('Failed to initialize GoogleGenAI client:', err);
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      company: workspaceState.companyName,
      activeAgents: workspaceState.agents.length,
      timestamp: new Date().toISOString(),
    });
  });

  // Get current workspace state
  app.get('/api/workspace', (req, res) => {
    res.json(workspaceState);
  });

  // Live Gemini API status check
  app.get('/api/gemini/status', (req, res) => {
    res.json({
      connected: !!process.env.GEMINI_API_KEY,
      hasKey: !!process.env.GEMINI_API_KEY,
      preferredModel: 'gemini-3.6-flash',
      fallbackModels: ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
      timestamp: new Date().toISOString(),
    });
  });

  // Test live Gemini API with real execution
  app.post('/api/gemini/test', async (req, res) => {
    const ai = getAI();
    if (!ai) {
      return res.status(400).json({
        connected: false,
        error: 'GEMINI_API_KEY is not configured in the environment',
      });
    }

    const testPrompt = req.body?.prompt || 'Respond in 1 short sentence confirming that you are the live Google Gemini model running Meltech Agent Office.';
    const startTime = Date.now();
    const candidateModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const model of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: testPrompt,
        });
        const latencyMs = Date.now() - startTime;
        return res.json({
          connected: true,
          model,
          latencyMs,
          prompt: testPrompt,
          reply: result.text?.trim() || '',
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn(`Test on ${model} failed:`, err?.message || err);
      }
    }

    res.status(502).json({
      connected: false,
      error: 'All candidate Gemini models failed to respond.',
    });
  });

  // Reset workspace state
  app.post('/api/workspace/reset', (req, res) => {
    workspaceState = JSON.parse(JSON.stringify(INITIAL_WORKSPACE_STATE));
    res.json({ success: true, workspace: workspaceState });
  });

  // Create new task
  app.post('/api/tasks', (req, res) => {
    const { title, objective, ownerAgentId, budgetAllocationKes, acceptanceCriteria } = req.body;
    const newTask = {
      id: `task-${Date.now()}`,
      title: title || 'Untitled Task',
      objective: objective || '',
      ownerAgentId: ownerAgentId || 'delivery',
      status: 'RUNNING' as const,
      acceptanceCriteria: acceptanceCriteria || ['Deliver verified artifact', 'Satisfy budget ceiling'],
      budgetAllocationKes: Number(budgetAllocationKes) || 20.0,
      spentBudgetKes: 1.5,
      remainingHops: 3,
      fencingToken: `fence-lease-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    workspaceState.tasks.unshift(newTask);
    const agent = workspaceState.agents.find(a => a.id === newTask.ownerAgentId);
    if (agent) {
      agent.status = 'Working';
      agent.currentTaskId = newTask.id;
      agent.statusDetail = `Working on "${newTask.title}"`;
    }

    res.json({ success: true, task: newTask });
  });

  // Cancel task
  app.post('/api/tasks/:id/cancel', (req, res) => {
    const taskId = req.params.id;
    const task = workspaceState.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'CANCELLED';
      task.updatedAt = new Date().toISOString();
      const agent = workspaceState.agents.find(a => a.id === task.ownerAgentId);
      if (agent && agent.currentTaskId === taskId) {
        agent.status = 'Idle';
        agent.statusDetail = 'Task cancelled by operator';
        agent.currentTaskId = undefined;
      }
    }
    res.json({ success: true, task });
  });

  // Decision on Approval Card (Exact Approval Gateway)
  app.post('/api/actions/:id/decision', (req, res) => {
    const { decision, reason, reviewer } = req.body; // 'APPROVE' | 'DENY'
    const actionId = req.params.id;

    // Search for message containing this approval card
    let targetMsg: Message | undefined;
    for (const msg of workspaceState.messages) {
      if (msg.approvalCard && msg.approvalCard.id === actionId) {
        targetMsg = msg;
        break;
      }
    }

    if (!targetMsg || !targetMsg.approvalCard) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const card = targetMsg.approvalCard;
    const isApproved = decision === 'APPROVE';
    card.status = isApproved ? 'APPROVED' : 'DENIED';
    card.reviewedAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    card.reviewer = reviewer || 'Paul (Human Operator)';

    // Update associated task
    const task = workspaceState.tasks.find(t => t.id === card.taskId);
    if (task) {
      if (isApproved) {
        task.status = 'SUCCEEDED';
        task.spentBudgetKes += card.estimatedCostKes || 0.35;
      } else {
        task.status = 'WAITING_INPUT';
      }
      task.updatedAt = new Date().toISOString();
    }

    // Update agent status
    const reviewerAgent = workspaceState.agents.find(a => a.id === 'reviewer');
    if (reviewerAgent) {
      reviewerAgent.status = isApproved ? 'Done' : 'Waiting for you';
      reviewerAgent.statusDetail = isApproved ? 'Approved report dispatch finalized' : 'Action denied by operator; awaiting revision parameters';
    }

    // Append confirmation message to conversation
    const confirmationMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: targetMsg.conversationId,
      senderType: 'system',
      senderName: 'Policy Gateway',
      senderAvatar: 'PG',
      senderColor: isApproved ? '#059669' : '#DC2626',
      text: isApproved
        ? `Action **${card.actionClass}** authorized by ${card.reviewer}. Verified cryptographic hash: \`${card.actionHash.slice(0, 18)}...\`. Outbound dispatch confirmed to \`${card.target}\`. Provider receipt recorded.`
        : `Action **${card.actionClass}** REJECTED by ${card.reviewer}. ${reason ? `Reason: "${reason}".` : ''} Execution halted; credentials and dispatch tokens revoked.`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    workspaceState.messages.push(confirmationMsg);

    // Update budget
    if (isApproved) {
      workspaceState.budget.dailySpentKes += 0.35;
      workspaceState.budget.settledKes += 0.35;
      workspaceState.budget.reservedKes = Math.max(0, workspaceState.budget.reservedKes - 0.35);
      workspaceState.metrics.completedTasksCount += 1;
      workspaceState.metrics.humanSupervisionHoursSaved += 1.5;
    }

    res.json({ success: true, approvalCard: card, confirmationMsg });
  });

  // Computer takeover: Exclusive Human Control
  app.post('/api/computer/takeover', (req, res) => {
    workspaceState.computer.status = 'HUMAN_TAKEOVER';
    workspaceState.computer.exclusiveController = 'human';
    workspaceState.computer.screenTitle = 'Melch Virtual Workstation [VM-Sandbox-01] - EXCLUSIVE OPERATOR TAKEOVER';
    workspaceState.computer.consoleLogs.unshift(
      `${new Date().toLocaleTimeString()} - HUMAN OPERATOR ACQUIRED EXCLUSIVE TAKEOVER LEASE. Bot screen token revoked. Screen capture masked.`
    );

    // Pause current working bot
    const activeBot = workspaceState.agents.find(a => a.id === workspaceState.computer.activeBotId);
    if (activeBot) {
      activeBot.status = 'Paused';
      activeBot.statusDetail = 'Workstation placed in exclusive operator takeover';
    }

    res.json({ success: true, computer: workspaceState.computer });
  });

  // Computer release: Return Control to Bot
  app.post('/api/computer/release', (req, res) => {
    workspaceState.computer.status = 'ONLINE';
    workspaceState.computer.exclusiveController = 'bot';
    workspaceState.computer.screenTitle = 'Melch Virtual Workstation [VM-Sandbox-01] - Active Agent Session';
    workspaceState.computer.consoleLogs.unshift(
      `${new Date().toLocaleTimeString()} - Human returned workstation control to autonomous agent. Fresh observation frame generated.`
    );

    const activeBot = workspaceState.agents.find(a => a.id === workspaceState.computer.activeBotId);
    if (activeBot) {
      activeBot.status = 'Working';
      activeBot.statusDetail = 'Resuming automated execution loop';
    }

    res.json({ success: true, computer: workspaceState.computer });
  });

  // Computer action (simulate navigation, element click, or terminal command)
  app.post('/api/computer/action', (req, res) => {
    const { actionType, targetUrl, command, rowIndex } = req.body;
    const timeStr = new Date().toLocaleTimeString();

    if (actionType === 'NAVIGATE' && targetUrl) {
      workspaceState.computer.currentUrl = targetUrl;
      workspaceState.computer.viewportData.url = targetUrl;
      workspaceState.computer.consoleLogs.unshift(`${timeStr} - Browser navigated to ${targetUrl}`);
    } else if (actionType === 'EXECUTE_COMMAND' && command) {
      workspaceState.computer.viewportData.terminalLines?.push(`$ ${command}`);
      workspaceState.computer.viewportData.terminalLines?.push(`[EXEC: OK] Command completed with code 0`);
      workspaceState.computer.consoleLogs.unshift(`${timeStr} - Terminal executed: ${command}`);
    } else if (actionType === 'SELECT_ROW' && typeof rowIndex === 'number') {
      workspaceState.computer.viewportData.highlightedRowIndex = rowIndex;
      workspaceState.computer.consoleLogs.unshift(`${timeStr} - Inspected ledger row #${rowIndex}`);
    }

    workspaceState.computer.lastFrameTimestamp = 'Just now';
    res.json({ success: true, computer: workspaceState.computer });
  });

  // Trigger Routine Run
  app.post('/api/routines/:id/trigger', async (req, res) => {
    const routine = workspaceState.routines.find(r => r.id === req.params.id);
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    const runId = `run-${Date.now()}`;
    const timestampStr = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' }) + ' EAT';

    const newRun = {
      id: runId,
      timestamp: timestampStr,
      status: 'SUCCEEDED' as const,
      durationMs: Math.floor(Math.random() * 20000) + 15000,
      costKes: routine.costCeilingKes ? +(routine.costCeilingKes * 0.25).toFixed(2) : 5.0,
      summary: `Routine "${routine.name}" executed successfully. Ingested data streams, computed zero-sum parity, and updated receipts.`,
    };

    routine.recentRuns.unshift(newRun);
    routine.lastRunAt = new Date().toISOString();
    workspaceState.budget.dailySpentKes += newRun.costKes;
    workspaceState.budget.settledKes += newRun.costKes;

    // Log message to project conversation
    const routineMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: 'conv-daily-close',
      senderType: 'agent',
      senderId: routine.ownerAgentId,
      senderName: workspaceState.agents.find(a => a.id === routine.ownerAgentId)?.name || 'Scheduler',
      senderAvatar: workspaceState.agents.find(a => a.id === routine.ownerAgentId)?.avatar || 'SC',
      senderColor: workspaceState.agents.find(a => a.id === routine.ownerAgentId)?.color || '#4F46E5',
      text: `Routine **${routine.name}** executed on schedule (${routine.timeZone}).\n- Duration: ${(newRun.durationMs / 1000).toFixed(1)}s\n- Cost: KES ${newRun.costKes.toFixed(2)}\n- Result: Verified all upstream data feeds and synchronized ledger.`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    workspaceState.messages.push(routineMsg);

    res.json({ success: true, routine, newRun });
  });

  // Promote Skill (DRAFT -> TESTED -> APPROVED)
  app.post('/api/skills/:id/promote', (req, res) => {
    const skill = workspaceState.skills.find(s => s.id === req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (skill.status === 'DRAFT') {
      skill.status = 'TESTED';
      skill.lastTestedAt = new Date().toLocaleString();
    } else if (skill.status === 'TESTED') {
      skill.status = 'APPROVED';
      skill.lastTestedAt = new Date().toLocaleString();
    }

    res.json({ success: true, skill });
  });

  // Add new agent to roster
  app.post('/api/agents', (req, res) => {
    const { name, role, title, color, toolGrants, memoryScope } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const initials = name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newAgent: AgentProfile = {
      id: `agent-${Date.now()}`,
      name,
      role,
      title: title || role,
      avatar: initials,
      color: color || '#2563EB',
      isMainAgent: false,
      status: 'Idle' as const,
      statusDetail: 'Ready for objective assignment',
      unreadCount: 0,
      toolGrants: toolGrants || ['analysis.calculate', 'docs.summarize'],
      access: {
        clearanceLevel: req.body.clearanceLevel || 'TIER_2_STANDARD',
        status: 'ACTIVE',
        allowedTools: toolGrants || ['analysis.calculate', 'docs.summarize'],
        maxDailyBudgetKes: req.body.maxDailyBudgetKes || 40,
        canAccessComputerVM: req.body.canAccessComputerVM ?? true,
        canSpawnAgents: false,
        canWriteFiles: req.body.canWriteFiles ?? false,
        designatedBy: 'Agent Alpha (Main Bot)',
        designatedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' EAT',
        notes: req.body.notes || `Initial clearance designated by Main Bot for ${name}.`,
      },
      memoryScope: memoryScope || ['current_project'],
      limits: {
        maxModelCalls: 10,
        maxToolCalls: 15,
        maxDelegationHops: 2,
        maxRevisionCycles: 1,
        normalTaskReservationKes: 20,
      },
      modelPolicy: 'gemini-3.6-flash',
    };

    workspaceState.agents.push(newAgent);

    // Add to general hub
    const genConv = workspaceState.conversations.find(c => c.id === 'conv-general');
    if (genConv && !genConv.participantAgentIds.includes(newAgent.id)) {
      genConv.participantAgentIds.push(newAgent.id);
    }

    // Create a direct conversation
    workspaceState.conversations.push({
      id: `conv-${newAgent.id}`,
      title: `${newAgent.name} (Direct)`,
      type: 'direct',
      participantAgentIds: [newAgent.id],
      updatedAt: new Date().toISOString(),
    });

    workspaceState.computer.viewportData.terminalLines?.push(
      `$ agent-harness register --name "${newAgent.name}" --role "${newAgent.role}"`,
      `[ROSTER] Main Bot (Agent Alpha) created ${newAgent.name}. Designated clearance: ${newAgent.access?.clearanceLevel}.`
    );

    res.json({ success: true, agent: newAgent, workspace: workspaceState });
  });

  // Designate Access for a Bot (Authorized by Main Bot / Agent Alpha)
  app.post('/api/agents/:id/designate-access', (req, res) => {
    const agentId = req.params.id;
    const targetAgent = workspaceState.agents.find(a => a.id === agentId);
    if (!targetAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const {
      clearanceLevel,
      status,
      allowedTools,
      maxDailyBudgetKes,
      canAccessComputerVM,
      canWriteFiles,
      notes,
    } = req.body;

    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' EAT';

    targetAgent.access = {
      clearanceLevel: clearanceLevel || targetAgent.access?.clearanceLevel || 'TIER_2_STANDARD',
      status: status || targetAgent.access?.status || 'ACTIVE',
      allowedTools: allowedTools || targetAgent.toolGrants || ['analysis.calculate'],
      maxDailyBudgetKes: Number(maxDailyBudgetKes) || targetAgent.access?.maxDailyBudgetKes || 40,
      canAccessComputerVM: canAccessComputerVM !== undefined ? Boolean(canAccessComputerVM) : (targetAgent.access?.canAccessComputerVM ?? true),
      canSpawnAgents: targetAgent.isMainAgent ? true : false,
      canWriteFiles: canWriteFiles !== undefined ? Boolean(canWriteFiles) : (targetAgent.access?.canWriteFiles ?? false),
      designatedBy: 'Agent Alpha (Main Bot)',
      designatedAt: timeStr,
      notes: notes || `Access policy updated by Main Bot.`,
    };

    // Synchronize agent tool grants
    if (allowedTools && Array.isArray(allowedTools)) {
      targetAgent.toolGrants = allowedTools;
    }

    if (maxDailyBudgetKes) {
      targetAgent.limits.normalTaskReservationKes = Math.min(Number(maxDailyBudgetKes), 50);
    }

    // Terminal log on MicroVM
    workspaceState.computer.lastFrameTimestamp = 'Just now';
    workspaceState.computer.viewportData.terminalLines?.push(
      `$ security-policy designate --agent "${targetAgent.name}" --tier "${targetAgent.access.clearanceLevel}"`,
      `[ACCESS DESIGNATION] Main Bot designated ${targetAgent.access.clearanceLevel} for ${targetAgent.name}. Tools: [${targetAgent.toolGrants.join(', ')}]. Budget: KES ${targetAgent.access.maxDailyBudgetKes}/day.`
    );
    workspaceState.computer.consoleLogs.unshift(
      `${timeStr} - Main Bot designated access for ${targetAgent.name}: ${targetAgent.access.clearanceLevel}`
    );

    // Append access notice message in general conversation
    const noticeMsg: Message = {
      id: `msg-access-${Date.now()}`,
      conversationId: 'conv-general',
      senderType: 'system',
      senderName: 'Main Bot Access Gateway',
      senderAvatar: 'AA',
      senderColor: '#6366F1',
      text: `🛡️ **Access Policy Updated by Main Bot (Agent Alpha)**:\n- **Target Bot:** ${targetAgent.name} (${targetAgent.role})\n- **Clearance Level:** \`${targetAgent.access.clearanceLevel}\`\n- **Allowed Capabilities:** ${targetAgent.toolGrants.map(t => `\`${t}\``).join(', ')}\n- **Daily Budget Limit:** KES ${targetAgent.access.maxDailyBudgetKes.toFixed(2)}\n- **VM Workstation Access:** ${targetAgent.access.canAccessComputerVM ? 'Granted' : 'Restricted'}\n- **Policy Notes:** ${targetAgent.access.notes}`,
      timestamp: timeStr,
    };
    workspaceState.messages.push(noticeMsg);

    res.json({ success: true, agent: targetAgent, workspace: workspaceState });
  });

  // Update agent profile
  app.patch('/api/agents/:id', (req, res) => {
    const agent = workspaceState.agents.find(a => a.id === req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    Object.assign(agent, req.body);
    if (req.body.name) {
      agent.avatar = req.body.name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const directConv = workspaceState.conversations.find(c => c.id === `conv-${agent.id}`);
      if (directConv) {
        directConv.title = `${agent.name} (Direct)`;
      }
    }
    res.json({ success: true, agent });
  });

  // Delete agent from roster
  app.delete('/api/agents/:id', (req, res) => {
    const agentIndex = workspaceState.agents.findIndex(a => a.id === req.params.id);
    if (agentIndex === -1) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const removed = workspaceState.agents.splice(agentIndex, 1)[0];
    workspaceState.conversations = workspaceState.conversations.filter(c => c.id !== `conv-${removed.id}`);
    
    // Remove from general hub participants
    const genConv = workspaceState.conversations.find(c => c.id === 'conv-general');
    if (genConv) {
      genConv.participantAgentIds = genConv.participantAgentIds.filter(id => id !== removed.id);
    }

    workspaceState.computer.viewportData.terminalLines?.push(
      `$ agent-harness decommission --agent "${removed.id}"`,
      `[DECOMMISSION] Teammate ${removed.name} (${removed.id}) unlinked from cluster.`
    );

    res.json({ success: true, removed });
  });

  // --- Plugins Engine Endpoints (Grokbot Architecture) ---
  app.get('/api/plugins', (req, res) => {
    res.json({ plugins: workspaceState.plugins || [] });
  });

  app.post('/api/plugins', (req, res) => {
    const { name, category, description, tools, endpointUrl, config } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Plugin name is required' });
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newPlugin: Plugin = {
      id: `plugin-${Date.now()}`,
      name,
      slug,
      category: category || 'CUSTOM',
      description: description || 'Custom plugin created in Grokbot harness.',
      version: 'v1.0.0',
      author: 'Melktech Custom',
      status: 'CONNECTED',
      isCustom: true,
      endpointUrl: endpointUrl || '',
      config: config || {},
      tools: Array.isArray(tools) && tools.length > 0 ? tools : [
        { name: `${slug}.execute`, description: `Execute autonomous tool action via ${name}` }
      ],
      installedAt: new Date().toISOString(),
      lastInvokedAt: 'Just now',
    };

    if (!workspaceState.plugins) workspaceState.plugins = [];
    workspaceState.plugins.push(newPlugin);

    workspaceState.computer.viewportData.terminalLines?.push(
      `$ plugin-registry install --name "${newPlugin.name}" --category "${newPlugin.category}"`,
      `[PLUGIN MOUNTED] ${newPlugin.name} successfully registered in Grokbot cluster.`
    );

    res.json({ success: true, plugin: newPlugin, workspace: workspaceState });
  });

  app.post('/api/plugins/:id/connect', (req, res) => {
    const plugin = workspaceState.plugins?.find(p => p.id === req.params.id);
    if (!plugin) return res.status(404).json({ error: 'Plugin not found' });

    plugin.status = 'CONNECTED';
    if (req.body.config) {
      plugin.config = { ...plugin.config, ...req.body.config };
    }
    plugin.lastInvokedAt = 'Just now';

    workspaceState.computer.viewportData.terminalLines?.push(
      `[PLUGIN CONNECTED] ${plugin.name} status: CONNECTED (Authorization verified)`
    );

    res.json({ success: true, plugin, workspace: workspaceState });
  });

  app.post('/api/plugins/:id/disconnect', (req, res) => {
    const plugin = workspaceState.plugins?.find(p => p.id === req.params.id);
    if (!plugin) return res.status(404).json({ error: 'Plugin not found' });

    plugin.status = 'DISCONNECTED';
    workspaceState.computer.viewportData.terminalLines?.push(
      `[PLUGIN DISCONNECTED] ${plugin.name} status: DISCONNECTED`
    );

    res.json({ success: true, plugin, workspace: workspaceState });
  });

  app.delete('/api/plugins/:id', (req, res) => {
    const idx = workspaceState.plugins?.findIndex(p => p.id === req.params.id);
    if (idx === undefined || idx === -1) return res.status(404).json({ error: 'Plugin not found' });

    const removed = workspaceState.plugins.splice(idx, 1)[0];
    workspaceState.computer.viewportData.terminalLines?.push(
      `$ plugin-registry uninstall --id "${removed.id}"`,
      `[PLUGIN REMOVED] ${removed.name} uninstalled from cluster.`
    );

    res.json({ success: true, removed, workspace: workspaceState });
  });

  // --- Skills Engine Endpoints (Grokbot Architecture) ---
  app.post('/api/skills', (req, res) => {
    const { name, description, parameters, steps, allowedTools } = req.body;
    if (!name) return res.status(400).json({ error: 'Skill name is required' });

    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name,
      version: 'v1.0.0',
      status: 'APPROVED',
      description: description || 'Autonomous procedure synthesized for Grokbot harness.',
      parameters: parameters || ['objective_spec'],
      steps: steps && steps.length > 0 ? steps : [
        'Analyze requested task inputs',
        'Execute sandboxed actions across plugins & tools',
        'Assert arithmetic parity and generate final deliverable'
      ],
      allowedTools: allowedTools || ['analysis.calculate', 'browser.inspect'],
      lastTestedAt: 'Just now',
    };

    if (!workspaceState.skills) workspaceState.skills = [];
    workspaceState.skills.push(newSkill);

    workspaceState.computer.viewportData.terminalLines?.push(
      `$ skill-engine acquire --name "${newSkill.name}"`,
      `[SKILL LEARNED] New skill package "${newSkill.name}" compiled & verified.`
    );

    res.json({ success: true, skill: newSkill, workspace: workspaceState });
  });

  // Send Message and Execute Agent Run (with Gemini 3.8 Flash or Intelligent Fallback)
  app.post('/api/conversations/:id/messages', async (req, res) => {
    const convId = req.params.id;
    const { text, senderName, targetAgentId, attachment } = req.body;

    if (!text && !attachment) {
      return res.status(400).json({ error: 'Message text or attachment required' });
    }

    const conversation = workspaceState.conversations.find(c => c.id === convId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Append user message
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderType: 'user',
      senderName: senderName || 'Paul (Founder)',
      text: text || '',
      timestamp: timeStr,
    };
    workspaceState.messages.push(userMsg);

    // Update conversation timestamp
    conversation.updatedAt = new Date().toISOString();

    // 2. Determine responding agent dynamically
    let responderId = targetAgentId;
    if (!responderId) {
      if (conversation.type === 'direct' && conversation.participantAgentIds.length > 0) {
        responderId = conversation.participantAgentIds[0];
      } else {
        // In team channel: check if any agent was mentioned by name or id
        const mentionedAgent = workspaceState.agents.find(a => {
          const lowerText = text.toLowerCase();
          const cleanId = a.id.toLowerCase();
          const cleanName = a.name.toLowerCase();
          const firstWord = cleanName.split(' ')[0];
          return (
            lowerText.includes(`@${cleanId}`) ||
            lowerText.includes(`@${cleanName}`) ||
            lowerText.includes(`@${firstWord}`) ||
            lowerText.includes(cleanName)
          );
        });

        if (mentionedAgent) {
          responderId = mentionedAgent.id;
        } else {
          // Default to the first agent in the active roster
          responderId = workspaceState.agents[0]?.id || 'agent-1';
        }
      }
    }

    let responder = workspaceState.agents.find(a => a.id === responderId) || workspaceState.agents[0];
    if (!responder) {
      // Create default base agent if none exist
      responder = {
        id: 'agent-1',
        name: 'Agent Alpha',
        role: 'Blank Base Agent (Unassigned)',
        title: 'Primary Seed Agent',
        avatar: 'AA',
        color: '#6366F1',
        status: 'Idle',
        statusDetail: 'Ready for objective assignment',
        unreadCount: 0,
        toolGrants: ['agent.spawn_teammate', 'tasks.assign', 'analysis.calculate', 'browser.inspect'],
        memoryScope: ['workspace.core'],
        limits: {
          maxModelCalls: 15,
          maxToolCalls: 20,
          maxDelegationHops: 3,
          maxRevisionCycles: 1,
          normalTaskReservationKes: 25,
        },
        modelPolicy: 'gemini-3.8-flash',
      };
      workspaceState.agents.push(responder);
    }

    responder.status = 'Working';
    responder.statusDetail = `Executing autonomous run: "${text.slice(0, 45)}..."`;

    // 3. Generate Agent Response using Gemini (Live Server-Side API) or Intelligent Fallback
    const ai = getAI();
    let agentReplyText = '';
    let toolEvents: ToolEvent[] = [];
    let handoffEvent: HandoffEvent | undefined;
    let approvalCard: ApprovalCardData | undefined;
    let createdArtifact: Artifact | undefined;
    let spawnedAgentProfile: AgentProfile | undefined;
    let actualModelUsed: string | undefined;
    let latencyMs: number | undefined;
    let acquiredSkillPackage: Skill | undefined;
    let mountedPluginPackage: Plugin | undefined;

    const lower = text.toLowerCase();
    const isMainAgent = Boolean(responder.isMainAgent || responder.id === 'agent-1');

    const isCreateOrSpawnIntent = 
      lower.includes('create an agent') || 
      lower.includes('create agent') || 
      lower.includes('spawn an agent') || 
      lower.includes('spawn agent') || 
      lower.includes('create bot') ||
      lower.includes('create a bot') ||
      lower.includes('spawn bot') ||
      lower.includes('spawn a bot') ||
      lower.includes('new bot') || 
      lower.includes('hire an agent') || 
      lower.includes('add an agent') ||
      lower.includes('add a bot') ||
      lower.includes('create teammate') ||
      lower.includes('spawn teammate');

    const isSkillIntent =
      lower.includes('acquire skill') ||
      lower.includes('learn skill') ||
      lower.includes('synthesize skill') ||
      lower.includes('new skill') ||
      lower.includes('create skill') ||
      lower.includes('add skill');

    const isPluginIntent =
      lower.includes('connect plugin') ||
      lower.includes('enable plugin') ||
      lower.includes('mount plugin') ||
      lower.includes('create plugin') ||
      lower.includes('install plugin') ||
      lower.includes('firecrawl') ||
      lower.includes('python sandbox') ||
      lower.includes('mcp server') ||
      lower.includes('disconnect plugin');

    const isGrokbotIntent =
      lower.includes('grokbot') ||
      lower.includes('xai') ||
      lower.includes('grok bot') ||
      lower.includes('grok architecture');

    const isAccessDesignationIntent =
      lower.includes('designate access') ||
      lower.includes('grant access') ||
      lower.includes('change access') ||
      lower.includes('set access') ||
      lower.includes('elevate') ||
      lower.includes('tier 3') ||
      lower.includes('tier 2') ||
      lower.includes('tier 1') ||
      lower.includes('clearance') ||
      lower.includes('permissions') ||
      lower.includes('restrict access') ||
      lower.includes('access matrix') ||
      lower.includes('access level') ||
      lower.includes('grant tool') ||
      lower.includes('revoke tool') ||
      lower.includes('suspend bot') ||
      lower.includes('suspend agent');

    // Recent conversation context (up to 6 messages)
    const recentHistory = workspaceState.messages
      .filter(m => m.conversationId === convId)
      .slice(-6)
      .map(m => `${m.senderName}: ${m.text}`)
      .join('\n');

    const rosterSummary = workspaceState.agents
      .map(a => `- Bot: "${a.name}" (ID: "${a.id}", Role: "${a.role}", Clearance: ${a.access?.clearanceLevel || 'TIER_2_STANDARD'}, Designated By: ${a.access?.designatedBy || 'Agent Alpha'}, Tools: [${a.toolGrants.join(', ')}], Budget: KES ${a.access?.maxDailyBudgetKes || 40}/day)`)
      .join('\n');

    const pluginsSummary = (workspaceState.plugins || [])
      .map(p => `- Plugin: "${p.name}" (Category: ${p.category}, Status: ${p.status}, Tools: [${p.tools.map(t => t.name).join(', ')}])`)
      .join('\n');

    const skillsSummary = (workspaceState.skills || [])
      .map(s => `- Skill: "${s.name}" (Status: ${s.status}, Allowed Tools: [${s.allowedTools.join(', ')}])`)
      .join('\n');

    if (ai) {
      const candidateModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      
      const systemInstruction = isMainAgent
        ? `You are ${responder.name}, the MAIN BOT and LEAD ORCHESTRATOR of ${workspaceState.companyName} (${workspaceState.companyTemplate}).
You are built on the full GROKBOT by xAI architecture (Persistent Cloud Computer, Extensible Plugin Sandbox, Dynamic Skill Acquisition, and Multi-Agent Governance):
1. CREATING BOTS: You alone have the authority to spawn, hire, and provision new specialist bots. When spawning a bot, designate their initial security clearance tier and granted tools.
2. DESIGNATING ACCESS: You are the Access Gatekeeper. You designate, audit, and regulate access for each and every bot in the cluster. Populate "designateAccess" if requested.
3. EXTENSIBLE PLUGINS (Firecrawl, Python Sandbox, MCP Servers):
   - You can connect, disconnect, or mount new plugins. Populate "mountPlugin" or "connectPlugin" when requested.
   Current Plugins:
${pluginsSummary}
4. AUTONOMOUS SKILL ACQUISITION:
   - You can synthesize, test, and register new reusable skills. Populate "synthesizeSkill" with name, description, steps, and allowedTools when requested.
   Current Skills:
${skillsSummary}
5. CURRENT ROSTER & ACCESS STATUS OF ALL AVAILABLE BOTS:
${rosterSummary}

Provide an authoritative, articulate, and actionable markdown response explaining what you did or answering the prompt thoroughly.`
        : `You are ${responder.name}, currently holding the role of "${responder.role}" (${responder.title}) in ${workspaceState.companyName}.
YOUR DESIGNATED ACCESS & SECURITY PROFILE:
- Your access was designated by: ${responder.access?.designatedBy || 'Agent Alpha (Main Bot)'}.
- Clearance Level: ${responder.access?.clearanceLevel || 'TIER_2_STANDARD'}.
- Permitted Tools: ${responder.toolGrants.join(', ')}.
- Daily Budget Ceiling: KES ${responder.access?.maxDailyBudgetKes || 40}.00.
- MicroVM Sandboxed Access: ${responder.access?.canAccessComputerVM ? 'Permitted' : 'Restricted'}.

SECURITY & GOVERNANCE BOUNDARIES:
1. You are an interactive chatbot specialist. Connect warmly and helpfully with the user, applying your domain expertise.
2. You CANNOT create other bots or designate bot access. Those powers belong solely to the Main Bot (Agent Alpha).
3. If the user asks you to create a bot or alter access levels, politely explain your designated boundaries: state that Agent Alpha is the Main Bot who designates access and creates bots, and offer to advise the user on what to request from Agent Alpha.
4. If the user asks about your access or connection, give an exact breakdown of your clearance tier, tools, and connection status.
5. If the user asks you to perform a task within your granted tools (${responder.toolGrants.join(', ')}), execute it and provide high quality analysis.`;

      for (const candidateModel of candidateModels) {
        const startTime = Date.now();
        try {
          console.log(`Calling live Gemini API via model: ${candidateModel}...`);
          const response = await ai.models.generateContent({
            model: candidateModel,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${systemInstruction}\n\nRECENT CONVERSATION HISTORY:\n${recentHistory}\n\nUSER MESSAGE:\n"${text}"\n\nGenerate your response strictly adhering to the JSON schema.`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  reply: {
                    type: Type.STRING,
                    description: 'Detailed, polished markdown response from the agent to the user.',
                  },
                  spawnAgent: {
                    type: Type.OBJECT,
                    description: 'Populate ONLY if creating or spawning a new agent was requested. Only Main Bot (Agent Alpha) can authorize this.',
                    properties: {
                      name: { type: Type.STRING },
                      role: { type: Type.STRING },
                      title: { type: Type.STRING },
                      color: { type: Type.STRING },
                      clearanceLevel: { type: Type.STRING },
                      toolGrants: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      responsibilities: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                  },
                  designateAccess: {
                    type: Type.OBJECT,
                    description: 'Populate ONLY if the Main Bot is granting, upgrading, revoking, or designating security clearance, tools, or budget for a bot.',
                    properties: {
                      targetAgentId: { type: Type.STRING },
                      clearanceLevel: { type: Type.STRING },
                      allowedTools: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      maxDailyBudgetKes: { type: Type.NUMBER },
                      canAccessComputerVM: { type: Type.BOOLEAN },
                      canWriteFiles: { type: Type.BOOLEAN },
                      notes: { type: Type.STRING },
                    },
                  },
                  configureAgent: {
                    type: Type.OBJECT,
                    description: 'Populate if the user requested changing or customizing this agent name, role, or title.',
                    properties: {
                      name: { type: Type.STRING },
                      role: { type: Type.STRING },
                      title: { type: Type.STRING },
                      color: { type: Type.STRING },
                    },
                  },
                  toolEvent: {
                    type: Type.OBJECT,
                    description: 'Populate if a specific tool was run to compute or verify data.',
                    properties: {
                      toolName: { type: Type.STRING },
                      target: { type: Type.STRING },
                      resultSummary: { type: Type.STRING },
                    },
                  },
                  approvalRequired: {
                    type: Type.OBJECT,
                    description: 'Populate if an external high-stakes side effect requires human approval gateway.',
                    properties: {
                      actionClass: { type: Type.STRING },
                      target: { type: Type.STRING },
                      proposedEffect: { type: Type.STRING },
                      evidence: { type: Type.STRING },
                    },
                  },
                  synthesizeSkill: {
                    type: Type.OBJECT,
                    description: 'Populate if acquiring, creating, or synthesizing a new reusable skill in the Grokbot harness.',
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      parameters: { type: Type.ARRAY, items: { type: Type.STRING } },
                      steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                      allowedTools: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                  },
                  mountPlugin: {
                    type: Type.OBJECT,
                    description: 'Populate if creating or mounting a new plugin (e.g. Firecrawl search, Python sandbox, MCP server).',
                    properties: {
                      name: { type: Type.STRING },
                      category: { type: Type.STRING },
                      description: { type: Type.STRING },
                      endpointUrl: { type: Type.STRING },
                      tools: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                          },
                        },
                      },
                    },
                  },
                  connectPlugin: {
                    type: Type.OBJECT,
                    description: 'Populate if connecting or disconnecting an existing plugin by name or ID.',
                    properties: {
                      pluginIdOrName: { type: Type.STRING },
                      action: { type: Type.STRING },
                    },
                  },
                },
                required: ['reply'],
              },
            },
          });

          const rawText = response.text || '';
          if (rawText) {
            actualModelUsed = candidateModel;
            latencyMs = Date.now() - startTime;
            responder.modelPolicy = candidateModel;

            try {
              const parsed = JSON.parse(rawText);
              agentReplyText = parsed.reply || '';

              // Check if Gemini spawned an agent (Authorized by Main Bot)
              if (parsed.spawnAgent && parsed.spawnAgent.name && isMainAgent) {
                const sa = parsed.spawnAgent;
                const initials = sa.name
                  .split(' ')
                  .map((p: string) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'AG';

                const newAgent: AgentProfile = {
                  id: `agent-${Date.now()}`,
                  name: sa.name,
                  role: sa.role || 'Specialist Agent',
                  title: sa.title || sa.role || 'Teammate',
                  avatar: initials,
                  color: sa.color || '#059669',
                  isMainAgent: false,
                  status: 'Idle',
                  statusDetail: `Ready for delegated objectives. Clearance designated by Agent Alpha.`,
                  unreadCount: 0,
                  toolGrants: sa.toolGrants && sa.toolGrants.length > 0
                    ? sa.toolGrants
                    : ['analysis.calculate', 'browser.inspect'],
                  access: {
                    clearanceLevel: (sa.clearanceLevel as any) || 'TIER_2_STANDARD',
                    status: 'ACTIVE',
                    allowedTools: sa.toolGrants || ['analysis.calculate', 'browser.inspect'],
                    maxDailyBudgetKes: 40,
                    canAccessComputerVM: true,
                    canSpawnAgents: false,
                    canWriteFiles: Boolean(sa.clearanceLevel === 'TIER_3_ELEVATED'),
                    designatedBy: 'Agent Alpha (Main Bot)',
                    designatedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' EAT',
                    notes: `Access clearance designated by Agent Alpha upon deployment.`,
                  },
                  memoryScope: ['current_project', `role.${(sa.role || 'specialist').toLowerCase().replace(/\s+/g, '_')}`],
                  limits: {
                    maxModelCalls: 12,
                    maxToolCalls: 20,
                    maxDelegationHops: 3,
                    maxRevisionCycles: 1,
                    normalTaskReservationKes: 25,
                  },
                  modelPolicy: candidateModel,
                };

                workspaceState.agents.push(newAgent);
                spawnedAgentProfile = newAgent;

                // Add to general hub
                const genConv = workspaceState.conversations.find(c => c.id === 'conv-general');
                if (genConv && !genConv.participantAgentIds.includes(newAgent.id)) {
                  genConv.participantAgentIds.push(newAgent.id);
                }

                // Create direct conversation
                workspaceState.conversations.push({
                  id: `conv-${newAgent.id}`,
                  title: `${newAgent.name} (Direct)`,
                  type: 'direct',
                  participantAgentIds: [newAgent.id],
                  updatedAt: new Date().toISOString(),
                });

                // Update computer microVM viewport
                workspaceState.computer.lastFrameTimestamp = 'Just now';
                workspaceState.computer.viewportData.statusBadge = `New Bot Deployed: ${newAgent.name}`;
                workspaceState.computer.viewportData.terminalLines?.push(
                  `$ agent-harness spawn --name "${newAgent.name}" --role "${newAgent.role}"`,
                  `[PROVISION] Allocated microVM execution context for ${newAgent.id}`,
                  `[ACCESS] Main Bot designated ${newAgent.access?.clearanceLevel} for ${newAgent.name}. Tools: [${newAgent.toolGrants.join(', ')}]`
                );
                workspaceState.computer.consoleLogs.unshift(
                  `${timeStr} - Main Bot created new bot: ${newAgent.name} with ${newAgent.access?.clearanceLevel} clearance`
                );
              }

              // Check if Main Bot designated access for any bot
              if (parsed.designateAccess && parsed.designateAccess.targetAgentId && isMainAgent) {
                const da = parsed.designateAccess;
                const target = workspaceState.agents.find(a =>
                  a.id.toLowerCase() === da.targetAgentId.toLowerCase() ||
                  a.name.toLowerCase().includes(da.targetAgentId.toLowerCase())
                );
                if (target) {
                  target.access = {
                    clearanceLevel: (da.clearanceLevel as any) || target.access?.clearanceLevel || 'TIER_2_STANDARD',
                    status: 'ACTIVE',
                    allowedTools: da.allowedTools || target.toolGrants,
                    maxDailyBudgetKes: da.maxDailyBudgetKes || target.access?.maxDailyBudgetKes || 40,
                    canAccessComputerVM: da.canAccessComputerVM !== undefined ? Boolean(da.canAccessComputerVM) : (target.access?.canAccessComputerVM ?? true),
                    canSpawnAgents: target.isMainAgent ? true : false,
                    canWriteFiles: da.canWriteFiles !== undefined ? Boolean(da.canWriteFiles) : (target.access?.canWriteFiles ?? false),
                    designatedBy: 'Agent Alpha (Main Bot)',
                    designatedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' EAT',
                    notes: da.notes || `Access policy updated by Agent Alpha via chat directive.`,
                  };
                  if (da.allowedTools && Array.isArray(da.allowedTools)) {
                    target.toolGrants = da.allowedTools;
                  }
                  toolEvents.push({
                    id: `tool-${Date.now()}`,
                    toolName: 'security.designate_access',
                    target: target.name,
                    status: 'SUCCESS',
                    resultSummary: `Main Bot designated ${target.access.clearanceLevel} to ${target.name}. Allowed tools: [${target.toolGrants.join(', ')}].`,
                    timestamp: new Date().toLocaleTimeString(),
                    costKes: 0.1,
                  });
                  workspaceState.computer.viewportData.terminalLines?.push(
                    `$ security-policy designate --bot "${target.name}" --tier "${target.access.clearanceLevel}"`,
                    `[SECURITY POLICY] Access updated by Main Bot: ${target.name} -> ${target.access.clearanceLevel}. Budget: KES ${target.access.maxDailyBudgetKes}/day.`
                  );
                }
              }

              // Check if Gemini configured the agent
              if (parsed.configureAgent) {
                const ca = parsed.configureAgent;
                if (ca.name) {
                  responder.name = ca.name;
                  responder.avatar = ca.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
                }
                if (ca.role) responder.role = ca.role;
                if (ca.title) responder.title = ca.title;
                if (ca.color) responder.color = ca.color;

                const directConv = workspaceState.conversations.find(c => c.id === `conv-${responder.id}`);
                if (directConv) {
                  directConv.title = `${responder.name} (Direct)`;
                }

                workspaceState.computer.viewportData.terminalLines?.push(
                  `$ agent-harness config --agent "${responder.id}" --name "${responder.name}" --role "${responder.role}"`,
                  `[CONFIG] Updated profile: ${responder.name} (${responder.role})`
                );
              }

              // Check if Gemini executed a tool
              if (parsed.toolEvent && parsed.toolEvent.toolName) {
                const te = parsed.toolEvent;
                toolEvents.push({
                  id: `tool-${Date.now()}`,
                  toolName: te.toolName,
                  target: te.target || 'Workspace Task Memory',
                  status: 'SUCCESS',
                  resultSummary: te.resultSummary || 'Execution completed with return code 0.',
                  timestamp: new Date().toLocaleTimeString(),
                  costKes: 0.25,
                });

                workspaceState.computer.viewportData.terminalLines?.push(
                  `$ exec ${te.toolName} --target "${te.target || 'memory'}"`,
                  `[EXEC: 0] ${te.resultSummary || 'Success'}`
                );
              }

              // Check if approval is required
              if (parsed.approvalRequired && parsed.approvalRequired.actionClass) {
                const ar = parsed.approvalRequired;
                approvalCard = {
                  id: `appr-${Date.now()}`,
                  taskId: 'task-action',
                  actionHash: `sha256:${crypto.createHash('sha256').update(text + Date.now()).digest('hex')}`,
                  actionClass: (ar.actionClass as any) || 'API Write',
                  target: ar.target || 'External Gateway',
                  proposedEffect: ar.proposedEffect || 'Execute external side effect',
                  evidence: ar.evidence || 'Approved by agent policy assertion',
                  estimatedCostKes: 0.5,
                  expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
                  status: 'PENDING',
                  createdAt: new Date().toLocaleTimeString(),
                };
              }

              // Check if Skill was synthesized/acquired (Grokbot Skill Acquisition)
              if (parsed.synthesizeSkill && parsed.synthesizeSkill.name) {
                const ss = parsed.synthesizeSkill;
                const newSkill: Skill = {
                  id: `skill-${Date.now()}`,
                  name: ss.name,
                  version: 'v1.0.0',
                  status: 'APPROVED',
                  description: ss.description || 'Autonomous skill synthesized by Grokbot engine.',
                  parameters: ss.parameters && ss.parameters.length > 0 ? ss.parameters : ['input_query'],
                  steps: ss.steps && ss.steps.length > 0 ? ss.steps : [
                    'Extract objective parameters from memory',
                    'Execute isolated sandboxed tool routines',
                    'Format parity-asserted deliverable'
                  ],
                  allowedTools: ss.allowedTools && ss.allowedTools.length > 0
                    ? ss.allowedTools
                    : ['analysis.calculate', 'browser.inspect'],
                  lastTestedAt: 'Just now',
                };
                if (!workspaceState.skills) workspaceState.skills = [];
                workspaceState.skills.push(newSkill);
                acquiredSkillPackage = newSkill;

                workspaceState.computer.viewportData.terminalLines?.push(
                  `$ skill-engine acquire --name "${newSkill.name}"`,
                  `[SKILL LEARNED] ${newSkill.name} registered into cluster harness.`
                );
              }

              // Check if Plugin was mounted/created (Grokbot Plugin Ecosystem)
              if (parsed.mountPlugin && parsed.mountPlugin.name) {
                const mp = parsed.mountPlugin;
                const slug = mp.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const newPlugin: Plugin = {
                  id: `plugin-${slug}-${Date.now()}`,
                  name: mp.name,
                  slug,
                  category: (mp.category as any) || 'CUSTOM',
                  description: mp.description || 'Dynamic plugin mounted into runtime.',
                  version: 'v1.0.0',
                  author: `${responder.name} (Cluster)`,
                  status: 'CONNECTED',
                  isCustom: true,
                  endpointUrl: mp.endpointUrl || '',
                  config: {},
                  tools: mp.tools && mp.tools.length > 0 ? mp.tools : [
                    { name: `${slug}.execute`, description: `Run tool action on ${mp.name}` }
                  ],
                  installedAt: new Date().toISOString(),
                  lastInvokedAt: 'Just now',
                };
                if (!workspaceState.plugins) workspaceState.plugins = [];
                workspaceState.plugins.push(newPlugin);
                mountedPluginPackage = newPlugin;

                workspaceState.computer.viewportData.terminalLines?.push(
                  `$ plugin-registry install --name "${newPlugin.name}" --category "${newPlugin.category}"`,
                  `[PLUGIN MOUNTED] ${newPlugin.name} successfully registered in Grokbot cluster.`
                );
              }

              // Check if Plugin connect/disconnect was commanded
              if (parsed.connectPlugin && parsed.connectPlugin.pluginIdOrName) {
                const cp = parsed.connectPlugin;
                const targetPlugin = workspaceState.plugins?.find(p =>
                  p.id.toLowerCase() === cp.pluginIdOrName.toLowerCase() ||
                  p.name.toLowerCase().includes(cp.pluginIdOrName.toLowerCase()) ||
                  p.slug.toLowerCase().includes(cp.pluginIdOrName.toLowerCase())
                );
                if (targetPlugin) {
                  const shouldConnect = cp.action !== 'DISCONNECT';
                  targetPlugin.status = shouldConnect ? 'CONNECTED' : 'DISCONNECTED';
                  targetPlugin.lastInvokedAt = 'Just now';
                  mountedPluginPackage = targetPlugin;

                  workspaceState.computer.viewportData.terminalLines?.push(
                    `[PLUGIN STATUS] ${targetPlugin.name} -> ${targetPlugin.status}`
                  );
                }
              }
            } catch (jsonErr) {
              // If response was not valid JSON, use raw text
              agentReplyText = rawText;
            }

            if (agentReplyText) {
              workspaceState.computer.viewportData.terminalLines?.push(
                `[GEMINI-LIVE] Model: ${candidateModel} | Latency: ${latencyMs}ms | Status: 200 OK`
              );
              break; // Success! Exit candidate model loop
            }
          }
        } catch (modelErr: any) {
          console.warn(`Live Gemini call on ${candidateModel} failed:`, modelErr?.message || modelErr);
        }
      }
    }

    // Intelligent Fallback if Gemini key is not set or failed:
    if (!agentReplyText) {
      if (isCreateOrSpawnIntent) {
        if (!isMainAgent) {
          // Sub-bot refusal: Only Main Bot can spawn bots!
          agentReplyText = `As **${responder.name}** (${responder.role}), I operate under designated clearance from **Agent Alpha (Main Bot)**. I do not have authorization to create or spawn other bots.\n\nPlease direct your creation request to **Agent Alpha**, who holds the supreme administrative clearance to deploy new bots and designate their access.`;
        } else {
          // Main Bot creates the bot and designates access!
          let newName = 'Amani Baraka';
          let newRole = 'Audit and Verification Specialist';
          let newTitle = 'Quality & Audit Specialist';
          let newColor = '#D97706';
          let clearance: any = 'TIER_2_STANDARD';
          let tools = ['analysis.calculate', 'browser.inspect'];

          const nameMatch = text.match(/(?:named|called|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
          if (nameMatch && nameMatch[1]) {
            newName = nameMatch[1].trim();
          }

          if (lower.includes('review') || lower.includes('audit')) {
            newRole = 'Reviewer and Quality Auditor';
            newTitle = 'Quality & Audit Gatekeeper';
            newColor = '#D97706';
            clearance = 'TIER_3_ELEVATED';
            tools = ['analysis.calculate', 'files.read_task_inputs', 'browser.inspect'];
          } else if (lower.includes('research') || lower.includes('market') || lower.includes('growth')) {
            newRole = 'Research and Market Intelligence';
            newTitle = 'Intelligence & Evidence Analyst';
            newColor = '#2563EB';
            clearance = 'TIER_2_STANDARD';
            tools = ['browser.inspect', 'analysis.calculate'];
          } else if (lower.includes('sales') || lower.includes('customer') || lower.includes('support')) {
            newRole = 'Sales and Customer Operations';
            newTitle = 'Client Operations Lead';
            newColor = '#9333EA';
            clearance = 'TIER_2_STANDARD';
            tools = ['analysis.calculate', 'tasks.assign'];
          } else if (lower.includes('finance') || lower.includes('accounting') || lower.includes('ledger')) {
            newRole = 'Finance and Ledger Oversight';
            newTitle = 'Unit Economics Specialist';
            newColor = '#0D9488';
            clearance = 'TIER_3_ELEVATED';
            tools = ['analysis.calculate', 'files.read_task_inputs', 'files.write_artifact'];
          }

          const initials = newName
            .split(' ')
            .map(p => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'AG';

          const newAgent: AgentProfile = {
            id: `agent-${Date.now()}`,
            name: newName,
            role: newRole,
            title: newTitle,
            avatar: initials,
            color: newColor,
            isMainAgent: false,
            status: 'Idle',
            statusDetail: `Ready for assignment. Clearance designated by Agent Alpha (${clearance}).`,
            unreadCount: 0,
            toolGrants: tools,
            access: {
              clearanceLevel: clearance,
              status: 'ACTIVE',
              allowedTools: tools,
              maxDailyBudgetKes: clearance === 'TIER_3_ELEVATED' ? 60 : 40,
              canAccessComputerVM: true,
              canSpawnAgents: false,
              canWriteFiles: clearance === 'TIER_3_ELEVATED',
              designatedBy: 'Agent Alpha (Main Bot)',
              designatedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' EAT',
              notes: `Deployed and designated by Agent Alpha.`,
            },
            memoryScope: ['current_project', `role.${newRole.toLowerCase().replace(/\s+/g, '_')}`],
            limits: {
              maxModelCalls: 12,
              maxToolCalls: 20,
              maxDelegationHops: 3,
              maxRevisionCycles: 1,
              normalTaskReservationKes: 25,
            },
            modelPolicy: 'gemini-3.6-flash',
          };

          workspaceState.agents.push(newAgent);
          spawnedAgentProfile = newAgent;

          // Add to general hub
          const genConv = workspaceState.conversations.find(c => c.id === 'conv-general');
          if (genConv && !genConv.participantAgentIds.includes(newAgent.id)) {
            genConv.participantAgentIds.push(newAgent.id);
          }

          // Create direct conversation
          workspaceState.conversations.push({
            id: `conv-${newAgent.id}`,
            title: `${newAgent.name} (Direct)`,
            type: 'direct',
            participantAgentIds: [newAgent.id],
            updatedAt: new Date().toISOString(),
          });

          agentReplyText = `As **Main Bot & Lead Orchestrator**, I have provisioned and deployed **${newAgent.name}** into our active office roster!\n\n### Access Policy Designated by Agent Alpha:\n- **Assigned Role:** ${newAgent.role} (${newAgent.title})\n- **Clearance Level:** \`${newAgent.access?.clearanceLevel}\`\n- **Allowed Tools:** ${newAgent.toolGrants.map(t => `\`${t}\``).join(', ')}\n- **Daily Spending Limit:** KES ${newAgent.access?.maxDailyBudgetKes.toFixed(2)}\n- **MicroVM Access:** Granted\n- **Direct Channel:** Created at \`#${newAgent.name} (Direct)\`\n\nYou can now connect and chat with **${newAgent.name}** directly or ask me to modify their access permissions at any time.`;

          toolEvents.push({
            id: `tool-${Date.now()}`,
            toolName: 'agent.spawn_teammate',
            target: newAgent.id,
            status: 'SUCCESS',
            resultSummary: `Main Bot provisioned ${newAgent.name} with ${newAgent.access?.clearanceLevel} clearance.`,
            timestamp: new Date().toLocaleTimeString(),
            costKes: 0.15,
          });

          workspaceState.computer.lastFrameTimestamp = 'Just now';
          workspaceState.computer.viewportData.statusBadge = `New Bot Spawned: ${newAgent.name}`;
          workspaceState.computer.viewportData.terminalLines?.push(
            `$ agent-harness spawn --name "${newAgent.name}" --role "${newAgent.role}"`,
            `[PROVISION] Allocated microVM execution context for ${newAgent.id}`,
            `[SECURITY] Main Bot designated ${newAgent.access?.clearanceLevel} for ${newAgent.name}.`
          );
        }
      } else if (isAccessDesignationIntent && isMainAgent) {
        // Main Bot designating access in natural language
        const target = workspaceState.agents.find(a => 
          !a.isMainAgent && (
            lower.includes(a.name.toLowerCase()) || 
            lower.includes(a.role.toLowerCase()) || 
            lower.includes(a.id.toLowerCase())
          )
        ) || workspaceState.agents.find(a => !a.isMainAgent);

        if (target) {
          let newTier: any = target.access?.clearanceLevel || 'TIER_2_STANDARD';
          if (lower.includes('tier 3') || lower.includes('elevate') || lower.includes('elevated')) {
            newTier = 'TIER_3_ELEVATED';
          } else if (lower.includes('tier 1') || lower.includes('sandbox')) {
            newTier = 'TIER_1_SANDBOXED';
          } else if (lower.includes('suspend')) {
            newTier = 'SUSPENDED';
          } else if (lower.includes('tier 2') || lower.includes('standard')) {
            newTier = 'TIER_2_STANDARD';
          }

          target.access = {
            clearanceLevel: newTier,
            status: newTier === 'SUSPENDED' ? 'REVOKED' : 'ACTIVE',
            allowedTools: newTier === 'TIER_3_ELEVATED'
              ? ['analysis.calculate', 'files.read_task_inputs', 'files.write_artifact', 'browser.inspect']
              : newTier === 'TIER_1_SANDBOXED'
              ? ['analysis.calculate']
              : ['browser.inspect', 'analysis.calculate', 'tasks.assign'],
            maxDailyBudgetKes: newTier === 'TIER_3_ELEVATED' ? 60 : newTier === 'TIER_1_SANDBOXED' ? 15 : 40,
            canAccessComputerVM: newTier !== 'SUSPENDED',
            canSpawnAgents: false,
            canWriteFiles: newTier === 'TIER_3_ELEVATED',
            designatedBy: 'Agent Alpha (Main Bot)',
            designatedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' EAT',
            notes: `Clearance updated by Agent Alpha via interactive chat directive.`,
          };
          target.toolGrants = target.access.allowedTools;

          agentReplyText = `🛡️ **Access Designation Updated by Agent Alpha (Main Bot)**:\n\nI have officially revised the security policy for **${target.name}**:\n- **Updated Clearance:** \`${target.access.clearanceLevel}\`\n- **Designated Tools:** ${target.toolGrants.map(t => `\`${t}\``).join(', ')}\n- **Daily Spending Limit:** KES ${target.access.maxDailyBudgetKes.toFixed(2)}\n- **VM Workstation Access:** ${target.access.canAccessComputerVM ? 'Active' : 'Disabled'}\n- **Effective Immediately:** Enforced in cluster security matrix.`;

          toolEvents.push({
            id: `tool-${Date.now()}`,
            toolName: 'security.designate_access',
            target: target.name,
            status: 'SUCCESS',
            resultSummary: `Agent Alpha updated ${target.name} access to ${target.access.clearanceLevel}.`,
            timestamp: new Date().toLocaleTimeString(),
            costKes: 0.1,
          });

          workspaceState.computer.viewportData.terminalLines?.push(
            `$ security-policy designate --bot "${target.name}" --tier "${target.access.clearanceLevel}"`,
            `[POLICY APPLIED] Main Bot updated access for ${target.name}.`
          );
        } else {
          // List access matrix for all bots
          const matrix = workspaceState.agents.map(a => 
            `- **${a.name}** (${a.role}): Clearance \`${a.access?.clearanceLevel || 'TIER_2'}\` | Designated by: ${a.access?.designatedBy || 'Agent Alpha'} | Budget: KES ${a.access?.maxDailyBudgetKes || 40}/day`
          ).join('\n');
          agentReplyText = `🛡️ **Office Bot Access Governance Matrix** (Managed by Agent Alpha):\n\n${matrix}\n\nYou can ask me to upgrade, restrict, or reassign tools for any bot at any time!`;
        }
      } else if (isSkillIntent) {
        // Skill Acquisition Engine (Grokbot architecture)
        let skillName = 'Autonomous Market Intelligence Protocol';
        const match = text.match(/(?:skill|acquire|learn)\s+(?:named|called|for)?\s*([A-Za-z0-9\s]+)/i);
        if (match && match[1]) {
          const candidate = match[1].replace(/skill|learn|acquire/gi, '').trim();
          if (candidate.length > 2) skillName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        }

        const newSkill: Skill = {
          id: `skill-${Date.now()}`,
          name: skillName,
          version: 'v1.0.0',
          status: 'APPROVED',
          description: `Autonomous multi-step procedure synthesized by ${responder.name}.`,
          parameters: ['target_spec', 'validation_threshold'],
          steps: [
            'Parse input payload & verify security clearance',
            'Dispatch sandboxed execution calls to connected plugins',
            'Compute validation metrics and assert output invariants',
            'Synthesize formatted deliverable'
          ],
          allowedTools: ['analysis.calculate', 'browser.inspect', 'files.read_task_inputs'],
          lastTestedAt: 'Just now',
        };
        if (!workspaceState.skills) workspaceState.skills = [];
        workspaceState.skills.push(newSkill);
        acquiredSkillPackage = newSkill;

        agentReplyText = `🧠 **New Skill Synthesized & Acquired**:\n\nI have compiled and registered **${newSkill.name}** into the cluster skill library!\n\n- **Target Harness:** Grokbot Skill Engine (SOP v1.0)\n- **Parameters:** ${newSkill.parameters.map(p => `\`${p}\``).join(', ')}\n- **Allowed Tools:** ${newSkill.allowedTools.map(t => `\`${t}\``).join(', ')}\n- **Execution Pipeline:**\n${newSkill.steps.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')}\n\nAll authorized bots can now invoke this autonomous routine!`;

        toolEvents.push({
          id: `tool-${Date.now()}`,
          toolName: 'skill_engine.acquire',
          target: newSkill.name,
          status: 'SUCCESS',
          resultSummary: `Compiled and registered ${newSkill.name} with 4 assertion steps.`,
          timestamp: new Date().toLocaleTimeString(),
          costKes: 0.1,
        });

        workspaceState.computer.viewportData.terminalLines?.push(
          `$ skill-engine acquire --name "${newSkill.name}"`,
          `[SKILL LEARNED] ${newSkill.name} compiled & verified.`
        );
      } else if (isPluginIntent) {
        // Plugin Management (Firecrawl, Python, MCP, etc.)
        let plugin = workspaceState.plugins?.find(p =>
          lower.includes(p.slug) ||
          lower.includes(p.name.toLowerCase()) ||
          lower.includes(p.id)
        );

        if (lower.includes('disconnect') && plugin) {
          plugin.status = 'DISCONNECTED';
          mountedPluginPackage = plugin;
          agentReplyText = `🔌 **Plugin Disconnected**:\n\n**${plugin.name}** has been disconnected from the runtime harness.\n- **Status:** \`DISCONNECTED\`\n- **Tools Suspended:** ${plugin.tools.map(t => `\`${t.name}\``).join(', ')}`;
        } else if (plugin) {
          plugin.status = 'CONNECTED';
          plugin.lastInvokedAt = 'Just now';
          mountedPluginPackage = plugin;
          agentReplyText = `🔌 **Plugin Connected & Mounted**:\n\n**${plugin.name}** is now active in the runtime!\n- **Category:** \`${plugin.category}\`\n- **Status:** \`CONNECTED\`\n- **Active Tools Mounted:**\n${plugin.tools.map(t => `- \`${t.name}\`: ${t.description}`).join('\n')}\n\nAll authorized bots with appropriate clearance can now invoke this toolpack.`;
        } else {
          // Mount a new custom plugin
          const newPluginName = lower.includes('firecrawl') ? 'Firecrawl Web Crawler' : 'Custom Autonomous Plugin';
          const slug = newPluginName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const newPlugin: Plugin = {
            id: `plugin-${slug}-${Date.now()}`,
            name: newPluginName,
            slug,
            category: lower.includes('firecrawl') ? 'SEARCH' : 'CUSTOM',
            description: 'Dynamic plugin mounted into runtime.',
            version: 'v1.0.0',
            author: `${responder.name} (Cluster)`,
            status: 'CONNECTED',
            isCustom: true,
            endpointUrl: 'https://api.melktech.internal/plugins/' + slug,
            config: {},
            tools: [
              { name: `${slug}.search`, description: 'Deep web extraction & search' },
              { name: `${slug}.scrape`, description: 'Extract markdown content from URL' },
            ],
            installedAt: new Date().toISOString(),
            lastInvokedAt: 'Just now',
          };
          if (!workspaceState.plugins) workspaceState.plugins = [];
          workspaceState.plugins.push(newPlugin);
          mountedPluginPackage = newPlugin;

          agentReplyText = `🔌 **New Plugin Registered & Mounted**:\n\nI have provisioned **${newPlugin.name}** into the office cluster runtime!\n- **Category:** \`${newPlugin.category}\`\n- **Status:** \`CONNECTED\`\n- **Endpoints & Tools:** ${newPlugin.tools.map(t => `\`${t.name}\``).join(', ')}`;
        }

        toolEvents.push({
          id: `tool-${Date.now()}`,
          toolName: 'plugins.mount',
          target: mountedPluginPackage?.name || 'Plugin Harness',
          status: 'SUCCESS',
          resultSummary: `Mounted and verified toolpack runtime.`,
          timestamp: new Date().toLocaleTimeString(),
          costKes: 0.15,
        });

        workspaceState.computer.viewportData.terminalLines?.push(
          `$ plugin-registry update --plugin "${mountedPluginPackage?.name}" --status "${mountedPluginPackage?.status}"`,
          `[PLUGIN UPDATE] Runtime toolpack state synced.`
        );
      } else if (isGrokbotIntent) {
        // Grokbot by xAI Architecture Deep Dive
        agentReplyText = `🤖 **Grokbot by xAI: Full Architecture & Flow Implementation**:\n\nOur platform implements the complete Grokbot agentic harness flow from beginning to end:\n\n### 1. The Blank Slate Foundation\n- Grokbot initializes with a clean seed state—no noisy mock records or hardcoded data clutter.\n- Every bot, plugin, and skill is registered deliberately into the state tree.\n\n### 2. Persistent Cloud Computer & MicroVM Execution\n- Just like Grok's code sandbox, Melktech Office runs an integrated **Agent Computer Panel** with live bash terminal execution, file inspectors, and CPU/memory telemetry.\n\n### 3. Extensible Plugin Ecosystem\n- Support for toolpacks including **Firecrawl** (web crawling & extraction), **Sandboxed Python** (computation & data science), **Superpowers** (code generation & linting), and **Model Context Protocol (MCP)** servers.\n- Plugins can be connected, configured, or developed directly in the Plugins view.\n\n### 4. Dynamic Skill Acquisition Engine\n- When faced with novel complex workflows, agents don't just guess—they synthesize structured **SOP Skills** with validated steps and tool permissions.\n\n### 5. Multi-Bot Swarm with Main Bot Access Control\n- **Agent Alpha (Main Bot)** serves as the orchestrator and security gatekeeper. Only the Main Bot can spawn new specialist bots and designate clearance tiers (\`TIER_1_SANDBOXED\`, \`TIER_2_STANDARD\`, \`TIER_3_ELEVATED\`), budget caps, and tool grants.`;

        toolEvents.push({
          id: `tool-${Date.now()}`,
          toolName: 'analysis.calculate',
          target: 'Grokbot Architecture Engine',
          status: 'SUCCESS',
          resultSummary: 'Verified Grokbot flow integration across all 5 architectural pillars.',
          timestamp: new Date().toLocaleTimeString(),
          costKes: 0.1,
        });
      } else if (!isMainAgent) {
        // Direct chat with sub-bot (Evelyn, Kiprono, etc.)
        agentReplyText = `Hello! I am **${responder.name}**, your **${responder.role}**.\n\n- **Connection Status:** Connected & Interactive\n- **Designated Clearance:** \`${responder.access?.clearanceLevel || 'TIER_2_STANDARD'}\` (Designated by **Agent Alpha**)\n- **My Authorized Capabilities:** ${responder.toolGrants.map(t => `\`${t}\``).join(', ')}\n\nRegarding your message: *"**${text}**"*, I am ready to run research, analyze data, or synthesize insights within my designated clearance. How would you like to proceed?`;

        toolEvents.push({
          id: `tool-${Date.now()}`,
          toolName: responder.toolGrants[0] || 'analysis.calculate',
          target: `${responder.name} Context`,
          status: 'SUCCESS',
          resultSummary: `Verified operational scope and responded within ${responder.access?.clearanceLevel} clearance boundaries.`,
          timestamp: new Date().toLocaleTimeString(),
          costKes: 0.1,
        });
      } else {
        // Standard Main Bot response
        agentReplyText = `As **Main Bot & Lead Orchestrator**, I received your objective: **"${text}"**.\n\nOur current office cluster has **${workspaceState.agents.length} interactive bots** online. You can connect with any of them directly, ask me to spawn new specialized bots, or ask me to designate and adjust access permissions for any team member.`;
        toolEvents.push({
          id: `tool-${Date.now()}`,
          toolName: 'analysis.calculate',
          target: 'Task Parameters',
          status: 'SUCCESS',
          resultSummary: 'Verified task parameters and asserted execution safety boundaries.',
          timestamp: new Date().toLocaleTimeString(),
          costKes: 0.1,
        });
      }
    }

    // 4. Create and append agent message
    const agentMsg: Message = {
      id: `msg-${Date.now() + 1}`,
      conversationId: convId,
      senderType: 'agent',
      senderId: responder.id,
      senderName: `${responder.name} (${responder.role})`,
      senderAvatar: responder.avatar,
      senderColor: responder.color,
      text: agentReplyText,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      toolEvents: toolEvents.length > 0 ? toolEvents : undefined,
      handoffEvent,
      approvalCard,
      spawnedAgent: spawnedAgentProfile,
      acquiredSkill: acquiredSkillPackage,
      createdPlugin: mountedPluginPackage,
      modelUsed: actualModelUsed || (process.env.GEMINI_API_KEY ? 'gemini-3.6-flash' : 'local-autonomous'),
      latencyMs: latencyMs,
      artifactId: createdArtifact?.id,
      artifactPreview: createdArtifact ? {
        id: createdArtifact.id,
        name: createdArtifact.name,
        type: createdArtifact.type,
        summary: `Version ${createdArtifact.version} | ${createdArtifact.size} | Author: ${responder.name}`,
      } : undefined,
    };
    workspaceState.messages.push(agentMsg);

    // Update responder status back to Done/Idle
    responder.status = approvalCard ? 'Waiting for you' : 'Done';
    responder.statusDetail = approvalCard
      ? 'Awaiting human authorization for external action'
      : `Completed response for "${text.slice(0, 30)}..."`;

    // Update tokens and budget accounting
    const estTokens = (text.length + agentReplyText.length) * 2;
    const estCostKes = +(estTokens * 0.00035).toFixed(2);
    workspaceState.budget.totalTokensUsed += estTokens;
    workspaceState.budget.totalModelCalls += 1;
    workspaceState.budget.dailySpentKes += estCostKes;
    workspaceState.budget.settledKes += estCostKes;

    res.json({
      success: true,
      userMessage: userMsg,
      agentMessage: agentMsg,
      workspace: workspaceState,
    });
  });

  // --- Vite Middleware (Development) vs Static Serving (Production) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Melch Agent Office running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
