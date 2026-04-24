import { describe, it, expect } from 'vitest';
import { makePreview } from '../chat';

describe('makePreview', () => {
  it('truncates to 80 chars', () => {
    const long = 'a'.repeat(200);
    expect(makePreview(long)).toHaveLength(80);
  });
  it('leaves short text unchanged', () => {
    expect(makePreview('ciao')).toBe('ciao');
  });
});
