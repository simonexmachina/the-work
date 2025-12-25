import { describe, it, expect } from 'vitest';

// Test UUID generation function (from app.js line 16)
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

describe('generateId', () => {
  it('should generate a valid UUID v4 format', () => {
    const id = generateId();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(id).toMatch(uuidRegex);
  });

  it('should always have version 4 indicator', () => {
    const id = generateId();
    expect(id[14]).toBe('4'); // 13th position (0-indexed) should be '4'
  });

  it('should have correct variant bits', () => {
    const id = generateId();
    const variantChar = id[19]; // 19th position (0-indexed)
    expect(['8', '9', 'a', 'b']).toContain(variantChar);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      ids.add(generateId());
    }

    // All IDs should be unique
    expect(ids.size).toBe(count);
  });

  it('should always generate strings of length 36', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateId();
      expect(id.length).toBe(36);
    }
  });

  it('should have hyphens in correct positions', () => {
    const id = generateId();
    expect(id[8]).toBe('-');
    expect(id[13]).toBe('-');
    expect(id[18]).toBe('-');
    expect(id[23]).toBe('-');
  });

  it('should only contain valid hex characters', () => {
    const id = generateId();
    const parts = id.split('-');
    const hexRegex = /^[0-9a-f]+$/;

    parts.forEach(part => {
      expect(part).toMatch(hexRegex);
    });
  });
});
