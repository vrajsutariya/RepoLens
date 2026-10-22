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
 * Standard Structured Response Schema for Repository Onboarding Guide
 */
export const ONBOARDING_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.OBJECT,
      properties: {
        purpose: { type: Type.STRING, description: 'Core purpose and objective of the project based on repository evidence.' },
        features: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Main application features identified in the codebase.' },
        technologies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              version: { type: Type.STRING },
              confidence: { type: Type.STRING, enum: ['manifest-verified', 'code-inferred'] },
              purpose: { type: Type.STRING },
            },
            required: ['name', 'category'],
          },
        },
        missingInfo: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Important facts that cannot be determined from available evidence.' },
      },
      required: ['purpose', 'features', 'technologies'],
    },
    architecture: {
      type: Type.OBJECT,
      properties: {
        frontend: { type: Type.STRING, description: 'Frontend structure or N/A if headless/backend-only.' },
        backend: { type: Type.STRING, description: 'Backend structure and design pattern.' },
        entryPoints: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING },
              type: { type: Type.STRING },
              description: { type: Type.STRING },
              startLine: { type: Type.INTEGER },
              endLine: { type: Type.INTEGER },
            },
            required: ['path', 'type'],
          },
        },
        keyModules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING },
              responsibility: { type: Type.STRING },
              keySymbols: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['path', 'responsibility'],
          },
        },
        relationships: { type: Type.STRING, description: 'Summary of internal component relationships and coupling.' },
        recommendedGraph: { type: Type.STRING, enum: ['modules', 'api-flow', 'call-graph', 'database'] },
      },
      required: ['backend', 'relationships'],
    },
    setup: {
      type: Type.OBJECT,
      properties: {
        prerequisites: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Required runtime versions or system prerequisites.' },
        installCommands: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              command: { type: Type.STRING },
              description: { type: Type.STRING },
              isVerified: { type: Type.BOOLEAN },
              warning: { type: Type.STRING },
            },
            required: ['command', 'description'],
          },
        },
        devCommands: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              command: { type: Type.STRING },
              description: { type: Type.STRING },
              isVerified: { type: Type.BOOLEAN },
              warning: { type: Type.STRING },
            },
            required: ['command', 'description'],
          },
        },
        prodCommands: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              command: { type: Type.STRING },
              description: { type: Type.STRING },
              isVerified: { type: Type.BOOLEAN },
              warning: { type: Type.STRING },
            },
            required: ['command', 'description'],
          },
        },
        requiredServices: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              isVerified: { type: Type.BOOLEAN },
            },
            required: ['name', 'description'],
          },
        },
        expectedUrls: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['label', 'url'],
          },
        },
      },
      required: ['prerequisites', 'installCommands', 'devCommands'],
    },
    environment: {
      type: Type.OBJECT,
      properties: {
        hasExampleFile: { type: Type.BOOLEAN },
        exampleFilePath: { type: Type.STRING },
        setupInstructions: { type: Type.STRING },
        variables: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              required: { type: Type.BOOLEAN },
              placeholder: { type: Type.STRING },
              usedBy: { type: Type.STRING },
              isVerified: { type: Type.BOOLEAN },
            },
            required: ['name', 'description'],
          },
        },
      },
      required: ['hasExampleFile', 'variables'],
    },
    readingOrder: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.INTEGER },
          filePath: { type: Type.STRING },
          purpose: { type: Type.STRING },
          whyItMatters: { type: Type.STRING },
          keySymbols: { type: Type.ARRAY, items: { type: Type.STRING } },
          startLine: { type: Type.INTEGER },
          endLine: { type: Type.INTEGER },
          nextFile: { type: Type.STRING },
        },
        required: ['order', 'filePath', 'purpose', 'whyItMatters'],
      },
    },
    requestFlow: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              step: { type: Type.INTEGER },
              component: { type: Type.STRING },
              action: { type: Type.STRING },
              filePath: { type: Type.STRING },
              startLine: { type: Type.INTEGER },
              endLine: { type: Type.INTEGER },
              isVerified: { type: Type.BOOLEAN },
              confidence: { type: Type.STRING },
            },
            required: ['step', 'component', 'action'],
          },
        },
        limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['summary', 'steps'],
    },
    testingAndTroubleshooting: {
      type: Type.OBJECT,
      properties: {
        hasTests: { type: Type.BOOLEAN },
        testCommands: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              command: { type: Type.STRING },
              description: { type: Type.STRING },
              isVerified: { type: Type.BOOLEAN },
            },
            required: ['command', 'description'],
          },
        },
        testDirectories: { type: Type.ARRAY, items: { type: Type.STRING } },
        troubleshooting: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              issue: { type: Type.STRING },
              possibleCause: { type: Type.STRING },
              suggestedFix: { type: Type.STRING },
              isVerified: { type: Type.BOOLEAN },
            },
            required: ['issue', 'possibleCause', 'suggestedFix'],
          },
        },
      },
      required: ['hasTests', 'testCommands', 'troubleshooting'],
    },
  },
  required: ['overview', 'architecture', 'setup', 'environment', 'readingOrder', 'requestFlow', 'testingAndTroubleshooting'],
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
    this._inFlightRequests = new Map();
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
    return config.geminiModel || 'gemini-3.8-flash';
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
   * Includes in-flight deduplication, bounded exponential backoff for transient errors, and diagnostic timing.
   *
   * @param {object} options
   * @param {string} options.prompt - Grounded user prompt with repository evidence
   * @param {string} options.systemInstruction - Strict system rules for citations & facts
   * @param {object} [options.schema] - Output JSON schema (defaults to QA_RESPONSE_SCHEMA)
   * @param {number} [options.timeoutMs=35000] - Request timeout in ms
   * @param {number} [options.maxRetries=2] - Maximum retries for transient errors (429/503)
   * @returns {Promise<{ rawText: string, data: object }>} Parsed structured response
   */
  async generateStructuredAnswer({
    prompt,
    systemInstruction,
    schema = QA_RESPONSE_SCHEMA,
    timeoutMs = 35000,
    maxRetries = 2,
  }) {
    const client = this.getClient();
    const model = this.getModelName();

    // In-flight deduplication key based on model and prompt boundaries
    const requestKey = `${model}:${prompt?.length || 0}:${(prompt || '').slice(0, 80)}:${(prompt || '').slice(-80)}`;
    if (this._inFlightRequests.has(requestKey)) {
      return this._inFlightRequests.get(requestKey);
    }

    const executionPromise = (async () => {
      const requestConfig = {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2, // Low temperature for high factual accuracy
      };

      const startTime = Date.now();

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let timeoutId;
        const generatePromise = client.models.generateContent({
          model,
          contents: prompt,
          config: requestConfig,
        });

        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            const err = new Error(`Gemini request timed out after ${timeoutMs / 1000}s`);
            err.statusCode = 504;
            err.code = 'GEMINI_TIMEOUT';
            reject(err);
          }, timeoutMs);
        });

        try {
          const response = await Promise.race([generatePromise, timeoutPromise]);
          clearTimeout(timeoutId);

          const elapsed = Date.now() - startTime;
          console.info(
            `[GeminiService] Structured answer generated in ${elapsed}ms using model "${model}" (attempt ${attempt + 1})`
          );

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
        } catch (err) {
          clearTimeout(timeoutId);

          // Classify error for clear developer feedback
          if (err.code === 'GEMINI_TIMEOUT') throw err;

          const message = err.message || '';
          let classifiedError = err;

          if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
            classifiedError = new Error('Gemini API rate limit or quota exceeded. Please retry shortly.');
            classifiedError.statusCode = 429;
            classifiedError.code = 'GEMINI_QUOTA_EXCEEDED';
          } else if (message.includes('API key') || message.includes('API_KEY_INVALID') || message.includes('403')) {
            classifiedError = new Error('Invalid Gemini API key or unauthorized request. Please verify GEMINI_API_KEY.');
            classifiedError.statusCode = 401;
            classifiedError.code = 'GEMINI_AUTH_ERROR';
          } else if (!err.statusCode) {
            classifiedError = new Error(`Gemini service error: ${message}`);
            classifiedError.statusCode = 502;
            classifiedError.code = 'GEMINI_API_ERROR';
          }

          // Check if error is transient and retryable
          const isRetryable =
            (classifiedError.code === 'GEMINI_QUOTA_EXCEEDED' ||
              classifiedError.statusCode === 429 ||
              classifiedError.statusCode === 503) &&
            classifiedError.code !== 'GEMINI_TIMEOUT' &&
            classifiedError.code !== 'GEMINI_AUTH_ERROR';

          if (isRetryable && attempt < maxRetries) {
            const backoff = Math.min(1000 * Math.pow(2, attempt), 3000) + Math.round(Math.random() * 200);
            console.warn(
              `[GeminiService] Transient error (${classifiedError.message}). Retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})...`
            );
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }

          throw classifiedError;
        }
      }
    })();

    this._inFlightRequests.set(requestKey, executionPromise);
    try {
      return await executionPromise;
    } finally {
      this._inFlightRequests.delete(requestKey);
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
