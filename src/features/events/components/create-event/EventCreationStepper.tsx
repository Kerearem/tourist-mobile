import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../../components/ui/AppText";
import { theme } from "../../../../constants/theme";
import { EVENT_CREATION_STEPS, type EventCreationStep } from "../../types/eventCreation";

const ACTIVE_COLOR = "#7C3AED";
const COMPLETE_COLOR = "#7C3AED";
const NEUTRAL_COLOR = "#E5E7EB";

type EventCreationStepperProps = {
  currentStep: EventCreationStep;
  completedSteps: EventCreationStep[];
};

export function EventCreationStepper({ currentStep, completedSteps }: EventCreationStepperProps) {
  return (
    <View style={styles.container}>
      {EVENT_CREATION_STEPS.map((step) => {
        const isActive = step === currentStep;
        const isCompleted = completedSteps.includes(step);
        const isFuture = step > currentStep && !isCompleted;

        return (
          <View key={step} style={styles.stepItem}>
            <View
              style={[
                styles.dot,
                isActive && styles.dotActive,
                isCompleted && styles.dotCompleted,
                isFuture && styles.dotFuture,
              ]}
            >
              {isCompleted && step < currentStep ? (
                <Ionicons color="#FFFFFF" name="checkmark" size={12} />
              ) : (
                <AppText style={[styles.dotLabel, (isActive || isCompleted) && styles.dotLabelActive]} variant="caption">
                  {step}
                </AppText>
              )}
            </View>
            {step < EVENT_CREATION_STEPS.length ? (
              <View style={[styles.connector, isCompleted ? styles.connectorCompleted : styles.connectorNeutral]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
  },
  stepItem: {
    alignItems: "center",
    flexDirection: "row",
  },
  dot: {
    alignItems: "center",
    backgroundColor: NEUTRAL_COLOR,
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  dotActive: {
    backgroundColor: ACTIVE_COLOR,
  },
  dotCompleted: {
    backgroundColor: COMPLETE_COLOR,
  },
  dotFuture: {
    backgroundColor: "#F3F4F6",
    borderColor: NEUTRAL_COLOR,
    borderWidth: 1,
  },
  dotLabel: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  dotLabelActive: {
    color: "#FFFFFF",
  },
  connector: {
    height: 2,
    marginHorizontal: 4,
    width: 18,
  },
  connectorCompleted: {
    backgroundColor: COMPLETE_COLOR,
  },
  connectorNeutral: {
    backgroundColor: NEUTRAL_COLOR,
  },
});
