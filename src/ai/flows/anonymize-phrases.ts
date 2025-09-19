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
  prompt: `You are an expert at anonymizing text. You will be given an array of phrases.
Your task is to rewrite them to obscure the original author's writing style and specific topics, while preserving the core meaning.

IMPORTANT: Your response MUST be a valid JSON object. It should contain a single key "anonymizedPhrases", which is an array of strings. Do not output any other text, markdown, or explanations before or after the JSON object.

Example Input: { "phrases": ["I love hiking in the mountains every weekend.", "My favorite food is sushi."] }
Example Output: { "anonymizedPhrases": ["This person enjoys outdoor activities in elevated terrains.", "They have a preference for a certain type of Japanese cuisine."] }

Phrases to anonymize:
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
    if (!output) {
      throw new Error("The AI model did not return a valid output.");
    }
    return output;
  }
);
