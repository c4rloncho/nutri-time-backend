import { AvailabilityService } from './availability.service';

// ponytail: solo isPastSlot — sin módulo de Nest ni repos falsos.
describe('AvailabilityService.isPastSlot', () => {
  const service = Object.create(
    AvailabilityService.prototype,
  ) as AvailabilityService;

  beforeAll(() => {
    process.env.CLINIC_TZ = 'UTC';
    jest.useFakeTimers().setSystemTime(new Date('2026-07-25T10:00:00Z'));
  });
  afterAll(() => jest.useRealTimers());

  it('marca pasados los slots de hoy anteriores a la hora actual', () => {
    expect(service.isPastSlot('2026-07-25', '09:00')).toBe(true);
    expect(service.isPastSlot('2026-07-25', '10:00')).toBe(true); // justo ahora: ya no se agenda
    expect(service.isPastSlot('2026-07-25', '11:00')).toBe(false);
  });

  it('compara el día antes que la hora', () => {
    expect(service.isPastSlot('2026-07-24', '23:00')).toBe(true);
    expect(service.isPastSlot('2026-07-26', '08:00')).toBe(false);
  });
});
