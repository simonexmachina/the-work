import { describe, it, expect } from 'vitest';

// Test worksheet normalization functions (from app.js)

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

// Normalize worksheet records
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

describe('extractFlatStatements', () => {
    it('should extract a single statement (no suffix)', () => {
        const worksheet = {
            statement1: 'First statement',
            q1True: 'Yes',
            q2Absolutely: 'Maybe',
            q3React: 'Angry',
            q4Without: 'Peaceful',
            turnaround1: 'Opposite'
        };

        const statements = extractFlatStatements(worksheet);
        expect(statements).toHaveLength(1);
        expect(statements[0]).toEqual({
            statement: 'First statement',
            q1True: 'Yes',
            q2Absolutely: 'Maybe',
            q3React: 'Angry',
            q4Without: 'Peaceful',
            turnaround: 'Opposite'
        });
    });

    it('should extract multiple statements with suffixes', () => {
        const worksheet = {
            statement1: 'First statement',
            q1True: 'Yes',
            turnaround1: 'First turnaround',
            statement2: 'Second statement',
            q1True2: 'No',
            turnaround2: 'Second turnaround',
            statement3: 'Third statement',
            q1True3: 'Maybe',
            turnaround3: 'Third turnaround'
        };

        const statements = extractFlatStatements(worksheet);
        expect(statements).toHaveLength(3);
        expect(statements[0].statement).toBe('First statement');
        expect(statements[1].statement).toBe('Second statement');
        expect(statements[2].statement).toBe('Third statement');
    });

    it('should return empty array if no statements found', () => {
        const worksheet = {
            situation: 'Test situation',
            person: 'Test person'
        };

        const statements = extractFlatStatements(worksheet);
        expect(statements).toEqual([]);
    });

    it('should skip completely empty statement groups', () => {
        const worksheet = {
            statement1: 'First statement',
            q1True: 'Yes',
            turnaround1: 'Turnaround',
            statement2: '', // Empty
            q1True2: '',
            q2Absolutely2: '',
            q3React2: '',
            q4Without2: '',
            turnaround2: '',
            statement3: 'Third statement',
            q1True3: 'Yes',
            turnaround3: 'Third turnaround'
        };

        const statements = extractFlatStatements(worksheet);
        expect(statements).toHaveLength(2);
        expect(statements[0].statement).toBe('First statement');
        expect(statements[1].statement).toBe('Third statement');
    });

    it('should handle partially filled statements', () => {
        const worksheet = {
            statement1: 'First statement',
            q1True: 'Yes'
            // Missing other fields
        };

        const statements = extractFlatStatements(worksheet);
        expect(statements).toHaveLength(1);
        expect(statements[0]).toEqual({
            statement: 'First statement',
            q1True: 'Yes',
            q2Absolutely: '',
            q3React: '',
            q4Without: '',
            turnaround: ''
        });
    });

    it('should sort statements by index', () => {
        const worksheet = {
            statement3: 'Third',
            q1True3: '3',
            turnaround3: 'Turn 3',
            statement1: 'First',
            q1True: '1',
            turnaround1: 'Turn 1',
            statement2: 'Second',
            q1True2: '2',
            turnaround2: 'Turn 2'
        };

        const statements = extractFlatStatements(worksheet);
        expect(statements).toHaveLength(3);
        expect(statements[0].statement).toBe('First');
        expect(statements[1].statement).toBe('Second');
        expect(statements[2].statement).toBe('Third');
    });

    it('should handle statements with only turnaround filled', () => {
        const worksheet = {
            statement1: '',
            turnaround1: 'Some turnaround'
        };

        const statements = extractFlatStatements(worksheet);
        expect(statements).toHaveLength(1);
        expect(statements[0].turnaround).toBe('Some turnaround');
    });

    it('should handle non-sequential statement indices', () => {
        const worksheet = {
            statement1: 'First',
            q1True: 'Yes',
            turnaround1: 'Turn 1',
            statement5: 'Fifth',
            q1True5: 'Yes',
            turnaround5: 'Turn 5'
        };

        const statements = extractFlatStatements(worksheet);
        expect(statements).toHaveLength(2);
        expect(statements[0].statement).toBe('First');
        expect(statements[1].statement).toBe('Fifth');
    });
});

describe('normalizeWorksheet', () => {
    it('should return null/undefined for null/undefined input', () => {
        expect(normalizeWorksheet(null)).toBeNull();
        expect(normalizeWorksheet(undefined)).toBeUndefined();
    });

    it('should return worksheet as-is if already using nested structure', () => {
        const worksheet = {
            id: 'test-1',
            situation: 'Test',
            statements: [
                { statement: 'First', q1True: 'Yes' }
            ]
        };

        const normalized = normalizeWorksheet(worksheet);
        expect(normalized).toBe(worksheet); // Same reference
        expect(normalized.statements).toEqual([
            { statement: 'First', q1True: 'Yes' }
        ]);
    });

    it('should convert flat statements to nested structure', () => {
        const worksheet = {
            id: 'test-1',
            situation: 'Test situation',
            statement1: 'First statement',
            q1True: 'Yes',
            turnaround1: 'Turnaround 1',
            statement2: 'Second statement',
            q1True2: 'No',
            turnaround2: 'Turnaround 2'
        };

        const normalized = normalizeWorksheet(worksheet);
        expect(normalized.id).toBe('test-1');
        expect(normalized.situation).toBe('Test situation');
        expect(Array.isArray(normalized.statements)).toBe(true);
        expect(normalized.statements).toHaveLength(2);
        expect(normalized.statements[0].statement).toBe('First statement');
        expect(normalized.statements[1].statement).toBe('Second statement');
    });

    it('should return worksheet as-is if no statements found', () => {
        const worksheet = {
            id: 'test-1',
            situation: 'Test situation',
            person: 'Test person'
        };

        const normalized = normalizeWorksheet(worksheet);
        expect(normalized).toEqual(worksheet);
        expect(normalized.statements).toBeUndefined();
    });

    it('should preserve all non-statement fields', () => {
        const worksheet = {
            id: 'test-1',
            situation: 'Test situation',
            person: 'Test person',
            wantChange: 'Want change',
            advice: 'Advice',
            needHappy: 'Need happy',
            notes: 'Notes',
            date: '2024-01-01',
            statement1: 'Statement',
            q1True: 'Yes',
            turnaround1: 'Turnaround'
        };

        const normalized = normalizeWorksheet(worksheet);
        expect(normalized.id).toBe('test-1');
        expect(normalized.situation).toBe('Test situation');
        expect(normalized.person).toBe('Test person');
        expect(normalized.wantChange).toBe('Want change');
        expect(normalized.advice).toBe('Advice');
        expect(normalized.needHappy).toBe('Need happy');
        expect(normalized.notes).toBe('Notes');
        expect(normalized.date).toBe('2024-01-01');
        expect(Array.isArray(normalized.statements)).toBe(true);
    });

    it('should handle empty worksheet object', () => {
        const worksheet = {};
        const normalized = normalizeWorksheet(worksheet);
        expect(normalized).toEqual({});
    });

    it('should handle worksheet with only situation fields', () => {
        const worksheet = {
            situation: 'Test',
            person: 'Person',
            wantChange: 'Change'
        };

        const normalized = normalizeWorksheet(worksheet);
        expect(normalized).toEqual(worksheet);
    });
});

