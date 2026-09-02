// Kernel & Multi-Provider Engine
export * from './kernel/ai-provider.service';
export * from './kernel/ai-company-config.service';

// Memory & Real-Time Context Aggregator (Redis-Backed Mem0 + Vector Memory)
export * from './memory/mem0-memory.service';
export * from './memory/context-aggregator.service';

// LangChain Tool Calling & Deterministic Agent Execution
export * from './tools/ai-tool-registry';
export * from './tools/builtin-tools';
export * from './tools/ai-agent-executor';

// Conversational AI & Entity Search
export * from './chat/ai-chat.service';
export * from './chat/ai-entity-search.service';

// Document Intelligence & Universal AST Builders
export * from './documents/ai-document-architect.service';
export * from './documents/ai-document-chat.service';
export * from './builders';

// Content Calendar & Marketing
export * from './content/ai-content-calendar.service';

// Analytics & Automation & CRM
export * from './analytics/ai-business-insights.service';
export * from './automation/ai-automation.service';
export * from './crm/ai-crm-copilot.service';

// Communications
export * from './communications/ai-email-and-meeting.service';

// Background Processing, Vector Store & Cron
export * from './background/ai-vector-store.service';
export * from './background/ai-jobs.service';
export * from './background/ai-cron.service';
