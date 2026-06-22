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
import { EVENT_TYPES, type EventType } from "../constants/eventTypes";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "CreateEventScreen"
>;

type FieldKey = "title" | "description" | "endsAt" | "venueName" | "location" | "eventType" | "price";
type FieldErrors = Partial<Record<FieldKey, string>>;
type PriceCurrency = "EUR" | "USD" | "TRY" | "GBP";

const CHIP_RADIUS = 999;
const FIELD_RADIUS = 14;
const SELECTED_CHIP_BG = "#DBEAFE";
const SELECTED_CHIP_BORDER = "#93C5FD";
const SELECTED_CHIP_TEXT = "#2563EB";
const inputFieldStyle = { borderRadius: FIELD_RADIUS };

const CURRENCY_OPTIONS: Array<{ value: PriceCurrency; label: string }> = [
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "TRY", label: "TRY (₺)" },
  { value: "GBP", label: "GBP (£)" },
];

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

const parsePriceAmount = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <AppText style={styles.fieldError} variant="caption">
      {message}
    </AppText>
  );
}

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
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<PriceCurrency>("EUR");
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);
  const [hasActiveEvent, setHasActiveEvent] = useState(false);
  const [activeEventTitle, setActiveEventTitle] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isOrganizerApproved = user?.organizerStatus === "approved";

  const locationLabel = useMemo(() => {
    if (!countryCode || !city.trim()) {
      return "Ülke ve şehir seç";
    }
    const country = getCountryByCode(countryCode);
    const countryName = country ? getCountryLabel(country, "tr") : countryCode;
    return `${city}, ${countryName}`;
  }, [city, countryCode]);

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedVenue = venueName.trim();
    const trimmedCity = city.trim();
    const trimmedCountryCode = countryCode.trim().toUpperCase();

    if (trimmedTitle.length < 3) {
      errors.title = "Etkinlik adı en az 3 karakter olmalı.";
    }
    if (trimmedDescription.length < 10) {
      errors.description = "Açıklama en az 10 karakter olmalı.";
    }
    if (!trimmedVenue) {
      errors.venueName = "Mekan adı gerekli.";
    }
    if (!trimmedCity || trimmedCountryCode.length < 2) {
      errors.location = "Şehir ve ülke seçmelisin.";
    }
    if (endsAt <= startsAt) {
      errors.endsAt = "Bitiş zamanı başlangıçtan sonra olmalı.";
    }
    if (!eventType) {
      errors.eventType = "Etkinlik türü seçmelisin.";
    }
    if (isPaid) {
      const amount = parsePriceAmount(priceAmount);
      if (amount == null || amount <= 0) {
        errors.price = "Geçerli bir tutar gir.";
      }
    }

    return errors;
  };

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

  const onSelectFree = () => {
    setIsPaid(false);
    setPriceAmount("");
    clearFieldError("price");
  };

  const onSelectPaid = () => {
    setIsPaid(true);
  };

  const onSubmit = async () => {
    if (!isOrganizerApproved || hasActiveEvent) {
      return;
    }

    const errors = validateForm();
    setFieldErrors(errors);
    setSubmitError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedVenue = venueName.trim();
    const trimmedCity = city.trim();
    const trimmedCountryCode = countryCode.trim().toUpperCase();
    const parsedPrice = parsePriceAmount(priceAmount);

    setIsSubmitting(true);

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
        type: eventType!,
        isPaid,
        ...(isPaid && parsedPrice != null
          ? {
              price: parsedPrice,
              priceCurrency,
            }
          : {}),
        ...(coverImageUrl ? { coverImageUrl } : {}),
      });

      Alert.alert("Başarılı", "Etkinliğin incelenmek üzere gönderildi.", [
        { text: "Tamam", onPress: () => navigation.goBack() },
      ]);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Etkinlik oluşturulamadı.";
      if (message.toLowerCase().includes("active event") || message.toLowerCase().includes("409")) {
        setHasActiveEvent(true);
        setSubmitError("Zaten aktif bir etkinliğin var. Bitmeden yeni etkinlik oluşturamazsın.");
      } else {
        setSubmitError(message);
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
            <AppInput
              error={fieldErrors.title}
              label="Etkinlik Adı"
              onChangeText={(value) => {
                setTitle(value);
                clearFieldError("title");
              }}
              placeholder="Berlin Türk Kahvesi Buluşması"
              style={inputFieldStyle}
              value={title}
            />
            <AppInput
              error={fieldErrors.description}
              label="Açıklama"
              multiline
              numberOfLines={4}
              onChangeText={(value) => {
                setDescription(value);
                clearFieldError("description");
              }}
              placeholder="Katılımcılar ne beklemeli, kimler katılmalı?"
              style={[inputFieldStyle, styles.textarea]}
              textAlignVertical="top"
              value={description}
            />

            <View style={styles.fieldBlock}>
              <AppText variant="label">Başlangıç Tarihi ve Saati</AppText>
              <AppText variant="caption">{formatDateTimeLabel(startsAt)}</AppText>
              <EventDateTimePicker
                minimumDate={new Date()}
                onChange={(value) => {
                  setStartsAt(value);
                  clearFieldError("endsAt");
                }}
                value={startsAt}
              />
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="label">Bitiş Tarihi ve Saati</AppText>
              <AppText variant="caption">{formatDateTimeLabel(endsAt)}</AppText>
              <View style={[styles.pickerWrap, fieldErrors.endsAt ? styles.inputErrorBorder : null]}>
                <EventDateTimePicker
                  minimumDate={startsAt}
                  onChange={(value) => {
                    setEndsAt(value);
                    clearFieldError("endsAt");
                  }}
                  value={endsAt}
                />
              </View>
              <FieldError message={fieldErrors.endsAt} />
            </View>

            <AppInput
              error={fieldErrors.venueName}
              label="Mekan"
              onChangeText={(value) => {
                setVenueName(value);
                clearFieldError("venueName");
              }}
              placeholder="Kreuzberg Topluluk Merkezi"
              style={inputFieldStyle}
              value={venueName}
            />

            <View style={styles.fieldBlock}>
              <AppText variant="label">Şehir / Ülke</AppText>
              <Pressable
                onPress={() => {
                  setIsLocationPickerOpen(true);
                  clearFieldError("location");
                }}
                style={[styles.selectField, fieldErrors.location ? styles.inputErrorBorder : null]}
              >
                <AppText variant="body">{locationLabel}</AppText>
                <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
              </Pressable>
              <FieldError message={fieldErrors.location} />
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="label">Fiyat</AppText>
              <View style={styles.choiceRow}>
                <Pressable
                  onPress={onSelectFree}
                  style={[styles.choiceChip, !isPaid && styles.choiceChipActive]}
                >
                  <AppText
                    style={[styles.choiceChipText, !isPaid && styles.choiceChipTextActive]}
                    variant="caption"
                  >
                    Ücretsiz
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={onSelectPaid}
                  style={[styles.choiceChip, isPaid && styles.choiceChipActive]}
                >
                  <AppText
                    style={[styles.choiceChipText, isPaid && styles.choiceChipTextActive]}
                    variant="caption"
                  >
                    Ücretli
                  </AppText>
                </Pressable>
              </View>

              {isPaid ? (
                <View style={styles.paidFields}>
                  <AppInput
                    error={fieldErrors.price}
                    keyboardType="decimal-pad"
                    label="Tutar"
                    onChangeText={(value) => {
                      setPriceAmount(value);
                      clearFieldError("price");
                    }}
                    placeholder="25.00"
                    style={inputFieldStyle}
                    value={priceAmount}
                  />
                  <View style={styles.fieldBlock}>
                    <AppText variant="label">Para Birimi</AppText>
                    <View style={styles.currencyRow}>
                      {CURRENCY_OPTIONS.map((item) => {
                        const active = priceCurrency === item.value;
                        return (
                          <Pressable
                            key={item.value}
                            onPress={() => {
                              setPriceCurrency(item.value);
                              clearFieldError("price");
                            }}
                            style={[styles.currencyChip, active && styles.currencyChipActive]}
                          >
                            <AppText style={active ? styles.currencyChipTextActive : styles.currencyChipText} variant="caption">
                              {item.label}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="label">Kapak Fotoğrafı</AppText>
              {coverUri ? <Image source={{ uri: coverUri }} style={styles.coverPreview} /> : null}
              <AppButton label={coverUri ? "Fotoğrafı Değiştir" : "Fotoğraf Seç"} onPress={() => void pickCoverImage()} variant="secondary" />
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="label">Etkinlik Türü</AppText>
              <AppText variant="caption">Bir tür seç (zorunlu)</AppText>
              <View style={[styles.typeGrid, fieldErrors.eventType ? styles.inputErrorBorder : null]}>
                {EVENT_TYPES.map((item) => {
                  const active = eventType === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => {
                        setEventType(item.value);
                        clearFieldError("eventType");
                      }}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                    >
                      <AppText style={active ? styles.typeChipTextActive : styles.typeChipText} variant="caption">
                        {item.emoji} {item.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <FieldError message={fieldErrors.eventType} />
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="label">Katılım Tipi</AppText>
              <View style={styles.choiceRow}>
                <Pressable
                  onPress={() => setRequiresApproval(false)}
                  style={[styles.choiceChip, !requiresApproval && styles.choiceChipActive]}
                >
                  <AppText
                    style={[styles.choiceChipText, !requiresApproval && styles.choiceChipTextActive]}
                    variant="caption"
                  >
                    Anında Katılım
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => setRequiresApproval(true)}
                  style={[styles.choiceChip, requiresApproval && styles.choiceChipActive]}
                >
                  <AppText
                    style={[styles.choiceChipText, requiresApproval && styles.choiceChipTextActive]}
                    variant="caption"
                  >
                    Onaylı Katılım
                  </AppText>
                </Pressable>
              </View>
            </View>

            {submitError ? (
              <AppText style={styles.submitError} variant="caption">
                {submitError}
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
          clearFieldError("location");
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
  fieldError: {
    color: theme.colors.danger,
  },
  submitError: {
    color: theme.colors.danger,
    textAlign: "center",
  },
  textarea: {
    minHeight: 110,
  },
  pickerWrap: {
    borderColor: "transparent",
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    padding: 1,
  },
  selectField: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  inputErrorBorder: {
    borderColor: theme.colors.danger,
  },
  coverPreview: {
    borderRadius: FIELD_RADIUS,
    height: 160,
    width: "100%",
  },
  choiceRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  choiceChip: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderColor: theme.colors.border,
    borderRadius: CHIP_RADIUS,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  choiceChipActive: {
    backgroundColor: SELECTED_CHIP_BG,
    borderColor: SELECTED_CHIP_BORDER,
  },
  choiceChipText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  choiceChipTextActive: {
    color: SELECTED_CHIP_TEXT,
    fontWeight: "700",
    textAlign: "center",
  },
  paidFields: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  currencyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  currencyChip: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderColor: theme.colors.border,
    borderRadius: CHIP_RADIUS,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  currencyChipActive: {
    backgroundColor: SELECTED_CHIP_BG,
    borderColor: SELECTED_CHIP_BORDER,
  },
  currencyChipText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
  currencyChipTextActive: {
    color: SELECTED_CHIP_TEXT,
    fontWeight: "700",
    textAlign: "center",
  },
  typeGrid: {
    borderColor: "transparent",
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  typeChip: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderColor: theme.colors.border,
    borderRadius: CHIP_RADIUS,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  typeChipActive: {
    backgroundColor: SELECTED_CHIP_BG,
    borderColor: SELECTED_CHIP_BORDER,
  },
  typeChipText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
  typeChipTextActive: {
    color: SELECTED_CHIP_TEXT,
    fontWeight: "700",
    textAlign: "center",
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
