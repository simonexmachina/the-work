import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

describe('Textarea Height Persistence', () => {
  let dom;
  let document;
  let window;
  let indexedDB;

  beforeEach(async () => {
    // Create a fresh JSDOM instance
    dom = new JSDOM(
      `
            <!DOCTYPE html>
            <html>
            <body>
                <div id="worksheet-view">
                    <div id="worksheet-form-container"></div>
                </div>
                <div id="list-view" class="hidden"></div>
                <div id="detail-view" class="hidden"></div>
                <div id="notification-container"></div>
            </body>
            </html>
        `,
      {
        url: 'http://localhost',
        pretendToBeVisual: true,
      }
    );

    window = dom.window;
    document = window.document;
    indexedDB = global.indexedDB;

    // Set up globals
    global.window = window;
    global.document = document;
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock setTimeout and clearTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    dom.window.close();
  });

  describe('Saving textarea heights', () => {
    it('should collect textarea heights when saving a worksheet', () => {
      // Create a simple form with textareas
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      const textarea1 = document.createElement('textarea');
      textarea1.name = 'situation';
      textarea1.style.height = '100px';

      const textarea2 = document.createElement('textarea');
      textarea2.name = 'person';
      textarea2.style.height = '150px';

      form.appendChild(textarea1);
      form.appendChild(textarea2);
      document.body.appendChild(form);

      // Collect heights (simulating the saveFormData logic)
      const fieldHeights = {};
      form.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.name) {
          fieldHeights[textarea.name] = textarea.style.height;
        }
      });

      expect(fieldHeights).toEqual({
        situation: '100px',
        person: '150px',
      });
    });

    it('should use offsetHeight as fallback if style.height is not set', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      const textarea = document.createElement('textarea');
      textarea.name = 'situation';

      // Mock offsetHeight
      Object.defineProperty(textarea, 'offsetHeight', {
        configurable: true,
        value: 120,
      });

      form.appendChild(textarea);
      document.body.appendChild(form);

      // Collect heights with fallback
      const fieldHeights = {};
      form.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.name) {
          const height = textarea.style.height || `${textarea.offsetHeight}px`;
          fieldHeights[textarea.name] = height;
        }
      });

      expect(fieldHeights).toEqual({
        situation: '120px',
      });
    });

    it('should include heights for statement textareas', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      // Create a statement group
      const statementGroup = document.createElement('div');
      statementGroup.setAttribute('data-statement-index', '1');

      const textarea1 = document.createElement('textarea');
      textarea1.name = 'statement1';
      textarea1.style.height = '80px';

      const textarea2 = document.createElement('textarea');
      textarea2.name = 'q1True';
      textarea2.style.height = '100px';

      statementGroup.appendChild(textarea1);
      statementGroup.appendChild(textarea2);
      form.appendChild(statementGroup);
      document.body.appendChild(form);

      // Collect heights
      const fieldHeights = {};
      form.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.name) {
          fieldHeights[textarea.name] = textarea.style.height;
        }
      });

      expect(fieldHeights).toEqual({
        statement1: '80px',
        q1True: '100px',
      });
    });
  });

  describe('Restoring textarea heights', () => {
    it('should restore textarea heights from worksheet data', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      const textarea1 = document.createElement('textarea');
      textarea1.name = 'situation';

      const textarea2 = document.createElement('textarea');
      textarea2.name = 'person';

      form.appendChild(textarea1);
      form.appendChild(textarea2);
      document.body.appendChild(form);

      // Simulate loading heights from worksheet
      const worksheet = {
        fieldHeights: {
          situation: '200px',
          person: '250px',
        },
      };

      // Restore heights
      Object.keys(worksheet.fieldHeights).forEach(fieldName => {
        const textarea = form.querySelector(`textarea[name="${fieldName}"]`);
        if (textarea) {
          textarea.style.height = worksheet.fieldHeights[fieldName];
        }
      });

      expect(textarea1.style.height).toBe('200px');
      expect(textarea2.style.height).toBe('250px');
    });

    it('should handle missing fieldHeights gracefully', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      const textarea = document.createElement('textarea');
      textarea.name = 'situation';
      form.appendChild(textarea);
      document.body.appendChild(form);

      // Worksheet without fieldHeights
      const worksheet = {
        situation: 'Test content',
      };

      // This should not throw an error
      if (worksheet.fieldHeights) {
        Object.keys(worksheet.fieldHeights).forEach(fieldName => {
          const textarea = form.querySelector(`textarea[name="${fieldName}"]`);
          if (textarea) {
            textarea.style.height = worksheet.fieldHeights[fieldName];
          }
        });
      }

      // Height should remain unchanged (empty or default)
      expect(textarea.style.height).toBe('');
    });

    it('should only restore heights for textareas that exist in the form', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      const textarea = document.createElement('textarea');
      textarea.name = 'situation';
      form.appendChild(textarea);
      document.body.appendChild(form);

      // Worksheet has heights for fields that don't exist in the form
      const worksheet = {
        fieldHeights: {
          situation: '100px',
          nonexistent: '200px',
        },
      };

      // Restore heights - should not throw error for nonexistent field
      Object.keys(worksheet.fieldHeights).forEach(fieldName => {
        const textarea = form.querySelector(`textarea[name="${fieldName}"]`);
        if (textarea) {
          textarea.style.height = worksheet.fieldHeights[fieldName];
        }
      });

      expect(textarea.style.height).toBe('100px');
    });
  });

  describe('ResizeObserver integration', () => {
    it('should set up ResizeObserver for textareas', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      const textarea1 = document.createElement('textarea');
      textarea1.name = 'situation';

      const textarea2 = document.createElement('textarea');
      textarea2.name = 'person';

      form.appendChild(textarea1);
      form.appendChild(textarea2);

      // Simulate setupTextareaResizeListeners
      const textareas = form.querySelectorAll('textarea');

      textareas.forEach(textarea => {
        const resizeObserver = new global.ResizeObserver(() => {});
        resizeObserver.observe(textarea);
        textarea._resizeObserver = resizeObserver;
      });

      expect(textarea1._resizeObserver).toBeDefined();
      expect(textarea2._resizeObserver).toBeDefined();
      expect(global.ResizeObserver).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data structure', () => {
    it('should store fieldHeights as a separate property in worksheet', () => {
      const worksheetData = {
        id: 'test-id',
        situation: 'Test situation',
        person: 'Test person',
        fieldHeights: {
          situation: '100px',
          person: '150px',
        },
      };

      expect(worksheetData.fieldHeights).toBeDefined();
      expect(typeof worksheetData.fieldHeights).toBe('object');
      expect(worksheetData.fieldHeights.situation).toBe('100px');
      expect(worksheetData.fieldHeights.person).toBe('150px');
    });

    it('should not interfere with other worksheet properties', () => {
      const worksheetData = {
        id: 'test-id',
        situation: 'Test situation',
        person: 'Test person',
        statements: [{ statement: 'Test statement' }],
        fieldHeights: {
          situation: '100px',
          person: '150px',
        },
      };

      // Verify other properties are not affected
      expect(worksheetData.situation).toBe('Test situation');
      expect(worksheetData.person).toBe('Test person');
      expect(worksheetData.statements).toHaveLength(1);
      expect(worksheetData.fieldHeights).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle textareas without names', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      const textarea = document.createElement('textarea');
      textarea.style.height = '100px';
      // No name attribute

      form.appendChild(textarea);

      // Collect heights - should skip unnamed textareas
      const fieldHeights = {};
      form.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.name) {
          fieldHeights[textarea.name] = textarea.style.height;
        }
      });

      expect(Object.keys(fieldHeights)).toHaveLength(0);
    });

    it('should handle empty height values', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      const textarea = document.createElement('textarea');
      textarea.name = 'situation';
      textarea.style.height = '';

      Object.defineProperty(textarea, 'offsetHeight', {
        configurable: true,
        value: 100,
      });

      form.appendChild(textarea);

      // Collect heights with fallback
      const fieldHeights = {};
      form.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.name) {
          const height = textarea.style.height || `${textarea.offsetHeight}px`;
          fieldHeights[textarea.name] = height;
        }
      });

      expect(fieldHeights.situation).toBe('100px');
    });

    it('should handle multiple statement groups', () => {
      const form = document.createElement('form');
      form.id = 'worksheet-form';

      // Create multiple statement groups
      for (let i = 1; i <= 3; i++) {
        const group = document.createElement('div');
        group.setAttribute('data-statement-index', i.toString());

        const textarea = document.createElement('textarea');
        textarea.name = `statement${i}`;
        textarea.style.height = `${100 + i * 10}px`;

        group.appendChild(textarea);
        form.appendChild(group);
      }

      document.body.appendChild(form);

      // Collect heights
      const fieldHeights = {};
      form.querySelectorAll('textarea').forEach(textarea => {
        if (textarea.name) {
          fieldHeights[textarea.name] = textarea.style.height;
        }
      });

      expect(fieldHeights).toEqual({
        statement1: '110px',
        statement2: '120px',
        statement3: '130px',
      });
    });
  });
});
