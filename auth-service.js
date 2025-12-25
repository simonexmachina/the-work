/**
 * Authentication Service
 *
 * Handles user authentication. Can be implemented with various providers:
 * - Firebase Auth
 * - Supabase Auth
 * - Custom JWT-based auth
 *
 * This is an abstract interface that should be implemented for your chosen auth provider.
 */

export class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.loadStoredAuth();
  }

  /**
   * Load stored authentication state (e.g., from localStorage)
   */
  loadStoredAuth() {
    // To be implemented by concrete auth service
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch (e) {
        console.error('Error loading stored auth:', e);
      }
    }
  }

  /**
   * Sign up a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User object
   */
  async signUp(email, password) {
    throw new Error('signUp must be implemented by concrete auth service');
  }

  /**
   * Sign in an existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User object
   */
  async signIn(email, password) {
    throw new Error('signIn must be implemented by concrete auth service');
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    this.notifyListeners('signout');
  }

  /**
   * Check if user is currently authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Get the current user
   * @returns {Promise<Object|null>} User object or null
   */
  async getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get the user ID
   * @returns {Promise<string|null>} User ID or null
   */
  async getUserId() {
    if (!this.currentUser) return null;
    return this.currentUser.uid || this.currentUser.id;
  }

  /**
   * Get the authentication token
   * @returns {Promise<string|null>} Auth token or null
   */
  async getToken() {
    const token = localStorage.getItem('auth_token');
    return token;
  }

  /**
   * Add an auth state change listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove an auth state change listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners of auth state changes
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  /**
   * Store authentication state
   * @param {Object} user - User object
   * @param {string} token - Auth token
   */
  storeAuth(user, token) {
    this.currentUser = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    this.notifyListeners('signin', user);
  }
}
