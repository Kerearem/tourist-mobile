import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";

type MessageComposerProps = {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
};

export function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [text, setText] = useState("");

  const handleSend = async () => {
    if (!text.trim() || disabled) {
      return;
    }
    const next = text;
    setText("");
    await onSend(next);
  };

  return (
    <View style={styles.container}>
      <AppInput onChangeText={setText} placeholder="Type a message" style={styles.input} value={text} />
      <AppButton label="Send" onPress={() => void handleSend()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
  },
});
