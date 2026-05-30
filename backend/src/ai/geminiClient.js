import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { systemPrompt } from './projectContext.js';
import { AiNotConfiguredError, AiProviderError } from '../errors/errors.js';

let cachedModel = null;

export function isGeminiConfigured() {
  return Boolean(env.gemini.apiKey);
}

function getModel() {
  if (!isGeminiConfigured()) {
    throw new AiNotConfiguredError();
  }
  if (cachedModel) return cachedModel;
  const genAI = new GoogleGenerativeAI(env.gemini.apiKey);
  cachedModel = genAI.getGenerativeModel({
    model: env.gemini.model,
    systemInstruction: systemPrompt,
  });
  return cachedModel;
}

export async function askGemini({ history, userMessage }) {
  const model = getModel();
  try {
    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });
    const result = await chat.sendMessage(userMessage);
    const text = result.response.text();
    if (!text || !text.trim()) {
      throw new AiProviderError('AI returned an empty response');
    }
    return text;
  } catch (err) {
    if (err instanceof AiProviderError || err instanceof AiNotConfiguredError) {
      throw err;
    }
    const detail = err?.message || String(err);
    const status = err?.status ?? err?.statusText;
    logger.error('Gemini request failed', { detail, status, model: env.gemini.model });
    const exposed = env.isProd
      ? 'AI provider request failed'
      : `AI provider request failed: ${detail}`;
    throw new AiProviderError(exposed);
  }
}
