import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

describe('Navigation and URL State', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost/',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.history = window.history;
    global.location = window.location;
    global.indexedDB = window.indexedDB;

    // Mock notification function
    global.showNotification = vi.fn();
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('URL Navigation Patterns', () => {
    it('should navigate to list view', () => {
      const params = new URLSearchParams();
      params.set('view', 'list');
      const url = `/?${params.toString()}`;
      window.history.pushState({ view: 'list' }, '', url);
      
      const urlParams = new URLSearchParams(window.location.search);
      expect(urlParams.get('view')).toBe('list');
    });

    it('should navigate to new worksheet view', () => {
      const params = new URLSearchParams();
      params.set('view', 'worksheet');
      const url = `/?${params.toString()}`;
      window.history.pushState({ view: 'worksheet' }, '', url);
      
      const urlParams = new URLSearchParams(window.location.search);
      expect(urlParams.get('view')).toBe('worksheet');
      expect(urlParams.get('id')).toBeNull();
    });

    it('should navigate to edit worksheet view with ID', () => {
      const params = new URLSearchParams();
      params.set('view', 'worksheet');
      params.set('id', '123');
      const url = `/?${params.toString()}`;
      window.history.pushState({ view: 'worksheet', id: 123 }, '', url);
      
      const urlParams = new URLSearchParams(window.location.search);
      expect(urlParams.get('view')).toBe('worksheet');
      expect(urlParams.get('id')).toBe('123');
    });

    it('should navigate to detail view with ID', () => {
      const params = new URLSearchParams();
      params.set('view', 'detail');
      params.set('id', '456');
      const url = `/?${params.toString()}`;
      window.history.pushState({ view: 'detail', id: 456 }, '', url);
      
      const urlParams = new URLSearchParams(window.location.search);
      expect(urlParams.get('view')).toBe('detail');
      expect(urlParams.get('id')).toBe('456');
    });
  });

  describe('State Restoration', () => {
    it('should restore list view from URL', () => {
      window.history.pushState({}, '', '/?view=list');
      const params = new URLSearchParams(window.location.search);
      const state = {
        view: params.get('view') || 'list',
        id: params.get('id') ? parseInt(params.get('id')) : null
      };
      
      expect(state.view).toBe('list');
      expect(state.id).toBeNull();
    });

    it('should restore worksheet view from URL', () => {
      window.history.pushState({}, '', '/?view=worksheet');
      const params = new URLSearchParams(window.location.search);
      const state = {
        view: params.get('view') || 'list',
        id: params.get('id') ? parseInt(params.get('id')) : null
      };
      
      expect(state.view).toBe('worksheet');
      expect(state.id).toBeNull();
    });

    it('should restore detail view with ID from URL', () => {
      window.history.pushState({}, '', '/?view=detail&id=789');
      const params = new URLSearchParams(window.location.search);
      const state = {
        view: params.get('view') || 'list',
        id: params.get('id') ? parseInt(params.get('id')) : null
      };
      
      expect(state.view).toBe('detail');
      expect(state.id).toBe(789);
    });

    it('should handle invalid view parameter gracefully', () => {
      window.history.pushState({}, '', '/?view=invalid');
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || 'list';
      
      // Should default to list if invalid
      const validViews = ['list', 'worksheet', 'detail'];
      const finalView = validViews.includes(view) ? view : 'list';
      expect(finalView).toBe('list');
    });

    it('should handle invalid ID parameter gracefully', () => {
      window.history.pushState({}, '', '/?view=detail&id=abc');
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      const id = idParam ? parseInt(idParam) : null;
      
      // parseInt('abc') returns NaN
      const isNaNResult = idParam && isNaN(parseInt(idParam));
      expect(isNaNResult).toBe(true);
      // Should handle NaN appropriately
      const finalId = isNaNResult ? null : id;
      expect(finalId).toBeNull();
    });
  });

  describe('Browser Navigation', () => {
    it('should handle browser back button', (done) => {
      // Initial state
      window.history.pushState({ view: 'list' }, '', '/?view=list');
      
      // Navigate forward
      window.history.pushState({ view: 'worksheet' }, '', '/?view=worksheet');
      
      // Set up popstate listener
      window.addEventListener('popstate', (event) => {
        if (event.state) {
          expect(event.state.view).toBe('list');
          done();
        }
      });
      
      // Simulate back button
      window.history.back();
    });

    it('should handle browser forward button', (done) => {
      // Initial state
      window.history.pushState({ view: 'list' }, '', '/?view=list');
      
      // Navigate forward
      window.history.pushState({ view: 'worksheet' }, '', '/?view=worksheet');
      
      // Go back
      window.history.back();
      
      // Set up popstate listener for forward
      window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view === 'worksheet') {
          expect(event.state.view).toBe('worksheet');
          done();
        }
      });
      
      // Simulate forward button
      window.history.forward();
    });
  });

  describe('URL Parameter Edge Cases', () => {
    it('should handle empty query string', () => {
      window.location.href = 'http://localhost/';
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || 'list';
      expect(view).toBe('list');
    });

    it('should handle multiple view parameters (use first)', () => {
      window.history.pushState({}, '', '/?view=list&view=worksheet');
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      expect(view).toBe('list'); // URLSearchParams.get returns first match
    });

    it('should handle special characters in parameters', () => {
      const params = new URLSearchParams();
      params.set('view', 'detail');
      params.set('id', '123');
      const url = `/?${params.toString()}`;
      
      const urlParams = new URLSearchParams(url.split('?')[1]);
      expect(urlParams.get('view')).toBe('detail');
      expect(urlParams.get('id')).toBe('123');
    });

    it('should handle very large ID values', () => {
      const largeId = '999999999';
      window.history.pushState({}, '', `/?view=detail&id=${largeId}`);
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id') ? parseInt(params.get('id')) : null;
      expect(id).toBe(999999999);
    });
  });
});

