/**
 * Firebase Firestore Database Service
 *
 * Handles all database operations with Firestore using v11 Modular API.
 *
 * Setup Instructions:
 * 1. Enable Firestore in Firebase Console
 * 2. Set up security rules (see FIREBASE_SECURITY_RULES.md)
 * 3. Firebase SDK is loaded via import map in index.html
 */

import { getFirestore } from 'firebase/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getApps } from 'firebase/app';

export class FirebaseDbService {
  constructor(authService = null) {
    this.db = null;
    this.initialized = false;
    this.authService = authService;
  }

  /**
   * Set the auth service for token refresh handling
   */
  setAuthService(authService) {
    this.authService = authService;
  }

  /**
   * Check if an error is a permission/auth error
   */
  isPermissionError(error) {
    if (!error) return false;
    
    const permissionErrors = [
      'permission-denied',
      'unauthenticated',
      'PERMISSION_DENIED'
    ];

    return permissionErrors.some(code => 
      error.code?.includes(code) || 
      error.message?.includes(code)
    );
  }

  /**
   * Retry a database operation with token refresh if it fails due to permissions
   */
  async retryWithTokenRefresh(operation, operationName) {
    try {
      return await operation();
    } catch (error) {
      // If it's a permission error and we have auth service, try refreshing token
      if (this.isPermissionError(error) && this.authService) {
        console.warn(`${operationName} failed with permission error, attempting token refresh...`);
        
        try {
          // Force refresh the token
          const newToken = await this.authService.getToken(true);
          
          if (!newToken) {
            console.error('Token refresh failed - user may need to sign in again');
            throw new Error('Authentication expired. Please sign in again.');
          }

          // Retry the operation with fresh token
          console.log(`Token refreshed, retrying ${operationName}...`);
          return await operation();
        } catch (retryError) {
          console.error(`Retry after token refresh failed:`, retryError);
          
          // If still failing, it might be a real auth issue
          if (this.isPermissionError(retryError)) {
            throw new Error('Authentication expired. Please sign in again.');
          }
          throw retryError;
        }
      }
      
      // Not a permission error or no auth service - just throw it
      throw error;
    }
  }

  /**
   * Initialize Firestore
   */
  async initialize() {
    if (this.initialized) return;

    // Ensure Firebase app is initialized
    const apps = getApps();
    if (apps.length === 0) {
      throw new Error('Firebase app not initialized. Please initialize Firebase Auth first.');
    }

    this.db = getFirestore(apps[0]);
    this.initialized = true;
  }

  /**
   * Get all worksheets for a user (including deleted ones for sync purposes)
   * @param {string} userId - User ID
   * @param {boolean} includeDeleted - Whether to include deleted worksheets (default: true for sync)
   * @returns {Promise<Array>} Array of worksheets
   */
  async getUserWorksheets(userId, includeDeleted = true) {
    await this.initialize();

    return this.retryWithTokenRefresh(async () => {
      const worksheetsRef = collection(this.db, 'worksheets');
      const q = query(worksheetsRef, where('userId', '==', userId), orderBy('updatedAt', 'desc'));

      const snapshot = await getDocs(q);

      const worksheets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter out deleted worksheets unless includeDeleted is true
      if (!includeDeleted) {
        return worksheets.filter(w => !w.deleted);
      }

      return worksheets;
    }, 'getUserWorksheets');
  }

  /**
   * Save a worksheet (create or update)
   * @param {string} userId - User ID
   * @param {Object} worksheet - Worksheet data
   * @returns {Promise<string>} Document ID
   */
  async saveWorksheet(userId, worksheet) {
    await this.initialize();

    return this.retryWithTokenRefresh(async () => {
      const worksheetData = {
        ...worksheet,
        userId,
        updatedAt: worksheet.updatedAt || new Date().toISOString(),
        syncedAt: new Date().toISOString(),
      };

      // Extract the ID - we'll use it as the document ID
      const { id, ...data } = worksheetData;

      if (id && typeof id === 'string' && id.length > 0) {
        // Save with the existing ID as the document ID
        const docRef = doc(this.db, 'worksheets', id);
        await setDoc(docRef, data, { merge: true });
        return id;
      } else {
        // Create new document with auto-generated ID (shouldn't happen with new system)
        console.warn('Worksheet missing ID, generating new one');
        const worksheetsRef = collection(this.db, 'worksheets');
        const docRef = await addDoc(worksheetsRef, data);
        return docRef.id;
      }
    }, 'saveWorksheet');
  }

  /**
   * Delete a worksheet (soft delete with tombstone)
   * @param {string} userId - User ID
   * @param {string} worksheetId - Worksheet ID
   */
  async deleteWorksheet(userId, worksheetId) {
    await this.initialize();

    return this.retryWithTokenRefresh(async () => {
      // Verify the worksheet belongs to the user
      const docRef = doc(this.db, 'worksheets', worksheetId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists() || docSnap.data().userId !== userId) {
        throw new Error('Worksheet not found or access denied');
      }

      // Soft delete: mark as deleted instead of removing
      await setDoc(
        docRef,
        {
          deleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }, 'deleteWorksheet');
  }

  /**
   * Subscribe to real-time updates for a user's worksheets
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function that receives array of worksheets (including deleted)
   * @returns {Promise<Function>} Promise that resolves to unsubscribe function
   */
  async subscribeToWorksheets(userId, callback) {
    await this.initialize();

    const worksheetsRef = collection(this.db, 'worksheets');
    const q = query(worksheetsRef, where('userId', '==', userId), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const worksheets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Pass all worksheets including deleted ones - sync service will handle them
        callback(worksheets);
      },
      error => {
        console.error('Error in worksheet subscription:', error);
      }
    );

    // Return unsubscribe function
    return unsubscribe;
  }
}
