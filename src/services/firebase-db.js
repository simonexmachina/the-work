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
  constructor() {
    this.db = null;
    this.initialized = false;
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

    try {
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
    } catch (error) {
      console.error('Error getting user worksheets:', error);
      throw error;
    }
  }

  /**
   * Save a worksheet (create or update)
   * @param {string} userId - User ID
   * @param {Object} worksheet - Worksheet data
   * @returns {Promise<string>} Document ID
   */
  async saveWorksheet(userId, worksheet) {
    await this.initialize();

    try {
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
    } catch (error) {
      console.error('Error saving worksheet:', error);
      throw error;
    }
  }

  /**
   * Delete a worksheet (soft delete with tombstone)
   * @param {string} userId - User ID
   * @param {string} worksheetId - Worksheet ID
   */
  async deleteWorksheet(userId, worksheetId) {
    await this.initialize();

    try {
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
    } catch (error) {
      console.error('Error deleting worksheet:', error);
      throw error;
    }
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
