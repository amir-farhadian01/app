/**
 * firebase.ts — Production shim entry point
 *
 * AI Studio code imports { auth, db, storage } from '../lib/firebase'.
 * In production, these are our Express/JWT/PostgreSQL implementations.
 * Vite aliases (vite.config.ts) also intercept direct 'firebase/*' imports.
 */

export { auth, googleProvider } from './shims/firebase-auth';
export { getFirestore } from './shims/firebase-firestore';
export { getStorage } from './shims/firebase-storage';

// Provide a db and storage export that AI Studio code expects
import { getFirestore } from './shims/firebase-firestore';
import { getStorage }   from './shims/firebase-storage';

export const db      = getFirestore();
export const storage = getStorage();
