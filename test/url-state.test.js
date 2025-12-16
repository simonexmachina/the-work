import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('URL State Management', () => {
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
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('URL Parameter Parsing', () => {
    it('should parse view parameter from URL', () => {
      window.history.pushState({}, '', '/?view=list');
      const params = new URLSearchParams(window.location.search);
      expect(params.get('view')).toBe('list');
    });

    it('should parse view and id parameters from URL', () => {
      window.history.pushState({}, '', '/?view=detail&id=123');
      const params = new URLSearchParams(window.location.search);
      expect(params.get('view')).toBe('detail');
      expect(params.get('id')).toBe('123');
    });

    it('should default to list view when no view parameter', () => {
      window.history.pushState({}, '', '/');
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || 'list';
      expect(view).toBe('list');
    });

    it('should handle missing id parameter', () => {
      window.history.pushState({}, '', '/?view=worksheet');
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id') ? parseInt(params.get('id')) : null;
      expect(id).toBeNull();
    });

    it('should parse id as integer', () => {
      window.history.pushState({}, '', '/?view=detail&id=456');
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id') ? parseInt(params.get('id')) : null;
      expect(id).toBe(456);
      expect(typeof id).toBe('number');
    });
  });

  describe('URL State Functions', () => {
    it('should create URLSearchParams object', () => {
      const params = new URLSearchParams();
      params.set('view', 'list');
      expect(params.toString()).toBe('view=list');
    });

    it('should build URL with view parameter', () => {
      const params = new URLSearchParams();
      params.set('view', 'worksheet');
      const url = `http://localhost/?${params.toString()}`;
      expect(url).toBe('http://localhost/?view=worksheet');
    });

    it('should build URL with view and id parameters', () => {
      const params = new URLSearchParams();
      params.set('view', 'detail');
      params.set('id', '789');
      const url = `http://localhost/?${params.toString()}`;
      expect(url).toContain('view=detail');
      expect(url).toContain('id=789');
    });

    it('should handle multiple URL parameters correctly', () => {
      const params = new URLSearchParams();
      params.set('view', 'worksheet');
      params.set('id', '123');
      const url = `http://localhost/?${params.toString()}`;
      const urlParams = new URLSearchParams(url.split('?')[1]);
      expect(urlParams.get('view')).toBe('worksheet');
      expect(urlParams.get('id')).toBe('123');
    });
  });

  describe('History API', () => {
    it('should support pushState', () => {
      const state = { view: 'list', id: null };
      const url = '/?view=list';
      window.history.pushState(state, '', url);
      expect(window.location.pathname).toBe('/');
      expect(window.location.search).toBe('?view=list');
    });

    it('should support popstate event', (done) => {
      const state = { view: 'detail', id: 123 };
      window.history.pushState(state, '', '/?view=detail&id=123');
      
      window.addEventListener('popstate', (event) => {
        expect(event.state).toEqual(state);
        done();
      });

      // Simulate back button
      window.history.back();
    });

    it('should update URL without page reload', () => {
      const initialURL = window.location.href;
      const state = { view: 'worksheet', id: 456 };
      window.history.pushState(state, '', '/?view=worksheet&id=456');
      
      expect(window.location.href).not.toBe(initialURL);
      expect(window.location.search).toContain('view=worksheet');
      expect(window.location.search).toContain('id=456');
    });
  });

  describe('URL State Scenarios', () => {
    it('should handle list view URL', () => {
      window.history.pushState({}, '', '/?view=list');
      const params = new URLSearchParams(window.location.search);
      const state = {
        view: params.get('view') || 'list',
        id: params.get('id') ? parseInt(params.get('id')) : null
      };
      expect(state.view).toBe('list');
      expect(state.id).toBeNull();
    });

    it('should handle new worksheet URL', () => {
      window.history.pushState({}, '', '/?view=worksheet');
      const params = new URLSearchParams(window.location.search);
      const state = {
        view: params.get('view') || 'list',
        id: params.get('id') ? parseInt(params.get('id')) : null
      };
      expect(state.view).toBe('worksheet');
      expect(state.id).toBeNull();
    });

    it('should handle edit worksheet URL', () => {
      window.history.pushState({}, '', '/?view=worksheet&id=999');
      const params = new URLSearchParams(window.location.search);
      const state = {
        view: params.get('view') || 'list',
        id: params.get('id') ? parseInt(params.get('id')) : null
      };
      expect(state.view).toBe('worksheet');
      expect(state.id).toBe(999);
    });

    it('should handle detail view URL', () => {
      window.history.pushState({}, '', '/?view=detail&id=555');
      const params = new URLSearchParams(window.location.search);
      const state = {
        view: params.get('view') || 'list',
        id: params.get('id') ? parseInt(params.get('id')) : null
      };
      expect(state.view).toBe('detail');
      expect(state.id).toBe(555);
    });
  });
});

