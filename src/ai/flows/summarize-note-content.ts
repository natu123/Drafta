'use server';

/**
 * @fileOverview A flow that summarizes the content of a note.
 *
 * - summarizeNoteContent - A function that takes note content as input and returns a summary.
 * - SummarizeNoteContentInput - The input type for the summarizeNoteContent function.
 * - SummarizeNoteContentOutput - The return type for the summarizeNoteContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeNoteContentInputSchema = z.object({
  noteContent: z.string().describe('The content of the note to summarize.'),
});
export type SummarizeNoteContentInput = z.infer<typeof SummarizeNoteContentInputSchema>;

const SummarizeNoteContentOutputSchema = z.object({
  summary: z.string().describe('A summary of the note content.'),
});
export type SummarizeNoteContentOutput = z.infer<typeof SummarizeNoteContentOutputSchema>;

export async function summarizeNoteContent(input: SummarizeNoteContentInput): Promise<SummarizeNoteContentOutput> {
  return summarizeNoteContentFlow(input);
}

const summarizeNoteContentPrompt = ai.definePrompt({
  name: 'summarizeNoteContentPrompt',
  input: {schema: SummarizeNoteContentInputSchema},
  output: {schema: SummarizeNoteContentOutputSchema},
  prompt: `Summarize the following note content:\n\n{{noteContent}}`,
});

const summarizeNoteContentFlow = ai.defineFlow(
  {
    name: 'summarizeNoteContentFlow',
    inputSchema: SummarizeNoteContentInputSchema,
    outputSchema: SummarizeNoteContentOutputSchema,
  },
  async input => {
    const {output} = await summarizeNoteContentPrompt(input);
    return output!;
  }
);
