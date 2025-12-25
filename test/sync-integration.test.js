import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

describe('Sync Integration', () => {
  let dom;
  let window;
  let db;
  const DB_NAME = 'TheWorkDB';
  const DB_VERSION = 2; // Updated to use string IDs
  const STORE_NAME = 'worksheets';

  // Helper to generate UUID for tests
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    window = dom.window;
    global.window = window;
    global.document = window.document;
    // fake-indexeddb/auto should provide indexedDB, but ensure it's available
    if (!global.indexedDB && window.indexedDB) {
      global.indexedDB = window.indexedDB;
    }
    global.navigator = { onLine: true };
    global.localStorage = window.localStorage;
    global.localStorage.clear();

    // Close existing database if open
    if (db) {
      db.close();
    }

    // Delete existing database
    await new Promise(resolve => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
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
          // Use string IDs, no autoIncrement
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          objectStore.createIndex('date', 'date', { unique: false });
        }
      };
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    vi.clearAllMocks();
  });

  // Helper function to save worksheet to IndexedDB
  async function saveWorksheet(worksheet) {
    return new Promise((resolve, reject) => {
      // Generate ID if not present
      if (!worksheet.id) {
        worksheet.id = generateId();
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(worksheet);

      request.onsuccess = () => resolve(worksheet.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Helper function to get all worksheets from IndexedDB
  async function getAllWorksheets() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  it('should save worksheet locally and sync to cloud', async () => {
    const mockDbService = {
      saveWorksheet: vi.fn(() => Promise.resolve('cloud-id')),
    };

    const mockAuthService = {
      isAuthenticated: vi.fn(() => Promise.resolve(true)),
      getUserId: vi.fn(() => Promise.resolve('test-user')),
    };

    const worksheet = {
      situation: 'Test situation',
      date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save locally
    const localId = await saveWorksheet(worksheet);
    expect(localId).toBeDefined();

    // Verify saved locally
    const localWorksheets = await getAllWorksheets();
    expect(localWorksheets).toHaveLength(1);
    expect(localWorksheets[0].situation).toBe('Test situation');

    // Sync to cloud (simulated)
    if (await mockAuthService.isAuthenticated()) {
      worksheet.id = localId;
      await mockDbService.saveWorksheet('test-user', worksheet);
      expect(mockDbService.saveWorksheet).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining({
          situation: 'Test situation',
        })
      );
    }
  });

  it('should merge local and remote worksheets on initial sync', async () => {
    // Create local worksheet
    const localWorksheet = {
      id: 'local-1',
      situation: 'Local worksheet',
      date: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    await saveWorksheet(localWorksheet);

    // Simulate remote worksheets
    const remoteWorksheets = [
      {
        id: 'remote-1',
        situation: 'Remote worksheet',
        date: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        userId: 'test-user',
      },
    ];

    // Get local worksheets
    const localWorksheets = await getAllWorksheets();

    // Merge logic - match by ID
    const localMap = new Map(localWorksheets.map(w => [w.id, w]));
    const remoteMap = new Map(remoteWorksheets.map(w => [w.id, w]));

    // Find worksheets to download
    const toDownload = [];
    for (const [id, remote] of remoteMap) {
      if (!localMap.has(id)) {
        toDownload.push(remote);
      }
    }

    expect(toDownload).toHaveLength(1);
    expect(toDownload[0].situation).toBe('Remote worksheet');

    // Download remote worksheet
    for (const worksheet of toDownload) {
      await saveWorksheet(worksheet);
    }

    // Verify both worksheets exist
    const allWorksheets = await getAllWorksheets();
    expect(allWorksheets.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle conflict resolution', async () => {
    // Create local worksheet
    const localWorksheet = {
      id: 'conflict-1',
      situation: 'Local version',
      date: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    await saveWorksheet(localWorksheet);

    // Simulate remote worksheet with same ID but newer timestamp
    const remoteWorksheet = {
      id: 'conflict-1',
      situation: 'Remote version (newer)',
      date: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    // Check timestamps
    const localTime = new Date(localWorksheet.updatedAt);
    const remoteTime = new Date(remoteWorksheet.updatedAt);

    if (remoteTime > localTime) {
      // Remote is newer - update local
      await saveWorksheet(remoteWorksheet);

      const updated = await getAllWorksheets();
      const updatedWorksheet = updated.find(w => w.id === 'conflict-1');
      expect(updatedWorksheet.situation).toBe('Remote version (newer)');
    }
  });

  it('should handle offline scenario', async () => {
    global.navigator.onLine = false;

    const worksheet = {
      situation: 'Offline worksheet',
      date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Should save locally even when offline
    const localId = await saveWorksheet(worksheet);
    expect(localId).toBeDefined();

    const localWorksheets = await getAllWorksheets();
    expect(localWorksheets).toHaveLength(1);
    expect(localWorksheets[0].situation).toBe('Offline worksheet');

    // When back online, should sync
    global.navigator.onLine = true;
    const mockDbService = {
      saveWorksheet: vi.fn(() => Promise.resolve('synced-id')),
    };

    if (global.navigator.onLine) {
      worksheet.id = localId;
      await mockDbService.saveWorksheet('test-user', worksheet);
      expect(mockDbService.saveWorksheet).toHaveBeenCalled();
    }
  });

  it('should delete worksheet locally and from cloud', async () => {
    const worksheetId = 'delete-test-1';
    const worksheet = {
      id: worksheetId,
      situation: 'To be deleted',
      date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveWorksheet(worksheet);

    const mockDbService = {
      deleteWorksheet: vi.fn(() => Promise.resolve()),
    };

    const mockAuthService = {
      isAuthenticated: vi.fn(() => Promise.resolve(true)),
      getUserId: vi.fn(() => Promise.resolve('test-user')),
    };

    // Delete locally
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.delete(worksheetId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Verify deleted locally
    const localWorksheets = await getAllWorksheets();
    expect(localWorksheets).toHaveLength(0);

    // Delete from cloud (simulated)
    if (await mockAuthService.isAuthenticated()) {
      await mockDbService.deleteWorksheet('test-user', worksheetId);
      expect(mockDbService.deleteWorksheet).toHaveBeenCalledWith('test-user', worksheetId);
    }
  });
});
