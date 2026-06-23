import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { HelpRoutes, MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList, MainTabParamList } from "../../../navigation/types";
import { getHelpCategoryLabel, HELP_STATUS_LABELS } from "../constants/helpCategories";
import { getHelpRequestById, respondToHelpRequest, updateHelpRequestStatus } from "../services/help.service";
import type { HelpRequest, HelpRequestStatus } from "../types";

type Props = NativeStackScreenProps<HelpStackParamList, "HelpDetailScreen">;

const formatRelativeTimeTr = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) {
    return `${minutes} dk önce`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} sa önce`;
  }
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
};

const getCategoryCover = (category?: string) => {
  const normalized = category?.trim().toUpperCase();
  if (normalized === "VISA_LEGAL" || normalized === "BUREAUCRACY_BANKING") {
    return "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80";
  }
  if (normalized === "HEALTH") {
    return "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=80";
  }
  if (normalized === "ACCOMMODATION" || normalized === "DAILY_LIFE") {
    return "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80";
  }
  return "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80";
};

const STATUS_ACTIONS: Array<{ status: HelpRequestStatus; label: string }> = [
  { status: "open", label: "Açık" },
  { status: "in_progress", label: "Devam Ediyor" },
  { status: "resolved", label: "Çözüldü" },
];

export function HelpDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadDetail = async () => {
    if (!user?.id) {
      setError("Oturum bulunamadı.");
      setIsLoading(false);
      return;
    }

    try {
      const detail = await getHelpRequestById(route.params.helpId, user.id);
      if (!detail) {
        setRequest(null);
        setError("İstek bulunamadı.");
        return;
      }
      setRequest(detail);
      setError(null);
    } catch {
      setRequest(null);
      setError("İstek detayı yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    void loadDetail();
  }, [route.params.helpId, user?.id]);

  const goBackToHelpList = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(HelpRoutes.HelpListScreen);
  };

  const onHelpPress = async () => {
    if (!user?.id || !request || isResponding) {
      return;
    }

    setIsResponding(true);
    setActionMessage(null);
    try {
      const result = await respondToHelpRequest({ requestId: request.id, viewerId: user.id });
      setRequest(result.helpRequest);
      const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
      tabNavigation?.navigate(TabRoutes.MessagesTab, {
        screen: MessagesRoutes.MessageThreadScreen,
        params: { threadId: result.conversationId },
      });
    } catch (respondError) {
      setActionMessage(respondError instanceof Error ? respondError.message : "Sohbet açılamadı.");
    } finally {
      setIsResponding(false);
    }
  };

  const onStatusChange = async (status: HelpRequestStatus) => {
    if (!request || isUpdatingStatus) {
      return;
    }

    setIsUpdatingStatus(true);
    setActionMessage(null);
    try {
      const updated = await updateHelpRequestStatus({ requestId: request.id, status });
      setRequest(updated);
      setActionMessage("Durum güncellendi.");
    } catch (statusError) {
      setActionMessage(statusError instanceof Error ? statusError.message : "Durum güncellenemedi.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.statePage}>
          <ScreenBackHeader onBack={goBackToHelpList} title="Yardım İsteği" />
          <Card style={styles.stateCard}>
            <Loader label="İstek yükleniyor..." />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.statePage}>
          <ScreenBackHeader onBack={goBackToHelpList} title="Yardım İsteği" />
          <Card style={styles.stateCard}>
            <ErrorState subtitle={error} title="Yüklenemedi" />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.statePage}>
          <ScreenBackHeader onBack={goBackToHelpList} title="Yardım İsteği" />
          <Card style={styles.stateCard}>
            <EmptyState subtitle="Bu istek kaldırılmış olabilir." title="İstek bulunamadı" />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const categoryLabel = getHelpCategoryLabel(request.category);
  const statusLabel = HELP_STATUS_LABELS[request.status];
  const relativeTime = formatRelativeTimeTr(request.createdAt);
  const isOwner = user?.id === request.author.id;
  const heroImage = request.photoUrl ?? getCategoryCover(request.category);
  const requesterMeta = [request.community, request.city, relativeTime].filter(Boolean).join(" · ");
  const canHelp = !isOwner && request.status !== "resolved" && !request.viewerState.hasResponded;

  const renderFooter = () => {
    if (isOwner) {
      return (
        <View style={styles.footerInner}>
          <AppText style={styles.footerLabel} variant="label">
            Durumu Güncelle
          </AppText>
          <View style={styles.statusActions}>
            {STATUS_ACTIONS.map((item) => {
              const active = request.status === item.status;
              return (
                <Pressable
                  key={item.status}
                  disabled={isUpdatingStatus || active}
                  onPress={() => void onStatusChange(item.status)}
                  style={[styles.statusChip, active && styles.statusChipActive]}
                >
                  <AppText style={[styles.statusChipText, active && styles.statusChipTextActive]} variant="caption">
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (request.viewerState.hasResponded) {
      return (
        <View style={styles.footerInner}>
          <AppText style={styles.respondedText} variant="body">
            Bu isteğe zaten yanıt verdin. Mesajlar sekmesinden sohbete devam edebilirsin.
          </AppText>
        </View>
      );
    }

    if (request.status === "resolved") {
      return (
        <View style={styles.footerInner}>
          <View style={[styles.helpButton, styles.helpButtonDisabled]}>
            <AppText style={styles.helpButtonLabel} variant="label">
              Bu istek kapatıldı
            </AppText>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.footerInner}>
        <Pressable
          disabled={isResponding || !canHelp}
          onPress={() => void onHelpPress()}
          style={[styles.helpButton, isResponding && styles.helpButtonDisabled]}
        >
          <AppText style={styles.helpButtonLabel} variant="label">
            {isResponding ? "Açılıyor..." : "Yardım Edebilirim"}
          </AppText>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroWrap}>
            <ImageBackground imageStyle={styles.heroImage} source={{ uri: heroImage }} style={styles.heroCover}>
              <View style={styles.heroOverlay} />
              <Pressable accessibilityLabel="Geri" onPress={goBackToHelpList} style={styles.backButton}>
                <Ionicons color="#111827" name="chevron-back" size={24} />
              </Pressable>
              <View style={styles.heroBadges}>
                <View style={styles.heroBadge}>
                  <AppText style={styles.heroBadgeText} variant="caption">
                    {categoryLabel}
                  </AppText>
                </View>
                <View style={[styles.heroBadge, styles.heroBadgeMuted]}>
                  <AppText style={styles.heroBadgeText} variant="caption">
                    {statusLabel}
                  </AppText>
                </View>
              </View>
            </ImageBackground>
          </View>

          <View style={styles.body}>
            <AppText style={styles.title} variant="title">
              {request.title}
            </AppText>

            <View style={styles.requesterRow}>
              <Avatar initials={request.author.displayName.slice(0, 2).toUpperCase()} size={40} uri={request.author.avatarUrl} />
              <View style={styles.requesterText}>
                <AppText style={styles.requesterName} variant="label">
                  {request.author.displayName}
                </AppText>
                <AppText style={styles.requesterMeta} variant="caption">
                  {requesterMeta}
                </AppText>
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionLabel} variant="label">
                İstek Detayı
              </AppText>
              <AppText style={styles.description} variant="body">
                {request.description}
              </AppText>
            </View>

            <AppText style={styles.metaLine} variant="caption">
              Kategori: {categoryLabel} · Durum: {statusLabel}
            </AppText>

            {actionMessage ? (
              <AppText style={styles.actionMessage} variant="caption">
                {actionMessage}
              </AppText>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>{renderFooter()}</View>
      </View>
    </SafeAreaView>
  );
}

const FOOTER_HEIGHT = 88;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: FOOTER_HEIGHT + theme.spacing.lg,
  },
  statePage: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
    zIndex: 2,
  },
  heroWrap: {
    backgroundColor: "#E5E7EB",
    height: 200,
    width: "100%",
  },
  heroCover: {
    flex: 1,
    justifyContent: "flex-start",
    padding: theme.spacing.md,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  heroImage: {
    resizeMode: "cover",
  },
  heroBadges: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    zIndex: 1,
  },
  heroBadge: {
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeMuted: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  body: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
  },
  requesterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  requesterText: {
    flex: 1,
    gap: 2,
  },
  requesterName: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  requesterMeta: {
    color: theme.colors.textSecondary,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  description: {
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  metaLine: {
    color: theme.colors.textSecondary,
  },
  actionMessage: {
    color: "#059669",
    marginTop: -theme.spacing.sm,
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    position: "absolute",
    right: 0,
  },
  footerInner: {
    gap: theme.spacing.sm,
  },
  footerLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  statusActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  statusChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
  },
  statusChipActive: {
    backgroundColor: "#111827",
  },
  statusChipText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  helpButton: {
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 52,
  },
  helpButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.85,
  },
  helpButtonLabel: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  respondedText: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
});
