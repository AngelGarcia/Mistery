"use server";

import {
  anonymizePhrases,
  type AnonymizePhrasesInput,
} from "@/ai/flows/anonymize-phrases";

export async function getAnonymizedPhrases(
  phrases: string[]
): Promise<string[]> {
  if (!phrases || phrases.length === 0) {
    return [];
  }
  try {
    const input: AnonymizePhrasesInput = { phrases };
    const result = await anonymizePhrases(input);
    if (result && result.anonymizedPhrases) {
      return result.anonymizedPhrases;
    }
    // Fallback if AI returns unexpected format
    return phrases.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error("Error anonymizing phrases, using fallback:", error);
    // Fallback to shuffling original phrases if the flow fails
    return phrases.sort(() => Math.random() - 0.5);
  }
}
