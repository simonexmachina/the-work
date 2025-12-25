# Cross-Device Sync Implementation

This directory contains everything you need to enable cross-device synchronization of your worksheets stored in IndexedDB.

## Overview

The sync solution provides:
- ✅ User authentication (email/password)
- ✅ Cloud storage for worksheets
- ✅ Automatic bidirectional sync
- ✅ Offline support (queue syncs when offline)
- ✅ Real-time updates across devices
- ✅ Conflict resolution (last-write-wins)

## Architecture

The solution is modular and consists of:

1. **`sync-service.js`** - Core sync logic that handles:
   - Initial sync on login
   - Ongoing sync on save
   - Background sync checks
   - Offline queue management
   - Real-time update listeners

2. **`auth-service.js`** - Abstract authentication interface

3. **`firebase-auth.js`** - Firebase Authentication implementation

4. **`firebase-db.js`** - Firestore database operations

## Quick Start

### Step 1: Set Up Firebase

Follow the instructions in [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md) to:
- Create a Firebase project
- Enable Authentication
- Create Firestore database
- Set up security rules
- Get your Firebase config

### Step 2: Add Scripts to HTML

Update your `index.html` to include Firebase SDK and sync services:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"></script>

<!-- Sync Services -->
<script src="auth-service.js"></script>
<script src="firebase-auth.js"></script>
<script src="firebase-db.js"></script>
<script src="sync-service.js"></script>

<!-- Your app -->
<script src="app.js"></script>
```

### Step 3: Add Login UI

Copy the login UI from [`login-ui-example.html`](./login-ui-example.html) into your `index.html`.

### Step 4: Integrate into app.js

Follow the integration guide in [`SYNC_IMPLEMENTATION.md`](./SYNC_IMPLEMENTATION.md) or use the example code in [`sync-integration-example.js`](./sync-integration-example.js).

Key steps:
1. Add Firebase config
2. Initialize sync service
3. Update `saveWorksheet` to sync
4. Add auth handlers
5. Update `DOMContentLoaded` listener

## Files Overview

| File | Purpose |
|------|---------|
| `SYNC_DESIGN.md` | Architecture and design decisions |
| `FIREBASE_SETUP.md` | Step-by-step Firebase setup guide |
| `SYNC_IMPLEMENTATION.md` | Integration instructions |
| `sync-service.js` | Core sync service |
| `auth-service.js` | Authentication interface |
| `firebase-auth.js` | Firebase auth implementation |
| `firebase-db.js` | Firestore database service |
| `sync-integration-example.js` | Example integration code |
| `login-ui-example.html` | Login UI template |

## How It Works

### Initial Sync (First Login)
1. User signs in
2. Fetch all worksheets from Firestore
3. Compare with local IndexedDB worksheets
4. Upload local-only or newer local worksheets
5. Download remote-only or newer remote worksheets

### Ongoing Sync
1. **On Save**: Save to IndexedDB → Sync to Firestore
2. **Real-time**: Listen for remote changes → Update local IndexedDB
3. **Offline**: Queue syncs → Process when back online

### Conflict Resolution
- Uses `updatedAt` timestamp
- Last write wins (simplest approach)
- Can be enhanced with operational transforms if needed

## Security

- All data is isolated per user (Firestore security rules)
- Authentication required for all operations
- HTTPS only (Firebase requirement)
- Tokens stored in localStorage (consider httpOnly cookies for production)

## Testing

1. **Same Device**: Sign out → Sign in → Worksheets should persist
2. **Cross Device**: 
   - Create worksheet on Device A
   - Sign in on Device B
   - Worksheet should appear after sync
3. **Offline**: 
   - Create worksheet offline
   - Should save locally
   - When online, should sync automatically

## Troubleshooting

### "Firebase SDK not loaded"
- Check that Firebase scripts are included in HTML
- Verify script order (Firebase before your app.js)

### "Permission denied"
- Check Firestore security rules are published
- Verify user is authenticated before accessing data

### Sync not working
- Check browser console for errors
- Verify Firebase config is correct
- Check network tab for API calls
- Ensure user is signed in

### Worksheets not appearing
- Check sync status in console
- Try manual sync button
- Verify Firestore has data (check Firebase Console)

## Alternative Implementations

The sync service is designed to be provider-agnostic. You can swap out Firebase for:

- **Supabase**: Create `supabase-auth.js` and `supabase-db.js`
- **Custom Backend**: Create custom auth and db services
- **Other Providers**: Any service that implements the same interface

## Next Steps

1. Set up Firebase (see `FIREBASE_SETUP.md`)
2. Integrate sync service (see `SYNC_IMPLEMENTATION.md`)
3. Test on multiple devices
4. Consider adding:
   - Sync status indicator
   - Sync progress bar
   - Conflict resolution UI
   - Export/import functionality

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase Console for errors
3. Check browser console for detailed error messages
4. Verify all setup steps were completed

