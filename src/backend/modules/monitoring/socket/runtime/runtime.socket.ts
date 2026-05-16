import { randomUUID } from 'crypto';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getScopedLogger, toErrorMeta } from '@connectingmatrix/logger/lib/logger';
import { buildSocketSession } from '@connectingmatrix/sockets/core/build-session.socket';
import { parseTokenFromHandshake } from '@connectingmatrix/sockets/core/auth-token.socket';
import { readRuntimeMonitor } from '@giga/process-monitoring/services/runtime-monitor/runtime-monitor.service';
import { runtimeSocketRootRoom, runtimeSocketUserRoom, setRuntimeSocketServer } from './event-bus';
import type { Request } from 'express';
import type { GraphqlResolverContext } from '@giga/shared/types/contracts/graphql.types';
import type { RuntimeMonitorInput } from '@giga/process-monitoring/services/runtime-monitor/runtime-monitor.types';

const RUNTIME_SOCKET_PATH = '/ws/runtime';
const logger = getScopedLogger('runtime-socket');
const kinds = ['processes', 'workflows', 'agents', 'swarms', 'applications', 'ingestions'];
const inputKeys = ['requestId', 'kind', 'organizationId', 'userId', 'first', 'offset', 'search'];

type RuntimeSubscribeInput = RuntimeMonitorInput & { requestId?: string | null };
type RuntimeSocketSession = Awaited<ReturnType<typeof buildSocketSession>>;

const monitorInput = (payload: RuntimeSubscribeInput): RuntimeMonitorInput & { requestId: string } => {
  const keys = Object.keys(payload || {});
  const extra = keys.filter((key) => !inputKeys.includes(key));
  if (extra.length) throw new Error(`runtime:subscribe contains unsupported keys: ${extra.join(', ')}`);
  if (!kinds.includes(payload.kind)) throw new Error('runtime:subscribe.kind is invalid.');
  return { ...payload, requestId: payload.requestId || randomUUID() };
};

const contextFor = (session: RuntimeSocketSession, input: RuntimeMonitorInput): GraphqlResolverContext => ({
  request: {} as Request,
  supabase: session.supabase,
  body: { query: 'runtime:subscribe', variables: { input } },
  userId: session.userId,
});

export function setupRuntimeSocketServer(server: HttpServer) {
  const io = new SocketIOServer(server, { path: RUNTIME_SOCKET_PATH, cors: { origin: '*' } });
  setRuntimeSocketServer(io);

  io.on('connection', async (socket) => {
    const subscriptions = new Map<string, string>();
    try {
      const tokenPayload = parseTokenFromHandshake(socket);
      if (!tokenPayload) throw new Error('Missing auth token.');
      socket.data.session = await buildSocketSession(tokenPayload);
      socket.emit('runtime:ready', { userId: socket.data.session.userId, path: RUNTIME_SOCKET_PATH });
    } catch (error) {
      logger.warn('runtime.socket.connection.unauthorized', { error: toErrorMeta(error) });
      socket.emit('runtime:error', { message: error instanceof Error ? error.message : 'Unauthorized' });
      socket.disconnect(true);
      return;
    }

    socket.on('runtime:subscribe', async (payload: RuntimeSubscribeInput) => {
      try {
        const input = monitorInput(payload);
        const session = socket.data.session as RuntimeSocketSession;
        const snapshot = await readRuntimeMonitor(contextFor(session, input), input);
        const subscriptionId = randomUUID();
        const room = snapshot.mode === 'root' ? runtimeSocketRootRoom() : runtimeSocketUserRoom(session.userId);
        subscriptions.set(subscriptionId, room);
        socket.join(room);
        socket.emit('runtime:subscribed', { requestId: input.requestId, subscriptionId, snapshot });
      } catch (error) {
        logger.warn('runtime.socket.subscribe.failed', { error: toErrorMeta(error) });
        socket.emit('runtime:error', { message: error instanceof Error ? error.message : 'Runtime monitor subscription failed.' });
      }
    });

    socket.on('runtime:unsubscribe', ({ subscriptionId }: { subscriptionId: string }) => {
      const room = subscriptions.get(subscriptionId);
      if (room) socket.leave(room);
      subscriptions.delete(subscriptionId);
    });
  });
  return io;
}
