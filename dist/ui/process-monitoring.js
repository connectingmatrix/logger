import { GraphQLClient } from './graphql-client.js';
const client = new GraphQLClient();
let endpoint = '/graphql';
export const processMonitoring = {
    bindWithServer(next) { endpoint = next.replace(/\/$/, ''); client.bindWithServer(endpoint); return processMonitoring; },
    list(filter = {}) { return client.query('query ProcessMonitoringList($kind:String,$status:String,$packageName:String){ processMonitoringList(kind:$kind,status:$status,packageName:$packageName) }', filter); },
    live(filter = {}) { return processMonitoring.list(filter); },
    logs: { live(processId) { return client.query('query ProcessMonitoringLogs($processId:ID!){ processMonitoringLogs(processId:$processId) }', { processId }); } },
    abort(processId, reason) { return client.mutation('mutation Abort($processId:ID!,$reason:String){ processMonitoringAbort(processId:$processId,reason:$reason) }', { processId, reason }); },
};
