/**
 * Mixing Zod schemas
 * Single source of truth for mixing validation rules
 */

import { z } from "zod";
import { SERVICE_CONFIG } from "@/lib/constants";
import { isValidBitcoinAddress } from "@/lib/validation";

export const destinationSchema = z.object({
  id: z.string().min(1),
  address: z
    .string()
    .trim()
    .refine(isValidBitcoinAddress, {
      message: "Invalid Bitcoin address format",
    }),
  percentage: z
    .number()
    .int()
    .min(10, { message: "Minimum percentage is 10%" })
    .max(100, { message: "Maximum percentage is 100%" }),
});

export const mixingSchema = z.object({
  destinations: z
    .array(destinationSchema)
    .min(1, { message: "At least one destination is required" })
    .max(SERVICE_CONFIG.maxDestinations, {
      message: `Maximum ${SERVICE_CONFIG.maxDestinations} destinations allowed`,
    })
    .refine(
      (destinations) =>
        destinations.reduce((sum, d) => sum + d.percentage, 0) === 100,
      { message: "Total percentage must equal 100%" }
    ),
  delay: z
    .number()
    .min(SERVICE_CONFIG.minDelay, {
      message: `Minimum delay is ${SERVICE_CONFIG.minDelay} hours`,
    })
    .max(SERVICE_CONFIG.maxDelay, {
      message: `Maximum delay is ${SERVICE_CONFIG.maxDelay} hours`,
    }),
});

export type DestinationSchema = z.infer<typeof destinationSchema>;
export type MixingSchema = z.infer<typeof mixingSchema>;
