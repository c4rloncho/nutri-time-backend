import { lastMonths } from './admin.service';

describe('lastMonths', () => {
  it('devuelve n meses terminando en el actual', () => {
    expect(lastMonths(3, new Date('2026-07-15T00:00:00Z'))).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
    ]);
  });

  it('cruza el cambio de anio', () => {
    expect(lastMonths(3, new Date('2026-01-31T00:00:00Z'))).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
  });
});
