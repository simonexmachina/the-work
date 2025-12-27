/**
 * Sync Service for Cross-Device Synchronization
 *
 * This module handles syncing worksheets between IndexedDB (local) and a remote backend.
 * Currently designed for Firebase, but can be adapted for other backends.
 */

export class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncStarted = false; // Track if sync has been started
    this.pendingSyncs = [];
    this.listeners = [];

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
      this.processPendingSyncs();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  }

  /**
   * Initialize the sync service with authentication
   * @param {Object} authService - Authentication service instance
   * @param {Object} dbService - Database service instance (Firestore, etc.)
   */
  async initialize(authService, dbService) {
    this.auth = authService;
    this.db = dbService;

    // Pass auth service to db service for token refresh
    if (this.db && this.db.setAuthService) {
      this.db.setAuthService(authService);
    }

    if (await this.auth.isAuthenticated()) {
      await this.startSync();
    }
  }

  /**
   * Start syncing - perform initial sync and set up listeners
   */
  async startSync() {
    console.log('[startSync] Called');
    if (!(await this.auth.isAuthenticated())) {
      console.warn('[startSync] Cannot start sync: user not authenticated');
      return;
    }

    // Prevent multiple simultaneous sync starts
    if (this.syncStarted) {
      console.log('[startSync] Sync already started, skipping duplicate startSync call');
      return;
    }

    this.syncStarted = true;
    console.log('[startSync] Notifying listeners: sync-started');
    this.notifyListeners('sync-started');

    try {
      await this.performInitialSync();
      console.log('[startSync] performInitialSync completed');
      await this.setupRealtimeListeners();
      console.log('[startSync] setupRealtimeListeners completed');
    } catch (error) {
      console.error('[startSync] Error starting sync:', error);
      this.syncStarted = false; // Reset on error so it can be retried
      this.notifyListeners('sync-error', error);
    }
  }

  /**
   * Stop syncing - remove listeners
   */
  stopSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.syncStarted = false; // Reset so sync can be started again
    this.notifyListeners('sync-stopped');
  }

  /**
   * Perform initial sync when user first logs in
   * Merges local and remote data, handling deletions via tombstones
   */
  async performInitialSync() {
    console.log('[performInitialSync] Starting...');
    if (this.syncInProgress) {
      console.log('[performInitialSync] Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;
    console.log('[performInitialSync] Notifying listeners: sync-progress initial-sync');
    this.notifyListeners('sync-progress', { status: 'initial-sync' });

    try {
      const userId = await this.auth.getUserId();
      console.log('[performInitialSync] User ID:', userId);
      const localWorksheets = await this.getAllLocalWorksheets();
      console.log('[performInitialSync] Local worksheets:', localWorksheets.length);
      const remoteWorksheets = await this.db.getUserWorksheets(userId); // includes deleted
      console.log('[performInitialSync] Remote worksheets:', remoteWorksheets.length);

      // Create maps for easier lookup by ID
      const localMap = new Map(localWorksheets.map(w => [w.id, w]));
      const remoteMap = new Map(remoteWorksheets.map(w => [w.id, w]));

      const toUpload = [];
      const toDownload = [];
      const toDeleteLocally = [];

      // Find worksheets that need syncing
      for (const [id, local] of localMap) {
        const remote = remoteMap.get(id);

        if (!remote) {
          // Only in local
          if (!local.deleted) {
            // Not deleted locally, upload to remote
            toUpload.push(local);
          }
          // If deleted locally but not on remote, we already uploaded it
        } else {
          // In both - check timestamps and deletion status
          const localTime = new Date(local.updatedAt || local.date);
          const remoteTime = new Date(remote.updatedAt || remote.date);

          // Handle deleted worksheets
          if (remote.deleted && !local.deleted) {
            // Remote was deleted, delete locally
            toDeleteLocally.push(id);
          } else if (local.deleted && !remote.deleted) {
            // Local was deleted, upload deletion
            toUpload.push(local);
          } else if (localTime > remoteTime) {
            // Local is newer - upload
            toUpload.push(local);
          } else if (remoteTime > localTime) {
            // Remote is newer - download
            toDownload.push(remote);
          }
          // If equal, no sync needed
        }
      }

      // Find worksheets only in remote
      for (const [id, remote] of remoteMap) {
        if (!localMap.has(id)) {
          if (remote.deleted) {
            // Remote is deleted but we don't have it locally - just ignore
            continue;
          }
          // New worksheet on remote - download
          toDownload.push(remote);
        }
      }

      // Upload local-only or newer local worksheets
      for (const worksheet of toUpload) {
        await this.db.saveWorksheet(userId, worksheet);
      }

      // Download remote-only or newer remote worksheets
      for (const worksheet of toDownload) {
        await this.saveLocalWorksheet(worksheet);
      }

      // Delete locally worksheets that were deleted remotely
      for (const id of toDeleteLocally) {
        await this.deleteLocalWorksheet(id);
      }

      console.log('[performInitialSync] Sync complete - uploaded:', toUpload.length, 'downloaded:', toDownload.length, 'deleted:', toDeleteLocally.length);
      console.log('[performInitialSync] Notifying listeners: sync-progress complete');
      this.notifyListeners('sync-progress', {
        status: 'complete',
        uploaded: toUpload.length,
        downloaded: toDownload.length,
        deleted: toDeleteLocally.length,
      });
    } catch (error) {
      console.error('[performInitialSync] Error during initial sync:', error);
      
      // Check if it's an auth error
      if (this.isAuthError(error)) {
        console.warn('Initial sync failed due to authentication error');
        this.notifyListeners('auth-error', error);
        // Stop sync - user needs to re-authenticate
        this.stopSync();
      }
      
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Check if an error is an authentication error
   */
  isAuthError(error) {
    if (!error) return false;
    
    const authErrorMessages = [
      'Authentication expired',
      'Please sign in again',
      'permission-denied',
      'unauthenticated'
    ];

    return authErrorMessages.some(msg => 
      error.message?.includes(msg) || 
      error.code?.includes(msg)
    );
  }

  /**
   * Sync a single worksheet to the cloud
   * @param {Object} worksheet - Worksheet to sync
   */
  async syncWorksheetToCloud(worksheet) {
    if (!(await this.auth.isAuthenticated())) {
      // Queue for later if not authenticated
      this.pendingSyncs.push({ type: 'upload', data: worksheet });
      return;
    }

    if (!this.isOnline) {
      // Queue for later if offline
      this.pendingSyncs.push({ type: 'upload', data: worksheet });
      return;
    }

    try {
      const userId = await this.auth.getUserId();
      await this.db.saveWorksheet(userId, worksheet);

      // Update local worksheet with sync timestamp
      worksheet.syncedAt = new Date().toISOString();
      await this.updateLocalWorksheet(worksheet);

      this.notifyListeners('worksheet-synced', worksheet);
    } catch (error) {
      console.error('Error syncing worksheet to cloud:', error);
      
      // Check if it's an auth error
      if (this.isAuthError(error)) {
        console.warn('Sync failed due to authentication error');
        this.notifyListeners('auth-error', error);
        // Don't queue auth errors - user needs to re-authenticate
      } else {
        // Queue other errors for retry
        this.pendingSyncs.push({ type: 'upload', data: worksheet });
      }
      
      throw error;
    }
  }

  /**
   * Process any pending syncs (when coming back online or after login)
   */
  async processPendingSyncs() {
    if (!this.isOnline || !(await this.auth.isAuthenticated())) {
      return;
    }

    const pending = [...this.pendingSyncs];
    this.pendingSyncs = [];

    for (const pendingSync of pending) {
      try {
        if (pendingSync.type === 'upload') {
          await this.syncWorksheetToCloud(pendingSync.data);
        }
      } catch (error) {
        console.error('Error processing pending sync:', error);
        // Re-queue if it fails
        this.pendingSyncs.push(pendingSync);
      }
    }
  }

  /**
   * Set up real-time listeners for remote changes
   */
  async setupRealtimeListeners() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    try {
      const userId = await this.auth.getUserId();
      this.unsubscribe = await this.db.subscribeToWorksheets(userId, async worksheets => {
        // Handle remote updates (including deletions)
        for (const remoteWorksheet of worksheets) {
          const localWorksheet = await this.getLocalWorksheetById(remoteWorksheet.id);

          if (!localWorksheet) {
            // New worksheet from remote
            if (!remoteWorksheet.deleted) {
              // Only add if not deleted
              await this.saveLocalWorksheet(remoteWorksheet);
              this.notifyListeners('worksheet-added', remoteWorksheet);
            }
          } else {
            // Exists locally - check for updates or deletions
            const localTime = new Date(localWorksheet.updatedAt || localWorksheet.date);
            const remoteTime = new Date(remoteWorksheet.updatedAt || remoteWorksheet.date);

            if (remoteWorksheet.deleted && !localWorksheet.deleted) {
              // Remote was deleted - delete locally
              await this.deleteLocalWorksheet(remoteWorksheet.id);
              this.notifyListeners('worksheet-deleted', { id: remoteWorksheet.id });
            } else if (remoteTime > localTime) {
              // Remote is newer - update local
              await this.saveLocalWorksheet(remoteWorksheet);
              this.notifyListeners('worksheet-updated', remoteWorksheet);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error setting up real-time listeners:', error);
      
      // Check if it's an auth error
      if (this.isAuthError(error)) {
        console.warn('Real-time listener setup failed due to authentication error');
        this.notifyListeners('auth-error', error);
        this.stopSync();
      }
    }
  }

  /**
   * Add a listener for sync events
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Delegate methods to be implemented by the app
  async getAllLocalWorksheets() {
    throw new Error('getAllLocalWorksheets must be implemented');
  }

  async getLocalWorksheetById(_id) {
    throw new Error('getLocalWorksheetById must be implemented');
  }

  async saveLocalWorksheet(_worksheet) {
    throw new Error('saveLocalWorksheet must be implemented');
  }

  async updateLocalWorksheet(_worksheet) {
    throw new Error('updateLocalWorksheet must be implemented');
  }

  async deleteLocalWorksheet(_id) {
    throw new Error('deleteLocalWorksheet must be implemented');
  }
}
