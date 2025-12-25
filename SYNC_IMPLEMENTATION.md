# Sync Implementation Guide

This guide shows how to integrate the sync functionality into your app.

## Quick Start

### 1. Update `index.html`

Add Firebase SDK scripts and sync service scripts before `app.js`:

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

### 2. Add Login UI to `index.html`

Add a login section in the header or as a modal. See the example in the updated `index.html`.

### 3. Configure Firebase in `app.js`

Add your Firebase config at the top of `app.js`:

```javascript
// Firebase Configuration
// Replace with your actual Firebase config from Firebase Console
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Initialize Sync Service

In `app.js`, after `initDB()`, initialize the sync service:

```javascript
// Initialize sync service
let syncService = null;
let authService = null;
let dbService = null;

async function initializeSync() {
    if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey) {
        console.warn('Firebase not configured. Sync disabled.');
        return;
    }

    try {
        // Initialize auth and db services
        authService = new FirebaseAuthService(FIREBASE_CONFIG);
        dbService = new FirebaseDbService();
        
        // Initialize sync service
        syncService = new SyncService();
        
        // Connect sync service to local database functions
        syncService.getAllLocalWorksheets = getAllWorksheets;
        syncService.getLocalWorksheetById = getWorksheetById;
        syncService.saveLocalWorksheet = async (worksheet) => {
            await saveWorksheet(worksheet);
        };
        syncService.updateLocalWorksheet = async (worksheet) => {
            await saveWorksheet(worksheet); // saveWorksheet handles both create and update
        };
        
        // Initialize sync
        await syncService.initialize(authService, dbService);
        
        // Listen for sync events
        syncService.addListener((event, data) => {
            if (event === 'sync-started') {
                showNotification('Sync started', 'success');
            } else if (event === 'sync-error') {
                showNotification('Sync error: ' + data.message, 'error');
            } else if (event === 'worksheet-synced') {
                console.log('Worksheet synced:', data);
            }
        });
        
    } catch (error) {
        console.error('Error initializing sync:', error);
    }
}
```

### 5. Update `saveWorksheet` to Sync

Modify your `saveWorksheet` function to also sync to cloud:

```javascript
async function saveWorksheet(worksheetData) {
    const worksheet = {
        ...worksheetData,
        date: worksheetData.date || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Save to IndexedDB first (for offline support)
    const result = await dbOperation('readwrite', (store) => {
        return worksheet.id ? store.put(worksheet) : store.add(worksheet);
    });

    const savedId = worksheet.id || result;
    worksheet.id = savedId;

    // Sync to cloud if sync service is available
    if (syncService && await authService.isAuthenticated()) {
        try {
            await syncService.syncWorksheetToCloud(worksheet);
        } catch (error) {
            console.error('Error syncing to cloud:', error);
            // Don't fail the save - it's saved locally
        }
    }

    return savedId;
}
```

### 6. Add Login/Logout Functions

Add these functions to handle authentication:

```javascript
async function handleSignUp(email, password) {
    try {
        await authService.signUp(email, password);
        showNotification('Account created successfully!', 'success');
        await syncService.startSync();
        updateAuthUI();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleSignIn(email, password) {
    try {
        await authService.signIn(email, password);
        showNotification('Signed in successfully!', 'success');
        await syncService.startSync();
        updateAuthUI();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleSignOut() {
    try {
        await authService.signOut();
        syncService.stopSync();
        showNotification('Signed out successfully', 'success');
        updateAuthUI();
    } catch (error) {
        showNotification('Error signing out', 'error');
    }
}

function updateAuthUI() {
    authService.getCurrentUser().then(user => {
        if (user) {
            // Show user info and logout button
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('user-section').classList.remove('hidden');
        } else {
            // Show login form
            document.getElementById('auth-section').classList.remove('hidden');
            document.getElementById('user-section').classList.add('hidden');
        }
    });
}
```

### 7. Call `initializeSync` on App Load

In your `DOMContentLoaded` event listener:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await initializeSync(); // Add this
    await restoreStateFromURL();
    // ... rest of your code
});
```

## Alternative: Supabase Implementation

If you prefer Supabase over Firebase, you can create similar service files:
- `supabase-auth.js` - Extends `AuthService` for Supabase
- `supabase-db.js` - Implements database operations with Supabase

The sync service will work the same way, just swap out the auth and db services.

## Testing Sync

1. **Test on same device**: Create a worksheet, sign out, sign in - it should still be there
2. **Test across devices**: 
   - Create worksheet on Device A
   - Sign in on Device B
   - Worksheet should appear after sync
3. **Test offline**: 
   - Create worksheet while offline
   - It should save locally
   - When you come back online, it should sync automatically

## Security Notes

- Never commit your Firebase config with real credentials to public repos
- Use environment variables or a config file that's in `.gitignore`
- For production, consider using Firebase App Check for additional security
- Regularly review and update your Firestore security rules

