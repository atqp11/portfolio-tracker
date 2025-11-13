import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.AI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;

// Create the client once per module on the server
const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Forward the request to the Google GenAI SDK. We expect the client to send
    // the same object shape used previously: { model, contents, config }
    const response = await ai.models.generateContent(body as any);

    // Return only the serializable parts the client expects. The SDK returns
    // a `text` property with the generated output in these usages.
    return NextResponse.json({ text: response.text });
  } catch (err: any) {
    console.error('AI proxy error:', err);
    
    // Check if it's a rate limit error
    if (err.status === 429) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        rateLimitExceeded: true 
      }, { status: 429 });
    }
    
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
