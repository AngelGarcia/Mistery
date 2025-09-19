'use server';

/**
 * @fileOverview Anonymizes user-submitted phrases to remove identifiable writing style and topics.
 *
 * - anonymizePhrases - A function that anonymizes an array of phrases.
 * - AnonymizePhrasesInput - The input type for the anonymizePhrases function.
 * - AnonymizePhrasesOutput - The return type for the anonymizePhrases function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnonymizePhrasesInputSchema = z.object({
  phrases: z.array(z.string()).describe('An array of phrases to anonymize.'),
});
export type AnonymizePhrasesInput = z.infer<typeof AnonymizePhrasesInputSchema>;

const AnonymizePhrasesOutputSchema = z.object({
  anonymizedPhrases: z
    .array(z.string())
    .describe('An array of anonymized phrases.'),
});
export type AnonymizePhrasesOutput = z.infer<typeof AnonymizePhrasesOutputSchema>;

export async function anonymizePhrases(input: AnonymizePhrasesInput): Promise<AnonymizePhrasesOutput> {
  return anonymizePhrasesFlow(input);
}

const anonymizePhrasesPrompt = ai.definePrompt({
  name: 'anonymizePhrasesPrompt',
  input: {schema: AnonymizePhrasesInputSchema},
  output: {schema: AnonymizePhrasesOutputSchema},
  prompt: `You are an expert at anonymizing text. You will be given an array of phrases and you must return a JSON object with a single key "anonymizedPhrases" which contains an array of the anonymized phrases. The anonymized phrases should not be identifiable to the original author based on writing style or topics. Try to keep the meaning of the phrase the same while changing the words.

Phrases:
{{#each phrases}}
- {{{this}}}
{{/each}}`,
});

const anonymizePhrasesFlow = ai.defineFlow(
  {
    name: 'anonymizePhrasesFlow',
    inputSchema: AnonymizePhrasesInputSchema,
    outputSchema: AnonymizePhrasesOutputSchema,
  },
  async input => {
    const {output} = await anonymizePhrasesPrompt(input);
    return output!;
  }
);
