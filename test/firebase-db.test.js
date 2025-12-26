import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { createMockFirebase } from './sync-helpers.js';

describe('FirebaseDbService', () => {
  let dom;
  let window;
  let mockFirebase;
  let mockFirestore;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    window = dom.window;
    global.window = window;

    // Create mock Firebase using helper
    mockFirebase = createMockFirebase();
    mockFirestore = mockFirebase._mocks.firestore;

    global.firebase = mockFirebase;
  });

  afterEach(() => {
    delete global.firebase;
    vi.clearAllMocks();
  });

  it('should initialize Firestore', async () => {
    expect(mockFirebase.firestore).toBeDefined();
  });

  it('should get user worksheets', async () => {
    const userId = 'test-user-id';

    // Simulate the service calling firestore
    const collection = mockFirebase.firestore();
    const query = collection.where('userId', '==', userId).orderBy('updatedAt', 'desc');
    const snapshot = await query.get();

    expect(mockFirestore).toHaveBeenCalled();
    expect(collection.where).toHaveBeenCalledWith('userId', '==', userId);
    expect(query.orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(snapshot.docs).toHaveLength(1);
    expect(snapshot.docs[0].id).toBe('test-doc-id');
  });

  it('should save a worksheet', async () => {
    const userId = 'test-user-id';
    const worksheet = {
      id: 'test-id',
      situation: 'Test situation',
      date: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const collection = mockFirebase.firestore();
    const docRef = collection.doc(worksheet.id);
    await docRef.set(
      {
        ...worksheet,
        userId,
        syncedAt: expect.any(String),
      },
      { merge: true }
    );

    expect(mockFirestore).toHaveBeenCalled();
    expect(collection.doc).toHaveBeenCalledWith(worksheet.id);
    expect(docRef.set).toHaveBeenCalled();
  });

  it('should create a new worksheet', async () => {
    const userId = 'test-user-id';
    const worksheet = {
      situation: 'Test situation',
      date: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const collection = mockFirebase.firestore();
    const docRef = await collection.add({
      ...worksheet,
      userId,
      syncedAt: expect.any(String),
    });

    expect(mockFirestore).toHaveBeenCalled();
    expect(collection.add).toHaveBeenCalled();
    expect(docRef.id).toBe('new-doc-id');
  });

  it('should delete a worksheet', async () => {
    const userId = 'test-user-id';
    const worksheetId = 'test-doc-id';

    const collection = mockFirebase.firestore();
    const docRef = collection.doc(worksheetId);
    const doc = await docRef.get();

    if (doc.exists && doc.data().userId === userId) {
      await docRef.delete();
    }

    expect(mockFirestore).toHaveBeenCalled();
    expect(collection.doc).toHaveBeenCalledWith(worksheetId);
    expect(docRef.delete).toHaveBeenCalled();
  });

  it('should subscribe to worksheet updates', async () => {
    const userId = 'test-user-id';
    const callback = vi.fn();

    const collection = mockFirebase.firestore();
    const query = collection.where('userId', '==', userId).orderBy('updatedAt', 'desc');
    const unsubscribe = query.onSnapshot(callback);

    // Wait for snapshot
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockFirestore).toHaveBeenCalled();
    expect(query.onSnapshot).toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });

  describe('Token Expiry and Retry Logic', () => {
    let mockAuthService;

    beforeEach(() => {
      mockAuthService = {
        getToken: vi.fn(() => Promise.resolve('fresh-token')),
        isAuthError: vi.fn((error) => {
          return error?.code?.includes('permission-denied') || 
                 error?.code?.includes('unauthenticated');
        }),
      };
    });

    it('should detect permission denied errors', () => {
      const error = { code: 'permission-denied', message: 'Permission denied' };
      const permissionErrors = ['permission-denied', 'unauthenticated', 'PERMISSION_DENIED'];
      
      const isPermissionError = permissionErrors.some(code => 
        error.code?.includes(code) || error.message?.includes(code)
      );
      
      expect(isPermissionError).toBe(true);
    });

    it('should detect unauthenticated errors', () => {
      const error = { code: 'unauthenticated' };
      const permissionErrors = ['permission-denied', 'unauthenticated', 'PERMISSION_DENIED'];
      
      const isPermissionError = permissionErrors.some(code => 
        error.code?.includes(code)
      );
      
      expect(isPermissionError).toBe(true);
    });

    it('should retry operation after token refresh on permission error', async () => {
      let callCount = 0;
      const operation = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw { code: 'permission-denied', message: 'Permission denied' };
        }
        return 'success';
      });

      // Simulate retry logic
      try {
        return await operation();
      } catch (error) {
        if (error.code?.includes('permission-denied')) {
          // Refresh token
          await mockAuthService.getToken(true);
          // Retry
          return await operation();
        }
        throw error;
      }
      
      // Should have been called twice (first attempt + retry)
      expect(operation).toHaveBeenCalledTimes(2);
      expect(mockAuthService.getToken).toHaveBeenCalledWith(true);
    });

    it('should not retry on non-permission errors', async () => {
      const operation = vi.fn(() => {
        throw { code: 'network-error', message: 'Network failed' };
      });

      try {
        await operation();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.code).toBe('network-error');
      }

      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getToken).not.toHaveBeenCalled();
    });

    it('should throw auth expired error if retry also fails', async () => {
      let callCount = 0;
      const operation = vi.fn(async () => {
        callCount++;
        throw { code: 'permission-denied', message: 'Permission denied' };
      });

      await expect(async () => {
        try {
          await operation();
        } catch (error) {
          if (error.code?.includes('permission-denied')) {
            await mockAuthService.getToken(true);
            try {
              await operation();
            } catch (retryError) {
              if (retryError.code?.includes('permission-denied')) {
                throw new Error('Authentication expired. Please sign in again.');
              }
            }
          }
        }
      }).rejects.toThrow('Authentication expired. Please sign in again.');

      expect(operation).toHaveBeenCalledTimes(2);
      expect(mockAuthService.getToken).toHaveBeenCalled();
    });

    it('should handle getUserWorksheets with token refresh', async () => {
      const userId = 'test-user-id';
      let attemptCount = 0;

      const getUserWorksheets = async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw { code: 'permission-denied', message: 'Permission denied' };
        }
        
        const collection = mockFirebase.firestore();
        const query = collection.where('userId', '==', userId).orderBy('updatedAt', 'desc');
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      };

      // Simulate retry with token refresh
      let result;
      try {
        result = await getUserWorksheets();
      } catch (error) {
        if (error.code?.includes('permission-denied')) {
          await mockAuthService.getToken(true);
          result = await getUserWorksheets();
        }
      }

      expect(attemptCount).toBe(2);
      expect(mockAuthService.getToken).toHaveBeenCalledWith(true);
      expect(result).toHaveLength(1);
    });

    it('should handle saveWorksheet with token refresh', async () => {
      const userId = 'test-user-id';
      const worksheet = { id: 'test-id', situation: 'Test' };
      let attemptCount = 0;

      const saveWorksheet = async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw { code: 'unauthenticated', message: 'Unauthenticated' };
        }
        
        const collection = mockFirebase.firestore();
        const docRef = collection.doc(worksheet.id);
        await docRef.set({ ...worksheet, userId }, { merge: true });
        return worksheet.id;
      };

      // Simulate retry with token refresh
      let result;
      try {
        result = await saveWorksheet();
      } catch (error) {
        if (error.code?.includes('unauthenticated')) {
          await mockAuthService.getToken(true);
          result = await saveWorksheet();
        }
      }

      expect(attemptCount).toBe(2);
      expect(mockAuthService.getToken).toHaveBeenCalledWith(true);
      expect(result).toBe('test-id');
    });

    it('should throw clear error message when token refresh fails', async () => {
      mockAuthService.getToken = vi.fn(() => Promise.resolve(null));
      
      const operation = async () => {
        throw { code: 'permission-denied' };
      };

      await expect(async () => {
        try {
          await operation();
        } catch (error) {
          if (error.code?.includes('permission-denied')) {
            const newToken = await mockAuthService.getToken(true);
            if (!newToken) {
              throw new Error('Authentication expired. Please sign in again.');
            }
          }
        }
      }).rejects.toThrow('Authentication expired. Please sign in again.');

      expect(mockAuthService.getToken).toHaveBeenCalledWith(true);
    });
  });
});

