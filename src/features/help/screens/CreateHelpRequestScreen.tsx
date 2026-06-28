import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { HelpRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList } from "../../../navigation/types";
import { uploadImage } from "../../../services/media/cloudinary";
import { HELP_CATEGORIES, type HelpCategoryValue } from "../constants/helpCategories";
import { createHelpRequest } from "../services/help.service";

type Props = NativeStackScreenProps<HelpStackParamList, "CreateHelpRequestScreen">;

export function CreateHelpRequestScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<HelpCategoryValue | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const locationSummary = useMemo(() => {
    if (!user) {
      return "";
    }
    const city = user.publicProfile.currentCity || user.privateProfile.destinationCity;
    const country = user.privateProfile.destinationCountryCode;
    const community = user.publicProfile.homeCommunity;
    return `${community} · ${city}, ${country}`;
  }, [user]);

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Galeri izni gerekli.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setPhotoUri(result.assets[0].uri);
    setError("");
  };

  const removePhoto = () => {
    setPhotoUri(null);
  };

  const onSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Başlık ve açıklama zorunludur.");
      return;
    }

    if (!category) {
      setError("Lütfen bir kategori seçin.");
      return;
    }

    if (!user) {
      setError("Oturum bulunamadı.");
      return;
    }

    const community = user.publicProfile.homeCommunity.trim();
    const countryCode = user.privateProfile.destinationCountryCode.trim().toUpperCase();
    const city = (user.publicProfile.currentCity || user.privateProfile.destinationCity).trim();

    if (!community || countryCode.length < 2 || !city) {
      setError("Profil bilgilerin eksik (topluluk, şehir veya ülke). Onboarding adımlarını tamamla.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        try {
          photoUrl = await uploadImage(photoUri, { folder: "help-requests" });
        } catch {
          // Fotoğraf (Cloudinary) başarısız olsa bile isteği fotoğrafsız gönder.
          photoUrl = undefined;
        }
      }

      await createHelpRequest({
        community,
        countryCode,
        city,
        title,
        description,
        category,
        photoUrl,
      });

      navigation.navigate(HelpRoutes.HelpListScreen, {
        refreshToken: `${Date.now()}`,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "İstek oluşturulamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Card>
            <AppText style={styles.title} variant="title">
              Yardım İsteği Oluştur
            </AppText>
            <AppText style={styles.subtitle} variant="bodyMuted">
              İhtiyacını net yaz; yakındaki topluluk üyeleri sana ulaşabilsin.
            </AppText>
            {locationSummary ? (
              <AppText style={styles.locationSummary} variant="caption">
                Konum: {locationSummary}
              </AppText>
            ) : null}
          </Card>

          <Card style={styles.formCard}>
            <View style={styles.formSection}>
              <AppText style={styles.fieldLabel} variant="label">
                Kategori *
              </AppText>
              <View style={styles.categoryGrid}>
                {HELP_CATEGORIES.map((item) => {
                  const selected = category === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => setCategory(item.value)}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    >
                      <AppText style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]} variant="caption">
                        {item.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formSection}>
              <AppText style={styles.fieldLabel} variant="label">
                Başlık *
              </AppText>
              <AppInput onChangeText={setTitle} placeholder="Örn. Kira sözleşmesi için rehberlik" value={title} />
            </View>

            <View style={styles.formSection}>
              <AppText style={styles.fieldLabel} variant="label">
                Durumunu Anlat *
              </AppText>
              <AppInput
                multiline
                onChangeText={setDescription}
                placeholder="Yardımcı olacak kişinin bilmesi gereken detayları yaz..."
                style={styles.descriptionInput}
                value={description}
              />
            </View>

            <View style={styles.formSection}>
              <AppText style={styles.fieldLabel} variant="label">
                Fotoğraf (isteğe bağlı)
              </AppText>
              {photoUri ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <Pressable onPress={removePhoto} style={styles.removePhotoButton}>
                    <Ionicons color="#FFFFFF" name="close" size={14} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => void pickFromGallery()} style={styles.galleryButton}>
                  <Ionicons color="#059669" name="images-outline" size={20} />
                  <AppText style={styles.galleryButtonText} variant="label">
                    Galeriden fotoğraf seç
                  </AppText>
                </Pressable>
              )}
            </View>

            {error ? (
              <AppText style={styles.error} variant="caption">
                {error}
              </AppText>
            ) : null}

            <AppButton
              containerStyle={styles.submitButton}
              label={isSubmitting ? "Gönderiliyor..." : "İsteği Yayınla"}
              loading={isSubmitting}
              onPress={() => void onSubmit()}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  container: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  locationSummary: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  formCard: {
    gap: theme.spacing.xxl,
  },
  formSection: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  categoryChip: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#059669",
  },
  categoryChipText: {
    color: "#374151",
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: "#047857",
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  galleryButton: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  galleryButtonText: {
    color: "#047857",
  },
  photoPreviewWrap: {
    alignSelf: "flex-start",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  photoPreview: {
    height: 160,
    width: 160,
  },
  removePhotoButton: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 24,
  },
  submitButton: {
    backgroundColor: "#16A34A",
    marginTop: theme.spacing.xs,
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing.sm,
  },
});
