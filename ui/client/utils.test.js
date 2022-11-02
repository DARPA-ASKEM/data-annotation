/* eslint-disable no-undef */
import { formatDateOnly, matchFileNameExtension } from './utils';

describe('matchFileNameExtension', () => {
  test('returns matched extension assuming a file name, else null', () => {
    const inputs = [
      'hello.txt',
      'rabbits.nc',
      'aliens.another',
      'yaaaa.foobar',
      'a-one-test.second.csv',
      'yet-ano_.ad.ds.xlsx',
      'yet-ano_.ad.ds.xls',
      'whatAbu.aas.tiff',
      'hello'
    ];

    const outputs = inputs.map((i) => {
      const match = matchFileNameExtension(i);
      return match && match[0];
    });

    expect(outputs).toEqual([
      '.txt',
      '.nc',
      '.another',
      '.foobar',
      '.csv',
      '.xlsx',
      '.xls',
      '.tiff',
      null
    ]);
  });
});

describe('formatDateOnly', () => {
  test('formats ts to date, without time', () => {
    const result = formatDateOnly(1660656870);

    expect(result).toBe('1970-01-20');
  });
});
