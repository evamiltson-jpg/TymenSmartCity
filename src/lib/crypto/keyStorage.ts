import type { StoredPrivateKey } from './types';

const DB_NAME = 'tyumen-smart-city-keys';
const DB_VERSION = 1;
const STORE_NAME = 'privateKeys';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = fn(store);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    request.onsuccess = () => resolve(request.result as T);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
};

export const loadStoredPrivateKey = async (userId: string): Promise<StoredPrivateKey | null> => {
  try {
    return (await withStore('readonly', (store) => store.get(userId))) ?? null;
  } catch {
    return null;
  }
};

export const saveStoredPrivateKey = async (record: StoredPrivateKey): Promise<void> => {
  await withStore('readwrite', (store) => store.put(record));
};

export const deleteStoredPrivateKey = async (userId: string): Promise<void> => {
  await withStore('readwrite', (store) => store.delete(userId));
};
