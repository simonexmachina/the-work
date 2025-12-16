// IndexedDB setup
const DB_NAME = 'TheWorkDB';
const DB_VERSION = 1;
const STORE_NAME = 'worksheets';

let db = null;

// Notification system
function showNotification(message, type = 'success', duration = 5000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                     type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                     type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                     'bg-blue-50 border-blue-200 text-blue-800';
    
    const iconColor = type === 'success' ? 'text-green-400' :
                      type === 'error' ? 'text-red-400' :
                      type === 'warning' ? 'text-yellow-400' :
                      'text-blue-400';

    const icon = type === 'success' ? 
        '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' :
        type === 'error' ?
        '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>' :
        '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';

    notification.className = `${bgColor} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in`;
    notification.innerHTML = `
        <div class="${iconColor} flex-shrink-0 mt-0.5">
            ${icon}
        </div>
        <div class="flex-1">
            <p class="font-medium">${message}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
        </button>
    `;

    container.appendChild(notification);

    // Auto-dismiss after duration
    setTimeout(() => {
        notification.classList.add('animate-slide-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);

    return notification;
}

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                objectStore.createIndex('date', 'date', { unique: false });
            }
        };
    });
}

// Database helper functions to reduce duplication
/**
 * Ensures the database is initialized before operations
 */
async function ensureDB() {
    if (!db) await initDB();
    return db;
}

/**
 * Creates a transaction for the worksheets store
 * @param {string} mode - 'readonly' or 'readwrite'
 * @returns {IDBTransaction}
 */
function createTransaction(mode = 'readonly') {
    return db.transaction([STORE_NAME], mode);
}

/**
 * Gets the object store from a transaction
 * @param {IDBTransaction} transaction
 * @returns {IDBObjectStore}
 */
function getStore(transaction) {
    return transaction.objectStore(STORE_NAME);
}

/**
 * Wraps an IDBRequest in a Promise
 * @param {IDBRequest} request
 * @returns {Promise}
 */
function executeRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Generic database operation helper that handles common IndexedDB patterns
 * @param {string} mode - 'readonly' or 'readwrite'
 * @param {Function} operation - Function that receives the store and returns an IDBRequest
 * @returns {Promise} Resolves with the request result
 */
async function dbOperation(mode, operation) {
    await ensureDB();
    const transaction = createTransaction(mode);
    const store = getStore(transaction);
    const request = operation(store);
    return executeRequest(request);
}

