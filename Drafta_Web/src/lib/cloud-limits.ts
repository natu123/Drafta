// Firestore save limits without loading Firestore, for the importer on screens that never sign in (the Playground).
export const CLOUD_LIMITS = { documentBytes: 450000, transactionBytes: 8000000, changedNotes: 400 } as const;
