// IndexedDB utilities for the React app
import { normalizeWorksheet } from './worksheet';

const DB_NAME = 'TheWorkDB';
const DB_VERSION = 2;
const STORE_NAME = 'worksheets';

let db = null;

// UUID Generation for client-side IDs
export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Initialize IndexedDB
export function initDB() {
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
                    keyPath: 'id'
                });
                objectStore.createIndex('date', 'date', { unique: false });
            }
        };
    });
}

async function ensureDB() {
    if (!db) await initDB();
    return db;
}

function createTransaction(mode = 'readonly') {
    return db.transaction([STORE_NAME], mode);
}

function getStore(transaction) {
    return transaction.objectStore(STORE_NAME);
}

function executeRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbOperation(mode, operation) {
    await ensureDB();
    const transaction = createTransaction(mode);
    
    transaction.onerror = (event) => {
        console.error('Transaction error:', event.target.error);
    };
    
    const store = getStore(transaction);
    const request = operation(store);
    
    if (!request) {
        throw new Error('Operation did not return a valid IDBRequest');
    }
    
    return executeRequest(request);
}

// Save worksheet to IndexedDB
export async function saveWorksheet(worksheetData) {
    const worksheet = {
        ...worksheetData,
        date: worksheetData.date || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (!worksheet.id) {
        worksheet.id = generateId();
    }

    await dbOperation('readwrite', (store) => {
        return store.put(worksheet);
    });

    return worksheet.id;
}

// Get all worksheets from IndexedDB (excluding deleted ones)
export async function getAllWorksheets() {
    try {
        const rawWorksheets = await dbOperation('readonly', (store) => {
            return store.getAll();
        });

        if (!rawWorksheets || rawWorksheets.length === 0) {
            return [];
        }

        const worksheets = rawWorksheets
            .filter(w => !w.deleted)
            .map((w, index) => {
                try {
                    const normalized = normalizeWorksheet(w);
                    if (!normalized) {
                        console.warn('Worksheet normalized to null/undefined:', { original: w, index });
                        return null;
                    }
                    return normalized;
                } catch (error) {
                    console.error('Error normalizing worksheet:', error, { worksheet: w, index });
                    return null;
                }
            })
            .filter(Boolean);

        return worksheets.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error('Error getting all worksheets:', error);
        return [];
    }
}

// Get worksheet by ID
export async function getWorksheetById(id) {
    try {
        const raw = await dbOperation('readonly', (store) => {
            return store.get(id);
        });

        if (!raw) {
            return null;
        }

        return normalizeWorksheet(raw);
    } catch (error) {
        console.error('Error getting worksheet by ID:', error, { id });
        return null;
    }
}

// Delete worksheet (soft delete/tombstone pattern)
export async function deleteWorksheet(id) {
    const worksheet = await getWorksheetById(id);
    if (worksheet) {
        worksheet.deleted = true;
        worksheet.deletedAt = new Date().toISOString();
        worksheet.updatedAt = new Date().toISOString();
        
        await dbOperation('readwrite', (store) => {
            return store.put(worksheet);
        });
    }
}

// Save worksheet without triggering sync (for sync service)
export async function saveLocalWorksheet(worksheet) {
    await dbOperation('readwrite', (store) => {
        return store.put(worksheet);
    });
}

// Delete worksheet (hard delete for sync service)
export async function deleteLocalWorksheet(id) {
    await dbOperation('readwrite', (store) => {
        return store.delete(id);
    });
}

