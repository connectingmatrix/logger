import { Executor } from '@workflow/executor';
import { recordAgentRunEvent } from '@connectingmatrix/ai-agents/services/ai-agents/clickhouse/runtime/agent-clickhouse-run-events';
import type { Server as SocketIOServer } from 'socket.io';

export type RuntimeEventKind =
  | 'agent.run'
  | 'agent.project'
  | 'agent.data_analysis'
  | 'workflow.run'
  | 'swarm.worker'
  | 'process.metric'
  | 'log.line'
  | 'approval.request'
  | 'approval.decision'
  | 'dataset.ingestion';

export type AgentIngestionProgressEvent = {
  ingestionJobId: string;
  processId: string;
  userId: string;
  agentId: string | null;
  parentScopeId: string | null;
  scopeType: 'AGENT_INGESTION';
  stage: string;
  percent: number;
  processedItems: number;
  totalItems: number;
  cpu: number;
  ramMb: number;
  timestamp: string;
};

export type AgentIngestionLogEvent = {
  ingestionJobId: string;
  processId: string;
  userId: string;
  agentId: string | null;
  parentScopeId: string | null;
  scopeType: 'AGENT_INGESTION';
  level: string;
  message: string;
  iteration: number;
  cpu: number;
  ramMb: number;
  timestamp: string;
};

export type RuntimeEventPayload = {
  kind: RuntimeEventKind;
  status: string;
  processId?: string | null;
  ingestionJobId?: string | null;
  scopeType?: string | null;
  parentScopeId?: string | null;
  userId?: string | null;
  agentId?: string | null;
  workflowId?: string | null;
  swarmId?: string | null;
  workerId?: string | null;
  runId?: string | null;
  iteration?: number | null;
  pid?: number | null;
  cpu?: number | null;
  cpuPercent?: number | null;
  ramMb?: number | null;
  ramBytes?: number | null;
  logLevel?: string | null;
  message?: string | null;
  timestamp: string;
};

export const runtimeUserRoom = (userId: string) => Executor.userRoom(userId);
export const runtimeAgentRoom = (agentId: string) => Executor.catalogRoom('runtime', `agent:${agentId}`);
export const runtimeSwarmRoom = (swarmId: string) => Executor.catalogRoom('runtime', `swarm:${swarmId}`);
export const runtimeSocketRootRoom = () => 'runtime:root';
export const runtimeSocketUserRoom = (userId: string) => `runtime:user:${userId}`;
export const runtimeSocketAgentRoom = (agentId: string) => `runtime:agent:${agentId}`;
export const runtimeSocketSwarmRoom = (swarmId: string) => `runtime:swarm:${swarmId}`;

const publishRuntime = Executor.publish as (room: string, eventName: string, payload: RuntimeEventPayload) => void;
let runtimeSocketServer: SocketIOServer | null = null;

export function setRuntimeSocketServer(io: SocketIOServer): void {
  runtimeSocketServer = io;
}

function emitSocketRuntime(room: string, eventName: string, payload: unknown): void {
  runtimeSocketServer?.to(room).emit(eventName, payload);
}

function emitRuntimeSocketEvent(room: string, event: RuntimeEventPayload): void {
  emitSocketRuntime(room, 'runtime:event', { subscriptionId: room, event });
}

export function emitRuntimeEvent(event: RuntimeEventPayload): void {
  void recordAgentRunEvent({
    ...event,
    pid: event.pid ? String(event.pid) : null,
    cpuPercent: event.cpuPercent || event.cpu || null,
    ramBytes: event.ramBytes || (event.ramMb ? event.ramMb * 1024 * 1024 : null),
  }).catch(() => undefined);
  if (event.userId) publishRuntime(runtimeUserRoom(event.userId), 'runtime:event', event);
  if (event.agentId) publishRuntime(runtimeAgentRoom(event.agentId), 'runtime:event', event);
  if (event.swarmId) publishRuntime(runtimeSwarmRoom(event.swarmId), 'runtime:event', event);
  emitRuntimeSocketEvent(runtimeSocketRootRoom(), event);
  if (event.userId) emitRuntimeSocketEvent(runtimeSocketUserRoom(event.userId), event);
  if (event.agentId) emitRuntimeSocketEvent(runtimeSocketAgentRoom(event.agentId), event);
  if (event.swarmId) emitRuntimeSocketEvent(runtimeSocketSwarmRoom(event.swarmId), event);
}

function emitAgentIngestionSocket(
  eventName: 'agent:ingestion:progress' | 'agent:ingestion:log',
  payload: AgentIngestionProgressEvent | AgentIngestionLogEvent,
) {
  emitSocketRuntime(runtimeSocketRootRoom(), eventName, payload);
  emitSocketRuntime(runtimeSocketUserRoom(payload.userId), eventName, payload);
  if (payload.agentId) emitSocketRuntime(runtimeSocketAgentRoom(payload.agentId), eventName, payload);
}

export function emitAgentIngestionProgress(payload: AgentIngestionProgressEvent): void {
  emitAgentIngestionSocket('agent:ingestion:progress', payload);
}

export function emitAgentIngestionLog(payload: AgentIngestionLogEvent): void {
  emitAgentIngestionSocket('agent:ingestion:log', payload);
}
