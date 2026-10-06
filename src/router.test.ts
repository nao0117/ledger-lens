import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash } from './router.ts';

describe('parseHash', () => {
  it('パスとクエリに分ける', () => {
    expect(parseHash('#/holdings?unclassified=1')).toEqual({ path: '/holdings', query: 'unclassified=1' });
    expect(parseHash('#/composition')).toEqual({ path: '/composition', query: '' });
  });

  it('空・未知のパス（旧 /trend を含む）はホームにする', () => {
    expect(parseHash('').path).toBe('/');
    expect(parseHash('#').path).toBe('/');
    expect(parseHash('#/trend').path).toBe('/');
    expect(parseHash('#/nope?x=1')).toEqual({ path: '/', query: 'x=1' });
  });
});

describe('hrefFor', () => {
  it('クエリがあれば付ける', () => {
    expect(hrefFor('/')).toBe('#/');
    expect(hrefFor('/holdings', { unclassified: '1' })).toBe('#/holdings?unclassified=1');
  });
});
