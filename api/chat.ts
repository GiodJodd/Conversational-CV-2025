import type { VercelRequest, VercelResponse } from '@vercel/node';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const SYSTEM_PROMPT = `
Insert Your Prompt Here
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const messages = (body?.messages ?? []) as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing messages' });
    }

    const truncated = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-10);

    const result = await streamText({
      model: openai('gpt-5-nano'),
      system: SYSTEM_PROMPT,
      messages: truncated,
      temperature: 0.5,
    });

    const stream = result.toDataStreamResponse();
    const reader = stream.body?.getReader();
    
    if (!reader) {
      return res.status(500).json({ error: 'Failed to create stream' });
    }

    // Stream the response
    const decoder = new TextDecoder();
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        res.write(decoder.decode(value, { stream: true }));
      }
    }
    
    return res.end();
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Server error',
      details: errorMessage,
      hint: 'Check OPENAI_API_KEY is set correctly in Vercel'
    });
  }
}
