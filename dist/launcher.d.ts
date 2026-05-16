import { type PackageLauncherPanel, type RequestContext } from './contracts.js';
export declare function createConnectingmatrixLoggerStubLauncher(context?: RequestContext): PackageLauncherPanel;
export declare const createStubLauncher: typeof createConnectingmatrixLoggerStubLauncher;
export declare const Launcher: {
    open: typeof createConnectingmatrixLoggerStubLauncher;
    mode: "stub";
};
export declare const launcher: typeof createConnectingmatrixLoggerStubLauncher;
