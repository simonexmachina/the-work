import { useState, useEffect, useCallback } from 'react';
import { SyncService } from '../services/sync-service.js';
import { FirebaseDbService } from '../services/firebase-db.js';
import {
  getAllWorksheets,
  getWorksheetById,
  saveLocalWorksheet,
  deleteLocalWorksheet,
} from '../utils/db';

let syncServiceInstance = null;
let dbServiceInstance = null;

export function useSync(authService, onSyncEvent) {
  const [syncService, setSyncService] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initSync() {
      if (!authService) return;

      try {
        if (!dbServiceInstance) {
          dbServiceInstance = new FirebaseDbService();
        }

        if (!syncServiceInstance) {
          syncServiceInstance = new SyncService();

          // Connect sync service to local database
          syncServiceInstance.getAllLocalWorksheets = getAllWorksheets;
          syncServiceInstance.getLocalWorksheetById = getWorksheetById;
          syncServiceInstance.saveLocalWorksheet = saveLocalWorksheet;
          syncServiceInstance.updateLocalWorksheet = saveLocalWorksheet;
          syncServiceInstance.deleteLocalWorksheet = deleteLocalWorksheet;

          await syncServiceInstance.initialize(authService, dbServiceInstance);

          // Add listener for sync events
          syncServiceInstance.addListener((event, data) => {
            if (event === 'sync-progress') {
              if (data.status === 'initial-sync') {
                setSyncing(true);
              } else if (data.status === 'complete') {
                setSyncing(false);
              }
            }

            if (onSyncEvent) {
              onSyncEvent(event, data);
            }
          });
        }

        if (mounted) {
          setSyncService(syncServiceInstance);
        }
      } catch (error) {
        console.error('Error initializing sync:', error);
      }
    }

    initSync();

    return () => {
      mounted = false;
    };
  }, [authService, onSyncEvent]);

  const performSync = useCallback(async () => {
    if (!syncService || !authService) return;

    const isAuthenticated = await authService.isAuthenticated();
    if (!isAuthenticated) return;

    try {
      setSyncing(true);
      await syncService.performInitialSync();
    } catch (error) {
      console.error('Error performing sync:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [syncService, authService]);

  const syncWorksheet = useCallback(
    async worksheet => {
      if (!syncService || !authService) return;

      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) return;

      try {
        await syncService.syncWorksheetToCloud(worksheet);
      } catch (error) {
        console.error('Error syncing worksheet:', error);
      }
    },
    [syncService, authService]
  );

  return {
    syncService,
    syncing,
    performSync,
    syncWorksheet,
  };
}
