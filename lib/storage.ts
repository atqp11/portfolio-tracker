// lib/storage.ts
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'portfolio-tracker';
const STORE_NAME = 'cache';

// Only initialize database in browser environment
export const db = typeof window !== 'undefined' 
  ? openDB(DB_NAME, 1, {
      upgrade(db: IDBPDatabase) {
        db.createObjectStore(STORE_NAME);
      },
    })
  : Promise.resolve(null);

export const get = async <T>(key: string): Promise<T | undefined> => {
  if (typeof window === 'undefined') return undefined;
  const database = await db;
  if (!database) return undefined;
  return database.get(STORE_NAME, key);
};

export const set = async (key: string, value: any): Promise<void> => {
  if (typeof window === 'undefined') return;
  const database = await db;
  if (!database) return;
  await database.put(STORE_NAME, value, key);
};