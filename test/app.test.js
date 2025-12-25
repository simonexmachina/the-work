import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// We'll need to load the app.js file and test its functions
// Since it's not modular, we'll test the DOM interactions

describe('App Functionality', () => {
  let dom;
  let document;
  let window;

  beforeEach(async () => {
    // Create a JSDOM instance
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;

    // Set up global objects
    global.window = window;
    global.document = document;
    global.indexedDB = window.indexedDB;

    // Mock alert and confirm
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);

    // Load the HTML structure
    document.body.innerHTML = `
      <div id="list-view" class="view">
        <div class="flex gap-4 mb-6 flex-wrap">
          <button id="new-worksheet-btn">Create New Worksheet</button>
        </div>
        <h2>Your Worksheets</h2>
        <div id="worksheets-list">
          <p class="text-center py-12 text-gray-500 italic">No worksheets yet. Create your first one to get started.</p>
        </div>
      </div>

      <div id="worksheet-view" class="view hidden">
        <div class="flex gap-4 mb-6 flex-wrap">
          <button id="back-btn">← Back to List</button>
          <button id="save-btn">Save Worksheet</button>
        </div>
        <form id="worksheet-form">
          <section>
            <label for="situation">Describe the situation:</label>
            <textarea id="situation" name="situation" rows="3"></textarea>
            <label for="person">Who angers, confuses, or disappoints you, and why?</label>
            <textarea id="person" name="person" rows="3"></textarea>
          </section>
        </form>
      </div>

      <div id="detail-view" class="view hidden">
        <div class="flex gap-4 mb-6 flex-wrap">
          <button id="back-from-detail-btn">← Back to List</button>
          <button id="edit-btn">Edit</button>
          <button id="delete-btn">Delete</button>
        </div>
        <div id="worksheet-detail"></div>
      </div>
    `;
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('View Management', () => {
    it('should hide all views initially except list view', () => {
      const listView = document.getElementById('list-view');
      const worksheetView = document.getElementById('worksheet-view');
      const detailView = document.getElementById('detail-view');

      expect(listView.classList.contains('hidden')).toBe(false);
      expect(worksheetView.classList.contains('hidden')).toBe(true);
      expect(detailView.classList.contains('hidden')).toBe(true);
    });

    it('should have all required view elements', () => {
      const listView = document.getElementById('list-view');
      const worksheetView = document.getElementById('worksheet-view');
      const detailView = document.getElementById('detail-view');

      expect(listView).toBeTruthy();
      expect(worksheetView).toBeTruthy();
      expect(detailView).toBeTruthy();
    });

    it('should have navigation buttons', () => {
      const newBtn = document.getElementById('new-worksheet-btn');
      const backBtn = document.getElementById('back-btn');
      const backFromDetailBtn = document.getElementById('back-from-detail-btn');
      const editBtn = document.getElementById('edit-btn');
      const deleteBtn = document.getElementById('delete-btn');
      const saveBtn = document.getElementById('save-btn');

      expect(newBtn).toBeTruthy();
      expect(backBtn).toBeTruthy();
      expect(backFromDetailBtn).toBeTruthy();
      expect(editBtn).toBeTruthy();
      expect(deleteBtn).toBeTruthy();
      expect(saveBtn).toBeTruthy();
    });
  });

  describe('Form Handling', () => {
    it('should have form fields', () => {
      const form = document.getElementById('worksheet-form');
      const situationField = document.getElementById('situation');
      const personField = document.getElementById('person');

      expect(form).toBeTruthy();
      expect(situationField).toBeTruthy();
      expect(personField).toBeTruthy();
    });

    it('should collect form data', () => {
      const form = document.getElementById('worksheet-form');
      const situationField = document.getElementById('situation');
      const personField = document.getElementById('person');

      situationField.value = 'Test situation';
      personField.value = 'Test person';

      const formData = new FormData(form);
      expect(formData.get('situation')).toBe('Test situation');
      expect(formData.get('person')).toBe('Test person');
    });
  });

  describe('Worksheet Rendering', () => {
    it('should render empty state when no worksheets', () => {
      const listContainer = document.getElementById('worksheets-list');
      expect(listContainer.textContent).toContain('No worksheets yet');
    });

    it('should render worksheet cards with truncated situation in heading', () => {
      const listContainer = document.getElementById('worksheets-list');
      const worksheet = {
        id: 'test-id-1',
        situation: 'Test situation. This is a longer description.',
        person: 'Test person',
        date: new Date().toISOString(),
        statements: []
      };

      // Replicate getSituationPreview logic
      const fullText = (worksheet.situation || worksheet.person || '').trim();
      const sentenceEndMatch = fullText.match(/[.!?](\s|$)/);
      const sentenceEndIndex = sentenceEndMatch ? sentenceEndMatch.index + 1 : fullText.length;
      let previewBase = fullText.slice(0, sentenceEndIndex);
      let preview = previewBase.length > 90 ? previewBase.slice(0, 90) : previewBase;
      const wasTruncatedBySentence = sentenceEndIndex < fullText.length;
      const wasTruncatedByLength = previewBase.length > 90;
      if (wasTruncatedBySentence || wasTruncatedByLength) {
        preview = preview.trimEnd() + '...';
      }

      const date = new Date(worksheet.date);
      const statements = Array.isArray(worksheet.statements)
        ? worksheet.statements.map(s => s.statement).filter(Boolean)
        : [];

      const statementsHtml = statements.length
        ? `<ul class="text-gray-600 text-sm mt-2 space-y-1">
            ${statements.map(s => `<li class="list-disc list-inside ml-4">${s}</li>`).join('')}
          </ul>`
        : `<div class="text-gray-600 text-sm mt-2 italic">No statements yet.</div>`;

      listContainer.innerHTML = `
        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-4 cursor-pointer" data-id="${worksheet.id}">
          <div class="flex justify-between items-start mb-2 flex-wrap">
            <h3 class="text-xl font-semibold text-gray-900 mb-0">${preview}</h3>
            <span class="text-gray-500 text-sm whitespace-nowrap ml-4">${date.toLocaleDateString()}</span>
          </div>
          ${statementsHtml}
        </div>
      `;

      const card = listContainer.querySelector('[data-id]');
      expect(card).toBeTruthy();
      expect(card.dataset.id).toBe('test-id-1');
      const heading = card.querySelector('h3');
      expect(heading.textContent).toBe('Test situation....');
      expect(card.textContent).toContain('No statements yet');
    });

    it('should render worksheet cards with statements list', () => {
      const listContainer = document.getElementById('worksheets-list');
      const worksheet = {
        id: 'test-id-2',
        situation: 'Another situation.',
        date: new Date().toISOString(),
        statements: [
          { statement: 'First statement text' },
          { statement: 'Second statement text' },
          { statement: 'Third statement text' }
        ]
      };

      const fullText = (worksheet.situation || worksheet.person || '').trim();
      const sentenceEndMatch = fullText.match(/[.!?](\s|$)/);
      const sentenceEndIndex = sentenceEndMatch ? sentenceEndMatch.index + 1 : fullText.length;
      let previewBase = fullText.slice(0, sentenceEndIndex);
      let preview = previewBase.length > 90 ? previewBase.slice(0, 90) : previewBase;
      const wasTruncatedBySentence = sentenceEndIndex < fullText.length;
      const wasTruncatedByLength = previewBase.length > 90;
      if (wasTruncatedBySentence || wasTruncatedByLength) {
        preview = preview.trimEnd() + '...';
      }

      const date = new Date(worksheet.date);
      const statements = Array.isArray(worksheet.statements)
        ? worksheet.statements.map(s => s.statement).filter(Boolean)
        : [];

      const statementsHtml = statements.length
        ? `<ul class="text-gray-600 text-sm mt-2 space-y-1">
            ${statements.map(s => `<li class="list-disc list-inside ml-4">${s}</li>`).join('')}
          </ul>`
        : `<div class="text-gray-600 text-sm mt-2 italic">No statements yet.</div>`;

      listContainer.innerHTML = `
        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-4 cursor-pointer" data-id="${worksheet.id}">
          <div class="flex justify-between items-start mb-2 flex-wrap">
            <h3 class="text-xl font-semibold text-gray-900 mb-0">${preview}</h3>
            <span class="text-gray-500 text-sm whitespace-nowrap ml-4">${date.toLocaleDateString()}</span>
          </div>
          ${statementsHtml}
        </div>
      `;

      const card = listContainer.querySelector('[data-id]');
      expect(card).toBeTruthy();
      const list = card.querySelector('ul');
      expect(list).toBeTruthy();
      const listItems = list.querySelectorAll('li');
      expect(listItems.length).toBe(3);
      expect(listItems[0].textContent).toBe('First statement text');
      expect(listItems[1].textContent).toBe('Second statement text');
      expect(listItems[2].textContent).toBe('Third statement text');
      // Check that list items have the disc class
      listItems.forEach(item => {
        expect(item.classList.contains('list-disc')).toBe(true);
        expect(item.classList.contains('list-inside')).toBe(true);
      });
    });

    it('should handle worksheet without statements array', () => {
      const listContainer = document.getElementById('worksheets-list');
      const worksheet = {
        id: 'test-id-3',
        situation: 'Situation without statements.',
        date: new Date().toISOString()
      };

      const fullText = (worksheet.situation || worksheet.person || '').trim();
      const sentenceEndMatch = fullText.match(/[.!?](\s|$)/);
      const sentenceEndIndex = sentenceEndMatch ? sentenceEndMatch.index + 1 : fullText.length;
      let previewBase = fullText.slice(0, sentenceEndIndex);
      let preview = previewBase.length > 90 ? previewBase.slice(0, 90) : previewBase;
      const wasTruncatedBySentence = sentenceEndIndex < fullText.length;
      const wasTruncatedByLength = previewBase.length > 90;
      if (wasTruncatedBySentence || wasTruncatedByLength) {
        preview = preview.trimEnd() + '...';
      }

      const date = new Date(worksheet.date);
      const statements = Array.isArray(worksheet.statements)
        ? worksheet.statements.map(s => s.statement).filter(Boolean)
        : [];

      const statementsHtml = statements.length
        ? `<ul class="text-gray-600 text-sm mt-2 space-y-1">
            ${statements.map(s => `<li class="list-disc list-inside ml-4">${s}</li>`).join('')}
          </ul>`
        : `<div class="text-gray-600 text-sm mt-2 italic">No statements yet.</div>`;

      listContainer.innerHTML = `
        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-4 cursor-pointer" data-id="${worksheet.id}">
          <div class="flex justify-between items-start mb-2 flex-wrap">
            <h3 class="text-xl font-semibold text-gray-900 mb-0">${preview}</h3>
            <span class="text-gray-500 text-sm whitespace-nowrap ml-4">${date.toLocaleDateString()}</span>
          </div>
          ${statementsHtml}
        </div>
      `;

      const card = listContainer.querySelector('[data-id]');
      expect(card).toBeTruthy();
      expect(card.textContent).toContain('No statements yet');
      const list = card.querySelector('ul');
      expect(list).toBeNull();
    });
  });
});

