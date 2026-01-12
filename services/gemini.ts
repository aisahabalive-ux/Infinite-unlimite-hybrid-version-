/**
 * services/gemini.ts
 *
 * Gemini client configuration for "Gemini-3-Pro-Preview" with thinkingBudget support.
 *
 * This module exports a lightweight client wrapper that:
 * - Is pre-configured for the "gemini-3-pro-preview" model
 * - Supports a `thinkingBudget` parameter to hint longer internal reasoning/chain-of-thought
 * - Provides a `generate` helper that can be used by the rest of the application
 *
 * Note: This is an application-level wrapper; adapt the endpoint and auth to your
 * real backend or cloud provider. By default it points to a relative /api/gemini
 * endpoint; replace with the real upstream when integrating.
 */

export type GeminiOptions = {
  model?: string;
  thinkingBudget?: number; // milliseconds budget or abstract units
  temperature?: number;
  maxTokens?: number;
  topP?: number;
};

export type GeminiResponse = {
  id?: string;
  output?: any;
  raw?: any;
};

const DEFAULT_ENDPOINT = "/api/gemini";
const DEFAULT_MODEL = "gemini-3-pro-preview";

export class GeminiClient {
  endpoint: string;
  model: string;
  defaultThinkingBudget: number;

  constructor(config?: { endpoint?: string; model?: string; defaultThinkingBudget?: number }) {
    this.endpoint = config?.endpoint ?? DEFAULT_ENDPOINT;
    this.model = config?.model ?? DEFAULT_MODEL;
    // thinkingBudget default: 2000ms is a reasonable starting point for "deeper thinking"
    this.defaultThinkingBudget = config?.defaultThinkingBudget ?? 2000;
  }

  async generate(prompt: string, options?: GeminiOptions): Promise<GeminiResponse> {
    const model = options?.model ?? this.model;
    const thinkingBudget = options?.thinkingBudget ?? this.defaultThinkingBudget;

    const payload = {
      model,
      prompt,
      thinkingBudget,
      temperature: options?.temperature ?? 0.2,
      maxTokens: options?.maxTokens ?? 512,
      topP: options?.topP ?? 0.95,
    };

    // You should attach authorization headers or proxy via your server.
    // Default behaviour: POST to relative endpoint; server is expected to forward/authorize.
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini generate failed: ${res.status} ${res.statusText} ${text}`);
    }

    const data = await res.json().catch(() => null);
    // Normalize response
    return {
      id: data?.id ?? null,
      output: data?.output ?? data,
      raw: data,
    };
  }
}

// Export a default client instance pre-configured for app usage
export const geminiClient = new GeminiClient({
  endpoint: DEFAULT_ENDPOINT,
  model: DEFAULT_MODEL,
  defaultThinkingBudget: 3000, // slightly larger budget for "pro preview"
});
