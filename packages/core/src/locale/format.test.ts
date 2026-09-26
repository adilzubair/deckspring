import { describe, expect, it } from 'vitest';
import { plural } from './format';

describe('plural', () => {
  it('uses Arabic zero, one, two, few, many, and other forms', () => {
    const forms = {
      zero: 'zero',
      one: 'one',
      two: 'two',
      few: 'few',
      many: 'many',
      other: 'other',
    };
    expect([0, 1, 2, 3, 11, 100].map((count) => plural(count, forms, 'ar'))).toEqual([
      'zero',
      'one',
      'two',
      'few',
      'many',
      'other',
    ]);
    expect(plural(2, { one: 'one', other: 'other' })).toBe('other');
  });
});
