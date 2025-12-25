import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Form Rendering', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="worksheet-form-container"></div>
                <div id="statements-container"></div>
            </body>
            </html>
        `, {
            url: 'http://localhost',
            pretendToBeVisual: true
        });

        window = dom.window;
        document = window.document;
        global.document = document;
        global.window = window;
    });

    afterEach(() => {
        dom.window.close();
    });

    // Simplified form field rendering function
    function renderFormField(name, label, placeholder, rows = 3, showPlaceholder = true) {
        const fieldId = name === 'wantChange' ? 'want-change' : 
                        name === 'needHappy' ? 'need-happy' :
                        name === 'q1True' ? 'q1-true' :
                        name === 'q2Absolutely' ? 'q2-absolutely' :
                        name === 'q3React' ? 'q3-react' :
                        name === 'q4Without' ? 'q4-without' :
                        name;
        
        const placeholderAttr = showPlaceholder && placeholder ? `placeholder="${placeholder}"` : '';
        
        return `
            <label for="${fieldId}" class="block mt-4 mb-2 font-semibold text-gray-900">${label}</label>
            <textarea id="${fieldId}" name="${name}" rows="${rows}" ${placeholderAttr} class="w-full p-3 border border-gray-300 rounded-lg"></textarea>
        `;
    }

    // Simplified statement group rendering
    function renderStatementGroup(num) {
        const suffix = num === 1 ? '' : num;
        
        return `
            <div class="statement-group" data-statement-index="${num}">
                <h3>Statement ${num}</h3>
                <textarea name="statement${num}"></textarea>
                <textarea name="q1True${suffix}"></textarea>
                <textarea name="q2Absolutely${suffix}"></textarea>
                <textarea name="q3React${suffix}"></textarea>
                <textarea name="q4Without${suffix}"></textarea>
                <textarea name="turnaround${num}"></textarea>
            </div>
        `;
    }

    describe('renderFormField', () => {
        it('should render a basic form field', () => {
            const html = renderFormField('situation', 'Situation', 'Enter situation', 3);
            expect(html).toContain('<label for="situation"');
            expect(html).toContain('Situation</label>');
            expect(html).toContain('<textarea');
            expect(html).toContain('name="situation"');
            expect(html).toContain('rows="3"');
            expect(html).toContain('placeholder="Enter situation"');
        });

        it('should use custom field ID for wantChange', () => {
            const html = renderFormField('wantChange', 'Want Change', '', 3);
            expect(html).toContain('id="want-change"');
            expect(html).toContain('name="wantChange"');
        });

        it('should use custom field ID for needHappy', () => {
            const html = renderFormField('needHappy', 'Need Happy', '', 3);
            expect(html).toContain('id="need-happy"');
            expect(html).toContain('name="needHappy"');
        });

        it('should use custom field ID for question fields', () => {
            let html = renderFormField('q1True', 'Question 1', '', 2);
            expect(html).toContain('id="q1-true"');

            html = renderFormField('q2Absolutely', 'Question 2', '', 2);
            expect(html).toContain('id="q2-absolutely"');

            html = renderFormField('q3React', 'Question 3', '', 3);
            expect(html).toContain('id="q3-react"');

            html = renderFormField('q4Without', 'Question 4', '', 3);
            expect(html).toContain('id="q4-without"');
        });

        it('should respect custom row count', () => {
            let html = renderFormField('test', 'Test', '', 5);
            expect(html).toContain('rows="5"');

            html = renderFormField('test', 'Test', '', 10);
            expect(html).toContain('rows="10"');
        });

        it('should omit placeholder if showPlaceholder is false', () => {
            const html = renderFormField('test', 'Test', 'Placeholder text', 3, false);
            expect(html).not.toContain('placeholder');
        });

        it('should omit placeholder if placeholder is empty', () => {
            const html = renderFormField('test', 'Test', '', 3, true);
            expect(html).not.toContain('placeholder');
        });

        it('should include placeholder when both are provided', () => {
            const html = renderFormField('test', 'Test', 'Enter text here', 3, true);
            expect(html).toContain('placeholder="Enter text here"');
        });

        it('should include proper CSS classes', () => {
            const html = renderFormField('test', 'Test', '', 3);
            expect(html).toContain('class="w-full p-3 border border-gray-300 rounded-lg"');
        });

        it('should include label with proper structure', () => {
            const html = renderFormField('test', 'Test Label', '', 3);
            expect(html).toContain('class="block mt-4 mb-2 font-semibold text-gray-900"');
            expect(html).toContain('>Test Label</label>');
        });
    });

    describe('renderStatementGroup', () => {
        it('should render statement group with correct index', () => {
            const html = renderStatementGroup(1);
            expect(html).toContain('data-statement-index="1"');
            expect(html).toContain('Statement 1');
        });

        it('should render statement field', () => {
            const html = renderStatementGroup(1);
            expect(html).toContain('name="statement1"');
        });

        it('should render questions without suffix for first statement', () => {
            const html = renderStatementGroup(1);
            expect(html).toContain('name="q1True"');
            expect(html).toContain('name="q2Absolutely"');
            expect(html).toContain('name="q3React"');
            expect(html).toContain('name="q4Without"');
            expect(html).not.toContain('name="q1True1"');
        });

        it('should render questions with suffix for subsequent statements', () => {
            const html = renderStatementGroup(2);
            expect(html).toContain('name="q1True2"');
            expect(html).toContain('name="q2Absolutely2"');
            expect(html).toContain('name="q3React2"');
            expect(html).toContain('name="q4Without2"');
        });

        it('should always use number suffix for statement field', () => {
            let html = renderStatementGroup(1);
            expect(html).toContain('name="statement1"');

            html = renderStatementGroup(2);
            expect(html).toContain('name="statement2"');

            html = renderStatementGroup(3);
            expect(html).toContain('name="statement3"');
        });

        it('should always use number suffix for turnaround field', () => {
            let html = renderStatementGroup(1);
            expect(html).toContain('name="turnaround1"');

            html = renderStatementGroup(2);
            expect(html).toContain('name="turnaround2"');
        });

        it('should render multiple statement groups correctly', () => {
            const html1 = renderStatementGroup(1);
            const html2 = renderStatementGroup(2);
            const html3 = renderStatementGroup(3);

            expect(html1).toContain('Statement 1');
            expect(html2).toContain('Statement 2');
            expect(html3).toContain('Statement 3');

            expect(html1).toContain('data-statement-index="1"');
            expect(html2).toContain('data-statement-index="2"');
            expect(html3).toContain('data-statement-index="3"');
        });

        it('should contain all required fields', () => {
            const html = renderStatementGroup(2);
            const container = document.createElement('div');
            container.innerHTML = html;

            const textareas = container.querySelectorAll('textarea');
            expect(textareas.length).toBe(6); // statement, 4 questions, turnaround
        });

        it('should include statement group class', () => {
            const html = renderStatementGroup(1);
            expect(html).toContain('class="statement-group"');
        });
    });

    describe('Field Name Conventions', () => {
        it('should follow naming pattern for first statement', () => {
            const html = renderStatementGroup(1);
            expect(html).toMatch(/name="statement1"/);
            expect(html).toMatch(/name="q1True"/); // No suffix
            expect(html).toMatch(/name="q2Absolutely"/); // No suffix
            expect(html).toMatch(/name="turnaround1"/);
        });

        it('should follow naming pattern for subsequent statements', () => {
            let html = renderStatementGroup(2);
            expect(html).toMatch(/name="statement2"/);
            expect(html).toMatch(/name="q1True2"/);
            expect(html).toMatch(/name="q2Absolutely2"/);
            expect(html).toMatch(/name="turnaround2"/);

            html = renderStatementGroup(5);
            expect(html).toMatch(/name="statement5"/);
            expect(html).toMatch(/name="q1True5"/);
            expect(html).toMatch(/name="turnaround5"/);
        });
    });

    describe('Integration - Multiple Statement Groups', () => {
        it('should render multiple groups with unique names', () => {
            const container = document.getElementById('statements-container');
            
            for (let i = 1; i <= 3; i++) {
                container.innerHTML += renderStatementGroup(i);
            }

            const groups = container.querySelectorAll('[data-statement-index]');
            expect(groups.length).toBe(3);

            // Check all textareas have unique names
            const textareas = container.querySelectorAll('textarea');
            const names = Array.from(textareas).map(t => t.getAttribute('name'));
            const uniqueNames = new Set(names);
            
            // All names should be unique
            expect(uniqueNames.size).toBe(names.length);
        });

        it('should support dynamic addition of statement groups', () => {
            const container = document.getElementById('statements-container');
            
            // Start with 1 group
            container.innerHTML = renderStatementGroup(1);
            expect(container.querySelectorAll('[data-statement-index]').length).toBe(1);

            // Add more groups
            container.innerHTML += renderStatementGroup(2);
            container.innerHTML += renderStatementGroup(3);
            expect(container.querySelectorAll('[data-statement-index]').length).toBe(3);
        });
    });

    describe('Form Field Accessibility', () => {
        it('should have matching label and input IDs', () => {
            const html = renderFormField('situation', 'Situation', '', 3);
            const container = document.createElement('div');
            container.innerHTML = html;

            const label = container.querySelector('label');
            const textarea = container.querySelector('textarea');

            expect(label.getAttribute('for')).toBe(textarea.getAttribute('id'));
        });

        it('should have proper label-input associations', () => {
            const fields = [
                ['situation', 'situation'],
                ['wantChange', 'want-change'],
                ['needHappy', 'need-happy'],
                ['q1True', 'q1-true'],
                ['q2Absolutely', 'q2-absolutely'],
                ['q3React', 'q3-react'],
                ['q4Without', 'q4-without']
            ];

            fields.forEach(([name, expectedId]) => {
                const html = renderFormField(name, 'Label', '', 3);
                const container = document.createElement('div');
                container.innerHTML = html;

                const label = container.querySelector('label');
                const textarea = container.querySelector('textarea');

                expect(label.getAttribute('for')).toBe(expectedId);
                expect(textarea.getAttribute('id')).toBe(expectedId);
                expect(textarea.getAttribute('name')).toBe(name);
            });
        });
    });
});

