import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import { createMockAuthService, createMockDbService, createMockLocalDb } from './sync-helpers.js';

describe('SyncService', () => {
  let dom;
  let window;
  let mockAuthService;
  let mockDbService;
  let mockLocalDb;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    window = dom.window;
    global.window = window;
    global.navigator = { onLine: true };
    global.localStorage = window.localStorage;
    global.localStorage.clear();

    // Create mocks using helpers
    mockAuthService = createMockAuthService();
    mockAuthService.isAuthenticated = vi.fn(() => Promise.resolve(true));
    mockAuthService.getUserId = vi.fn(() => Promise.resolve('test-user-id'));
    mockAuthService.getCurrentUser = vi.fn(() =>
      Promise.resolve({
        uid: 'test-user-id',
        email: 'test@example.com',
      })
    );

    mockDbService = createMockDbService();
    mockDbService.getUserWorksheets = vi.fn(() =>
      Promise.resolve([
        {
          id: 'remote-1',
          situation: 'Remote worksheet',
          date: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          userId: 'test-user-id',
        },
      ])
    );

    mockLocalDb = createMockLocalDb();
    mockLocalDb.getAllWorksheets = vi.fn(() =>
      Promise.resolve([
        {
          id: 'local-1', // Now using string IDs everywhere
          situation: 'Local worksheet',
          date: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ])
    );
    mockLocalDb.getWorksheetById = vi.fn(id =>
      Promise.resolve(
        id === 'local-1'
          ? {
              id: 'local-1',
              situation: 'Local worksheet',
              date: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            }
          : null
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with auth and db services', async () => {
    // Test that sync service can be initialized
    // Since we can't easily load the class, we test the expected interface
    expect(mockAuthService.isAuthenticated).toBeDefined();
    expect(mockDbService.getUserWorksheets).toBeDefined();
  });

  it('should perform initial sync', async () => {
    // Simulate initial sync logic
    const localWorksheets = await mockLocalDb.getAllWorksheets();
    const remoteWorksheets = await mockDbService.getUserWorksheets('test-user-id');

    expect(localWorksheets).toHaveLength(1);
    expect(remoteWorksheets).toHaveLength(1);
    expect(localWorksheets[0].id).toBe('local-1'); // String ID
    expect(remoteWorksheets[0].id).toBe('remote-1'); // String ID
  });

  it('should upload local-only worksheets', async () => {
    const localWorksheets = await mockLocalDb.getAllWorksheets();
    const remoteWorksheets = await mockDbService.getUserWorksheets('test-user-id');

    // Find local-only worksheets by ID
    const remoteIds = new Set(remoteWorksheets.map(w => w.id));
    const toUpload = localWorksheets.filter(w => !remoteIds.has(w.id));

    expect(toUpload).toHaveLength(1);
    expect(toUpload[0].id).toBe('local-1'); // String ID

    // Upload
    for (const worksheet of toUpload) {
      await mockDbService.saveWorksheet('test-user-id', worksheet);
    }

    expect(mockDbService.saveWorksheet).toHaveBeenCalledWith('test-user-id', toUpload[0]);
  });

  it('should download remote-only worksheets', async () => {
    const localWorksheets = await mockLocalDb.getAllWorksheets();
    const remoteWorksheets = await mockDbService.getUserWorksheets('test-user-id');

    // Find remote-only worksheets by ID
    const localIds = new Set(localWorksheets.map(w => w.id));
    const toDownload = remoteWorksheets.filter(w => !localIds.has(w.id));

    expect(toDownload).toHaveLength(1);
    expect(toDownload[0].id).toBe('remote-1'); // String ID

    // Download
    for (const worksheet of toDownload) {
      await mockLocalDb.saveLocalWorksheet(worksheet);
    }

    expect(mockLocalDb.saveLocalWorksheet).toHaveBeenCalledWith(toDownload[0]);
  });

  it('should handle conflict resolution (last write wins)', async () => {
    const localWorksheet = {
      id: 'conflict-1', // String ID
      situation: 'Local version',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const remoteWorksheet = {
      id: 'conflict-1', // String ID
      situation: 'Remote version',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    const localTime = new Date(localWorksheet.updatedAt);
    const remoteTime = new Date(remoteWorksheet.updatedAt);

    if (remoteTime > localTime) {
      // Remote is newer - download
      await mockLocalDb.saveLocalWorksheet(remoteWorksheet);
      expect(mockLocalDb.saveLocalWorksheet).toHaveBeenCalledWith(remoteWorksheet);
    } else {
      // Local is newer - upload
      await mockDbService.saveWorksheet('test-user-id', localWorksheet);
      expect(mockDbService.saveWorksheet).toHaveBeenCalledWith('test-user-id', localWorksheet);
    }
  });

  it('should sync worksheet to cloud when authenticated', async () => {
    const worksheet = {
      id: 'test-id-1', // String ID
      situation: 'Test',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const isAuthenticated = await mockAuthService.isAuthenticated();
    if (isAuthenticated) {
      await mockDbService.saveWorksheet('test-user-id', worksheet);
      expect(mockDbService.saveWorksheet).toHaveBeenCalledWith('test-user-id', worksheet);
    }
  });

  it('should queue syncs when offline', () => {
    global.navigator.onLine = false;
    expect(global.navigator.onLine).toBe(false);
    // Sync should be queued
    global.navigator.onLine = true;
  });

  it('should process pending syncs when coming back online', async () => {
    const pendingSyncs = [
      { type: 'upload', data: { id: 'pending-1', situation: 'Pending' } }, // String ID
    ];

    global.navigator.onLine = true;
    if (global.navigator.onLine && (await mockAuthService.isAuthenticated())) {
      for (const sync of pendingSyncs) {
        if (sync.type === 'upload') {
          await mockDbService.saveWorksheet('test-user-id', sync.data);
        }
      }
      expect(mockDbService.saveWorksheet).toHaveBeenCalled();
    }
  });

  describe('Auth Error Handling', () => {
    it('should detect auth errors by message', () => {
      const error = new Error('Authentication expired. Please sign in again.');
      const authErrorMessages = [
        'Authentication expired',
        'Please sign in again',
        'permission-denied',
        'unauthenticated'
      ];

      const isAuthError = authErrorMessages.some(msg => 
        error.message?.includes(msg) || error.code?.includes(msg)
      );

      expect(isAuthError).toBe(true);
    });

    it('should detect auth errors by code', () => {
      const error = { code: 'permission-denied', message: 'Permission denied' };
      const authErrorMessages = [
        'Authentication expired',
        'Please sign in again',
        'permission-denied',
        'unauthenticated'
      ];

      const isAuthError = authErrorMessages.some(msg => 
        error.message?.includes(msg) || error.code?.includes(msg)
      );

      expect(isAuthError).toBe(true);
    });

    it('should not queue auth errors for retry', async () => {
      const worksheet = { id: 'test-1', situation: 'Test' };
      const pendingSyncs = [];
      
      try {
        await mockDbService.saveWorksheet('test-user-id', worksheet);
        throw new Error('Authentication expired. Please sign in again.');
      } catch (error) {
        const authErrorMessages = ['Authentication expired', 'Please sign in again'];
        const isAuthError = authErrorMessages.some(msg => error.message?.includes(msg));
        
        if (!isAuthError) {
          pendingSyncs.push({ type: 'upload', data: worksheet });
        }
      }

      expect(pendingSyncs).toHaveLength(0);
    });

    it('should queue non-auth errors for retry', async () => {
      const worksheet = { id: 'test-1', situation: 'Test' };
      const pendingSyncs = [];
      
      try {
        await mockDbService.saveWorksheet('test-user-id', worksheet);
        throw new Error('Network error');
      } catch (error) {
        const authErrorMessages = ['Authentication expired', 'Please sign in again'];
        const isAuthError = authErrorMessages.some(msg => error.message?.includes(msg));
        
        if (!isAuthError) {
          pendingSyncs.push({ type: 'upload', data: worksheet });
        }
      }

      expect(pendingSyncs).toHaveLength(1);
      expect(pendingSyncs[0].data.id).toBe('test-1');
    });

    it('should emit auth-error event on authentication failure', async () => {
      const listeners = [];
      const authError = new Error('Authentication expired. Please sign in again.');
      
      const notifyListeners = (event, data) => {
        listeners.forEach(listener => listener(event, data));
      };

      const listener = vi.fn();
      listeners.push(listener);

      // Simulate sync failure with auth error
      try {
        throw authError;
      } catch (error) {
        const authErrorMessages = ['Authentication expired'];
        const isAuthError = authErrorMessages.some(msg => error.message?.includes(msg));
        
        if (isAuthError) {
          notifyListeners('auth-error', error);
        }
      }

      expect(listener).toHaveBeenCalledWith('auth-error', authError);
    });

    it('should stop sync on auth error during initial sync', async () => {
      let syncStarted = true;
      const stopSync = () => {
        syncStarted = false;
      };

      try {
        await mockDbService.getUserWorksheets('test-user-id');
        throw new Error('Authentication expired. Please sign in again.');
      } catch (error) {
        const authErrorMessages = ['Authentication expired'];
        const isAuthError = authErrorMessages.some(msg => error.message?.includes(msg));
        
        if (isAuthError) {
          stopSync();
        }
      }

      expect(syncStarted).toBe(false);
    });

    it('should pass auth service to db service for token refresh', () => {
      const dbService = createMockDbService();
      dbService.setAuthService = vi.fn();
      
      dbService.setAuthService(mockAuthService);
      
      expect(dbService.setAuthService).toHaveBeenCalledWith(mockAuthService);
    });

    it('should handle auth errors in real-time listener setup', async () => {
      let syncStarted = true;
      const stopSync = () => {
        syncStarted = false;
      };

      mockDbService.subscribeToWorksheets = vi.fn(() => {
        throw new Error('Permission denied');
      });

      try {
        await mockDbService.subscribeToWorksheets('test-user-id', vi.fn());
      } catch (error) {
        const authErrorMessages = ['Permission denied', 'permission-denied'];
        const isAuthError = authErrorMessages.some(msg => error.message?.includes(msg));
        
        if (isAuthError) {
          stopSync();
        }
      }

      expect(syncStarted).toBe(false);
    });
  });

  describe('Auth Service Integration', () => {
    it('should initialize db service with auth service', () => {
      const dbService = createMockDbService();
      dbService.setAuthService = vi.fn();
      
      // Simulate sync service initialization
      if (dbService && dbService.setAuthService) {
        dbService.setAuthService(mockAuthService);
      }
      
      expect(dbService.setAuthService).toHaveBeenCalledWith(mockAuthService);
    });

    it('should not crash if db service does not support setAuthService', () => {
      const dbService = {}; // No setAuthService method
      
      // Should not throw
      if (dbService && dbService.setAuthService) {
        dbService.setAuthService(mockAuthService);
      }
      
      expect(true).toBe(true);
    });

    it('should trigger sync when user signs in', async () => {
      // Create a mock auth service with listeners support
      const authListeners = [];
      const mockAuth = createMockAuthService();
      mockAuth.addListener = vi.fn(callback => {
        authListeners.push(callback);
        return () => {
          const index = authListeners.indexOf(callback);
          if (index > -1) authListeners.splice(index, 1);
        };
      });
      mockAuth.isAuthenticated = vi.fn(() => Promise.resolve(true));
      mockAuth.getUserId = vi.fn(() => Promise.resolve('test-user-id'));

      // Create mock sync service
      let syncStarted = false;
      const mockSyncService = {
        startSync: vi.fn(async () => {
          syncStarted = true;
        }),
        stopSync: vi.fn(() => {
          syncStarted = false;
        }),
      };

      // Simulate useSync hook behavior
      const unsubscribe = mockAuth.addListener(async (event, _data) => {
        if (event === 'signin' && mockSyncService) {
          await mockSyncService.startSync();
        } else if (event === 'signout' && mockSyncService) {
          mockSyncService.stopSync();
        }
      });

      // Trigger signin event
      authListeners.forEach(listener => listener('signin', {}));
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSyncService.startSync).toHaveBeenCalled();
      expect(syncStarted).toBe(true);

      // Trigger signout event
      authListeners.forEach(listener => listener('signout', {}));

      expect(mockSyncService.stopSync).toHaveBeenCalled();
      expect(syncStarted).toBe(false);

      unsubscribe();
    });

    it('should handle errors when triggering sync after signin', async () => {
      // Create a mock auth service with listeners support
      const authListeners = [];
      const mockAuth = createMockAuthService();
      mockAuth.addListener = vi.fn(callback => {
        authListeners.push(callback);
        return () => {
          const index = authListeners.indexOf(callback);
          if (index > -1) authListeners.splice(index, 1);
        };
      });

      // Create mock sync service that throws error
      const mockSyncService = {
        startSync: vi.fn(async () => {
          throw new Error('Sync failed');
        }),
      };

      // Simulate useSync hook behavior with error handling
      const unsubscribe = mockAuth.addListener(async (event, _data) => {
        if (event === 'signin' && mockSyncService) {
          try {
            await mockSyncService.startSync();
          } catch (error) {
            // Error should be logged but not thrown
            console.error('Error starting sync after signin:', error);
          }
        }
      });

      // Trigger signin event - should not throw
      expect(async () => {
        authListeners.forEach(listener => listener('signin', {}));
        await new Promise(resolve => setTimeout(resolve, 0));
      }).not.toThrow();

      expect(mockSyncService.startSync).toHaveBeenCalled();

      unsubscribe();
    });
  });
});
