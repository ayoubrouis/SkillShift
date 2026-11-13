import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  throw new Error('GROQ_API_KEY is required – get a free key at https://console.groq.com');
}

export const openai = new OpenAI({
  apiKey,
  baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
});

/**
 * Send a chat request to Groq (OpenAI-compatible) and return the assistant's content.
 * Uses llama-3.3-70b-versatile which is available on Groq's free tier.
 */
export async function groqChat(
  messages: ChatCompletionMessageParam[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages,
    temperature: options?.temperature ?? 0.1,
    max_tokens: options?.maxTokens ?? 4096,
  });
  return completion.choices[0].message?.content ?? '';
}