// Save worksheet to IndexedDB
async function saveWorksheet(worksheetData) {
    const worksheet = {
        ...worksheetData,
        date: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const result = await dbOperation('readwrite', (store) => {
        // Use add() for new records (no id), put() for updates (has id)
        return worksheet.id ? store.put(worksheet) : store.add(worksheet);
    });

    // Return the ID (either the new auto-generated ID or the existing ID)
    return worksheet.id || result;
}

// Get all worksheets from IndexedDB
async function getAllWorksheets() {
    const rawWorksheets = await dbOperation('readonly', (store) => {
        return store.getAll();
    });

    const worksheets = rawWorksheets.map(normalizeWorksheet);

    // Sort by date descending
    return worksheets.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Get worksheet by ID
async function getWorksheetById(id) {
    const raw = await dbOperation('readonly', (store) => {
        return store.get(id);
    });

    return normalizeWorksheet(raw);
}

// Delete worksheet
async function deleteWorksheet(id) {
    await dbOperation('readwrite', (store) => {
        return store.delete(id);
    });
}

// View management
const views = {
    list: document.getElementById('list-view'),
    worksheet: document.getElementById('worksheet-view'),
    detail: document.getElementById('detail-view')
};

let currentWorksheetId = null;

// Render worksheet form dynamically
function renderWorksheetForm() {
    const container = document.getElementById('worksheet-form-container');
    if (!container) return;

    container.innerHTML = `
        <form id="worksheet-form">
            ${renderStep1Section()}
            ${renderStep2Section()}
            ${renderNotesSection()}
        </form>
    `;

    // Initialize the statements section with the default number of statements
    initializeStatementsSection();
}

function renderStep1Section() {
    return `
        <section class="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">Step 1: Judge Your Neighbor</h2>
            <p class="italic text-gray-600 mb-6 p-4 bg-gray-50 border-l-4 border-blue-600 rounded">
                Think of a stressful situation with someone—past, present, or future—in which you feel anger, sadness, fear, or shame. Be specific and brief.
            </p>
            
            ${renderFormField('situation', 'Describe the situation:', 'Example: My partner didn\'t call me when they said they would...', 3)}
            ${renderFormField('person', 'Who angers, confuses, or disappoints you, and why?', 'Example: I am angry at Paul because he doesn\'t listen to me...', 3)}
            ${renderFormField('wantChange', 'How do you want them to change? What do you want them to do?', 'Example: I want Paul to respect me, to see me, to treat me with kindness...', 3)}
            ${renderFormField('advice', 'What advice would you offer to them?', 'Example: Paul should be more considerate, he should think before he speaks...', 3)}
            ${renderFormField('needHappy', 'In order for you to be happy, what do you need them to think, say, feel, or do?', 'Example: I need Paul to understand me, to appreciate me, to love me...', 3)}
        </section>
    `;
}

function renderStep2Section() {
    return `
        <section class="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">Step 2: The Work</h2>
            <p class="italic text-gray-600 mb-6 p-4 bg-gray-50 border-l-4 border-blue-600 rounded">
                Take each statement from Step 1 and investigate it using these four questions.
            </p>
            <div id="statements-container"></div>
            <div class="mt-4">
                <button
                    type="button"
                    id="add-statement-btn"
                    class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                    + Add Statement
                </button>
            </div>
        </section>
    `;
}

function renderStatementGroup(num) {
    const suffix = num === 1 ? '' : num;
    const placeholder =
        num === 1
            ? 'For example:\n- Opposite: They don\'t listen to me → They do listen to me.\n- To yourself: They don\'t listen to me → I don\'t listen to me.\n- To them: They don\'t listen to me → I don\'t listen to them.'
            : '';
    
    return `
        <div class="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6" data-statement-index="${num}">
            <h3 class="text-xl font-bold text-blue-600 mb-4">Statement ${num}</h3>
            ${renderFormField(`statement${num}`, 'Write a statement from Step 1:', '', 2, false)}
            ${renderFormField(`q1True${suffix}`, 'Question 1: Is it true?', num === 1 ? 'Yes or No, and why...' : '', num === 1 ? 2 : 2, false)}
            ${renderFormField(`q2Absolutely${suffix}`, 'Question 2: Can you absolutely know it\'s true?', num === 1 ? 'Yes or No, and why...' : '', 2, false)}
            ${renderFormField(`q3React${suffix}`, 'Question 3: How do you react when you believe that thought?', num === 1 ? 'What happens? How do you treat the person? How do you treat yourself?' : '', 3, false)}
            ${renderFormField(`q4Without${suffix}`, 'Question 4: Who would you be without that thought?', num === 1 ? 'Close your eyes. Who are you without this thought?' : '', 3, false)}
            ${renderFormField(`turnaround${num}`, 'Turnarounds (write all turnarounds you find):', placeholder, 4, true)}
            <div class="mt-2 text-sm text-gray-600 bg-gray-50 border-l-4 border-blue-200 rounded p-3">
                <p class="font-semibold mb-1">Common turnarounds to explore:</p>
                <ul class="list-disc list-inside space-y-1">
                    <li><span class="font-medium">To the opposite</span> – "They don\'t listen to me" → "They do listen to me."</li>
                    <li><span class="font-medium">To yourself</span> – "They don\'t listen to me" → "I don\'t listen to me."</li>
                    <li><span class="font-medium">To them</span> – "They don\'t listen to me" → "I don\'t listen to them."</li>
                </ul>
                <p class="mt-2">Write several genuine examples for each turnaround that feel true to you.</p>
            </div>
        </div>
    `;
}

// Initialize the statements section with a default number of statements,
// and wire up the "Add Statement" button so users can add as many as they need.
function initializeStatementsSection(existingCount) {
    const container = document.getElementById('statements-container');
    if (!container) return;

    // If we have an explicit count (e.g. from an existing worksheet), use it;
    // otherwise default to a single statement.
    const defaultCount = typeof existingCount === 'number' && existingCount > 0 ? existingCount : 1;

    container.innerHTML = '';
    for (let i = 1; i <= defaultCount; i++) {
        container.insertAdjacentHTML('beforeend', renderStatementGroup(i));
    }

    const addButton = document.getElementById('add-statement-btn');
    if (addButton) {
        addButton.onclick = () => {
            const currentCount = container.querySelectorAll('[data-statement-index]').length;
            const nextIndex = currentCount + 1;
            container.insertAdjacentHTML('beforeend', renderStatementGroup(nextIndex));
        };
    }
}

function renderNotesSection() {
    return `
        <section class="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">Notes & Reflections</h2>
            ${renderFormField('notes', 'Additional notes or insights:', 'Any additional reflections, insights, or notes...', 5, false)}
        </section>
    `;
}

function renderFormField(name, label, placeholder, rows = 3, showPlaceholder = true) {
    const fieldId = name === 'wantChange' ? 'want-change' : 
                    name === 'needHappy' ? 'need-happy' :
                    name === 'q1True' ? 'q1-true' :
                    name === 'q2Absolutely' ? 'q2-absolutely' :
                    name === 'q3React' ? 'q3-react' :
                    name === 'q4Without' ? 'q4-without' :
                    name === 'q1True2' ? 'q1-true-2' :
                    name === 'q2Absolutely2' ? 'q2-absolutely-2' :
                    name === 'q3React2' ? 'q3-react-2' :
                    name === 'q4Without2' ? 'q4-without-2' :
                    name === 'q1True3' ? 'q1-true-3' :
                    name === 'q2Absolutely3' ? 'q2-absolutely-3' :
                    name === 'q3React3' ? 'q3-react-3' :
                    name === 'q4Without3' ? 'q4-without-3' :
                    name;
    
    const placeholderAttr = showPlaceholder && placeholder ? `placeholder="${placeholder}"` : '';
    
    return `
        <label for="${fieldId}" class="block mt-4 mb-2 font-semibold text-gray-900">${label}</label>
        <textarea id="${fieldId}" name="${name}" rows="${rows}" ${placeholderAttr} class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[80px]"></textarea>
    `;
}

// URL state management
function updateURL(viewName, id = null) {
    const params = new URLSearchParams();
    params.set('view', viewName);
    if (id) {
        params.set('id', id);
    }
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ view: viewName, id }, '', newURL);
}

