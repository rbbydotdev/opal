import type { Remote } from 'comlink';

export interface WorkerInstance<T = any> {
  id: string;
  worker: Worker;
  remote: Remote<T>;
  busy: boolean;
  queue: Array<() => void>;
}

export interface WorkerPoolConfig {
  id: string;
  src: string;
  count: number;
}

export interface WorkerPoolState<T = any> {
  workers: WorkerInstance<T>[];
  roundRobinIndex: number;
}

export interface WorkerPoolContextValue<T = any> {
  cmd: Remote<T>;
  getWorker: () => WorkerInstance<T> | null;
  isReady: boolean;
}

export interface WorkerPoolProviderProps extends WorkerPoolConfig {
  children: React.ReactNode;
}