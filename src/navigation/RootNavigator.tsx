import React from "react";
import { NavigationContainer } from "@react-navigation/native";

import { FullScreenLoader } from "../components/feedback/FullScreenLoader";
import { useAuth } from "../hooks/useAuth";
import { AuthStack } from "./auth/AuthStack";
import { OnboardingStack } from "./onboarding/OnboardingStack";
import { MainTabs } from "./tabs/MainTabs";

export function RootNavigator() {
  const { gateStatus } = useAuth();

  // Tourist mobile handles end-user flows only.
  // Admin dashboard is planned as a separate web client.
  if (gateStatus === "booting") {
    return <FullScreenLoader label="Booting Tourist..." />;
  }

  return (
    <NavigationContainer>
      {gateStatus === "signed_out" || gateStatus === "needs_phone_verification" || gateStatus === "needs_email_verification" ? (
        <AuthStack />
      ) : null}

      {gateStatus === "needs_onboarding" ? <OnboardingStack /> : null}

      {gateStatus === "ready" ? <MainTabs /> : null}
    </NavigationContainer>
  );
}
