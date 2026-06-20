import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { Loader } from "../../../components/ui/Loader";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { getCountryByCode, getCountryLabel } from "../../../constants/countries";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { uploadImage } from "../../../services/media/cloudinary";
import { EventDateTimePicker } from "../components/EventDateTimePicker";
import { EventLocationPickerModal } from "../components/EventLocationPickerModal";
import { createEvent } from "../services/events.service";
import { getOrganizerStatus } from "../services/organizer.service";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "CreateEventScreen"
>;

const buildDefaultStart = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(18, 0, 0, 0);
  return date;
};

const addHours = (date: Date, hours: number) => {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
};

const formatDateTimeLabel = (date: Date) =>
  date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function CreateEventScreen({ navigation }: Props) {
  const { user } = useAuth();
  const defaultStart = useMemo(() => buildDefaultStart(), []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [endsAt, setEndsAt] = useState(addHours(defaultStart, 2));
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState(user?.privateProfile.destinationCity ?? user?.publicProfile.currentCity ?? "");
  const [countryCode, setCountryCode] = useState(user?.privateProfile.destinationCountryCode ?? "");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);
  const [hasActiveEvent, setHasActiveEvent] = useState(false);
  const [activeEventTitle, setActiveEventTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOrganizerApproved = user?.organizerStatus === "approved";
  const locationLabel = useMemo(() => {
    if (!countryCode || !city.trim()) {
      return "Ülke ve şehir seç";
    }
    const country = getCountryByCode(countryCode);
    const countryName = country ? getCountryLabel(country, "tr") : countryCode;
    return `${city}, ${countryName}`;
  }, [city, countryCode]);

  useEffect(() => {
    const loadLimit = async () => {
      setIsCheckingLimit(true);
      try {
        const status = await getOrganizerStatus();
        setHasActiveEvent(Boolean(status.hasActiveEvent));
        setActiveEventTitle(status.activeEventTitle ?? null);
      } catch {
        setHasActiveEvent(false);
      } finally {
        setIsCheckingLimit(false);
      }
    };

    void loadLimit();
  }, []);

  const pickCoverImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Kapak fotoğrafı seçmek için galeri izni gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const onSubmit = async () => {
    if (!isOrganizerApproved || hasActiveEvent) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedVenue = venueName.trim();
    const trimmedCity = city.trim();
    const trimmedCountryCode = countryCode.trim().toUpperCase();

    if (trimmedTitle.length < 3) {
      setError("Etkinlik adı en az 3 karakter olmalı.");
      return;
    }
    if (trimmedDescription.length < 10) {
      setError("Açıklama en az 10 karakter olmalı.");
      return;
    }
    if (!trimmedVenue || !trimmedCity || trimmedCountryCode.length < 2) {
      setError("Mekan, şehir ve ülke seçimini tamamla.");
      return;
    }
    if (endsAt <= startsAt) {
      setError("Bitiş zamanı başlangıçtan sonra olmalı.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let coverImageUrl: string | undefined;
      if (coverUri) {
        coverImageUrl = await uploadImage(coverUri, { folder: "events/covers" });
      }

      await createEvent({
        title: trimmedTitle,
        description: trimmedDescription,
        city: trimmedCity,
        countryCode: trimmedCountryCode,
        venueName: trimmedVenue,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        requiresApproval,
        ...(coverImageUrl ? { coverImageUrl } : {}),
      });

      Alert.alert("Başarılı", "Etkinliğin incelenmek üzere gönderildi.", [
        { text: "Tamam", onPress: () => navigation.goBack() },
      ]);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Etkinlik oluşturulamadı.";
      if (message.toLowerCase().includes("active event") || message.toLowerCase().includes("409")) {
        setHasActiveEvent(true);
        setError("Zaten aktif bir etkinliğin var. Bitmeden yeni etkinlik oluşturamazsın.");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingLimit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Oluştur" />
          <Card style={styles.stateCard}>
            <Loader label="Kontrol ediliyor..." />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!isOrganizerApproved) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Oluştur" />
          <Card style={styles.stateCard}>
            <AppText variant="body">Etkinlik oluşturmak için onaylı organizatör olmalısın.</AppText>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (hasActiveEvent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Oluştur" />
          <Card style={styles.blockCard}>
            <AppText variant="sectionTitle">Zaten aktif bir etkinliğin var</AppText>
            <AppText variant="bodyMuted">
              {activeEventTitle
                ? `"${activeEventTitle}" etkinliğin devam ederken yeni etkinlik oluşturamazsın.`
                : "Devam eden veya onay bekleyen bir etkinliğin varken yeni etkinlik oluşturamazsın."}
            </AppText>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.flex}
      >
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Oluştur" />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <AppInput label="Etkinlik Adı" onChangeText={setTitle} placeholder="Berlin Türk Kahvesi Buluşması" value={title} />
            <AppInput
              label="Açıklama"
              multiline
              numberOfLines={4}
              onChangeText={setDescription}
              placeholder="Katılımcılar ne beklemeli, kimler katılmalı?"
              style={styles.textarea}
              textAlignVertical="top"
              value={description}
            />

            <View style={styles.fieldBlock}>
              <AppText variant="label">Tarih ve Saat</AppText>
              <AppText variant="caption">{formatDateTimeLabel(startsAt)}</AppText>
              <EventDateTimePicker minimumDate={new Date()} onChange={setStartsAt} value={startsAt} />
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="label">Bitiş</AppText>
              <AppText variant="caption">{formatDateTimeLabel(endsAt)}</AppText>
              <EventDateTimePicker
                minimumDate={startsAt}
                onChange={setEndsAt}
                value={endsAt}
              />
            </View>

            <AppInput label="Mekan" onChangeText={setVenueName} placeholder="Kreuzberg Topluluk Merkezi" value={venueName} />

            <View style={styles.fieldBlock}>
              <AppText variant="label">Şehir / Ülke</AppText>
              <Pressable onPress={() => setIsLocationPickerOpen(true)} style={styles.selectField}>
                <AppText variant="body">{locationLabel}</AppText>
                <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
              </Pressable>
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="label">Kapak Fotoğrafı</AppText>
              {coverUri ? <Image source={{ uri: coverUri }} style={styles.coverPreview} /> : null}
              <AppButton label={coverUri ? "Fotoğrafı Değiştir" : "Fotoğraf Seç"} onPress={() => void pickCoverImage()} variant="secondary" />
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="label">Katılım Tipi</AppText>
              <View style={styles.choiceRow}>
                <Pressable
                  onPress={() => setRequiresApproval(false)}
                  style={[styles.choiceChip, !requiresApproval && styles.choiceChipActive]}
                >
                  <AppText style={!requiresApproval ? styles.choiceChipTextActive : undefined} variant="caption">
                    Anında Katılım
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => setRequiresApproval(true)}
                  style={[styles.choiceChip, requiresApproval && styles.choiceChipActive]}
                >
                  <AppText style={requiresApproval ? styles.choiceChipTextActive : undefined} variant="caption">
                    Onaylı Katılım
                  </AppText>
                </Pressable>
              </View>
            </View>

            {error ? (
              <AppText style={styles.errorText} variant="caption">
                {error}
              </AppText>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            disabled={isSubmitting}
            label={isSubmitting ? "Gönderiliyor..." : "Etkinliği Oluştur"}
            onPress={() => void onSubmit()}
          />
        </View>
      </KeyboardAvoidingView>

      <EventLocationPickerModal
        city={city}
        countryCode={countryCode}
        onClose={() => setIsLocationPickerOpen(false)}
        onConfirm={(nextCountryCode, nextCity) => {
          setCountryCode(nextCountryCode);
          setCity(nextCity);
        }}
        visible={isLocationPickerOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pagePadding: {
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  form: {
    gap: theme.spacing.md,
  },
  fieldBlock: {
    gap: theme.spacing.xs,
  },
  textarea: {
    minHeight: 110,
  },
  selectField: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  coverPreview: {
    borderRadius: theme.radius.md,
    height: 160,
    width: "100%",
  },
  choiceRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  choiceChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: theme.radius.md,
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  choiceChipActive: {
    backgroundColor: "#111827",
  },
  choiceChipTextActive: {
    color: "#FFFFFF",
  },
  errorText: {
    color: theme.colors.danger,
  },
  footer: {
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  stateCard: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  blockCard: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
});