function getURLState() {
    const params = new URLSearchParams(window.location.search);
    return {
        view: params.get('view') || 'list',
        id: params.get('id') ? parseInt(params.get('id')) : null
    };
}

function showView(viewName, id = null) {
    Object.values(views).forEach(view => view.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    
    // Render form if showing worksheet view
    if (viewName === 'worksheet') {
        renderWorksheetForm();
    }
    
    // Update URL
    updateURL(viewName, id);
    
    // Update current worksheet ID
    currentWorksheetId = id;
}

// Normalize worksheet records so that statements are always stored in a nested structure.
// Older records that used flat suffixed fields like statement1, q1True2, etc. are
// converted into worksheet.statements = [{ statement, q1True, ... }, ...].
function normalizeWorksheet(worksheet) {
    if (!worksheet) return worksheet;

    // If already using nested structure, return as-is
    if (Array.isArray(worksheet.statements)) {
        return worksheet;
    }

    const statements = extractFlatStatements(worksheet);
    if (!statements.length) {
        return worksheet;
    }

    return {
        ...worksheet,
        statements
    };
}

// Extract statements from legacy flat fields into an array of statement objects
function extractFlatStatements(worksheet) {
    const indices = new Set();

    Object.keys(worksheet).forEach((key) => {
        const match = key.match(/^statement(\d+)?$/);
        if (match) {
            const index = match[1] ? parseInt(match[1], 10) : 1;
            if (!Number.isNaN(index)) {
                indices.add(index);
            }
        }
    });

    if (indices.size === 0) return [];

    const sorted = Array.from(indices).sort((a, b) => a - b);

    return sorted
        .map((idx) => {
            const suffix = idx === 1 ? '' : idx;
            const statement = worksheet[`statement${idx}`] || '';
            const q1True = worksheet[`q1True${suffix}`] || '';
            const q2Absolutely = worksheet[`q2Absolutely${suffix}`] || '';
            const q3React = worksheet[`q3React${suffix}`] || '';
            const q4Without = worksheet[`q4Without${suffix}`] || '';
            const turnaround = worksheet[`turnaround${idx}`] || '';

            // Skip completely empty statement groups
            if (
                !statement &&
                !q1True &&
                !q2Absolutely &&
                !q3React &&
                !q4Without &&
                !turnaround
            ) {
                return null;
            }

            return {
                statement,
                q1True,
                q2Absolutely,
                q3React,
                q4Without,
                turnaround
            };
        })
        .filter(Boolean);
}

// Generate a truncated preview of the situation for the list view:
// - Prefer the first sentence (up to ., !, or ? followed by space/end)
// - Also enforce a maximum of 90 characters
// - Append "..." if the situation was truncated (by sentence or length)
function getSituationPreview(worksheet) {
    const CHARACTER_LIMIT = 130;
    const fullText = (worksheet.situation || worksheet.person || '').trim();
    if (!fullText) {
        return 'No content';
    }

    // Find end of first sentence (., !, or ? followed by space or end of string)
    const sentenceEndMatch = fullText.match(/[.!?](\s|$)/);
    const sentenceEndIndex = sentenceEndMatch ? sentenceEndMatch.index + 1 : fullText.length;

    // Take up to the end of the first sentence
    let previewBase = fullText.slice(0, sentenceEndIndex);

    // Enforce character limit
    let preview = previewBase.length > CHARACTER_LIMIT ? previewBase.slice(0, CHARACTER_LIMIT) : previewBase;

    const wasTruncatedBySentence = sentenceEndIndex < fullText.length;
    const wasTruncatedByLength = previewBase.length > CHARACTER_LIMIT;

    // Remove any trailing full stop if present (since we append '...')
    if (wasTruncatedBySentence || wasTruncatedByLength) {
        preview = preview.trimEnd().replace(/\.$/, '') + '...';
    }

    return preview;
}

// Render worksheets list
async function renderWorksheetsList() {
    const listContainer = document.getElementById('worksheets-list');
    const worksheets = await getAllWorksheets();

    if (worksheets.length === 0) {
        listContainer.innerHTML = '<p class="text-center py-12 text-gray-500 italic">No worksheets yet. Create your first one to get started.</p>';
        return;
    }

    listContainer.innerHTML = worksheets.map(worksheet => {
        const date = new Date(worksheet.date);
        const truncatedPreview = getSituationPreview(worksheet);

        // Collect statement texts from the nested statements array (if present)
        const statements = Array.isArray(worksheet.statements)
            ? worksheet.statements
                .map(s => s.statement)
                .filter(Boolean)
            : [];

        const statementsHtml = statements.length
            ? `
                <ul class="text-gray-600 text-sm mt-2 space-y-1">
                    ${statements.map(s => `<li class="list-disc list-inside ml-4">${s}</li>`).join('')}
                </ul>
              `
            : `<div class="text-gray-600 text-sm mt-2 italic">No statements yet.</div>`;

        return `
            <div class="bg-white rounded-lg border border-gray-200 p-6 mb-4 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5" data-id="${worksheet.id}">
                <div class="flex justify-between items-start mb-2 flex-wrap">
                    <h3 class="text-l font-semibold text-gray-900 mb-0">${truncatedPreview}</h3>
                    <span class="text-gray-500 text-sm whitespace-nowrap ml-4">${date.toLocaleDateString()}</span>
                </div>
                ${statementsHtml}
            </div>
        `;
    }).join('');

    // Add click handlers
    listContainer.querySelectorAll('[data-id]').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showWorksheetDetail(id);
        });
    });
}

