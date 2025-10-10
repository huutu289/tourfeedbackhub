import { NextResponse } from 'next/server';
import { summarizeFeedback } from '@/ai/flows/summarize-feedback';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const result = await summarizeFeedback({ feedbackMessage: message });
    return NextResponse.json({ summary: result.summary, language: result.language });
  } catch (error) {
    console.error('Summarize API error', error);
    return NextResponse.json({ error: 'Failed to summarise feedback.' }, { status: 500 });
  }
}
