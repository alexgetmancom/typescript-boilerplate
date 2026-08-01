import { log } from "../logger.js";

export type WorkerHandle = {
  stop: () => void;
};

export function startIntervalWorker(name: string, intervalMs: number, task: () => void | Promise<void>): WorkerHandle {
  if (!Number.isInteger(intervalMs) || intervalMs <= 0) {
    throw new Error("Worker interval must be a positive integer");
  }

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = async (): Promise<void> => {
    if (stopped) return;
    try {
      await task();
      log("debug", "Worker cycle completed", { worker: name });
    } catch (error) {
      log("error", "Worker cycle failed", { worker: name, error });
    } finally {
      if (!stopped) timer = setTimeout(() => void run(), intervalMs);
    }
  };

  void run();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      log("info", "Worker stopped", { worker: name });
    },
  };
}
