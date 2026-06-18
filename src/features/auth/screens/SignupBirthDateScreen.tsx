import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { AuthRoutes } from "../../../constants/routes";
import type { AuthStackParamList } from "../../../navigation/types";
import { BirthDatePicker } from "../components/BirthDatePicker";
import { SignupFlowLayout } from "../components/SignupFlowLayout";
import { SIGNUP_FLOW_STEPS } from "../constants/signupFlow";
import { useSignupDraft } from "../providers/SignupDraftProvider";
import {
  formatBirthDate,
  getDefaultBirthDate,
  getMaximumBirthDate,
  getMinimumBirthDate,
  parseBirthDate,
} from "../utils/birthDate";

type Props = NativeStackScreenProps<AuthStackParamList, "SignupBirthDateScreen">;

export function SignupBirthDateScreen({ navigation }: Props) {
  const { draft, updateDraft } = useSignupDraft();
  const initialDate = useMemo(
    () => parseBirthDate(draft.birthDate) ?? getDefaultBirthDate(),
    [draft.birthDate],
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const onContinue = () => {
    updateDraft({ birthDate: formatBirthDate(selectedDate) });
    navigation.navigate(AuthRoutes.SignupUsernameScreen);
  };

  return (
    <SignupFlowLayout
      currentStep={SIGNUP_FLOW_STEPS.birthDate}
      onBack={() => navigation.goBack()}
      onPrimaryPress={onContinue}
      primaryLabel="Continue"
      showBack
      subtitle="Scroll the wheels to pick your birth date."
      title="When were you born?"
    >
      <View style={styles.selectedDateCard}>
        <AppText muted variant="caption">
          Selected date
        </AppText>
        <AppText style={styles.selectedDateValue}>{formatBirthDate(selectedDate)}</AppText>
      </View>

      <BirthDatePicker
        maximumDate={getMaximumBirthDate()}
        minimumDate={getMinimumBirthDate()}
        onChange={setSelectedDate}
        value={selectedDate}
      />
    </SignupFlowLayout>
  );
}

const styles = StyleSheet.create({
  selectedDateCard: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedDateValue: {
    fontSize: 18,
    fontWeight: "700",
  },
});
