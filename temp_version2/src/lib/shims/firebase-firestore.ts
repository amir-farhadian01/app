/**
 * firebase/firestore shim
 * Implements Firestore's API surface but routes reads/writes
 * to our Express REST backend (/api/*).
 *
 * Path mapping:
 *   doc(db, 'users', id)        → GET/PUT /api/users/:id
 *   collection(db, 'services')  → GET     /api/services
 *   addDoc(collection(...))     → POST    /api/...
 */

import api from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocRef {
  _path: string;
  _segments: string[];
  _isDoc: true;
}

interface CollectionRef {
  _path: string;
  _segments: string[];
  _isCollection: true;
  _constraints: Constraint[];
}

type Ref = DocRef | CollectionRef;

interface Constraint {
  type: 'where' | 'orderBy' | 'limit' | 'startAfter';
  [key: string]: any;
}

interface DocumentSnapshot {
  id: string;
  exists: () => boolean;
  data: () => Record<string, any> | undefined;
}

interface QuerySnapshot {
  docs: DocumentSnapshot[];
  empty: boolean;
  size: number;
  forEach: (cb: (doc: DocumentSnapshot) => void) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function segmentsToApiPath(segments: string[]): string {
  // Firestore paths: ['users', userId] → /api/users/{userId}
  // Collection:      ['services']      → /api/services
  return '/api/' + segments.join('/');
}

function toDocSnap(id: string, rawData: any): DocumentSnapshot {
  const exists = rawData !== null && rawData !== undefined;
  return {
    id,
    exists: () => exists,
    data: () => (exists ? rawData : undefined),
  };
}

function buildQueryParams(constraints: Constraint[]): string {
  const params: string[] = [];
  for (const c of constraints) {
    if (c.type === 'where')   params.push(`${c.field}_${c.op}=${encodeURIComponent(c.value)}`);
    if (c.type === 'orderBy') params.push(`orderBy=${c.field}&order=${c.direction || 'asc'}`);
    if (c.type === 'limit')   params.push(`limit=${c.n}`);
  }
  return params.length ? '?' + params.join('&') : '';
}

// ─── Core API ─────────────────────────────────────────────────────────────────

export function getFirestore(_app?: any): object { return {}; }
export function initializeFirestore(_app: any, _settings: any): object { return {}; }
export function connectFirestoreEmulator() {}

export function doc(_db: any, ...pathSegments: string[]): DocRef {
  return { _path: pathSegments.join('/'), _segments: pathSegments, _isDoc: true };
}

export function collection(_db: any, ...pathSegments: string[]): CollectionRef {
  return { _path: pathSegments.join('/'), _segments: pathSegments, _isCollection: true, _constraints: [] };
}

export function query(ref: CollectionRef, ...constraints: Constraint[]): CollectionRef {
  return { ...ref, _constraints: [...(ref._constraints || []), ...constraints] };
}

export function where(field: string, op: string, value: any): Constraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction?: 'asc' | 'desc'): Constraint {
  return { type: 'orderBy', field, direction: direction || 'asc' };
}

export function limit(n: number): Constraint {
  return { type: 'limit', n };
}

export function startAfter(_doc: any): Constraint {
  return { type: 'startAfter' };
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

export function arrayUnion(...items: any[]): any[] { return items; }
export function arrayRemove(...items: any[]): any[] { return items; }
export function increment(n: number): number { return n; }
export function deleteField(): null { return null; }

// ─── Document operations ──────────────────────────────────────────────────────

export async function getDoc(ref: DocRef): Promise<DocumentSnapshot> {
  const apiPath = segmentsToApiPath(ref._segments);
  const id = ref._segments[ref._segments.length - 1];
  try {
    const data = await api.get<any>(apiPath);
    return toDocSnap(id, data);
  } catch {
    return toDocSnap(id, null);
  }
}

export async function getDocFromServer(ref: DocRef): Promise<DocumentSnapshot> {
  return getDoc(ref);
}

export async function setDoc(ref: DocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const apiPath = segmentsToApiPath(ref._segments);
  await api.put(apiPath, data);
}

export async function updateDoc(ref: DocRef, data: any): Promise<void> {
  const apiPath = segmentsToApiPath(ref._segments);
  await api.put(apiPath, data);
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  const apiPath = segmentsToApiPath(ref._segments);
  await api.delete(apiPath);
}

// ─── Collection operations ────────────────────────────────────────────────────

export async function addDoc(ref: CollectionRef, data: any): Promise<{ id: string }> {
  const apiPath = segmentsToApiPath(ref._segments);
  const result = await api.post<{ id: string }>(apiPath, data);
  return result || { id: '' };
}

export async function getDocs(ref: CollectionRef): Promise<QuerySnapshot> {
  const apiPath = segmentsToApiPath(ref._segments) + buildQueryParams(ref._constraints || []);
  try {
    const raw = await api.get<any>(apiPath);
    const items: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
    const docs = items.map((item: any) => toDocSnap(item.id ?? item._id ?? '', item));
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (cb) => docs.forEach(cb),
    };
  } catch {
    return { docs: [], empty: true, size: 0, forEach: () => {} };
  }
}

// ─── Real-time listener (polls every 5s as fallback) ─────────────────────────

export function onSnapshot(
  ref: Ref,
  callbackOrOptions: any,
  callback?: (snap: any) => void,
): () => void {
  const cb = typeof callbackOrOptions === 'function' ? callbackOrOptions : callback!;

  const fetch = async () => {
    try {
      if ((ref as CollectionRef)._isCollection) {
        const snap = await getDocs(ref as CollectionRef);
        cb(snap);
      } else {
        const snap = await getDoc(ref as DocRef);
        cb(snap);
      }
    } catch { /* ignore */ }
  };

  fetch();
  const interval = setInterval(fetch, 5000);
  return () => clearInterval(interval);
}

export function writeBatch(_db: any) {
  const ops: Array<() => Promise<void>> = [];
  return {
    set: (ref: DocRef, data: any) => { ops.push(() => setDoc(ref, data)); },
    update: (ref: DocRef, data: any) => { ops.push(() => updateDoc(ref, data)); },
    delete: (ref: DocRef) => { ops.push(() => deleteDoc(ref)); },
    commit: () => Promise.all(ops.map(op => op())),
  };
}
