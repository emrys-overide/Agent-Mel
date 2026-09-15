export type AgentStatus = 
  | 'Idle' 
  | 'Working' 
  | 'Waiting for you' 
  | 'Waiting for connection' 
  | 'Blocked' 
  | 'Paused' 
  | 'Done';

export type TaskStatus = 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'WAITING_INPUT' 
  | 'WAITING_APPROVAL' 
  | 'WAITING_NETWORK' 
  | 'VERIFYING' 
  | 'SUCCEEDED' 
  | 'FAILED' 
  | 'CANCELLED';

export type ActionStatus = 
  | 'PROPOSED' 
  | 'AUTHORIZED' 
  | 'DISPATCHED' 
  | 'CONFIRMED' 
  | 'UNKNOWN_OUTCOME' 
  | 'REJECTED';

export type SkillStatus = 'DRAFT' | 'TESTED' | 'APPROVED' | 'RETIRED';

export type AccessClearanceLevel = 
  | 'ORCHESTRATOR'     // Main Bot - Supreme authority (creates bots, designates access)
  | 'TIER_3_ELEVATED'  // Elevated - File writes, external API, routine dispatch
  | 'TIER_2_STANDARD'  // Standard - Calculations, browser inspect, task reading
  | 'TIER_1_SANDBOXED' // Sandboxed - Read-only chat & inquiry
  | 'SUSPENDED';       // Suspended - Halted by Main Bot

export interface BotAccessDesignation {
  clearanceLevel: AccessClearanceLevel;
  status: 'ACTIVE' | 'AUDIT_HOLD' | 'REVOKED';
  allowedTools: string[];
  maxDailyBudgetKes: number;
  canAccessComputerVM: boolean;
  canSpawnAgents: boolean;
  canWriteFiles: boolean;
  designatedBy: string; // e.g. "Agent Alpha (Main Bot)"
  designatedAt: string;
  notes?: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  title: string;
  avatar: string;
  color: string;
  isMainAgent?: boolean;
  status: AgentStatus;
  statusDetail?: string;
  currentTaskId?: string;
  unreadCount: number;
  toolGrants: string[];
  access?: BotAccessDesignation;
  memoryScope: string[];
  limits: {
    maxModelCalls: number;
    maxToolCalls: number;
    maxDelegationHops: number;
    maxRevisionCycles: number;
    normalTaskReservationKes: number;
  };
  modelPolicy: string;
}

export interface Task {
  id: string;
  title: string;
  objective: string;
  ownerAgentId: string;
  status: TaskStatus;
  acceptanceCriteria: string[];
  parentTaskId?: string;
  budgetAllocationKes: number;
  spentBudgetKes: number;
  remainingHops: number;
  fencingToken: string;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
}

export interface ToolEvent {
  id: string;
  toolName: string;
  target?: string;
  inputs?: Record<string, any>;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  resultSummary: string;
  timestamp: string;
  costKes?: number;
}

export interface HandoffEvent {
  fromAgentId: string;
  toAgentId: string;
  reason: string;
  taskObjective: string;
  remainingBudgetKes: number;
  timestamp: string;
}

export interface ApprovalCardData {
  id: string;
  taskId: string;
  actionHash: string;
  actionClass: 'Send Email' | 'Publish Artifact' | 'API Write' | 'Budget Expansion' | 'Run External Process';
  target: string;
  proposedEffect: string;
  proposedAction?: string;
  evidence: string;
  estimatedCostKes: number;
  expiry: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
  reviewedAt?: string;
  reviewer?: string;
  riskLevel?: string;
  inputHash?: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: 'report' | 'csv' | 'code' | 'json';
  version: number;
  content: string;
  sourceRefs: string[];
  authorAgentId: string;
  size: string;
  createdAt: string;
  acceptanceState: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export type PluginStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONFIGURING' | 'ERROR';
export type PluginCategory = 'SEARCH' | 'CODE' | 'INFRASTRUCTURE' | 'INTEGRATION' | 'MCP_SERVER' | 'CUSTOM';

export interface PluginTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface Plugin {
  id: string;
  name: string;
  slug: string;
  category: PluginCategory;
  description: string;
  version: string;
  author: string;
  status: PluginStatus;
  icon?: string;
  config?: Record<string, string>;
  tools: PluginTool[];
  installedAt: string;
  lastInvokedAt?: string;
  isCustom?: boolean;
  endpointUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'user' | 'agent' | 'system';
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  senderColor?: string;
  text: string;
  timestamp: string;
  replyToId?: string;
  toolEvents?: ToolEvent[];
  handoffEvent?: HandoffEvent;
  approvalCard?: ApprovalCardData;
  spawnedAgent?: AgentProfile;
  acquiredSkill?: Skill;
  createdPlugin?: Plugin;
  modelUsed?: string;
  latencyMs?: number;
  artifactId?: string;
  artifactPreview?: {
    id: string;
    name: string;
    type: string;
    summary: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  type: 'direct' | 'project';
  participantAgentIds: string[];
  activeTaskId?: string;
  updatedAt: string;
}

export interface TableRowData {
  id: string;
  channel: string;
  amount: string;
  status: string;
  flagged?: boolean;
}

export interface ComputerSession {
  status: 'ONLINE' | 'PAUSED' | 'HUMAN_TAKEOVER';
  activeApp: 'Browser' | 'Terminal' | 'Spreadsheet' | 'Reconciliation Engine';
  currentUrl: string;
  lastFrameTimestamp: string;
  exclusiveController: 'bot' | 'human';
  activeBotId?: string;
  screenTitle: string;
  viewportData: {
    heading: string;
    url: string;
    statusBadge: string;
    tableColumns?: string[];
    tableRows?: TableRowData[];
    terminalLines?: string[];
    highlightedRowIndex?: number;
    summaryStats?: { label: string; value: string }[];
  };
  consoleLogs: string[];
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  ownerAgentId: string;
  scheduleCron: string;
  scheduleDisplay: string;
  timeZone: string;
  enabled: boolean;
  skillVersion: string;
  lastRunAt?: string;
  nextRunAt: string;
  concurrencyPolicy: 'COALESCE' | 'SKIP' | 'RUN_LATEST';
  costCeilingKes: number;
  recentRuns: {
    id: string;
    timestamp: string;
    status: 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
    durationMs: number;
    costKes: number;
    summary: string;
  }[];
}

export interface Skill {
  id: string;
  name: string;
  version: string;
  status: SkillStatus;
  description: string;
  parameters: string[];
  steps: string[];
  allowedTools: string[];
  lastTestedAt?: string;
}

export interface CompanyBudget {
  totalCapitalCeilingKes: number; // e.g. 28,500
  testPoolKes: number; // e.g. 5,000
  dailyCapKes: number; // e.g. 150
  dailySpentKes: number;
  reservedKes: number;
  settledKes: number;
  totalTokensUsed: number;
  totalModelCalls: number;
  totalToolCalls: number;
}

export interface CompanyMetrics {
  activeJobsCount: number;
  completedTasksCount: number;
  humanSupervisionHoursSaved: number;
  contributionMarginKes: number;
  currency: string;
  activeTemplate: string;
}

export interface WorkspaceState {
  companyName: string;
  companyTemplate: string;
  agents: AgentProfile[];
  conversations: Conversation[];
  activeConversationId: string;
  messages: Message[];
  tasks: Task[];
  artifacts: Artifact[];
  computer: ComputerSession;
  routines: Routine[];
  skills: Skill[];
  plugins: Plugin[];
  budget: CompanyBudget;
  metrics: CompanyMetrics;
}
