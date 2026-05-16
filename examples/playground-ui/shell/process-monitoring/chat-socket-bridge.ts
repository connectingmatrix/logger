import { CHAT_SOCKET_EVENT_TYPES, type ChatSocketEventType } from '@giga/dataloader/client/legacy/socket/chat/page-events.socket';
import type { ChatExecutionMode } from '@giga/dataloader/client/legacy/socket/chat/types.socket';
import { processMonitorRealtime } from './realtimeProcessStore';

type RuntimeMode = ChatExecutionMode | 'DEFAULT';
type RuntimeChatEvent = {
    type: ChatSocketEventType;
    requestId?: string | null;
    chatId?: string | null;
    chatMode?: RuntimeMode | null;
    stage?: string;
    message?: string;
};

type RuntimeState = { processId: string; mode: RuntimeMode; chatId: string | null };

const modeFrom = (value: RuntimeMode | null | undefined): RuntimeMode => (value === 'AGENT' || value === 'WORKFLOW' || value === 'SWARM' ? value : 'DEFAULT');
const isLifecycleEvent = (type: string): boolean => type === CHAT_SOCKET_EVENT_TYPES.requestStart || type === CHAT_SOCKET_EVENT_TYPES.requestProgress || type === CHAT_SOCKET_EVENT_TYPES.requestDone || type === CHAT_SOCKET_EVENT_TYPES.requestError;
const status = (type: string): 'running' | 'stopped' => (type === CHAT_SOCKET_EVENT_TYPES.requestDone || type === CHAT_SOCKET_EVENT_TYPES.requestError ? 'stopped' : 'running');
const modeLabel = (mode: RuntimeMode): string => (mode === 'AGENT' ? 'AI Agent' : mode === 'WORKFLOW' ? 'Workflow' : mode === 'SWARM' ? 'Swarm' : 'Default AI');
const processIdFor = (requestId: string, chatId: string | null, mode: RuntimeMode): string => (chatId ? `chat:${mode.toLowerCase()}:${chatId}` : `chat:${mode.toLowerCase()}:${requestId}`);
const labelFor = (mode: RuntimeMode, chatId: string | null, requestId: string): string => `${modeLabel(mode)} execution (${chatId || requestId})`;
const parentFor = (mode: RuntimeMode): string => (mode === 'WORKFLOW' ? 'process-group:workflows' : 'process-group:agents');
const logLevel = (type: string): 'ERROR' | 'INFO' | 'WARN' | 'DEBUG' => (type === CHAT_SOCKET_EVENT_TYPES.requestError ? 'ERROR' : 'INFO');
const fallback = (mode: RuntimeMode, stage: string, requestId: string): string => (stage ? `${modeLabel(mode)}: ${stage}` : `${modeLabel(mode)} request ${requestId}`);
const pidFor = (value: string): number => {
    let seed = 0;
    for (let index = 0; index < value.length; index += 1) {
        seed = (seed * 31 + value.charCodeAt(index)) % 9973;
    }
    return 2000 + seed;
};
const at = (): string => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const subscribeChatExecutionMonitor = (defaultUserId: string): () => void => {
    const activeByRequest = new Map<string, RuntimeState>();
    const handler = (event: Event): void => {
        const customEvent = event instanceof CustomEvent ? event : null;
        if (!customEvent) return;
        const detail = customEvent.detail as RuntimeChatEvent;
        if (!detail?.type || !isLifecycleEvent(detail.type)) return;

        const requestId = typeof detail.requestId === 'string' ? detail.requestId.trim() : '';
        if (!requestId) return;

        const mode = modeFrom(detail.chatMode);
        const chatId = typeof detail.chatId === 'string' && detail.chatId.trim() ? detail.chatId.trim() : null;
        const processId = activeByRequest.get(requestId)?.processId || processIdFor(requestId, chatId, mode);
        const currentStage = typeof detail.stage === 'string' ? detail.stage.trim() : '';
        const currentMessage = typeof detail.message === 'string' && detail.message.trim() ? detail.message : fallback(mode, currentStage, requestId);
        const state: RuntimeState = { processId, mode, chatId };
        const currentStatus = status(detail.type);
        const processName = labelFor(mode, chatId, requestId);
        const currentPid = pidFor(processId);

        activeByRequest.set(requestId, state);
        processMonitorRealtime.upsertProcesses([{ id: processId, pid: currentPid, parentId: parentFor(mode), name: processName, command: processName, userId: defaultUserId, cpu: currentStatus === 'running' ? 12 : 0, memoryBytes: 512 * 1024 * 1024, status: currentStatus, type: 'service' }]);
        processMonitorRealtime.appendLogs([{ id: `chat-event:${requestId}:${detail.type}`, timestamp: at(), processId, processName, pid: currentPid, userId: defaultUserId, level: logLevel(detail.type), message: currentMessage }]);
        if (detail.type === CHAT_SOCKET_EVENT_TYPES.requestDone || detail.type === CHAT_SOCKET_EVENT_TYPES.requestError) {
            activeByRequest.delete(requestId);
        }
    };

    window.addEventListener('giga:chat-socket', handler);
    return () => {
        window.removeEventListener('giga:chat-socket', handler);
        activeByRequest.clear();
    };
};
