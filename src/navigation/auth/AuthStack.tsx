import React from "react";
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
  const initialRouteName =
    gateStatus === "needs_phone_verification"
      ? AuthRoutes.PhoneVerificationScreen
      : gateStatus === "needs_email_verification"
        ? AuthRoutes.EmailVerificationScreen
        : AuthRoutes.LoginScreen;

  return (
    <Stack.Navigator initialRouteName={initialRouteName} key={gateStatus} screenOptions={{ headerShown: false }}>
      <Stack.Screen component={LoginScreen} name={AuthRoutes.LoginScreen} />
      <Stack.Screen component={SignupScreen} name={AuthRoutes.SignupScreen} />
      <Stack.Screen component={PhoneVerificationScreen} name={AuthRoutes.PhoneVerificationScreen} />
      <Stack.Screen component={EmailVerificationScreen} name={AuthRoutes.EmailVerificationScreen} />
    </Stack.Navigator>
  );
}
