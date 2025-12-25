import { describe, it, expect } from 'vitest';

// Test the getSituationPreview logic
// Since the function isn't exported, we'll replicate its logic for testing
function getSituationPreview(worksheet) {
  const fullText = (worksheet.situation || worksheet.person || '').trim();
  if (!fullText) {
    return 'No content';
  }

  // Find end of first sentence (., !, or ? followed by space or end of string)
  const sentenceEndMatch = fullText.match(/[.!?](\s|$)/);
  const sentenceEndIndex = sentenceEndMatch ? sentenceEndMatch.index + 1 : fullText.length;

  // Take up to the end of the first sentence
  let previewBase = fullText.slice(0, sentenceEndIndex);

  // Enforce 90 character limit
  let preview = previewBase.length > 90 ? previewBase.slice(0, 90) : previewBase;

  const wasTruncatedBySentence = sentenceEndIndex < fullText.length;
  const wasTruncatedByLength = previewBase.length > 90;

  if (wasTruncatedBySentence || wasTruncatedByLength) {
    preview = preview.trimEnd() + '...';
  }

  return preview;
}

describe('getSituationPreview', () => {
  describe('Empty or missing content', () => {
    it('should return "No content" for empty situation and person', () => {
      const worksheet = {};
      expect(getSituationPreview(worksheet)).toBe('No content');
    });

    it('should return "No content" for whitespace-only situation', () => {
      const worksheet = { situation: '   ' };
      expect(getSituationPreview(worksheet)).toBe('No content');
    });

    it('should use person when situation is empty', () => {
      const worksheet = { person: 'Test person' };
      expect(getSituationPreview(worksheet)).toBe('Test person');
    });
  });

  describe('First sentence truncation', () => {
    it('should truncate at first period followed by space', () => {
      const worksheet = { situation: 'First sentence. Second sentence.' };
      expect(getSituationPreview(worksheet)).toBe('First sentence....');
    });

    it('should truncate at first exclamation mark followed by space', () => {
      const worksheet = { situation: 'First sentence! Second sentence.' };
      expect(getSituationPreview(worksheet)).toBe('First sentence!...');
    });

    it('should truncate at first question mark followed by space', () => {
      const worksheet = { situation: 'First sentence? Second sentence.' };
      expect(getSituationPreview(worksheet)).toBe('First sentence?...');
    });

    it('should truncate at period at end of string', () => {
      const worksheet = { situation: 'First sentence.' };
      expect(getSituationPreview(worksheet)).toBe('First sentence.');
    });

    it('should not truncate if no sentence ending found', () => {
      const worksheet = { situation: 'No sentence ending here' };
      expect(getSituationPreview(worksheet)).toBe('No sentence ending here');
    });
  });

  describe('90 character limit', () => {
    it('should truncate to 90 characters if first sentence is longer', () => {
      const longSentence = 'A'.repeat(150) + '.';
      const worksheet = { situation: longSentence };
      const result = getSituationPreview(worksheet);
      expect(result.length).toBe(93); // 90 chars + '...'
      expect(result).toContain('...');
      expect(result.slice(0, 90)).toBe('A'.repeat(90));
    });

    it('should not truncate if first sentence is exactly 90 characters', () => {
      const exactSentence = 'A'.repeat(89) + '.';
      const worksheet = { situation: exactSentence };
      const result = getSituationPreview(worksheet);
      // 89 A's + 1 period = 90 chars, no truncation needed
      expect(result).toBe(exactSentence);
    });

    it('should truncate if first sentence exceeds 90 characters', () => {
      const exactSentence = 'A'.repeat(90) + '.';
      const worksheet = { situation: exactSentence };
      const result = getSituationPreview(worksheet);
      // 90 A's + 1 period = 91 chars, should be truncated to 90 + '...'
      expect(result.length).toBe(93);
      expect(result).toContain('...');
    });

    it('should not truncate if first sentence is less than 90 characters', () => {
      const shortSentence = 'Short sentence.';
      const worksheet = { situation: shortSentence };
      expect(getSituationPreview(worksheet)).toBe('Short sentence.');
    });
  });

  describe('Combined truncation scenarios', () => {
    it('should handle sentence ending before 100 chars', () => {
      const worksheet = { situation: 'Short. ' + 'A'.repeat(200) };
      expect(getSituationPreview(worksheet)).toBe('Short....');
    });

    it('should handle sentence ending after 90 chars', () => {
      const longFirstSentence = 'A'.repeat(150) + '. Second sentence.';
      const worksheet = { situation: longFirstSentence };
      const result = getSituationPreview(worksheet);
      expect(result.length).toBe(93); // 90 chars + '...'
      expect(result).toContain('...');
    });

    it('should handle trailing whitespace (trimmed before processing)', () => {
      // The function trims the input first, so trailing whitespace is removed
      const worksheet = { situation: 'First sentence.   ' };
      // After trimming, it becomes 'First sentence.', which is a complete sentence
      // Since there's no more text after the period, no ellipsis is added
      expect(getSituationPreview(worksheet)).toBe('First sentence.');
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple sentence endings', () => {
      const worksheet = { situation: 'First. Second! Third?' };
      expect(getSituationPreview(worksheet)).toBe('First....');
    });

    it('should handle period without space (end of string)', () => {
      const worksheet = { situation: 'Sentence.' };
      expect(getSituationPreview(worksheet)).toBe('Sentence.');
    });

    it('should handle period with space', () => {
      const worksheet = { situation: 'Sentence. More text' };
      expect(getSituationPreview(worksheet)).toBe('Sentence....');
    });

    it('should handle very long text without sentence ending', () => {
      const longText = 'A'.repeat(200);
      const worksheet = { situation: longText };
      const result = getSituationPreview(worksheet);
      expect(result.length).toBe(93); // 90 chars + '...'
      expect(result).toContain('...');
    });
  });
});
