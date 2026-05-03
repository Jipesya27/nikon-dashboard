import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, model = 'qwen3.5' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Ollama API error: ${errorData}`);
    }

    const data = await response.json();
    return NextResponse.json({ response: data.response });
  } catch (error: any) {
    console.error('Chat AI Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
