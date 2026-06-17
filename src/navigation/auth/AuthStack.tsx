import React, { useEffect, useMemo, useRef } from "react";
import { CommonActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthRoutes } from "../../constants/routes";
import { EmailVerificationScreen } from "../../features/auth/screens/EmailVerificationScreen";
import { LoginScreen } from "../../features/auth/screens/LoginScreen";
import { PhoneVerificationScreen } from "../../features/auth/screens/PhoneVerificationScreen";
import { SignupScreen } from "../../features/auth/screens/SignupScreen";
import { useAuth } from "../../hooks/useAuth";
import type { AuthStackParamList } from "../types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  const { gateStatus } = useAuth();
  const navigationRef = useRef<any>(null);
  const initialRouteName =
    gateStatus === "needs_phone_verification"
      ? AuthRoutes.PhoneVerificationScreen
      : gateStatus === "needs_email_verification"
        ? AuthRoutes.EmailVerificationScreen
        : AuthRoutes.LoginScreen;
  const gateTargetRoute = useMemo(() => {
    if (gateStatus === "needs_phone_verification") {
      return AuthRoutes.PhoneVerificationScreen;
    }
    if (gateStatus === "needs_email_verification") {
      return AuthRoutes.EmailVerificationScreen;
    }
    return null;
  }, [gateStatus]);

  useEffect(() => {
    if (!gateTargetRoute || !navigationRef.current?.getState) {
      return;
    }

    const state = navigationRef.current.getState();
    const currentRouteName = state?.routes?.[state.index ?? 0]?.name;

    if (!currentRouteName || currentRouteName === gateTargetRoute) {
      return;
    }

    navigationRef.current.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: gateTargetRoute }],
      }),
    );
  }, [gateTargetRoute]);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      key={gateStatus}
      ref={navigationRef}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen component={LoginScreen} name={AuthRoutes.LoginScreen} />
      <Stack.Screen component={SignupScreen} name={AuthRoutes.SignupScreen} />
      <Stack.Screen component={PhoneVerificationScreen} name={AuthRoutes.PhoneVerificationScreen} />
      <Stack.Screen component={EmailVerificationScreen} name={AuthRoutes.EmailVerificationScreen} />
    </Stack.Navigator>
  );
}
