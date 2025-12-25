/**
 * Firebase Authentication Service Implementation
 *
 * Concrete implementation of AuthService using Firebase Auth v11 Modular API.
 *
 * Setup Instructions:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Email/Password authentication in Firebase Console
 * 3. Copy your Firebase config and set it in FIREBASE_CONFIG in app.js
 * 4. Firebase SDK is loaded via import map in index.html
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

export class FirebaseAuthService {
  constructor(firebaseConfig) {
    this.config = firebaseConfig;
    this.auth = null;
    this.app = null;
    this.initialized = false;
    this.currentUser = null;
    this.listeners = [];
  }

  /**
   * Add a listener for auth events
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  /**
   * Store auth data and notify listeners
   */
  storeAuth(user, token) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      if (token) {
        localStorage.setItem('auth_token', token);
      }
      this.notifyListeners('signin', user);
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to get from localStorage
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        return this.currentUser;
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }

    // Try to get from Firebase
    if (this.auth && this.auth.currentUser) {
      this.currentUser = {
        uid: this.auth.currentUser.uid,
        email: this.auth.currentUser.email,
        displayName: this.auth.currentUser.displayName,
      };
      return this.currentUser;
    }

    return null;
  }

  /**
   * Get the user ID
   */
  async getUserId() {
    const user = await this.getCurrentUser();
    return user ? user.uid : null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  }

  /**
   * Initialize Firebase Auth
   */
  async initialize() {
    if (this.initialized) return;

    if (!this.config) {
      throw new Error('Firebase config not provided. Please set FIREBASE_CONFIG.');
    }

    // Initialize Firebase using modular API
    const existingApps = getApps();
    if (existingApps.length === 0) {
      this.app = initializeApp(this.config);
    } else {
      this.app = existingApps[0];
    }

    this.auth = getAuth(this.app);
    this.initialized = true;

    // Listen for auth state changes
    onAuthStateChanged(this.auth, user => {
      if (user) {
        this.storeAuth(
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          },
          null
        );
      } else {
        this.currentUser = null;
        localStorage.removeItem('auth_user');
        this.notifyListeners('signout');
      }
    });

    // Check if user is already signed in
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      this.storeAuth(
        {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
        },
        null
      );
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(email, password) {
    await this.initialize();

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      // Note: onAuthStateChanged will handle the rest automatically
      return userCredential.user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(email, password) {
    await this.initialize();

    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      // Note: onAuthStateChanged will handle the rest automatically
      return userCredential.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    if (this.auth) {
      await firebaseSignOut(this.auth);
    }
    // onAuthStateChanged will handle clearing the user and notifying listeners
  }

  /**
   * Get the authentication token
   */
  async getToken() {
    if (!this.auth || !this.auth.currentUser) {
      return null;
    }

    try {
      return await this.auth.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Format Firebase errors into user-friendly messages
   */
  formatError(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
      'auth/weak-password': 'Password is too weak. Please use a stronger password.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
    };

    const message =
      errorMessages[error.code] || error.message || 'An error occurred. Please try again.';
    return new Error(message);
  }
}
