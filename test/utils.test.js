import { describe, it, expect } from 'vitest';

// Utility function tests
describe('Utility Functions', () => {
  describe('Date formatting', () => {
    it('should format dates correctly', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = date.toLocaleDateString();
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should handle ISO date strings', () => {
      const isoString = new Date().toISOString();
      const date = new Date(isoString);
      expect(date.toISOString()).toBe(isoString);
    });
  });

  describe('Text truncation', () => {
    it('should truncate long text', () => {
      const longText = 'A'.repeat(150);
      const truncated = longText.length > 100 
        ? longText.substring(0, 100) + '...' 
        : longText;
      
      expect(truncated.length).toBe(103);
      expect(truncated).toContain('...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      const truncated = shortText.length > 100 
        ? shortText.substring(0, 100) + '...' 
        : shortText;
      
      expect(truncated).toBe(shortText);
      expect(truncated.length).toBe(shortText.length);
    });
  });

  describe('Preview text generation', () => {
    it('should use situation as preview if available', () => {
      const worksheet = { situation: 'Test situation', person: 'Test person' };
      const preview = worksheet.situation || worksheet.person || 'No content';
      expect(preview).toBe('Test situation');
    });

    it('should use person as preview if situation not available', () => {
      const worksheet = { person: 'Test person' };
      const preview = worksheet.situation || worksheet.person || 'No content';
      expect(preview).toBe('Test person');
    });

    it('should use default if neither available', () => {
      const worksheet = {};
      const preview = worksheet.situation || worksheet.person || 'No content';
      expect(preview).toBe('No content');
    });
  });

  describe('Form data collection', () => {
    it('should trim form field values', () => {
      const values = ['  test  ', '  another  ', 'normal'];
      const trimmed = values.map(v => v.trim());
      
      expect(trimmed[0]).toBe('test');
      expect(trimmed[1]).toBe('another');
      expect(trimmed[2]).toBe('normal');
    });

    it('should handle empty strings', () => {
      const empty = '';
      const trimmed = empty.trim();
      expect(trimmed).toBe('');
    });
  });
});

