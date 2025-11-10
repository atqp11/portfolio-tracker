// lib/storage.ts
import { openDB } from 'idb';

const DB_NAME = 'portfolio-tracker';
const STORE_NAME = 'cache';

export const db = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export const get = async <T>(key: string): Promise<T | undefined> => {
  return (await db).get(STORE_NAME, key);
};

export const set = async (key: string, value: any): Promise<void> => {
  return (await db).put(STORE_NAME, value, key);
};