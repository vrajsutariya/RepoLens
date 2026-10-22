import { GoogleGenAI } from '@google/genai';
import { config, isGeminiConfigured } from '../config/env.js';

/**
 * Gemini Service Module
 *
 * Encapsulates Google Gemini API communication using the official @google/genai SDK.
 * Keeps the API key strictly on the backend and enforces structured code context boundaries.
 */
class GeminiService {
  constructor() {
    this._client = null;
  }

  /**
   * Lazily initialize and return the GoogleGenAI client instance.
   * Throws a descriptive error if the API key is not configured.
   */
  getClient() {
    if (!isGeminiConfigured()) {
      throw new Error(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in your server environment.'
      );
    }

    if (!this._client) {
      this._client = new GoogleGenAI({
        apiKey: config.geminiApiKey,
      });
    }

    return this._client;
  }

  /**
   * Checks if Gemini is configured without throwing.
   */
  isConfigured() {
    return isGeminiConfigured();
  }

  /**
   * Gets the configured Gemini model name.
   */
  getModelName() {
    return config.geminiModel;
  }

  /**
   * Prepare and analyze structured repository context with Gemini.
   *
   * Service Boundary: This function expects structured, relevant code excerpts,
   * file paths, and AST/dependency summaries rather than arbitrary raw repository dumps.
   *
   * @param {Object} options
   * @param {string} options.prompt - Specific developer query or architectural instruction.
   * @param {Array<{ path: string, content: string, startLine?: number, endLine?: number }>} options.codeContext - Curated code excerpts with citations.
   * @param {string} [options.systemInstruction] - Grounding instructions for architectural reasoning.
   */
  async analyzeCodeContext({ prompt, codeContext = [], systemInstruction = '' }) {
    if (!this.isConfigured()) {
      throw new Error(
        'Cannot invoke Gemini analysis: GEMINI_API_KEY is not configured on the backend.'
      );
    }

    const client = this.getClient();
    const model = this.getModelName();

    // Prepare structured context payload with file/line evidence metadata
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
}

export const geminiService = new GeminiService();
export default geminiService;
