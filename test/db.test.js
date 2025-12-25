import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Import the app functions - we'll need to expose them or test them indirectly
// Since app.js uses module-level code, we'll test IndexedDB operations directly

describe('IndexedDB Operations', () => {
  let db;
  const DB_NAME = 'TheWorkDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'worksheets';

  beforeEach(async () => {
    // Close existing database if open
    if (db) {
      db.close();
    }

    // Delete existing database
    await new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Ignore errors if DB doesn't exist
      deleteRequest.onblocked = () => resolve();
    });

    // Create fresh database
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          objectStore.createIndex('date', 'date', { unique: false });
        }
      };
    });
  });

  it('should create a database and object store', () => {
    expect(db).toBeTruthy();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
    expect(db.objectStoreNames.contains(STORE_NAME)).toBe(true);
  });

  it('should save a worksheet', async () => {
    const worksheet = {
      id: 'test-id-1',
      situation: 'Test situation',
      person: 'Test person',
      date: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(worksheet);

      request.onsuccess = () => {
        expect(request.result).toBeTruthy();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  });

  it('should retrieve a worksheet by ID', async () => {
    const worksheet = {
      id: 'test-id-2',
      situation: 'Test situation',
      person: 'Test person',
      date: new Date().toISOString(),
    };

    // First save
    const savedId = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(worksheet);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Then retrieve
    const retrieved = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(savedId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    expect(retrieved).toBeTruthy();
    expect(retrieved.situation).toBe(worksheet.situation);
    expect(retrieved.person).toBe(worksheet.person);
  });

  it('should retrieve all worksheets', async () => {
    const worksheets = [
      { id: 'test-id-3', situation: 'Situation 1', date: new Date().toISOString() },
      { id: 'test-id-4', situation: 'Situation 2', date: new Date().toISOString() },
      { id: 'test-id-5', situation: 'Situation 3', date: new Date().toISOString() },
    ];

    // Save all
    for (const ws of worksheets) {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(ws);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Retrieve all
    const all = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    expect(all.length).toBe(3);
  });

  it('should update an existing worksheet', async () => {
    const worksheet = {
      id: 'test-id-6',
      situation: 'Original situation',
      date: new Date().toISOString(),
    };

    // Save
    const id = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(worksheet);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Update
    const updated = { ...worksheet, id, situation: 'Updated situation' };
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(updated);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Verify update
    const retrieved = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    expect(retrieved.situation).toBe('Updated situation');
  });

  it('should delete a worksheet', async () => {
    const worksheet = {
      id: 'test-id-7',
      situation: 'To be deleted',
      date: new Date().toISOString(),
    };

    // Save
    const id = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(worksheet);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Delete
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Verify deletion
    const retrieved = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    expect(retrieved).toBeUndefined();
  });
});
