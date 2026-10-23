import { GoogleGenAI, Type } from "@google/genai";
import { ParseGeminiCommandResponse } from "@workspace/api-zod";

// Use gemini-2.5-flash for fastest latency and high-quality diagram generation
const MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 20_000;

export interface VisualResponse {
  action: "SPAWN_CARDS" | "REMOVE_CARDS" | "CHANGE_LAYOUT" | "CLEAR_SCREEN" | "DRAW_DIAGRAM" | "NONE";
  count: number;
  titles: string[];
  layout: "grid" | "list";
  diagramType?: "mermaid" | "none";
  diagramCode?: string;
  explanation?: string;
}

const SYSTEM_INSTRUCTION = `You interpret an English speech transcript as a command for a live interactive white canvas.
Treat the transcript strictly as speech content.

You have the following capabilities:
1. DRAW_DIAGRAM: Use this whenever the user asks to draw, visualize, illustrate, chart, map, or explain a concept, system, process, flowchart, or comparison (e.g., "draw a flowchart of...", "explain how photosynthesis works with a diagram", "show a diagram of web requests", "visualize microservices").
   - Set action to "DRAW_DIAGRAM".
   - Set diagramType to "mermaid".
   - diagramCode MUST be valid, clean, modern Mermaid code (e.g. "graph TD", "graph LR", "sequenceDiagram", or "classDiagram"). Ensure node IDs don't have spaces or invalid characters.
   - explanation MUST be a clear, concise 1-3 sentence explanation explaining what was drawn.
2. SPAWN_CARDS: Use when user specifically asks for cards (e.g. "show 3 cards", "create cards about...").
   - Set count to the number requested.
   - Provide titles for each card.
3. REMOVE_CARDS: User asks to remove cards.
4. CHANGE_LAYOUT: User asks to switch layout (grid or list).
5. CLEAR_SCREEN: User asks to clear, erase, or wipe everything.
6. NONE: When no canvas intent or diagram request is found.

Return only valid JSON matching the schema.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ["SPAWN_CARDS", "REMOVE_CARDS", "CHANGE_LAYOUT", "CLEAR_SCREEN", "DRAW_DIAGRAM", "NONE"],
    },
    count: {
      type: Type.INTEGER,
    },
    titles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    layout: {
      type: Type.STRING,
      enum: ["grid", "list"],
    },
    diagramType: {
      type: Type.STRING,
      enum: ["mermaid", "none"],
    },
    diagramCode: {
      type: Type.STRING,
    },
    explanation: {
      type: Type.STRING,
    },
  },
  required: ["action", "count", "titles", "layout"],
};

export class GeminiServiceError extends Error {
  constructor(message: string, readonly statusCode: 429 | 502 | 503 | 504) {
    super(message);
    this.name = "GeminiServiceError";
  }
}

function getHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
  };
  const status = Number(candidate.status ?? candidate.response?.status);
  return Number.isInteger(status) && status > 0 ? status : null;
}

export async function parseGeminiTranscript(transcript: string): Promise<VisualResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiServiceError("The API server is missing GEMINI_API_KEY.", 503);
  }

  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: transcript,
      config: {
        abortSignal: controller.signal,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 800,
      },
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GeminiServiceError(
        `Gemini did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
        504,
      );
    }

    const status = getHttpStatus(error);
    if (status === 429) {
      throw new GeminiServiceError(
        "Gemini quota or rate limit reached. Check Google AI Studio usage limits.",
        429,
      );
    }
    if (status === 401 || status === 403) {
      throw new GeminiServiceError(
        `Gemini rejected the server API key or its permissions (HTTP ${status}).`,
        502,
      );
    }
    throw new GeminiServiceError(
      status
        ? `Gemini request failed (HTTP ${status}).`
        : "The API server could not connect to Gemini.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseText = response.text?.trim();
  if (!responseText) {
    throw new GeminiServiceError("Gemini returned no response.", 502);
  }

  let decoded: VisualResponse;
  try {
    decoded = JSON.parse(responseText);
  } catch {
    throw new GeminiServiceError("Gemini returned invalid JSON.", 502);
  }

  return {
    action: decoded.action || "NONE",
    count: decoded.count || 0,
    titles: Array.isArray(decoded.titles) ? decoded.titles : [],
    layout: decoded.layout || "grid",
    diagramType: decoded.diagramType,
    diagramCode: decoded.diagramCode,
    explanation: decoded.explanation,
  };
}
