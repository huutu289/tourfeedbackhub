'use server';

/**
 * @fileOverview An AI agent to detect the language of feedback messages.
 *
 * - detectFeedbackLanguage - A function that detects the language of a feedback message.
 * - DetectFeedbackLanguageInput - The input type for the detectFeedbackLanguage function.
 * - DetectFeedbackLanguageOutput - The return type for the detectFeedbackLanguage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectFeedbackLanguageInputSchema = z.object({
  message: z.string().describe('The feedback message to analyze.'),
});
export type DetectFeedbackLanguageInput = z.infer<
  typeof DetectFeedbackLanguageInputSchema
>;

const DetectFeedbackLanguageOutputSchema = z.object({
  language: z
    .string()
    .describe('The detected language of the feedback message.'),
  confidence: z
    .number()
    .describe('The confidence level of the language detection (0-1).'),
});
export type DetectFeedbackLanguageOutput = z.infer<
  typeof DetectFeedbackLanguageOutputSchema
>;

export async function detectFeedbackLanguage(
  input: DetectFeedbackLanguageInput
): Promise<DetectFeedbackLanguageOutput> {
  return detectFeedbackLanguageFlow(input);
}

const detectFeedbackLanguagePrompt = ai.definePrompt({
  name: 'detectFeedbackLanguagePrompt',
  input: {schema: DetectFeedbackLanguageInputSchema},
  output: {schema: DetectFeedbackLanguageOutputSchema},
  prompt: `Determine the language of the following text and the confidence level:

Text: {{{message}}}

Respond with the language and a confidence level between 0 and 1. The language MUST be an ISO 639-1 code. Confidence must be a number between 0 and 1.

Ensure the output is formatted as a JSON object matching this schema:
`,
});

const detectFeedbackLanguageFlow = ai.defineFlow(
  {
    name: 'detectFeedbackLanguageFlow',
    inputSchema: DetectFeedbackLanguageInputSchema,
    outputSchema: DetectFeedbackLanguageOutputSchema,
  },
  async input => {
    const {output} = await detectFeedbackLanguagePrompt(input);
    return output!;
  }
);
