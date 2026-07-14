import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { ListItem } from "../../../components/ui/ListItem";
import { Screen } from "../../../components/ui/Screen";
import { theme } from "../../../constants/theme";
import {
  SUPPORT_TOPIC_OPTIONS,
  submitSupportReport,
  type SupportTopic,
} from "../services/support.service";
import { validateReportProblemForm } from "../utils/reportProblemForm";

export function ReportProblemScreen() {
  const [selectedTopic, setSelectedTopic] = useState<SupportTopic | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    const validation = validateReportProblemForm({ topic: selectedTopic, message });
    if (!validation.ok) {
      Alert.alert(validation.title, validation.description);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitSupportReport({ topic: validation.topic, message: validation.message });
      Alert.alert("Bildiriminiz alındı", "Teşekkürler, en kısa sürede inceleyeceğiz.");
      setSelectedTopic(null);
      setMessage("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bildirim gönderilemedi.";
      Alert.alert("Hata", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Card>
          <AppText variant="sectionTitle">Sorun Bildir</AppText>
          <AppText variant="bodyMuted">
            Yaşadığınız sorunu paylaşın; destek ekibimiz inceleyecektir.
          </AppText>
        </Card>

        <Card>
          <AppText style={styles.topicTitle} variant="label">
            Konu
          </AppText>
          {SUPPORT_TOPIC_OPTIONS.map((topic) => {
            const isSelected = selectedTopic === topic.value;
            return (
              <ListItem
                key={topic.value}
                onPress={() => setSelectedTopic(topic.value)}
                right={
                  isSelected ? (
                    <AppText style={styles.selectedMark} variant="label">
                      ✓
                    </AppText>
                  ) : null
                }
                title={topic.label}
              />
            );
          })}
        </Card>

        <Card>
          <AppInput
            label="Sorununuzu açıklayın"
            multiline
            onChangeText={setMessage}
            placeholder="Ne olduğunu kısaca yazın..."
            style={styles.input}
            value={message}
          />
          <AppButton
            disabled={isSubmitting}
            label={isSubmitting ? "Gönderiliyor..." : "Gönder"}
            onPress={() => void onSubmit()}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  topicTitle: {
    marginBottom: theme.spacing.sm,
  },
  selectedMark: {
    color: theme.colors.primary,
  },
  input: {
    marginBottom: theme.spacing.md,
    minHeight: 120,
    textAlignVertical: "top",
  },
});
