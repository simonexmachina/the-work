/**
 * Helper functions for sync service tests
 */

export function createMockAuthService() {
  return {
    currentUser: null,
    isAuthenticated: vi.fn(() => Promise.resolve(false)),
    getCurrentUser: vi.fn(() => Promise.resolve(null)),
    getUserId: vi.fn(() => Promise.resolve(null)),
    getToken: vi.fn(() => Promise.resolve(null)),
    signUp: vi.fn(() => Promise.resolve({ uid: 'test-uid', email: 'test@example.com' })),
    signIn: vi.fn(() => Promise.resolve({ uid: 'test-uid', email: 'test@example.com' })),
    signOut: vi.fn(() => Promise.resolve()),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    storeAuth: vi.fn()
  };
}

export function createMockDbService() {
  return {
    getUserWorksheets: vi.fn(() => Promise.resolve([])),
    saveWorksheet: vi.fn(() => Promise.resolve('saved-id')),
    deleteWorksheet: vi.fn(() => Promise.resolve()),
    subscribeToWorksheets: vi.fn(() => Promise.resolve(() => {}))
  };
}

export function createMockLocalDb() {
  return {
    getAllWorksheets: vi.fn(() => Promise.resolve([])),
    getWorksheetById: vi.fn(() => Promise.resolve(null)),
    saveLocalWorksheet: vi.fn(() => Promise.resolve()),
    updateLocalWorksheet: vi.fn(() => Promise.resolve())
  };
}

export function createMockFirebase() {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    getIdToken: vi.fn(() => Promise.resolve('test-token'))
  };

  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: vi.fn((callback) => {
      mockAuth._authStateCallback = callback;
      return () => {};
    }),
    createUserWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: mockUser })),
    signInWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: mockUser })),
    signOut: vi.fn(() => Promise.resolve())
  };

  const mockDoc = {
    id: 'test-doc-id',
    data: vi.fn(() => ({
      userId: 'test-user-id',
      situation: 'Test situation',
      date: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    })),
    exists: true
  };

  const mockQuery = {
    where: vi.fn(function() { return this; }),
    orderBy: vi.fn(function() { return this; }),
    get: vi.fn(() => Promise.resolve({
      docs: [mockDoc]
    })),
    onSnapshot: vi.fn((callback) => {
      setTimeout(() => {
        callback({
          docs: [mockDoc]
        });
      }, 0);
      return () => {};
    })
  };

  const mockCollection = {
    doc: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve(mockDoc)),
      set: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve())
    })),
    add: vi.fn(() => Promise.resolve({
      id: 'new-doc-id'
    })),
    where: vi.fn(() => mockQuery),
    orderBy: vi.fn(() => mockQuery)
  };

  const mockFirestore = vi.fn(() => mockCollection);

  return {
    apps: [],
    initializeApp: vi.fn(() => ({})),
    auth: vi.fn(() => mockAuth),
    firestore: mockFirestore,
    _mocks: {
      auth: mockAuth,
      firestore: mockFirestore,
      collection: mockCollection,
      query: mockQuery,
      doc: mockDoc,
      user: mockUser
    }
  };
}