// Show worksheet detail
async function showWorksheetDetail(id) {
    const worksheet = await getWorksheetById(id);
    
    if (!worksheet) {
        showNotification('Worksheet not found', 'error');
        showView('list');
        return;
    }

    const detailContainer = document.getElementById('worksheet-detail');
    detailContainer.innerHTML = renderWorksheetDetail(worksheet);
    showView('detail', id);
}

// Render worksheet detail HTML
function renderWorksheetDetail(worksheet) {
    const date = new Date(worksheet.date);
    
    const statementsHtml = renderAllStatementDetails(worksheet);

    return `
        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">Judge Your Neighbor</h2>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">Situation:</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${worksheet.situation || ''}</div>
            </div>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">Who angers, confuses, or disappoints you, and why?</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${worksheet.person || ''}</div>
            </div>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">How do you want them to change? What do you want them to do?</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${worksheet.wantChange || ''}</div>
            </div>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">What advice would you offer to them?</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${worksheet.advice || ''}</div>
            </div>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">In order for you to be happy, what do you need them to think, say, feel, or do?</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${worksheet.needHappy || ''}</div>
            </div>
        </div>

        ${statementsHtml}

        ${worksheet.notes ? `
        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">Notes & Reflections</h2>
            <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">${worksheet.notes}</div>
        </div>
        ` : ''}

        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
            <p class="text-gray-500 text-sm">
                Created: ${date.toLocaleString()}
            </p>
        </div>
    `;
}

