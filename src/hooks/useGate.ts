import { useMemo } from "react";

import { useAuth } from "./useAuth";

export function useGate() {
  const auth = useAuth();

  return useMemo(
    () => ({
      gateStatus: auth.gateStatus,
      isBooting: auth.isBooting,
      isSignedOut: auth.gateStatus === "signed_out",
      needsOnboarding: auth.gateStatus === "needs_onboarding",
      isReady: auth.gateStatus === "ready",
    }),
    [auth.gateStatus, auth.isBooting],
  );
}
