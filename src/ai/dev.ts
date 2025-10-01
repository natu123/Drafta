import { config } from 'dotenv';
config();

import '@/ai/flows/generate-initial-draft.ts';
import '@/ai/flows/summarize-note-content.ts';