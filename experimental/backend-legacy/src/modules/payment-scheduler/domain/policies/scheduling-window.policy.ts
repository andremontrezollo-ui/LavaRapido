import type { Policy } from '../../../../shared/policies/Policy';

interface WindowInput {
  scheduledFor: Date;
  now: Date;
  windowSizeSeconds: number;
}

interface WindowResult {
  isWithinWindow: boolean;
  windowStart: Date;
  windowEnd: Date;
}

export class SchedulingWindowPolicy implements Policy<WindowInput, WindowResult> {
  evaluate(input: WindowInput): WindowResult {
    const halfWindow = input.windowSizeSeconds * 500;
    const start = new Date(input.scheduledFor.getTime() - halfWindow);
    const end = new Date(input.scheduledFor.getTime() + halfWindow);
    return {
      isWithinWindow: input.now.getTime() >= start.getTime() && input.now.getTime() <= end.getTime(),
      windowStart: start,
      windowEnd: end,
    };
  }
}
