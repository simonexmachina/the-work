/**
 * Example Integration of Sync Service into app.js
 * 
 * This file shows how to integrate the sync functionality.
 * Copy the relevant parts into your app.js file.
 */

// ============================================================================
// 1. ADD FIREBASE CONFIG AT THE TOP OF app.js
// ============================================================================

const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ============================================================================
// 2. ADD SYNC SERVICE VARIABLES AFTER YOUR DB VARIABLES
// ============================================================================

let syncService = null;
let authService = null;
let dbService = null;

// ============================================================================
// 3. ADD INITIALIZE SYNC FUNCTION
// ============================================================================

async function initializeSync() {
    // Skip if Firebase not configured
    if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "YOUR_API_KEY_HERE") {
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
            // Save to IndexedDB without triggering another sync
            const worksheetCopy = { ...worksheet };
            await dbOperation('readwrite', (store) => {
                return worksheetCopy.id ? store.put(worksheetCopy) : store.add(worksheetCopy);
            });
        };
        syncService.updateLocalWorksheet = async (worksheet) => {
            // Update in IndexedDB
            await dbOperation('readwrite', (store) => {
                return store.put(worksheet);
            });
        };
        
        // Initialize sync
        await syncService.initialize(authService, dbService);
        
        // Listen for sync events
        syncService.addListener((event, data) => {
            if (event === 'sync-started') {
                showNotification('Sync started', 'success');
            } else if (event === 'sync-progress') {
                if (data.status === 'complete') {
                    showNotification(
                        `Sync complete: ${data.uploaded} uploaded, ${data.downloaded} downloaded`,
                        'success'
                    );
                    // Refresh the list view if we're on it
                    if (views.list && !views.list.classList.contains('hidden')) {
                        renderWorksheetsList();
                    }
                }
            } else if (event === 'sync-error') {
                showNotification('Sync error: ' + (data.message || 'Unknown error'), 'error');
            } else if (event === 'worksheet-synced') {
                console.log('Worksheet synced:', data);
            } else if (event === 'worksheet-added') {
                // New worksheet from another device
                if (views.list && !views.list.classList.contains('hidden')) {
                    renderWorksheetsList();
                }
            } else if (event === 'worksheet-updated') {
                // Updated worksheet from another device
                if (currentWorksheetId === data.id) {
                    // If viewing this worksheet, reload it
                    showWorksheetDetail(data.id);
                }
                if (views.list && !views.list.classList.contains('hidden')) {
                    renderWorksheetsList();
                }
            } else if (event === 'online') {
                showNotification('Back online. Syncing...', 'success');
            } else if (event === 'offline') {
                showNotification('You are offline. Changes will sync when you reconnect.', 'warning');
            }
        });
        
        // Listen for auth state changes
        authService.addListener((event, data) => {
            if (event === 'signin') {
                updateAuthUI();
                syncService.startSync();
            } else if (event === 'signout') {
                updateAuthUI();
                syncService.stopSync();
            }
        });
        
    } catch (error) {
        console.error('Error initializing sync:', error);
        showNotification('Error initializing sync: ' + error.message, 'error');
    }
}

// ============================================================================
// 4. MODIFY saveWorksheet TO SYNC TO CLOUD
// ============================================================================

// Replace your existing saveWorksheet function with this version:
async function saveWorksheetWithSync(worksheetData) {
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

    // Sync to cloud if sync service is available and user is authenticated
    if (syncService && authService && await authService.isAuthenticated()) {
        try {
            await syncService.syncWorksheetToCloud(worksheet);
        } catch (error) {
            console.error('Error syncing to cloud:', error);
            // Don't fail the save - it's saved locally and will sync later
        }
    }

    return savedId;
}

// ============================================================================
// 5. ADD AUTHENTICATION HANDLERS
// ============================================================================

async function handleSignUp(email, password) {
    if (!authService) {
        showNotification('Sync service not initialized', 'error');
        return;
    }

    try {
        await authService.signUp(email, password);
        showNotification('Account created successfully!', 'success');
        await syncService.startSync();
        updateAuthUI();
        // Close modal if you have one
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleSignIn(email, password) {
    if (!authService) {
        showNotification('Sync service not initialized', 'error');
        return;
    }

    try {
        await authService.signIn(email, password);
        showNotification('Signed in successfully!', 'success');
        await syncService.startSync();
        updateAuthUI();
        // Close modal if you have one
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleSignOut() {
    if (!authService) return;

    try {
        await authService.signOut();
        if (syncService) {
            syncService.stopSync();
        }
        showNotification('Signed out successfully', 'success');
        updateAuthUI();
    } catch (error) {
        showNotification('Error signing out: ' + error.message, 'error');
    }
}

function updateAuthUI() {
    if (!authService) return;

    authService.getCurrentUser().then(user => {
        const authSection = document.getElementById('auth-section');
        const userSection = document.getElementById('user-section');
        const userEmail = document.getElementById('user-email');

        if (user && authSection && userSection) {
            // User is signed in
            if (userEmail) userEmail.textContent = user.email || 'User';
            authSection.classList.add('hidden');
            userSection.classList.remove('hidden');
        } else if (authSection && userSection) {
            // User is signed out
            authSection.classList.remove('hidden');
            userSection.classList.add('hidden');
        }
    });
}

// ============================================================================
// 6. ADD MANUAL SYNC BUTTON HANDLER
// ============================================================================

async function handleManualSync() {
    if (!syncService || !authService) {
        showNotification('Sync service not available', 'error');
        return;
    }

    if (!await authService.isAuthenticated()) {
        showNotification('Please sign in to sync', 'warning');
        return;
    }

    try {
        showNotification('Syncing...', 'info');
        await syncService.performInitialSync();
        showNotification('Sync complete!', 'success');
        await renderWorksheetsList();
    } catch (error) {
        showNotification('Sync failed: ' + error.message, 'error');
    }
}

// ============================================================================
// 7. UPDATE DOMContentLoaded EVENT LISTENER
// ============================================================================

// In your existing DOMContentLoaded listener, add:
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    
    // Initialize sync (this will check if Firebase is configured)
    await initializeSync();
    
    // Update auth UI
    updateAuthUI();
    
    // Rest of your existing code...
    await restoreStateFromURL();
    
    // ... existing event listeners ...
    
    // Add auth form handlers (if you add the login UI)
    const signUpForm = document.getElementById('signup-form');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            await handleSignUp(email, password);
        });
    }
    
    const signInForm = document.getElementById('signin-form');
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;
            await handleSignIn(email, password);
        });
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleSignOut);
    }
    
    const syncBtn = document.getElementById('manual-sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', handleManualSync);
    }
});

// ============================================================================
// 8. UPDATE deleteWorksheet TO SYNC DELETION
// ============================================================================

async function deleteWorksheetWithSync(id) {
    // Delete from IndexedDB
    await dbOperation('readwrite', (store) => {
        return store.delete(id);
    });

    // Delete from cloud if authenticated
    if (syncService && authService && await authService.isAuthenticated()) {
        try {
            const userId = await authService.getUserId();
            await dbService.deleteWorksheet(userId, id);
        } catch (error) {
            console.error('Error deleting from cloud:', error);
            // Don't fail - it's deleted locally
        }
    }
}

