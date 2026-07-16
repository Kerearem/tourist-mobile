import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { AppText } from "../../../../components/ui/AppText";
import { theme } from "../../../../constants/theme";
import type { GuidedCaptureCopy, GuidedCaptureMode } from "../../utils/organizer-verification-capture";
import { resolveGuidedCaptureFrameRect } from "../../utils/organizer-verification-guided-crop";

type Props = {
  mode: GuidedCaptureMode;
  copy: GuidedCaptureCopy;
};

export function VerificationGuidedCaptureOverlay({ mode, copy }: Props) {
  const { width, height } = useWindowDimensions();
  const frame = resolveGuidedCaptureFrameRect(mode, width, height);
  const { left: frameLeft, top: frameTop, width: frameWidth, height: frameHeight } = frame;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: frameTop }]} />
      <View style={[styles.overlay, { top: frameTop, left: 0, width: frameLeft, height: frameHeight }]} />
      <View
        style={[
          styles.overlay,
          {
            top: frameTop,
            left: frameLeft + frameWidth,
            right: 0,
            height: frameHeight,
          },
        ]}
      />
      <View
        style={[
          styles.overlay,
          {
            top: frameTop + frameHeight,
            left: 0,
            right: 0,
            bottom: 0,
          },
        ]}
      />

      <View
        style={[
          mode === "identity" ? styles.identityFrame : styles.selfieFrame,
          {
            top: frameTop,
            left: frameLeft,
            width: frameWidth,
            height: frameHeight,
            borderRadius: mode === "identity" ? theme.radius.lg : frameWidth / 2,
          },
        ]}
      />

      <View style={[styles.instructions, { top: frameTop + frameHeight + theme.spacing.lg }]}>
        <AppText style={styles.instructionPrimary} variant="sectionTitle">
          {copy.primaryInstruction}
        </AppText>
        <AppText style={styles.instructionSecondary} variant="body">
          {copy.secondaryInstruction}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    position: "absolute",
  },
  identityFrame: {
    borderColor: "#FFFFFF",
    borderStyle: "dashed",
    borderWidth: 2,
    position: "absolute",
  },
  selfieFrame: {
    borderColor: "#FFFFFF",
    borderStyle: "dashed",
    borderWidth: 2,
    position: "absolute",
  },
  instructions: {
    alignItems: "center",
    gap: theme.spacing.xs,
    left: theme.spacing.lg,
    position: "absolute",
    right: theme.spacing.lg,
  },
  instructionPrimary: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  instructionSecondary: {
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  },
});