// Render all statement details for however many statements are present
function renderAllStatementDetails(worksheet) {
    if (!Array.isArray(worksheet.statements) || worksheet.statements.length === 0) {
        return '';
    }

    return worksheet.statements
        .map((statement, index) => renderStatementDetail(statement, index + 1))
        .join('');
}

function renderStatementDetail(statement, num) {
    if (!statement || (!statement.statement && !statement.q1True)) {
        return '';
    }

    return `
        <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">Statement ${num} - The Work</h2>
            
            ${statement.statement ? `
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">Statement:</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${statement.statement}</div>
            </div>
            ` : ''}
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">Question 1: Is it true?</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${statement.q1True || ''}</div>
            </div>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">Question 2: Can you absolutely know it's true?</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${statement.q2Absolutely || ''}</div>
            </div>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">Question 3: How do you react when you believe that thought?</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${statement.q3React || ''}</div>
            </div>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">Question 4: Who would you be without that thought?</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${statement.q4Without || ''}</div>
            </div>
            
            <div class="mb-6">
                <span class="block font-semibold text-gray-900 mb-2">Turnaround:</span>
                <div class="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">${statement.turnaround || ''}</div>
            </div>
        </div>
    `;
}

// Load worksheet into form for editing
async function loadWorksheetIntoForm(id) {
    const worksheet = await getWorksheetById(id);
    if (!worksheet) {
        showNotification('Worksheet not found', 'error');
        showView('list');
        return;
    }

    // Work out how many statements exist on this worksheet so we can render them all
    const statementCount = Array.isArray(worksheet.statements) && worksheet.statements.length > 0
        ? worksheet.statements.length
        : 1;

    // Show view first to render the form
    showView('worksheet', id);
    
    // Wait for form to be rendered, then populate fields
    setTimeout(() => {
        // Ensure the correct number of statement groups are rendered
        initializeStatementsSection(statementCount);

        const form = document.getElementById('worksheet-form');
        if (!form) return;

        // Load all non-statement form fields
        Object.keys(worksheet).forEach(key => {
            if (key === 'statements') return;
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                field.value = worksheet[key] || '';
            }
        });

        // Load statements into their corresponding fields
        if (Array.isArray(worksheet.statements)) {
            worksheet.statements.forEach((statement, index) => {
                const idx = index + 1;
                const suffix = idx === 1 ? '' : idx;

                const setValue = (name, value) => {
                    const el = form.querySelector(`[name="${name}"]`);
                    if (el) el.value = value || '';
                };

                setValue(`statement${idx}`, statement.statement);
                setValue(`q1True${suffix}`, statement.q1True);
                setValue(`q2Absolutely${suffix}`, statement.q2Absolutely);
                setValue(`q3React${suffix}`, statement.q3React);
                setValue(`q4Without${suffix}`, statement.q4Without);
                setValue(`turnaround${idx}`, statement.turnaround);
            });
        }
    }, 0);
}

