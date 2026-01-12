/**
 * constants.tsx
 *
 * Global configuration updated to Node V18.0.0 baseline as requested.
 *
 * Exported constants:
 * - GLOBAL_CONFIG: central app configuration
 *
 * Keep this file lightweight and easily extendable.
 */

export const GLOBAL_CONFIG = {
  nodeVersion: "v18.0.0",
  environment: process?.env?.NODE_ENV ?? "development",
  defaultConcurrency: Math.max(1, (typeof navigator !== "undefined" && navigator.hardwareConcurrency) ? Math.min(6, navigator.hardwareConcurrency) : 4),
  apiTimeoutMs: 30_000,
  // feature toggles
  enableParallelWorkerEngine: true,
  enableGeminiPreviewModel: true,
};

export default GLOBAL_CONFIG;
