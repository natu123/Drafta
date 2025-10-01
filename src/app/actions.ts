"use server";

import { generateInitialDraft } from "@/ai/flows/generate-initial-draft";
import { summarizeNoteContent } from "@/ai/flows/summarize-note-content";
import { z } from "zod";

const summarizeSchema = z.object({
  noteContent: z.string().min(1, "Note content cannot be empty."),
});

export async function summarizeAction(input: { noteContent: string }) {
  try {
    const validatedInput = summarizeSchema.parse(input);
    const { summary } = await summarizeNoteContent(validatedInput);
    return { success: true, summary };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}

const generateSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty."),
});

export async function generateDraftAction(input: { prompt: string }) {
    try {
        const validatedInput = generateSchema.parse(input);
        const { draft } = await generateInitialDraft(validatedInput);
        return { success: true, draft };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}
