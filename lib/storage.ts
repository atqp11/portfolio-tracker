/**
 * This module provides utility functions for interacting with a client-side IndexedDB database.
 * It uses the `idb` library to simplify database operations.
 *
 * The database is only initialized in a browser environment, ensuring compatibility with server-side rendering (SSR).
 */

// lib/storage.ts
import { openDB, type IDBPDatabase } from 'idb';

/**
 * The name of the IndexedDB database.
 */
const DB_NAME = 'portfolio-tracker';

/**
 * The name of the object store within the database.
 */
const STORE_NAME = 'cache';

/**
 * A promise that resolves to the initialized IndexedDB database instance.
 * If the code is running in a non-browser environment, the promise resolves to `null`.
 */
export const db = typeof window !== 'undefined'
  ? openDB(DB_NAME, 1, {
      upgrade(db: IDBPDatabase) {
        db.createObjectStore(STORE_NAME);
      },
    })
  : Promise.resolve(null);

/**
 * Retrieves a value from the IndexedDB database by its key.
 *
 * @template T - The expected type of the value.
 * @param {string} key - The key of the value to retrieve.
 * @returns {Promise<T | undefined>} A promise that resolves to the value, or `undefined` if not found or in a non-browser environment.
 */
export const get = async <T>(key: string): Promise<T | undefined> => {
  if (typeof window === 'undefined') return undefined;
  const database = await db;
  if (!database) return undefined;
  return database.get(STORE_NAME, key);
};

/**
 * Stores a value in the IndexedDB database under the specified key.
 *
 * @param {string} key - The key under which to store the value.
 * @param {any} value - The value to store.
 * @returns {Promise<void>} A promise that resolves when the value has been stored, or does nothing in a non-browser environment.
 */
export const set = async (key: string, value: any): Promise<void> => {
  if (typeof window === 'undefined') return;
  const database = await db;
  if (!database) return;
  await database.put(STORE_NAME, value, key);
};