/**
 * Mixing service — public interface.
 */

export type { DestinationAddress } from "./types";
export {
  addDestination,
  removeDestination,
  computeTotalPercentage,
  computeCanProceed,
} from "./distribution";
