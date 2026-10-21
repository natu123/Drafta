// Firestore save limits without loading Firestore, for the importer on screens that never sign in (the Playground).
// documentWrites: summaries, bodies and deletions in one save, below Firestore's 500 writes per transaction (specs/17).
export const CLOUD_LIMITS = { documentBytes: 450000, transactionBytes: 8000000, documentWrites: 480 } as const;
