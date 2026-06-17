import React from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "../../../constants/theme";
import { ProfileEventHighlights, type StoryHighlightItem } from "./ProfileEventHighlights";

type ProfileHighlightRowProps = {
  highlights: StoryHighlightItem[];
};

export function ProfileHighlightRow({ highlights }: ProfileHighlightRowProps) {
  return (
    <View style={styles.wrapper}>
      <ProfileEventHighlights highlights={highlights} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: -theme.spacing.xs,
  },
});
