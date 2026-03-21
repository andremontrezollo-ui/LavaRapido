export interface SchedulePaymentRequest { readonly destination: string; readonly amount: number; readonly delaySeconds: number; readonly label?: string; }
