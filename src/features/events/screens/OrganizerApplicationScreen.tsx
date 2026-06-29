import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import type { OrganizerStatus } from "../../../models/user";
import { applyForOrganizer, getOrganizerStatus } from "../services/organizer.service";
import { meetsOrganizerMinimumAge } from "../utils/viewerAge";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "OrganizerApplicationScreen"
>;

const statusMessage = (status: OrganizerStatus) => {
  if (status === "pending") {
    return "Başvurun inceleniyor. Onaylandığında etkinlik oluşturabilirsin.";
  }
  if (status === "approved") {
    return "Organizatör hesabın onaylandı. Menüden etkinlik oluşturabilirsin.";
  }
  if (status === "rejected") {
    return "Önceki başvurun reddedildi. Yeni bir başvuru gönderebilirsin.";
  }
  return null;
};

export function OrganizerApplicationScreen({ navigation }: Props) {
  const { user, refreshSession } = useAuth();
  const [motivation, setMotivation] = useState("");
  const [organizerStatus, setOrganizerStatus] = useState<OrganizerStatus>(user?.organizerStatus ?? "not_applied");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canApply = organizerStatus === "not_applied" || organizerStatus === "rejected";
  const isOldEnoughForOrganizer = meetsOrganizerMinimumAge(user?.privateProfile.birthDate);
  const infoMessage = useMemo(() => statusMessage(organizerStatus), [organizerStatus]);

  useEffect(() => {
    const loadStatus = async () => {
      setIsLoading(true);
      try {
        const status = await getOrganizerStatus();
        setOrganizerStatus(status.organizerStatus);
        if (status.application?.reason) {
          setMotivation(status.application.reason);
        }
        setError(null);
      } catch {
        setError("Başvuru durumu yüklenemedi.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadStatus();
  }, []);

  const onSubmit = async () => {
    const reason = motivation.trim();
    if (reason.length < 10) {
      setError("Lütfen en az 10 karakterlik bir motivasyon yaz.");
      return;
    }

    if (!canApply) {
      return;
    }

    if (!isOldEnoughForOrganizer) {
      setError("Organizatör olmak için en az 18 yaşında olmalısın.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await applyForOrganizer({ reason });
      setOrganizerStatus(result.organizerStatus);
      await refreshSession();
      setSuccess("Başvurun alındı, inceleniyor.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Başvuru gönderilemedi.";
      if (message.toLowerCase().includes("already submitted") || message.toLowerCase().includes("409")) {
        setError("Zaten aktif bir organizatör başvurun var.");
        setOrganizerStatus("pending");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Ol" />
        <Card style={styles.stateCard}>
          <Loader label="Başvuru durumu yükleniyor..." />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.container}>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Organizatör Ol" />

        <Card style={styles.card}>
          <AppText variant="title">Organizatör Ol</AppText>
          <AppText variant="bodyMuted">
            Organizatörler, şehirlerinde güvenli ve faydalı topluluk etkinlikleri düzenler.
          </AppText>
          <View style={styles.badges}>
            <Badge label="Topluluk rolü" />
            <Badge label="Güven ve şeffaflık" />
          </View>
        </Card>

        <Card style={styles.card}>
          <AppText variant="sectionTitle">Bu rol ne içerir?</AppText>
          <AppText variant="bodyMuted">- Topluluk etkinliklerini düzenlemek</AppText>
          <AppText variant="bodyMuted">- Etkinlik bilgilerini doğru tutmak</AppText>
          <AppText variant="bodyMuted">- Yeni gelenlere destek olmak</AppText>
        </Card>

        {infoMessage ? (
          <Card style={styles.infoCard}>
            <AppText variant="body">{infoMessage}</AppText>
          </Card>
        ) : null}

        {!isOldEnoughForOrganizer && canApply ? (
          <Card style={styles.warningCard}>
            <AppText variant="body">
              Organizatör olmak için en az 18 yaşında olmalısın. Şu an başvuru yapamazsın.
            </AppText>
          </Card>
        ) : null}

        {success ? (
          <Card style={styles.successCard}>
            <AppText style={styles.successText} variant="body">
              {success}
            </AppText>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <AppText variant="sectionTitle">Neden organizatör olmak istiyorsun?</AppText>
          <AppInput
            editable={canApply && isOldEnoughForOrganizer}
            multiline
            numberOfLines={5}
            onChangeText={setMotivation}
            placeholder="Motivasyonunu ve düzenlemek istediğin etkinlik türlerini yaz."
            style={styles.textarea}
            textAlignVertical="top"
            value={motivation}
          />

          {error ? (
            <AppText style={styles.errorText} variant="caption">
              {error}
            </AppText>
          ) : null}

          {canApply && isOldEnoughForOrganizer ? (
            <AppButton
              disabled={isSubmitting}
              label={isSubmitting ? "Gönderiliyor..." : "Başvuruyu Gönder"}
              onPress={() => void onSubmit()}
            />
          ) : canApply ? null : (
            <AppButton label="Geri Dön" onPress={() => navigation.goBack()} variant="secondary" />
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    gap: theme.spacing.sm,
  },
  infoCard: {
    backgroundColor: "#EFF6FF",
    gap: theme.spacing.xs,
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    gap: theme.spacing.xs,
  },
  successCard: {
    backgroundColor: "#ECFDF5",
  },
  successText: {
    color: "#047857",
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  textarea: {
    minHeight: 120,
  },
  errorText: {
    color: theme.colors.danger,
  },
});
