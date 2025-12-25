import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

// Integration tests that test the full flow
describe('Integration Tests', () => {
  let dom;
  let document;
  let window;
  let db;

  beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;

    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);

    // Initialize database
    const DB_NAME = 'TheWorkDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'worksheets';

    // Close existing database if open
    if (db) {
      db.close();
    }

    // Delete existing database
    await new Promise(resolve => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Ignore errors if DB doesn't exist
      deleteRequest.onblocked = () => resolve();
    });

    // Create fresh database
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

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

  describe('Complete Worksheet Flow', () => {
    it('should save and retrieve a complete worksheet', async () => {
      const worksheet = {
        id: 'test-integration-1',
        situation: 'My partner was late',
        person: "I am angry at Sarah because she doesn't respect my time",
        wantChange: 'I want Sarah to be on time and communicate better',
        advice: 'Sarah should set reminders and be more considerate',
        needHappy: 'I need Sarah to value my time and show up when she says she will',
        statements: [
          {
            statement: "Sarah doesn't respect my time",
            q1True: 'Yes',
            q2Absolutely: "No, I can't absolutely know",
            q3React: 'I feel angry and resentful',
            q4Without: 'I would feel calm and understanding',
            turnaround: "I don't respect my time when I wait for her",
          },
        ],
        date: new Date().toISOString(),
      };

      // Save
      const id = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['worksheets'], 'readwrite');
        const store = transaction.objectStore('worksheets');
        const request = store.add(worksheet);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      expect(id).toBeTruthy();

      // Retrieve
      const retrieved = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['worksheets'], 'readonly');
        const store = transaction.objectStore('worksheets');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      expect(retrieved.situation).toBe(worksheet.situation);
      expect(retrieved.person).toBe(worksheet.person);
      expect(Array.isArray(retrieved.statements)).toBe(true);
      expect(retrieved.statements[0].statement).toBe(worksheet.statements[0].statement);
    });

    it('should sort worksheets by date descending', async () => {
      const worksheets = [
        {
          id: 'test-integration-2',
          situation: 'Oldest',
          date: new Date('2023-01-01').toISOString(),
        },
        {
          id: 'test-integration-3',
          situation: 'Newest',
          date: new Date('2023-12-31').toISOString(),
        },
        {
          id: 'test-integration-4',
          situation: 'Middle',
          date: new Date('2023-06-15').toISOString(),
        },
      ];

      // Save all
      for (const ws of worksheets) {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(['worksheets'], 'readwrite');
          const store = transaction.objectStore('worksheets');
          const request = store.add(ws);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Retrieve all and sort
      const all = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['worksheets'], 'readonly');
        const store = transaction.objectStore('worksheets');
        const request = store.getAll();
        request.onsuccess = () => {
          const sorted = request.result.sort((a, b) => new Date(b.date) - new Date(a.date));
          resolve(sorted);
        };
        request.onerror = () => reject(request.error);
      });

      expect(all.length).toBe(3);
      expect(all[0].situation).toBe('Newest');
      expect(all[1].situation).toBe('Middle');
      expect(all[2].situation).toBe('Oldest');
    });
  });

  describe('Data Validation', () => {
    it('should handle empty worksheet fields', async () => {
      const worksheet = {
        id: 'test-integration-5',
        situation: '',
        person: '',
        date: new Date().toISOString(),
      };

      const id = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['worksheets'], 'readwrite');
        const store = transaction.objectStore('worksheets');
        const request = store.add(worksheet);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const retrieved = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['worksheets'], 'readonly');
        const store = transaction.objectStore('worksheets');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      expect(retrieved.situation).toBe('');
      expect(retrieved.person).toBe('');
    });

    it('should handle long text fields', async () => {
      const longText = 'A'.repeat(10000);
      const worksheet = {
        id: 'test-integration-6',
        situation: longText,
        date: new Date().toISOString(),
      };

      const id = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['worksheets'], 'readwrite');
        const store = transaction.objectStore('worksheets');
        const request = store.add(worksheet);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const retrieved = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['worksheets'], 'readonly');
        const store = transaction.objectStore('worksheets');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      expect(retrieved.situation.length).toBe(10000);
    });
  });
});
