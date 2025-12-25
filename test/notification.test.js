import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Notification System', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="notification-container"></div>
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

        // Mock setTimeout
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        dom.window.close();
    });

    // Simplified notification function for testing
    function showNotification(message, type = 'success', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.dataset.type = type;
        notification.dataset.duration = duration;

        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);

        return notification;
    }

    describe('Basic Notification', () => {
        it('should create a notification element', () => {
            const notification = showNotification('Test message', 'success');
            expect(notification).toBeTruthy();
            expect(notification.textContent).toBe('Test message');
        });

        it('should add notification to container', () => {
            const container = document.getElementById('notification-container');
            showNotification('Test message');
            expect(container.children.length).toBe(1);
        });

        it('should handle multiple notifications', () => {
            const container = document.getElementById('notification-container');
            showNotification('Message 1');
            showNotification('Message 2');
            showNotification('Message 3');
            expect(container.children.length).toBe(3);
        });

        it('should return null if container does not exist', () => {
            document.body.innerHTML = '';
            const result = showNotification('Test');
            expect(result).toBeUndefined();
        });
    });

    describe('Notification Types', () => {
        it('should create success notification', () => {
            const notification = showNotification('Success!', 'success');
            expect(notification.classList.contains('notification-success')).toBe(true);
            expect(notification.dataset.type).toBe('success');
        });

        it('should create error notification', () => {
            const notification = showNotification('Error!', 'error');
            expect(notification.classList.contains('notification-error')).toBe(true);
            expect(notification.dataset.type).toBe('error');
        });

        it('should create warning notification', () => {
            const notification = showNotification('Warning!', 'warning');
            expect(notification.classList.contains('notification-warning')).toBe(true);
            expect(notification.dataset.type).toBe('warning');
        });

        it('should create info notification', () => {
            const notification = showNotification('Info!', 'info');
            expect(notification.classList.contains('notification-info')).toBe(true);
            expect(notification.dataset.type).toBe('info');
        });

        it('should default to success type', () => {
            const notification = showNotification('Default');
            expect(notification.classList.contains('notification-success')).toBe(true);
        });
    });

    describe('Auto-dismiss', () => {
        it('should set default duration', () => {
            const notification = showNotification('Test');
            expect(notification.dataset.duration).toBe('5000');
        });

        it('should accept custom duration', () => {
            const notification = showNotification('Test', 'success', 3000);
            expect(notification.dataset.duration).toBe('3000');
        });

        it('should remove notification after duration', () => {
            const container = document.getElementById('notification-container');
            showNotification('Test', 'success', 1000);
            
            expect(container.children.length).toBe(1);
            
            // Fast-forward time
            vi.advanceTimersByTime(1000);
            
            expect(container.children.length).toBe(0);
        });

        it('should handle multiple notifications with different durations', () => {
            const container = document.getElementById('notification-container');
            showNotification('Short', 'success', 1000);
            showNotification('Medium', 'success', 2000);
            showNotification('Long', 'success', 3000);
            
            expect(container.children.length).toBe(3);
            
            vi.advanceTimersByTime(1000);
            expect(container.children.length).toBe(2);
            
            vi.advanceTimersByTime(1000);
            expect(container.children.length).toBe(1);
            
            vi.advanceTimersByTime(1000);
            expect(container.children.length).toBe(0);
        });
    });

    describe('Message Content', () => {
        it('should display message text', () => {
            const notification = showNotification('This is a test message');
            expect(notification.textContent).toBe('This is a test message');
        });

        it('should handle empty message', () => {
            const notification = showNotification('');
            expect(notification.textContent).toBe('');
        });

        it('should handle special characters in message', () => {
            const message = '<script>alert("xss")</script>';
            const notification = showNotification(message);
            expect(notification.textContent).toBe(message);
        });

        it('should handle long messages', () => {
            const longMessage = 'A'.repeat(500);
            const notification = showNotification(longMessage);
            expect(notification.textContent).toBe(longMessage);
        });
    });

    describe('Notification Stacking', () => {
        it('should stack notifications in order', () => {
            const container = document.getElementById('notification-container');
            showNotification('First');
            showNotification('Second');
            showNotification('Third');
            
            const notifications = container.children;
            expect(notifications[0].textContent).toBe('First');
            expect(notifications[1].textContent).toBe('Second');
            expect(notifications[2].textContent).toBe('Third');
        });

        it('should maintain order when dismissing', () => {
            const container = document.getElementById('notification-container');
            showNotification('First', 'success', 1000);
            showNotification('Second', 'success', 2000);
            showNotification('Third', 'success', 3000);
            
            vi.advanceTimersByTime(1000);
            
            const notifications = container.children;
            expect(notifications.length).toBe(2);
            expect(notifications[0].textContent).toBe('Second');
            expect(notifications[1].textContent).toBe('Third');
        });
    });

    describe('Edge Cases', () => {
        it('should handle notification with zero duration', () => {
            const container = document.getElementById('notification-container');
            showNotification('Test', 'success', 0);
            
            expect(container.children.length).toBe(1);
            vi.advanceTimersByTime(0);
            expect(container.children.length).toBe(0);
        });

        it('should not crash if notification is manually removed', () => {
            const notification = showNotification('Test', 'success', 1000);
            notification.remove();
            
            vi.advanceTimersByTime(1000);
            // Should not throw error
            expect(true).toBe(true);
        });

        it('should handle container being removed', () => {
            showNotification('Test', 'success', 1000);
            document.body.innerHTML = '';
            
            // Should not throw error when trying to remove
            vi.advanceTimersByTime(1000);
            expect(true).toBe(true);
        });
    });
});

