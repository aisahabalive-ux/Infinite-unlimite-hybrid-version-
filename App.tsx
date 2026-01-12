import React from "react";
import { createRoot } from "react-dom/client";
import CreativeStudio from "./components/CreativeStudio";
import { GLOBAL_CONFIG } from "./constants";

/**
 * App.tsx
 *
 * Updated to V18.5 "Supreme UI" with all tabs active.
 *
 * This main application file:
 * - Uses React 18 createRoot API
 * - Renders multiple panels/tabs simultaneously (all active)
 * - Integrates the CreativeStudio component with sample tasks
 *
 * Notes:
 * - "Supreme UI" here is interpreted as a polished layout and lightweight theming.
 * - All tabs are rendered so they are active at once (visible) per request.
 */

const sampleTasks = Array.from({ length: 12 }).map((_, i) => ({
  id: `task-${i + 1}`,
  payload: { text: `Payload for task ${i + 1}`, timestamp: Date.now() + i },
}));

function TabPanel({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #e6e6e6", borderRadius: 8, padding: 12, background: "#fff" }}>
      <h3 style={{ margin: "0 0 8px 0" }}>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function App() {
  return (
    <div style={{ fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", height: "100vh", background: "#f4f6f9" }}>
      <header style={{ padding: 16, borderBottom: "1px solid #eaeaea", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>INFINITE UNLIMITED HYBRID · Supreme UI v18.5</h1>
            <div style={{ fontSize: 12, color: "#666" }}>Node baseline: {GLOBAL_CONFIG.nodeVersion}</div>
          </div>
          <nav style={{ display: "flex", gap: 8 }}>
            <button>Studio</button>
            <button>Model</button>
            <button>Settings</button>
            <button>Logs</button>
            <button>Help</button>
          </nav>
        </div>
      </header>

      <main style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 420px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 12 }}>
          <TabPanel title="Creative Studio">
            <CreativeStudio tasks={sampleTasks} concurrency={Math.min(6, navigator.hardwareConcurrency ?? 4)} />
          </TabPanel>

          <TabPanel title="Model Playground">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 12 }}>
              <div>
                <p style={{ marginTop: 0 }}>Model: Gemini-3-Pro-Preview (configured in services/gemini)</p>
                <textarea placeholder="Write a prompt..." style={{ width: "100%", minHeight: 120 }} />
              </div>
              <aside>
                <p style={{ marginTop: 0, fontSize: 13 }}>Quick Actions</p>
                <button style={{ display: "block", marginBottom: 8 }}>Generate</button>
                <button style={{ display: "block" }}>Clear</button>
              </aside>
            </div>
          </TabPanel>
        </div>

        <aside style={{ display: "grid", gap: 12 }}>
          <TabPanel title="Settings">
            <div style={{ fontSize: 13 }}>
              <div>Environment: {GLOBAL_CONFIG.environment}</div>
              <div>Node Version: {GLOBAL_CONFIG.nodeVersion}</div>
              <div>Default concurrency: {GLOBAL_CONFIG.defaultConcurrency}</div>
            </div>
          </TabPanel>

          <TabPanel title="Logs">
            <div style={{ fontSize: 12, color: "#444", maxHeight: 180, overflow: "auto", background: "#fafafa", padding: 8 }}>
              <div>[info] App started with Supreme UI v18.5</div>
              <div>[debug] CreativeStudio loaded — worker engine available: {typeof Worker !== "undefined" ? "yes" : "no"}</div>
              <div>[warn] This is a demo environment — confirm production endpoints before use.</div>
            </div>
          </TabPanel>

          <TabPanel title="Help">
            <div style={{ fontSize: 13 }}>
              <p style={{ marginTop: 0 }}>For API & model config see services/gemini.ts</p>
              <p style={{ marginBottom: 0 }}>All tabs are rendered and active simultaneously for rapid iteration.</p>
            </div>
          </TabPanel>
        </aside>
      </main>

      <footer style={{ padding: 12, borderTop: "1px solid #eaeaea", background: "#fff", textAlign: "center", fontSize: 12 }}>
        © {new Date().getFullYear()} INFINITE UNLIMITED HYBRID — v18.5 Supreme UI
      </footer>
    </div>
  );
}

// Mount to #root
const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
} else {
  console.warn("No root element (#root) found — App not mounted.");
}

export default App;
