import React from "react";
import { StyleSheet, View } from "react-native";

import { Loader } from "../ui/Loader";

type FullScreenLoaderProps = {
  label?: string;
};

export function FullScreenLoader({ label = "Loading..." }: FullScreenLoaderProps) {
  return (
    <View style={styles.container}>
      <Loader label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