// Save form data
async function saveFormData() {
    const form = document.getElementById('worksheet-form');
    const worksheetData = {};

    // Only include id if we're editing an existing worksheet
    if (currentWorksheetId) {
        worksheetData.id = currentWorksheetId;
    }

    // Collect all non-statement form fields
    form.querySelectorAll('textarea, input').forEach(field => {
        if (!field.name || field.name === 'id') return;
        // Skip fields that belong to a statement group; they are handled separately
        if (field.closest('[data-statement-index]')) return;
        worksheetData[field.name] = field.value.trim();
    });

    // Collect statements into a nested array
    const statements = [];
    const statementGroups = form.querySelectorAll('[data-statement-index]');

    statementGroups.forEach(group => {
        const idx = parseInt(group.getAttribute('data-statement-index'), 10);
        const suffix = idx === 1 ? '' : idx;

        const getValue = (name) => {
            const el = group.querySelector(`[name="${name}"]`);
            return el ? el.value.trim() : '';
        };

        const statementText = getValue(`statement${idx}`);
        const q1True = getValue(`q1True${suffix}`);
        const q2Absolutely = getValue(`q2Absolutely${suffix}`);
        const q3React = getValue(`q3React${suffix}`);
        const q4Without = getValue(`q4Without${suffix}`);
        const turnaround = getValue(`turnaround${idx}`);

        // Only add a statement object if there is any content
        if (
            statementText ||
            q1True ||
            q2Absolutely ||
            q3React ||
            q4Without ||
            turnaround
        ) {
            statements.push({
                statement: statementText,
                q1True,
                q2Absolutely,
                q3React,
                q4Without,
                turnaround
            });
        }
    });

    if (statements.length > 0) {
        worksheetData.statements = statements;
    }

    try {
        const savedId = await saveWorksheet(worksheetData);
        showNotification('Worksheet saved successfully!', 'success');
        currentWorksheetId = null;
        await renderWorksheetsList();
        // Navigate to detail view of the saved worksheet
        if (savedId) {
            showView('detail', savedId);
            await showWorksheetDetail(savedId);
        } else {
            showView('list');
        }
    } catch (error) {
        console.error('Error saving worksheet:', error);
        showNotification('Error saving worksheet. Please try again.', 'error');
    }
}

// Restore state from URL
async function restoreStateFromURL() {
    const state = getURLState();
    
    switch (state.view) {
        case 'worksheet':
            if (state.id) {
                await loadWorksheetIntoForm(state.id);
            } else {
                showView('worksheet');
                // Reset form after it's rendered
                setTimeout(() => {
                    const form = document.getElementById('worksheet-form');
                    if (form) form.reset();
                }, 0);
            }
            break;
        case 'detail':
            if (state.id) {
                await showWorksheetDetail(state.id);
            } else {
                showView('list');
            }
            break;
        case 'list':
        default:
            await renderWorksheetsList();
            showView('list');
            break;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    
    // Restore state from URL on initial load
    await restoreStateFromURL();

    // Handle browser back/forward buttons
    window.addEventListener('popstate', async (event) => {
        if (event.state) {
            currentWorksheetId = event.state.id || null;
            await restoreStateFromURL();
        } else {
            // Fallback to parsing URL
            await restoreStateFromURL();
        }
    });

    // Navigation buttons
    document.getElementById('new-worksheet-btn').addEventListener('click', () => {
        showView('worksheet');
        // Reset form after it's rendered
        setTimeout(() => {
            const form = document.getElementById('worksheet-form');
            if (form) form.reset();
        }, 0);
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        showView('list');
    });

    document.getElementById('back-from-detail-btn').addEventListener('click', () => {
        showView('list');
    });

    document.getElementById('save-btn').addEventListener('click', (e) => {
        e.preventDefault();
        saveFormData();
    });

    document.getElementById('edit-btn').addEventListener('click', async () => {
        if (currentWorksheetId) {
            await loadWorksheetIntoForm(currentWorksheetId);
        }
    });

    document.getElementById('delete-btn').addEventListener('click', async () => {
        if (!currentWorksheetId) return;
        
        // Show confirmation using browser confirm (we'll replace this with a custom modal if needed)
        if (confirm('Are you sure you want to delete this worksheet? This action cannot be undone.')) {
            try {
                await deleteWorksheet(currentWorksheetId);
                showNotification('Worksheet deleted successfully!', 'success');
                currentWorksheetId = null;
                await renderWorksheetsList();
                showView('list');
            } catch (error) {
                console.error('Error deleting worksheet:', error);
                showNotification('Error deleting worksheet. Please try again.', 'error');
            }
        }
    });

    // Prevent form submission on Enter
    document.getElementById('worksheet-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveFormData();
    });
});

