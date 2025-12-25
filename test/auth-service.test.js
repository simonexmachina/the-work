import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock AuthService class (based on auth-service.js)
class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.loadStoredAuth();
  }

  loadStoredAuth() {
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch (e) {
        console.error('Error loading stored auth:', e);
      }
    }
  }

  async signUp(email, password) {
    throw new Error('signUp must be implemented by concrete auth service');
  }

  async signIn(email, password) {
    throw new Error('signIn must be implemented by concrete auth service');
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    this.notifyListeners('signout');
  }

  async isAuthenticated() {
    return this.currentUser !== null;
  }

  async getCurrentUser() {
    return this.currentUser;
  }

  async getUserId() {
    if (!this.currentUser) return null;
    return this.currentUser.uid || this.currentUser.id;
  }

  async getToken() {
    const token = localStorage.getItem('auth_token');
    return token;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  storeAuth(user, token) {
    this.currentUser = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    this.notifyListeners('signin', user);
  }
}

describe('AuthService Base Class', () => {
  let dom;
  let window;
  let authService;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    window = dom.window;
    global.window = window;
    global.localStorage = window.localStorage;
    global.localStorage.clear();

    authService = new AuthService();
  });

  afterEach(() => {
    global.localStorage.clear();
    dom.window.close();
  });

  describe('Initialization', () => {
    it('should initialize with null user', () => {
      expect(authService.currentUser).toBeNull();
    });

    it('should initialize with empty listeners array', () => {
      expect(authService.listeners).toEqual([]);
    });

    it('should load stored auth from localStorage', () => {
      const user = { uid: 'test-uid', email: 'test@example.com' };
      localStorage.setItem('auth_user', JSON.stringify(user));

      const newAuthService = new AuthService();
      expect(newAuthService.currentUser).toEqual(user);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('auth_user', 'invalid json');

      const newAuthService = new AuthService();
      expect(newAuthService.currentUser).toBeNull();
    });
  });

  describe('Authentication State', () => {
    it('should return false when not authenticated', async () => {
      const result = await authService.isAuthenticated();
      expect(result).toBe(false);
    });

    it('should return true when authenticated', async () => {
      authService.currentUser = { uid: 'test-uid' };
      const result = await authService.isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return current user', async () => {
      const user = { uid: 'test-uid', email: 'test@example.com' };
      authService.currentUser = user;

      const result = await authService.getCurrentUser();
      expect(result).toEqual(user);
    });

    it('should return null when no user', async () => {
      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
    });

    it('should get user ID from uid field', async () => {
      authService.currentUser = { uid: 'test-uid' };
      const userId = await authService.getUserId();
      expect(userId).toBe('test-uid');
    });

    it('should get user ID from id field', async () => {
      authService.currentUser = { id: 'test-id' };
      const userId = await authService.getUserId();
      expect(userId).toBe('test-id');
    });

    it('should prefer uid over id', async () => {
      authService.currentUser = { uid: 'test-uid', id: 'test-id' };
      const userId = await authService.getUserId();
      expect(userId).toBe('test-uid');
    });

    it('should return null for user ID when not authenticated', async () => {
      const userId = await authService.getUserId();
      expect(userId).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should get token from localStorage', async () => {
      localStorage.setItem('auth_token', 'test-token');
      const token = await authService.getToken();
      expect(token).toBe('test-token');
    });

    it('should return null when no token', async () => {
      const token = await authService.getToken();
      expect(token).toBeNull();
    });

    it('should store token during storeAuth', () => {
      const user = { uid: 'test-uid' };
      authService.storeAuth(user, 'test-token');

      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });
  });

  describe('Sign Out', () => {
    it('should clear current user', async () => {
      authService.currentUser = { uid: 'test-uid' };
      await authService.signOut();
      expect(authService.currentUser).toBeNull();
    });

    it('should remove auth_user from localStorage', async () => {
      localStorage.setItem('auth_user', 'test');
      await authService.signOut();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    it('should remove auth_token from localStorage', async () => {
      localStorage.setItem('auth_token', 'test-token');
      await authService.signOut();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should notify listeners of signout', async () => {
      const listener = vi.fn();
      authService.addListener(listener);
      await authService.signOut();
      expect(listener).toHaveBeenCalledWith('signout', undefined);
    });
  });

  describe('Listener Management', () => {
    it('should add listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      authService.addListener(listener1);
      authService.addListener(listener2);

      expect(authService.listeners.length).toBe(2);
    });

    it('should remove listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      authService.addListener(listener1);
      authService.addListener(listener2);
      authService.removeListener(listener1);

      expect(authService.listeners.length).toBe(1);
      expect(authService.listeners[0]).toBe(listener2);
    });

    it('should notify all listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      authService.addListener(listener1);
      authService.addListener(listener2);
      authService.notifyListeners('test-event', { data: 'test' });

      expect(listener1).toHaveBeenCalledWith('test-event', { data: 'test' });
      expect(listener2).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      authService.addListener(errorListener);
      authService.addListener(goodListener);

      // Should not throw
      authService.notifyListeners('test-event');

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();
    });

    it('should notify on signin when storeAuth is called', () => {
      const listener = vi.fn();
      authService.addListener(listener);

      const user = { uid: 'test-uid', email: 'test@example.com' };
      authService.storeAuth(user, 'test-token');

      expect(listener).toHaveBeenCalledWith('signin', user);
    });
  });

  describe('Store Auth', () => {
    it('should store user in currentUser', () => {
      const user = { uid: 'test-uid', email: 'test@example.com' };
      authService.storeAuth(user, 'test-token');
      expect(authService.currentUser).toEqual(user);
    });

    it('should store user in localStorage', () => {
      const user = { uid: 'test-uid', email: 'test@example.com' };
      authService.storeAuth(user, 'test-token');

      const stored = JSON.parse(localStorage.getItem('auth_user'));
      expect(stored).toEqual(user);
    });

    it('should store token in localStorage', () => {
      const user = { uid: 'test-uid' };
      authService.storeAuth(user, 'test-token');
      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });

    it('should work without token', () => {
      const user = { uid: 'test-uid' };
      authService.storeAuth(user, null);
      expect(authService.currentUser).toEqual(user);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Abstract Methods', () => {
    it('should throw error for signUp', async () => {
      await expect(authService.signUp('test@example.com', 'password')).rejects.toThrow(
        'signUp must be implemented by concrete auth service'
      );
    });

    it('should throw error for signIn', async () => {
      await expect(authService.signIn('test@example.com', 'password')).rejects.toThrow(
        'signIn must be implemented by concrete auth service'
      );
    });
  });
});
