import { GraphQLClient } from './graphql-client.js';
import type { RuntimeProcessKind, RuntimeProcessStatus } from '../observability.js';

export interface ProcessMonitoringFilter { kind?: RuntimeProcessKind; status?: RuntimeProcessStatus; packageName?: string; ownerId?: string; }

const client = new GraphQLClient();
let endpoint = '/graphql';
export const processMonitoring = {
  bindWithServer(next: string) { endpoint = next.replace(/\/$/, ''); client.bindWithServer(endpoint); return processMonitoring; },
  list(filter: ProcessMonitoringFilter = {}) { return client.query('query ProcessMonitoringList($kind:String,$status:String,$packageName:String){ processMonitoringList(kind:$kind,status:$status,packageName:$packageName) }', filter as unknown as Record<string, unknown>); },
  live(filter: ProcessMonitoringFilter = {}) { return processMonitoring.list(filter); },
  logs: { live(processId: string) { return client.query('query ProcessMonitoringLogs($processId:ID!){ processMonitoringLogs(processId:$processId) }', { processId }); } },
  abort(processId: string, reason?: string) { return client.mutation('mutation Abort($processId:ID!,$reason:String){ processMonitoringAbort(processId:$processId,reason:$reason) }', { processId, reason }); },
};
