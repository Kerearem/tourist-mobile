import React, { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { Screen } from "../../../components/ui/Screen";
import { HelpRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList } from "../../../navigation/types";
import { createHelpRequest } from "../services/help.service";

type Props = NativeStackScreenProps<HelpStackParamList, "CreateHelpRequestScreen">;

export function CreateHelpRequestScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{ id: string; uri: string; name: string; previewType: "image" | "video" | "file" }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Gallery permission is required to select photos/videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setAttachments((prev) => [
      ...prev,
      ...result.assets.map((asset) => ({
        id: `${asset.assetId ?? asset.uri}_${Date.now()}`,
        uri: asset.uri,
        name: asset.fileName ?? "Media",
        previewType: asset.type === "video" ? "video" : "image",
      })),
    ]);
    setError("");
  };

  const pickFromFiles = async () => {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: ["image/*", "video/*"],
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }

      setAttachments((prev) => [
        ...prev,
        ...result.assets.map((asset) => ({
          id: `${asset.uri}_${Date.now()}`,
          uri: asset.uri,
          name: asset.name ?? "File",
          previewType: asset.mimeType?.startsWith("video/") ? "video" : asset.mimeType?.startsWith("image/") ? "image" : "file",
        })),
      ]);
      setError("");
    } catch {
      setError("Files picker is unavailable. Rebuild the iOS app and try again.");
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const onSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    if (!user) {
      setError("No active user.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    await createHelpRequest({
      author: {
        id: user.id,
        displayName: user.displayName,
      },
      community: user.community,
      countryCode: user.currentCountryCode,
      city: user.currentCity,
      title,
      description,
    });
    setIsSubmitting(false);

    navigation.navigate(HelpRoutes.HelpListScreen, {
      refreshToken: `${Date.now()}`,
    });
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Card>
          <AppText style={styles.title} variant="title">
            Create Help Request
          </AppText>
          <AppText style={styles.subtitle} variant="bodyMuted">
            Share your request clearly so nearby community members can support you faster.
          </AppText>
          <View style={styles.badgeRow}>
            <Badge label="Community Support" />
            <Badge label="UI-only form" />
          </View>
        </Card>

        <Card>
          <AppInput label="Request Title" onChangeText={setTitle} placeholder="e.g. Need guidance for rental documents" value={title} />
          <AppInput
            error={error || undefined}
            label="Describe Your Situation"
            multiline
            onChangeText={setDescription}
            placeholder="Add important details so helpers can respond effectively..."
            style={styles.descriptionInput}
            value={description}
          />

          <View style={styles.attachmentsSection}>
            <AppText style={styles.attachmentsLabel} variant="label">
              Add photos or videos
            </AppText>
            <View style={styles.attachmentsActions}>
              <Pressable onPress={() => void pickFromGallery()} style={styles.attachmentsActionButton}>
                <Ionicons color="#0F172A" name="images-outline" size={16} />
                <AppText style={styles.attachmentsActionText} variant="caption">
                  Gallery
                </AppText>
              </Pressable>
              <Pressable onPress={() => void pickFromFiles()} style={styles.attachmentsActionButton}>
                <Ionicons color="#0F172A" name="document-outline" size={16} />
                <AppText style={styles.attachmentsActionText} variant="caption">
                  Files
                </AppText>
              </Pressable>
            </View>

            {attachments.length > 0 ? (
              <View style={styles.attachmentsGrid}>
                {attachments.map((item) => (
                  <View key={item.id} style={styles.attachmentTile}>
                    {item.previewType === "image" ? (
                      <Image source={{ uri: item.uri }} style={styles.attachmentImage} />
                    ) : (
                      <View style={styles.attachmentFallback}>
                        <Ionicons color="#1F2937" name={item.previewType === "video" ? "videocam-outline" : "document-outline"} size={18} />
                        <AppText style={styles.attachmentName} numberOfLines={1} variant="caption">
                          {item.name}
                        </AppText>
                      </View>
                    )}
                    <Pressable onPress={() => removeAttachment(item.id)} style={styles.removeAttachmentButton}>
                      <Ionicons color="#FFFFFF" name="close" size={12} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {error ? (
            <AppText style={styles.error} variant="caption">
              {error}
            </AppText>
          ) : null}

          <AppButton
            containerStyle={styles.submitButton}
            label={isSubmitting ? "Submitting..." : "Submit Request"}
            loading={isSubmitting}
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
  badgeRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    marginBottom: theme.spacing.sm,
  },
  descriptionInput: {
    marginTop: theme.spacing.md,
    minHeight: 120,
    textAlignVertical: "top",
  },
  attachmentsInput: {
    marginTop: theme.spacing.md,
  },
  attachmentsSection: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  attachmentsLabel: {
    color: theme.colors.textPrimary,
  },
  attachmentsActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  attachmentsActionButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  attachmentsActionText: {
    color: "#0F172A",
    fontWeight: "600",
  },
  attachmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  attachmentTile: {
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    height: 82,
    overflow: "hidden",
    position: "relative",
    width: 82,
  },
  attachmentImage: {
    height: "100%",
    width: "100%",
  },
  attachmentFallback: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  attachmentName: {
    color: "#374151",
    textAlign: "center",
  },
  removeAttachmentButton: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 20,
  },
  submitButton: {
    backgroundColor: "#16A34A",
    marginTop: theme.spacing.lg,
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
});
