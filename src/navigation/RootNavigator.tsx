import React from "react";
import { NavigationContainer } from "@react-navigation/native";

import { FullScreenLoader } from "../components/feedback/FullScreenLoader";
import { useAuth } from "../hooks/useAuth";
import { AuthStack } from "./auth/AuthStack";
import { OnboardingStack } from "./onboarding/OnboardingStack";
import { MainTabs } from "./tabs/MainTabs";

export function RootNavigator() {
  const { gateStatus } = useAuth();

  if (gateStatus === "booting") {
    return <FullScreenLoader label="Booting Tourist..." />;
  }

  const showMainApp = gateStatus === "ready";
  const showOnboarding = gateStatus === "needs_onboarding";
  const showAuth =
    gateStatus === "signed_out" ||
    gateStatus === "needs_phone_verification" ||
    gateStatus === "needs_email_verification";

  return (
    <NavigationContainer key={showMainApp ? "main" : showOnboarding ? "onboarding" : "auth"}>
      {showMainApp ? <MainTabs /> : null}
      {showOnboarding ? <OnboardingStack /> : null}
      {showAuth || (!showMainApp && !showOnboarding) ? <AuthStack /> : null}
    </NavigationContainer>
  );
}
