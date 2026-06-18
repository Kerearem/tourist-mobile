import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { FlowProgressBar } from "../../../components/ui/FlowProgressBar";
import { SIGNUP_FLOW_STEPS, SIGNUP_FLOW_TOTAL_STEPS } from "../constants/signupFlow";
import { Screen } from "../../../components/ui/Screen";
import { AuthRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { AuthStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneVerificationScreen">;

export function PhoneVerificationScreen({ navigation }: Props) {
  const { completePhoneVerification, resendPhoneCode, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState("A 6-digit code was sent to your phone.");
  const [expiresInSec, setExpiresInSec] = useState(600);
  const [resendInSec, setResendInSec] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresInSec((prev) => Math.max(0, prev - 1));
      setResendInSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expireLabel = useMemo(() => {
    const min = Math.floor(expiresInSec / 60);
    const sec = expiresInSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [expiresInSec]);

  const onConfirm = async () => {
    const cleanCode = code.replace(/\D+/g, "").slice(0, 6);
    if (cleanCode.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    if (expiresInSec === 0) {
      setError("Code expired. Please request a new one.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await completePhoneVerification(cleanCode);
      navigation.reset({
        index: 0,
        routes: [{ name: AuthRoutes.EmailVerificationScreen }],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Phone verification failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resendInSec > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setError(null);
    try {
      await resendPhoneCode();
      setCode("");
      setInfo("New code sent. Check the backend log for your verification code.");
      setExpiresInSec(600);
      setResendInSec(30);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not resend code.";
      if (message.toLowerCase().includes("once per minute") || message.toLowerCase().includes("too many")) {
        setError("Çok sık denediniz, biraz bekleyin.");
      } else {
        setError(message);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <FlowProgressBar currentStep={SIGNUP_FLOW_STEPS.phoneVerification} totalSteps={SIGNUP_FLOW_TOTAL_STEPS} />
        <View style={styles.content}>
          <AppText style={styles.title}>Phone Verification</AppText>
          <AppText muted style={styles.subtitle}>
            {info}
          </AppText>

          <AppInput
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(value) => {
              setCode(value.replace(/\D+/g, "").slice(0, 6));
              if (error) {
                setError(null);
              }
            }}
            placeholder="Enter 6-digit code"
            value={code}
          />

          <View style={styles.metaRow}>
            <AppText muted variant="caption">
              Expires in {expireLabel}
            </AppText>
            <AppButton
              containerStyle={[styles.resendButton, resendInSec > 0 && styles.resendButtonDisabled]}
              disabled={resendInSec > 0 || isResending}
              label={resendInSec > 0 ? `Resend in ${resendInSec}s` : isResending ? "Sending..." : "Resend code"}
              onPress={onResend}
              variant="secondary"
            />
          </View>

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <AppButton label={isSubmitting ? "Verifying..." : "Confirm Phone"} loading={isSubmitting} onPress={onConfirm} />
          <AppButton containerStyle={styles.secondaryButton} label="Sign Out" onPress={signOut} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: 8,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resendButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resendButtonDisabled: {
    opacity: 0.7,
  },
  error: {
    color: "#DC2626",
  },
  secondaryButton: {
    backgroundColor: "#6B7280",
  },
});
