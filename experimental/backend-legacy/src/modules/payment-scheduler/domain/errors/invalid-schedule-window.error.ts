export class InvalidScheduleWindowError extends Error {
  constructor(reason: string) { super(`Invalid schedule window: ${reason}`); this.name = 'InvalidScheduleWindowError'; }
}
