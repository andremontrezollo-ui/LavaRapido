/**
 * Mixing Infrastructure — I/O boundary for the mixing feature.
 *
 * The only place allowed to call backend-client functions related to mixing.
 */

import { createMixSession as _createMixSession } from "@/services/backend-client";
import type { ApiResult } from "@/services/backend-client";
import type { MixSessionResponse } from "@/contracts/mix-session";

/** Submit a new mix session to the backend. */
export function submitMixSession(): Promise<ApiResult<MixSessionResponse>> {
  return _createMixSession();
}
