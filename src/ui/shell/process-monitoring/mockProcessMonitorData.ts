import type { ProcessMonitorSnapshot } from './types';

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const initialProcessMonitorSnapshot: ProcessMonitorSnapshot = {
    updatedAt: '10:24:33',
    metrics: {
        totalProcesses: 128,
        totalUsers: 12,
        cpuUsage: 23.7,
        memoryUsedBytes: 4.2 * GB,
        memoryTotalBytes: 15.6 * GB,
        loadAverage: [0.42, 0.38, 0.35],
        activeAlerts: 3,
        uptime: '5d 14h 22m',
        networkGbps: 1.3,
        diskMbps: 248
    },
    users: [
        { id: 'root', name: 'root', cpu: 8.6, memoryBytes: 1.2 * GB, processCount: 32, status: 'active', role: 'root' },
        { id: 'john', name: 'john', cpu: 5.7, memoryBytes: 864.2 * MB, processCount: 18, status: 'active', role: 'normal' },
        { id: 'jane', name: 'jane', cpu: 3.2, memoryBytes: 512.8 * MB, processCount: 12, status: 'active', role: 'normal' },
        { id: 'mike', name: 'mike', cpu: 2.1, memoryBytes: 310.7 * MB, processCount: 9, status: 'idle', role: 'normal' },
        { id: 'alex', name: 'alex', cpu: 1.6, memoryBytes: 198.6 * MB, processCount: 6, status: 'active', role: 'normal' },
        { id: 'docker', name: 'docker', cpu: 2.1, memoryBytes: 345.6 * MB, processCount: 6, status: 'active', role: 'service' },
        { id: 'nginx', name: 'nginx', cpu: 4.1, memoryBytes: 512.3 * MB, processCount: 6, status: 'active', role: 'service' },
        { id: 'postgres', name: 'postgres', cpu: 3.0, memoryBytes: 482.1 * MB, processCount: 15, status: 'active', role: 'service' },
        { id: 'redis', name: 'redis', cpu: 0.8, memoryBytes: 128.4 * MB, processCount: 2, status: 'active', role: 'service' }
    ],
    processes: [
        { id: 'systemd', pid: 1, parentId: null, name: 'systemd (init)', userId: 'root', cpu: 0.3, memoryBytes: 55.2 * MB, status: 'running', type: 'system' },
        { id: 'sshd', pid: 742, parentId: 'systemd', name: 'sshd', userId: 'root', cpu: 0.1, memoryBytes: 12.4 * MB, status: 'running', type: 'service' },
        { id: 'root-bash', pid: 1123, parentId: 'sshd', name: 'bash', userId: 'root', cpu: 0.2, memoryBytes: 8.1 * MB, status: 'running', type: 'shell' },
        { id: 'node-server', pid: 1156, parentId: 'root-bash', name: 'node server.js', userId: 'root', cpu: 5.6, memoryBytes: 128.7 * MB, status: 'running', type: 'node' },
        { id: 'worker-1', pid: 1161, parentId: 'node-server', name: 'worker.js', userId: 'root', cpu: 2.1, memoryBytes: 45.3 * MB, status: 'running', type: 'node' },
        { id: 'worker-2', pid: 1162, parentId: 'node-server', name: 'worker.js', userId: 'root', cpu: 1.8, memoryBytes: 44.8 * MB, status: 'running', type: 'node' },
        { id: 'database-js', pid: 1163, parentId: 'node-server', name: 'database.js', userId: 'root', cpu: 1.2, memoryBytes: 38.9 * MB, status: 'running', type: 'node' },
        { id: 'cache-js', pid: 1164, parentId: 'node-server', name: 'cache.js', userId: 'root', cpu: 0.8, memoryBytes: 24.6 * MB, status: 'running', type: 'node' },

        { id: 'nginx-master', pid: 888, parentId: 'systemd', name: 'nginx', userId: 'nginx', cpu: 1.3, memoryBytes: 33.6 * MB, status: 'running', type: 'nginx' },
        { id: 'nginx-worker-1', pid: 889, parentId: 'nginx-master', name: 'nginx: worker process', userId: 'nginx', cpu: 0.6, memoryBytes: 15.8 * MB, status: 'running', type: 'nginx' },
        { id: 'nginx-worker-2', pid: 890, parentId: 'nginx-master', name: 'nginx: worker process', userId: 'nginx', cpu: 0.7, memoryBytes: 16.1 * MB, status: 'running', type: 'nginx' },

        { id: 'postgres-master', pid: 994, parentId: 'systemd', name: 'postgres', userId: 'postgres', cpu: 2.4, memoryBytes: 98.7 * MB, status: 'running', type: 'database' },
        { id: 'postgres-writer', pid: 995, parentId: 'postgres-master', name: 'postgres: writer', userId: 'postgres', cpu: 1.1, memoryBytes: 32.2 * MB, status: 'running', type: 'database' },
        { id: 'postgres-wal', pid: 996, parentId: 'postgres-master', name: 'postgres: wal writer', userId: 'postgres', cpu: 0.4, memoryBytes: 12.1 * MB, status: 'sleeping', type: 'database' },
        { id: 'postgres-bg', pid: 997, parentId: 'postgres-master', name: 'postgres: bgworker', userId: 'postgres', cpu: 0.3, memoryBytes: 11.8 * MB, status: 'sleeping', type: 'database' },

        { id: 'docker-service', pid: 1021, parentId: 'systemd', name: 'docker', userId: 'docker', cpu: 1.6, memoryBytes: 75.4 * MB, status: 'running', type: 'docker' },
        { id: 'containerd', pid: 1022, parentId: 'docker-service', name: 'containerd', userId: 'docker', cpu: 0.6, memoryBytes: 22.8 * MB, status: 'running', type: 'docker' },
        { id: 'docker-proxy', pid: 1023, parentId: 'docker-service', name: 'docker-proxy', userId: 'docker', cpu: 1.0, memoryBytes: 18.2 * MB, status: 'running', type: 'docker' },
        { id: 'redis-server', pid: 1033, parentId: 'systemd', name: 'redis-server', userId: 'redis', cpu: 0.5, memoryBytes: 19.1 * MB, status: 'running', type: 'database' },
        { id: 'cron', pid: 1044, parentId: 'systemd', name: 'cron', userId: 'root', cpu: 0.1, memoryBytes: 2.1 * MB, status: 'running', type: 'service' },

        { id: 'john-shell', pid: 2201, parentId: null, name: 'terminal', userId: 'john', cpu: 0.7, memoryBytes: 110.2 * MB, status: 'running', type: 'shell' },
        { id: 'john-node', pid: 2205, parentId: 'john-shell', name: 'node dev-server.js', userId: 'john', cpu: 2.3, memoryBytes: 256.4 * MB, status: 'running', type: 'node' },
        { id: 'john-code', pid: 2210, parentId: null, name: 'code', userId: 'john', cpu: 1.4, memoryBytes: 289.6 * MB, status: 'running', type: 'editor' },
        { id: 'john-chrome', pid: 2218, parentId: null, name: 'chrome', userId: 'john', cpu: 1.5, memoryBytes: 320.2 * MB, status: 'running', type: 'browser' },
        { id: 'john-python', pid: 2222, parentId: 'john-shell', name: 'python worker.py', userId: 'john', cpu: 1.1, memoryBytes: 200.3 * MB, status: 'sleeping', type: 'python' },

        { id: 'jane-chrome', pid: 3201, parentId: null, name: 'chrome', userId: 'jane', cpu: 2.4, memoryBytes: 324.5 * MB, status: 'running', type: 'browser' },
        { id: 'jane-slack', pid: 3205, parentId: null, name: 'slack', userId: 'jane', cpu: 0.4, memoryBytes: 89.1 * MB, status: 'running', type: 'other' },
        { id: 'jane-code', pid: 3210, parentId: null, name: 'code', userId: 'jane', cpu: 0.4, memoryBytes: 99.2 * MB, status: 'sleeping', type: 'editor' },

        { id: 'mike-terminal', pid: 4201, parentId: null, name: 'terminal', userId: 'mike', cpu: 0.7, memoryBytes: 110.2 * MB, status: 'running', type: 'shell' },
        { id: 'mike-python', pid: 4205, parentId: 'mike-terminal', name: 'python', userId: 'mike', cpu: 1.1, memoryBytes: 200.3 * MB, status: 'running', type: 'python' },
        { id: 'mike-vim', pid: 4207, parentId: 'mike-terminal', name: 'vim', userId: 'mike', cpu: 0.3, memoryBytes: 45.2 * MB, status: 'sleeping', type: 'editor' },

        { id: 'alex-git', pid: 5202, parentId: null, name: 'git', userId: 'alex', cpu: 0.6, memoryBytes: 78.6 * MB, status: 'sleeping', type: 'shell' },
        { id: 'alex-node', pid: 5204, parentId: null, name: 'node', userId: 'alex', cpu: 1.0, memoryBytes: 120.0 * MB, status: 'running', type: 'node' }
    ],
    logs: [
        { id: 'log-1', timestamp: '10:24:31.123', processId: 'node-server', processName: 'node server.js', pid: 1156, userId: 'root', level: 'INFO', message: 'Server started on port 3000' },
        { id: 'log-2', timestamp: '10:24:31.125', processId: 'worker-1', processName: 'worker.js', pid: 1161, userId: 'root', level: 'INFO', message: 'Worker started with id 1' },
        { id: 'log-3', timestamp: '10:24:31.126', processId: 'database-js', processName: 'database.js', pid: 1163, userId: 'root', level: 'INFO', message: 'Connected to database' },
        { id: 'log-4', timestamp: '10:24:31.200', processId: 'nginx-worker-1', processName: 'nginx: worker process', pid: 889, userId: 'nginx', level: 'INFO', message: 'Accepted connection from 192.168.1.10' },
        { id: 'log-5', timestamp: '10:24:31.245', processId: 'node-server', processName: 'node server.js', pid: 1156, userId: 'root', level: 'INFO', message: 'GET /api/users 200 15ms' },
        { id: 'log-6', timestamp: '10:24:31.310', processId: 'worker-2', processName: 'worker.js', pid: 1162, userId: 'root', level: 'DEBUG', message: 'Processing job 42' },
        { id: 'log-7', timestamp: '10:24:31.410', processId: 'database-js', processName: 'database.js', pid: 1163, userId: 'root', level: 'INFO', message: 'Query executed in 12ms' },
        { id: 'log-8', timestamp: '10:24:31.512', processId: 'worker-1', processName: 'worker.js', pid: 1161, userId: 'root', level: 'WARN', message: 'Job queue size high (85)' },
        { id: 'log-9', timestamp: '10:24:31.789', processId: 'node-server', processName: 'node server.js', pid: 1156, userId: 'root', level: 'ERROR', message: 'Unhandled exception: User not found' },
        { id: 'log-10', timestamp: '10:24:31.790', processId: 'worker-2', processName: 'worker.js', pid: 1162, userId: 'root', level: 'ERROR', message: 'Job 42 failed: Timeout exceeded' },
        { id: 'log-11', timestamp: '10:24:31.900', processId: 'postgres-writer', processName: 'postgres: writer', pid: 995, userId: 'postgres', level: 'INFO', message: 'WAL segment written' },
        { id: 'log-12', timestamp: '10:24:32.001', processId: 'postgres-bg', processName: 'postgres: bgworker', pid: 997, userId: 'postgres', level: 'DEBUG', message: 'Background worker heartbeat' },
        { id: 'log-13', timestamp: '10:24:32.215', processId: 'nginx-worker-1', processName: 'nginx: worker process', pid: 889, userId: 'nginx', level: 'INFO', message: 'GET /favicon.ico 404 2ms' },
        { id: 'log-14', timestamp: '10:24:32.410', processId: 'cache-js', processName: 'cache.js', pid: 1164, userId: 'root', level: 'INFO', message: 'Cache hit for key: user:123' },
        { id: 'log-15', timestamp: '10:24:32.612', processId: 'worker-1', processName: 'worker.js', pid: 1161, userId: 'root', level: 'INFO', message: 'Job 43 completed in 120ms' },
        { id: 'log-16', timestamp: '10:24:32.890', processId: 'database-js', processName: 'database.js', pid: 1163, userId: 'root', level: 'ERROR', message: 'Connection pool exhausted' },
        { id: 'log-17', timestamp: '10:24:33.001', processId: 'node-server', processName: 'node server.js', pid: 1156, userId: 'root', level: 'WARN', message: 'High response time detected: 502ms' },
        { id: 'log-18', timestamp: '10:24:33.123', processId: 'redis-server', processName: 'redis-server', pid: 1033, userId: 'redis', level: 'INFO', message: 'Client connected: 127.0.0.1:54321' },
        { id: 'log-19', timestamp: '10:24:33.456', processId: 'docker-service', processName: 'docker', pid: 1021, userId: 'docker', level: 'INFO', message: 'Container nginx started' },
        { id: 'log-20', timestamp: '10:24:33.789', processId: 'cron', processName: 'cron', pid: 1044, userId: 'root', level: 'INFO', message: 'Scheduled job completed' },
        { id: 'log-21', timestamp: '10:24:34.004', processId: 'john-node', processName: 'node dev-server.js', pid: 2205, userId: 'john', level: 'INFO', message: 'Vite dev server hot update applied' },
        { id: 'log-22', timestamp: '10:24:34.109', processId: 'john-python', processName: 'python worker.py', pid: 2222, userId: 'john', level: 'DEBUG', message: 'Background embedding batch queued' },
        { id: 'log-23', timestamp: '10:24:34.333', processId: 'jane-chrome', processName: 'chrome', pid: 3201, userId: 'jane', level: 'WARN', message: 'Renderer memory pressure warning' },
        { id: 'log-24', timestamp: '10:24:34.618', processId: 'mike-python', processName: 'python', pid: 4205, userId: 'mike', level: 'INFO', message: 'Notebook kernel started' }
    ],
    alerts: [
        { id: 'alert-1', title: 'Connection pool exhausted', message: 'database.js reported no available connections in the selected scope.', level: 'ERROR' },
        { id: 'alert-2', title: 'High response time detected', message: 'node server.js exceeded 500ms on the last collection window.', level: 'WARN' },
        { id: 'alert-3', title: 'Job queue size high', message: 'worker.js reported 85 queued jobs awaiting dispatch.', level: 'WARN' }
    ]
};
