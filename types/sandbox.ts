// Global types for Cloudflare sandbox file management

export interface SandboxFile {
  content: string;
  lastModified: number;
}

export interface SandboxFileCache {
  files: Record<string, SandboxFile>;
  lastSync: number;
  sandboxId: string;
  manifest?: any; // FileManifest type from file-manifest.ts
}

export interface CloudflareSandboxData {
  sandboxId: string;
  url: string;
  processId?: string; // For tracking Vite process
  sessionId?: string; // CF sandbox session ID
}

export interface SandboxState {
  fileCache: SandboxFileCache | null;
  sandbox: any; // Cloudflare sandbox instance
  sandboxData: CloudflareSandboxData | null;
}

// Cloudflare Worker environment interface
export interface WorkerEnv {
  Sandbox: DurableObjectNamespace;
  SESSION_STORAGE?: KVNamespace;
}

// Declare global types for legacy compatibility
declare global {
  var activeSandbox: any;
  var sandboxState: SandboxState;
  var existingFiles: Set<string>;
}

export {};