import React, { useEffect, useRef, useState } from "react";

/**
 * components/CreativeStudio.tsx
 *
 * "2nm GAA Parallel Worker Engine" implementation (browser-side).
 *
 * - Creates a pool of Web Workers that run tasks in parallel.
 * - Uses a lightweight worker script generated via Blob so there's no extra file.
 * - Provides a React-friendly interface: start, stop, status, progress and results.
 *
 * This is designed as a general parallel compute engine that can be used by the
 * rest of the app (e.g., to pre-render, run prompt transforms, or local inference
 * helper calculations). The "2nm GAA" name is a product-style label — the code
 * focuses on efficient parallel dispatch and graceful shutdown.
 */

type Task<T = any> = {
  id: string;
  payload: T;
};

type WorkerResult<R = any> = {
  id: string;
  result?: R;
  error?: string;
};

type CreativeStudioProps<T = any, R = any> = {
  tasks?: Task<T>[];
  concurrency?: number; // number of parallel workers to spawn
  onProgress?: (completed: number, total: number) => void;
  onComplete?: (results: WorkerResult<R>[]) => void;
  // optional transformer to run inside worker if you want to run custom code
  // represented as a stringified function body: (payload) => { ... }
  workerFunctionBody?: string | null;
  className?: string;
};

export default function CreativeStudio<T = any, R = any>({
  tasks = [],
  concurrency = Math.max(1, navigator.hardwareConcurrency ? Math.min(8, navigator.hardwareConcurrency) : 4),
  onProgress,
  onComplete,
  workerFunctionBody = null,
  className,
}: CreativeStudioProps<T, R>) {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [results, setResults] = useState<WorkerResult<R>[]>([]);
  const tasksRef = useRef<Task<T>[]>(tasks);
  const workersRef = useRef<Worker[]>([]);
  const queueRef = useRef<Task<T>[]>([]);
  const stoppedRef = useRef(false);

  useEffect(() => {
    // accept updated tasks prop
    tasksRef.current = tasks;
    queueRef.current = [...tasks];
  }, [tasks]);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      stopEngine();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default worker function: echo + demonstration compute
  const defaultWorkerBody = `
    // Worker receives { id, payload }
    self.onmessage = async function(e) {
      const { id, payload } = e.data;
      try {
        // Simulated compute: can be replaced by user-supplied function body
        // Example lightweight "creative" operation
        const result = (function run(payload) {
          // payload is passed through; do idempotent transformations
          // Simulate heavier compute by using a fast pseudo-work loop
          let acc = 0;
          for (let i = 0; i < 50000; i++) {
            acc += (i ^ (i << 1)) % 97;
          }
          return { processed: payload, checksum: acc };
        })(payload);

        // Post back the result
        self.postMessage({ id, result });
      } catch (err) {
        self.postMessage({ id, error: String(err) });
      }
    };
  `;

  function createWorkerScript() {
    const body = workerFunctionBody && workerFunctionBody.trim().length > 0 ? workerFunctionBody : defaultWorkerBody;
    // Wrap body to be a valid worker script (it can assume postMessage/onmessage)
    const blob = new Blob([body], { type: "text/javascript" });
    return URL.createObjectURL(blob);
  }

  function startEngine() {
    if (running) return;
    stoppedRef.current = false;
    queueRef.current = [...tasksRef.current];
    setResults([]);
    setCompleted(0);
    setRunning(true);

    if (!window || typeof window === "undefined" || (typeof Worker === "undefined")) {
      // No worker support — fall back to main-thread sequential execution
      runSequentiallyOnMainThread();
      return;
    }

    const scriptURL = createWorkerScript();
    const actualConcurrency = Math.min(concurrency, Math.max(1, queueRef.current.length));
    workersRef.current = [];

    for (let i = 0; i < actualConcurrency; i++) {
      const worker = new Worker(scriptURL, { type: "module" });
      worker.onmessage = (e: MessageEvent) => {
        const { id, result, error } = e.data as { id: string; result?: R; error?: any };
        setResults((prev) => {
          const next = [...prev, { id, result, error: error ? String(error) : undefined }];
          if (onComplete && queueRef.current.length === 0 && next.length === tasksRef.current.length) {
            // All assigned tasks have completed
            setTimeout(() => onComplete(next), 0);
          }
          return next;
        });
        setCompleted((prev) => {
          const nextCompleted = prev + 1;
          if (onProgress) onProgress(nextCompleted, tasksRef.current.length);
          // If all tasks complete, stop workers automatically
          if (nextCompleted >= tasksRef.current.length) {
            stopEngine();
          }
          return nextCompleted;
        });
        // Assign next task if available
        assignNextTaskToWorker(worker);
      };
      worker.onerror = (err) => {
        console.error("Worker error:", err);
        // Treat as failed result for currently running task — continue assignment
        setCompleted((prev) => prev + 1);
        assignNextTaskToWorker(worker);
      };
      workersRef.current.push(worker);
    }

    // Kick off initial assignment
    for (const w of workersRef.current) assignNextTaskToWorker(w);
  }

  function assignNextTaskToWorker(w: Worker) {
    if (stoppedRef.current) return;
    const task = queueRef.current.shift();
    if (!task) {
      // No more tasks to assign for this worker
      try {
        // allow worker to terminate
        w.terminate();
      } catch (e) {
        // ignore
      }
      return;
    }
    try {
      w.postMessage({ id: task.id, payload: task.payload });
    } catch (err) {
      // Post failed; record as error and continue
      setResults((prev) => [...prev, { id: task.id, error: String(err) }]);
      setCompleted((prev) => {
        const next = prev + 1;
        if (onProgress) onProgress(next, tasksRef.current.length);
        if (next >= tasksRef.current.length) stopEngine();
        return next;
      });
      assignNextTaskToWorker(w);
    }
  }

  async function runSequentiallyOnMainThread() {
    // Fallback for environments without Worker support.
    const body = workerFunctionBody && workerFunctionBody.trim().length > 0 ? workerFunctionBody : defaultWorkerBody;
    // Create a function wrapper: the body is expected to define self.onmessage usage.
    // For main-thread simulation, we will just run a simple function similar to default
    const runSimulated = (payload: any) => {
      // Use the same logic as defaultWorkerBody for parity
      let acc = 0;
      for (let i = 0; i < 50000; i++) {
        acc += (i ^ (i << 1)) % 97;
      }
      return { processed: payload, checksum: acc };
    };

    const total = queueRef.current.length;
    const collected: WorkerResult<R>[] = [];
    while (queueRef.current.length && !stoppedRef.current) {
      const t = queueRef.current.shift()!;
      try {
        const result = runSimulated(t.payload);
        collected.push({ id: t.id, result });
      } catch (err) {
        collected.push({ id: t.id, error: String(err) });
      }
      setCompleted((prev) => {
        const next = prev + 1;
        if (onProgress) onProgress(next, total);
        return next;
      });
    }
    setResults(collected);
    setRunning(false);
    if (onComplete) onComplete(collected);
  }

  function stopEngine() {
    stoppedRef.current = true;
    for (const w of workersRef.current) {
      try {
        w.terminate();
      } catch (e) {
        // ignore termination errors
      }
    }
    workersRef.current = [];
    setRunning(false);
  }

  // UI: simple studio controls + status
  return (
    <div className={className ?? "creative-studio"} style={{ border: "1px solid var(--studio-border,#ddd)", borderRadius: 8, padding: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <strong>Creative Studio — 2nm GAA Parallel Worker Engine</strong>
          <div style={{ fontSize: 12, color: "#666" }}>Concurrency: {concurrency} · Tasks: {tasksRef.current.length}</div>
        </div>
        <div>
          {!running ? (
            <button onClick={() => startEngine()} style={{ marginRight: 8 }}>
              Start
            </button>
          ) : (
            <button onClick={() => stopEngine()} style={{ marginRight: 8 }}>
              Stop
            </button>
          )}
          <button
            onClick={() => {
              // Reset
              stopEngine();
              queueRef.current = [...tasksRef.current];
              setResults([]);
              setCompleted(0);
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
        <div style={{ minHeight: 120 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            Status: {running ? "Running" : "Idle"} · Completed: {completed}/{tasksRef.current.length}
          </div>
          <div style={{ background: "#fafafa", padding: 8, borderRadius: 6, minHeight: 80 }}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {results.slice(-10).map((r) => (
                <li key={r.id} style={{ fontSize: 12 }}>
                  <span style={{ fontFamily: "monospace" }}>{r.id}</span>
                  {r.error ? (
                    <span style={{ color: "crimson", marginLeft: 8 }}>error</span>
                  ) : (
                    <span style={{ color: "green", marginLeft: 8 }}>ok</span>
                  )}
                </li>
              ))}
              {results.length === 0 && <li style={{ fontSize: 12, color: "#888" }}>No results yet</li>}
            </ol>
          </div>
        </div>

        <aside style={{ minHeight: 120 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Engine Overview</div>
          <ul style={{ fontSize: 12, margin: 0, paddingLeft: 18 }}>
            <li>Worker pool: {running ? `${workersRef.current.length} active` : "stopped"}</li>
            <li>Queue: {queueRef.current.length} remaining</li>
            <li>Safe fallback when Workers unavailable (sequential)</li>
            <li>Non-blocking UI, graceful termination</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
