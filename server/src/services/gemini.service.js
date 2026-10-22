import { GoogleGenAI, Type } from '@google/genai';
import { config, isGeminiConfigured } from '../config/env.js';

/**
 * Standard Structured Response Schema for Codebase Q&A
 */
export const QA_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: 'Comprehensive, markdown-formatted technical answer grounded strictly in verified repository evidence.',
    },
    summary: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence executive summary answering the question directly.',
    },
    claims: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: 'Individual factual statement or architectural observation.',
          },
          type: {
            type: Type.STRING,
            enum: ['source_fact', 'architectural_inference'],
            description: 'Whether the claim is directly observed in code evidence or inferred architecturally.',
          },
          evidenceIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Array of evidence IDs (e.g. ["ev_1", "ev_2"]) supporting this claim.',
          },
        },
        required: ['text', 'type', 'evidenceIds'],
      },
      description: 'Key technical claims with their evidence citations and fact/inference distinction.',
    },
    inferences: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Architectural or design inferences drawn from verified facts.',
    },
    limitations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Explicit static analysis limitations or unresolved questions due to missing context.',
    },
    suggestedFiles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Actual repository files recommended for the developer to inspect further.',
    },
  },
  required: ['answer', 'summary', 'claims'],
};

/**
 * Gemini Service Module
 *
 * Encapsulates Google Gemini API communication using the official @google/genai SDK.
 * Keeps the API key strictly on the backend and enforces structured code context boundaries.
 */
class GeminiService {
  constructor() {
    this._client = null;
    this._mockClient = null;
  }

  /**
   * Sets a mock client for deterministic unit and integration tests.
   * @param {object|null} mockClient
   */
  setMockClient(mockClient) {
    this._mockClient = mockClient;
  }

  /**
   * Clears any active mock client.
   */
  resetMockClient() {
    this._mockClient = null;
  }

  /**
   * Lazily initialize and return the GoogleGenAI client instance.
   * Throws a descriptive error if the API key is not configured.
   */
  getClient() {
    if (this._mockClient) {
      return this._mockClient;
    }

    if (!isGeminiConfigured()) {
      const error = new Error(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in your server environment.'
      );
      error.statusCode = 503;
      error.code = 'GEMINI_NOT_CONFIGURED';
      throw error;
    }

    if (!this._client) {
      this._client = new GoogleGenAI({
        apiKey: config.geminiApiKey,
      });
    }

    return this._client;
  }

  /**
   * Checks if Gemini is configured (or has an active test mock) without throwing.
   */
  isConfigured() {
    return Boolean(this._mockClient || isGeminiConfigured());
  }

  /**
   * Gets the configured Gemini model name.
   */
  getModelName() {
    return config.geminiModel || 'gemini-2.5-flash';
  }

  /**
   * Prepare and analyze structured repository context with Gemini (legacy helper).
   */
  async analyzeCodeContext({ prompt, codeContext = [], systemInstruction = '' }) {
    const client = this.getClient();
    const model = this.getModelName();

    const contextContent = codeContext
      .map(
        (file) =>
          `--- File: ${file.path}${file.startLine ? ` (Lines ${file.startLine}-${file.endLine || 'end'})` : ''} ---\n${file.content}`
      )
      .join('\n\n');

    const contents = [
      ...(systemInstruction ? [{ role: 'system', text: systemInstruction }] : []),
      {
        role: 'user',
        text: `Here is the verified repository context:\n\n${contextContent}\n\nTask: ${prompt}`,
      },
    ];

    const response = await client.models.generateContent({
      model,
      contents,
    });

    return response;
  }

  /**
   * Generates a structured JSON answer from Gemini using schema enforcement and strict grounding.
   *
   * @param {object} options
   * @param {string} options.prompt - Grounded user prompt with repository evidence
   * @param {string} options.systemInstruction - Strict system rules for citations & facts
   * @param {object} [options.schema] - Output JSON schema (defaults to QA_RESPONSE_SCHEMA)
   * @param {number} [options.timeoutMs=35000] - Request timeout in ms
   * @returns {Promise<{ rawText: string, data: object }>} Parsed structured response
   */
  async generateStructuredAnswer({
    prompt,
    systemInstruction,
    schema = QA_RESPONSE_SCHEMA,
    timeoutMs = 35000,
  }) {
    const client = this.getClient();
    const model = this.getModelName();

    const requestConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.2, // Low temperature for high factual accuracy
    };

    // Execute generation with timeout guard
    const generatePromise = client.models.generateContent({
      model,
      contents: prompt,
      config: requestConfig,
    });

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error(`Gemini request timed out after ${timeoutMs / 1000}s`);
        err.statusCode = 504;
        err.code = 'GEMINI_TIMEOUT';
        reject(err);
      }, timeoutMs);
    });

    let response;
    try {
      response = await Promise.race([generatePromise, timeoutPromise]);
    } catch (err) {
      // Classify error for clear developer feedback
      if (err.code === 'GEMINI_TIMEOUT') throw err;

      const message = err.message || '';
      if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        const error = new Error('Gemini API rate limit or quota exceeded. Please retry shortly.');
        error.statusCode = 429;
        error.code = 'GEMINI_QUOTA_EXCEEDED';
        throw error;
      }

      if (message.includes('API key') || message.includes('API_KEY_INVALID') || message.includes('403')) {
        const error = new Error('Invalid Gemini API key or unauthorized request. Please verify GEMINI_API_KEY.');
        error.statusCode = 401;
        error.code = 'GEMINI_AUTH_ERROR';
        throw error;
      }

      const error = new Error(`Gemini service error: ${message}`);
      error.statusCode = 502;
      error.code = 'GEMINI_API_ERROR';
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    // Extract text safely from response
    let rawText = '';
    if (typeof response?.text === 'string') {
      rawText = response.text;
    } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      rawText = response.candidates[0].content.parts[0].text;
    } else if (typeof response === 'string') {
      rawText = response;
    }

    if (!rawText || !rawText.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    // Clean JSON formatting if markdown fences were added
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Safe fallback extraction if model returned slightly malformed JSON
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse structured JSON from Gemini: ${parseErr.message}`);
      }
    }

    return {
      rawText,
      data: parsed,
    };
  }
}

export const geminiService = new GeminiService();
export default geminiService;
