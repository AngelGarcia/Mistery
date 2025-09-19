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
    return result.anonymizedPhrases;
  } catch (error) {
    console.error("Error anonymizing phrases:", error);
    throw new Error("Failed to anonymize phrases.");
  }
}
