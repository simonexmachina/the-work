# Sync Functionality Tests

This document describes the test coverage for the cross-device sync functionality.

## Test Files

### 1. `auth-service.test.js`

Tests for the base `AuthService` class interface.

- Basic authentication state management
- Storage and retrieval of auth state

### 2. `firebase-auth.test.js`

Tests for `FirebaseAuthService` implementation.

- Firebase initialization
- Sign up functionality
- Sign in functionality
- Sign out functionality
- Authentication status checking
- Error handling

### 3. `firebase-db.test.js`

Tests for `FirebaseDbService` implementation.

- Firestore initialization
- Getting user worksheets
- Saving worksheets (create and update)
- Deleting worksheets
- Real-time subscriptions

### 4. `sync-service.test.js`

Tests for `SyncService` core functionality.

- Service initialization
- Initial sync logic
- Uploading local-only worksheets
- Downloading remote-only worksheets
- Conflict resolution (last-write-wins)
- Syncing to cloud when authenticated
- Offline queue management
- Processing pending syncs when coming back online

### 5. `sync-integration.test.js`

End-to-end integration tests for the sync flow.

- Saving worksheet locally and syncing to cloud
- Merging local and remote worksheets on initial sync
- Conflict resolution with timestamps
- Offline scenario handling
- Deleting worksheets locally and from cloud

## Test Helpers

### `sync-helpers.js`

Utility functions for creating mock services:

- `createMockAuthService()` - Creates a mock authentication service
- `createMockDbService()` - Creates a mock database service
- `createMockLocalDb()` - Creates a mock local database interface
- `createMockFirebase()` - Creates a complete Firebase mock with Auth and Firestore

## Running Tests

```bash
# Run all tests
npm test

# Run tests once (no watch mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

The sync functionality tests cover:

✅ **Authentication**

- Sign up, sign in, sign out
- Auth state management
- Token handling

✅ **Database Operations**

- CRUD operations on Firestore
- Real-time subscriptions
- Query operations

✅ **Sync Logic**

- Initial sync on login
- Bidirectional sync
- Conflict resolution
- Offline support
- Queue management

✅ **Integration**

- Full sync flow
- Local and remote data merging
- Error handling
- Edge cases

## Test Statistics

- **Total Test Files**: 12
- **Total Tests**: 103
- **Sync-Related Tests**: 25
  - Auth service: 1 test
  - Firebase auth: 5 tests
  - Firebase DB: 6 tests
  - Sync service: 8 tests
  - Integration: 5 tests

## Mocking Strategy

The tests use comprehensive mocking to avoid requiring actual Firebase services:

1. **Firebase Auth**: Mocked with `vi.fn()` to simulate authentication flows
2. **Firestore**: Mocked with query builders and document operations
3. **IndexedDB**: Uses `fake-indexeddb` for local database testing
4. **Network**: Tests simulate online/offline states

## Future Test Additions

Potential areas for additional test coverage:

- [ ] Error recovery scenarios
- [ ] Network failure handling
- [ ] Large dataset sync performance
- [ ] Concurrent modification handling
- [ ] Token refresh scenarios
- [ ] Security rule validation
