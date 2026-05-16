export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

export function formatPercent(value: number, precision = 1): string {
    if (!Number.isFinite(value)) return '0%';
    return `${value.toFixed(precision)}%`;
}

export function createTimestamp(date = new Date()): string {
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function createSparkline(seed: number, points = 20): number[] {
    return Array.from({ length: points }, (_, index) => {
        const wave = Math.sin((index + seed) / 2.4) * 8;
        const drift = Math.cos((index + seed) / 4.2) * 4;
        return Math.max(2, Math.round(34 + wave + drift + ((index + seed) % 5)));
    });
}
