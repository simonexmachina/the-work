# Cross-Device Sync Design Document

## Overview
This document outlines the design for enabling cross-device synchronization of worksheets stored in IndexedDB.

## Requirements
1. **User Authentication**: Users need to identify themselves across devices
2. **Backend Storage**: A server to store and sync data
3. **Sync Mechanism**: Bidirectional sync between local IndexedDB and remote storage
4. **Conflict Resolution**: Handle cases where the same worksheet is edited on multiple devices
5. **Offline Support**: Continue working offline, sync when online

## Architecture Options

### Option 1: Firebase (Recommended for Quick Implementation)
**Pros:**
- Complete solution (Auth + Firestore + Real-time sync)
- Free tier available
- Easy to set up
- Real-time synchronization
- Built-in offline support

**Cons:**
- Vendor lock-in
- Requires Firebase account setup

**Implementation:**
- Firebase Authentication (Email/Password or OAuth)
- Cloud Firestore for data storage
- Firestore offline persistence
- Automatic conflict resolution via timestamps

### Option 2: Supabase
**Pros:**
- Open source
- PostgreSQL backend
- Real-time subscriptions
- Row-level security
- Free tier available

**Cons:**
- Slightly more complex setup than Firebase
- Requires Supabase account

**Implementation:**
- Supabase Auth (Email/Password or OAuth)
- PostgreSQL database with worksheets table
- Real-time subscriptions for sync
- Conflict resolution via `updatedAt` timestamps

### Option 3: Custom Backend (Node.js/Express)
**Pros:**
- Full control
- No vendor lock-in
- Can customize exactly to needs

**Cons:**
- Requires hosting infrastructure
- More development time
- Need to handle security, scaling, etc.

**Implementation:**
- Express.js API
- JWT authentication
- PostgreSQL or MongoDB database
- REST API for CRUD operations
- Manual sync polling or WebSocket for real-time

## Recommended Approach: Firebase

We'll implement Option 1 (Firebase) as it provides the fastest path to a working solution with minimal infrastructure management.

## Data Model Changes

### Current Structure (IndexedDB)
```javascript
{
  id: 1,  // Auto-increment
  date: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  situation: "...",
  person: "...",
  // ... other fields
  statements: [...]
}
```

### Synced Structure (Firestore)
```javascript
{
  id: "firebase-doc-id",  // Firebase document ID
  userId: "user-uid",     // Firebase Auth UID
  date: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  syncedAt: "2024-01-01T00:00:00.000Z",  // Last sync timestamp
  situation: "...",
  person: "...",
  // ... other fields
  statements: [...]
}
```

## Sync Strategy

### Initial Sync (First Login)
1. User logs in
2. Fetch all worksheets from Firestore for this user
3. Merge with local IndexedDB:
   - If worksheet exists in both: Use the one with newer `updatedAt`
   - If only in Firestore: Add to IndexedDB
   - If only in IndexedDB: Upload to Firestore

### Ongoing Sync
1. **On Save**: Save to IndexedDB first (for offline support), then sync to Firestore
2. **On Load**: Check for updates from Firestore
3. **Background Sync**: Periodically check for remote updates
4. **Real-time Updates**: Listen to Firestore changes for this user's worksheets

### Conflict Resolution
- Use `updatedAt` timestamp
- Last write wins (simplest approach)
- Could be enhanced with operational transforms for more sophisticated conflict resolution

## Implementation Plan

### Phase 1: Authentication
1. Add Firebase SDK
2. Create login/signup UI
3. Implement authentication flow
4. Store auth token in localStorage/sessionStorage

### Phase 2: Firestore Integration
1. Initialize Firestore
2. Create worksheets collection
3. Add user ID to all worksheets
4. Implement CRUD operations in Firestore

### Phase 3: Sync Service
1. Create sync service module
2. Implement initial sync on login
3. Implement save-to-cloud on local save
4. Implement background sync check
5. Add real-time listeners

### Phase 4: UI Updates
1. Add login/signup buttons
2. Show sync status indicator
3. Add manual sync button
4. Show user email/account info

### Phase 5: Offline Support
1. Queue sync operations when offline
2. Retry failed syncs when back online
3. Show offline indicator

## Security Considerations

1. **Authentication**: All API calls require valid auth token
2. **Data Isolation**: Users can only access their own worksheets (Firestore security rules)
3. **HTTPS**: All communication over HTTPS
4. **Token Storage**: Store tokens securely (consider httpOnly cookies for production)

## Migration Path

1. Existing users: On first login, upload all local worksheets to cloud
2. New users: Start with cloud-first approach
3. Backward compatibility: App should work offline-only if user doesn't log in

