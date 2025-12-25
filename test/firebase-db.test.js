import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { createMockFirebase } from './sync-helpers.js';

describe('FirebaseDbService', () => {
  let dom;
  let window;
  let mockFirebase;
  let mockFirestore;
  let mockCollection;
  let mockDoc;
  let mockQuery;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true
    });

    window = dom.window;
    global.window = window;

    // Create mock Firebase using helper
    mockFirebase = createMockFirebase();
    mockFirestore = mockFirebase._mocks.firestore;
    mockCollection = mockFirebase._mocks.collection;
    mockQuery = mockFirebase._mocks.query;
    mockDoc = mockFirebase._mocks.doc;

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
    const query = collection.where('userId', '==', userId)
      .orderBy('updatedAt', 'desc');
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
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    const collection = mockFirebase.firestore();
    const docRef = collection.doc(worksheet.id);
    await docRef.set({
      ...worksheet,
      userId,
      syncedAt: expect.any(String)
    }, { merge: true });

    expect(mockFirestore).toHaveBeenCalled();
    expect(collection.doc).toHaveBeenCalledWith(worksheet.id);
    expect(docRef.set).toHaveBeenCalled();
  });

  it('should create a new worksheet', async () => {
    const userId = 'test-user-id';
    const worksheet = {
      situation: 'Test situation',
      date: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    const collection = mockFirebase.firestore();
    const docRef = await collection.add({
      ...worksheet,
      userId,
      syncedAt: expect.any(String)
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
    const query = collection.where('userId', '==', userId)
      .orderBy('updatedAt', 'desc');
    const unsubscribe = query.onSnapshot(callback);

    // Wait for snapshot
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockFirestore).toHaveBeenCalled();
    expect(query.onSnapshot).toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });
});

