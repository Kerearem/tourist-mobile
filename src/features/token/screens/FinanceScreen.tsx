import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { EmptyState } from "../../../components/ui/EmptyState";
import { theme } from "../../../constants/theme";
import type { ProfileStackParamList } from "../../../navigation/types";
import {
  getEarnings,
  getWithdrawals,
  withdrawFromEvent,
  type EarningEvent,
  type EarningWaitTier,
  type EarningsSummary,
  type WithdrawalHistoryItem,
} from "../services/token.service";

type Props = NativeStackScreenProps<ProfileStackParamList, "FinanceScreen">;

const WAIT_TIER_LABELS: Record<EarningWaitTier, string> = {
  EARLY: "Erken",
  MID: "Orta",
  PATIENT: "Sabırlı",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getWaitTierStyle(tier: EarningWaitTier) {
  switch (tier) {
    case "EARLY":
      return styles.tierEarly;
    case "MID":
      return styles.tierMid;
    case "PATIENT":
      return styles.tierPatient;
  }
}

function estimateNetAmount(amount: number, event: EarningEvent) {
  if (amount <= 0 || event.availableTokens <= 0) {
    return 0;
  }
  return Math.floor((amount * event.previewNetAmount) / event.availableTokens);
}

function estimateTotalFeePct(event: EarningEvent) {
  if (event.availableTokens <= 0) {
    return 0;
  }
  const netRatio = event.previewNetAmount / event.availableTokens;
  return Math.round((1 - netRatio) * 100);
}

type WithdrawModalProps = {
  visible: boolean;
  event: EarningEvent | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
};

function WithdrawModal({ visible, event, isSubmitting, onClose, onSubmit }: WithdrawModalProps) {
  const [amountText, setAmountText] = useState("");

  React.useEffect(() => {
    if (visible && event) {
      setAmountText(String(event.availableTokens));
    } else {
      setAmountText("");
    }
  }, [visible, event]);

  const parsedAmount = Number.parseInt(amountText, 10);
  const isValidAmount =
    event != null &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= event.availableTokens;

  const previewNet = event && isValidAmount ? estimateNetAmount(parsedAmount, event) : 0;
  const totalFeePct = event ? estimateTotalFeePct(event) : 0;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={(pressEvent) => pressEvent.stopPropagation()} style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <AppText style={styles.modalTitle} variant="sectionTitle">
            {event?.eventTitle ?? "Çekim"}
          </AppText>
          <AppText style={styles.modalSubtitle} variant="bodyMuted">
            Çekilebilir: {event?.availableTokens ?? 0} token
          </AppText>

          <AppText style={styles.inputLabel} variant="label">
            Miktar (token)
          </AppText>
          <TextInput
            editable={!isSubmitting}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={theme.colors.muted}
            style={styles.amountInput}
            value={amountText}
            onChangeText={setAmountText}
          />

          {event && parsedAmount > event.availableTokens ? (
            <AppText style={styles.validationText} variant="caption">
              Etkinlik kazancından fazla çekemezsin
            </AppText>
          ) : null}

          {isValidAmount ? (
            <AppText style={styles.previewText} variant="body">
              Komisyon: %{totalFeePct} • Eline geçecek: ~{previewNet} TL
            </AppText>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable disabled={isSubmitting} onPress={onClose} style={styles.modalCancelButton}>
              <AppText style={styles.modalCancelText} variant="label">
                İptal
              </AppText>
            </Pressable>
            <Pressable
              disabled={!isValidAmount || isSubmitting}
              onPress={() => onSubmit(parsedAmount)}
              style={[styles.modalSubmitButton, (!isValidAmount || isSubmitting) && styles.buttonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <AppText style={styles.modalSubmitText} variant="label">
                  Çek
                </AppText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function FinanceScreen({ navigation }: Props) {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EarningEvent | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  const availableEvents = useMemo(
    () => (earnings?.events ?? []).filter((event) => event.availableTokens > 0),
    [earnings?.events],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [earningsResult, withdrawalsResult] = await Promise.all([getEarnings(), getWithdrawals()]);
      setEarnings(earningsResult);
      setWithdrawals(withdrawalsResult);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Finans bilgileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const openWithdrawModal = (event: EarningEvent) => {
    setSelectedEvent(event);
    setIsWithdrawModalOpen(true);
  };

  const closeWithdrawModal = () => {
    if (isSubmittingWithdraw) {
      return;
    }
    setIsWithdrawModalOpen(false);
    setSelectedEvent(null);
  };

  const handleWithdraw = async (tokenAmount: number) => {
    if (!selectedEvent || isSubmittingWithdraw) {
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const result = await withdrawFromEvent(selectedEvent.eventId, tokenAmount);
      setIsWithdrawModalOpen(false);
      setSelectedEvent(null);
      await loadData();
      Alert.alert("Başarılı", `${result.withdrawal.netAmount} TL çekildi (mock)`);
    } catch (error) {
      Alert.alert("Çekim yapılamadı", error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={26} />
          </Pressable>
          <AppText style={styles.topTitle} variant="label">
            Finans
          </AppText>
          <View style={styles.topSpacer} />
        </View>

        <AppText style={styles.mockNote} variant="caption">
          Şu an çekimler test amaçlıdır, gerçek ödeme yapılmaz.
        </AppText>

        {isLoading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <AppText style={styles.stateText} variant="bodyMuted">
              Yükleniyor...
            </AppText>
          </View>
        ) : loadError ? (
          <View style={styles.stateWrap}>
            <EmptyState
              actionLabel="Tekrar dene"
              description={loadError}
              onActionPress={() => void loadData()}
              title="Finans yüklenemedi"
            />
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <AppText style={styles.summaryLabel} variant="caption">
                    Beklemede
                  </AppText>
                  <AppText style={styles.summaryPendingValue} variant="label">
                    {earnings?.totalPending ?? 0} token
                  </AppText>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <AppText style={styles.summaryLabel} variant="caption">
                    Çekilebilir
                  </AppText>
                  <AppText style={styles.summaryAvailableValue} variant="hero">
                    {earnings?.totalAvailable ?? 0}
                  </AppText>
                  <AppText style={styles.summaryAvailableUnit} variant="caption">
                    token
                  </AppText>
                </View>
              </View>
              <AppText style={styles.summaryHint} variant="caption">
                Beklemedeki kazançlar etkinlik tamamlanınca çekilebilir olur.
              </AppText>
            </View>

            <AppText style={styles.sectionTitle} variant="label">
              Çekilebilir Kazançlar
            </AppText>

            {availableEvents.length === 0 ? (
              <View style={styles.emptySection}>
                <EmptyState title="Henüz çekilebilir kazancın yok" />
              </View>
            ) : (
              availableEvents.map((event) => (
                <View key={event.eventId} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <AppText style={styles.eventTitle} variant="label">
                      {event.eventTitle}
                    </AppText>
                    <View style={[styles.tierBadge, getWaitTierStyle(event.waitTier)]}>
                      <AppText style={styles.tierBadgeText} variant="caption">
                        {WAIT_TIER_LABELS[event.waitTier]}
                      </AppText>
                    </View>
                  </View>
                  <AppText style={styles.eventTokens} variant="body">
                    {event.availableTokens} token
                  </AppText>
                  <AppText style={styles.eventNetPreview} variant="body">
                    Şu an çekersen: {event.previewNetAmount} TL
                  </AppText>
                  <AppText style={styles.eventHint} variant="caption">
                    Daha uzun beklersen daha az komisyon ödersin
                  </AppText>
                  <Pressable onPress={() => openWithdrawModal(event)} style={styles.withdrawButton}>
                    <AppText style={styles.withdrawButtonText} variant="label">
                      Çek
                    </AppText>
                  </Pressable>
                </View>
              ))
            )}

            <View style={styles.sectionDivider} />
            <AppText style={styles.sectionTitle} variant="label">
              Çekim Geçmişi
            </AppText>

            {withdrawals.length === 0 ? (
              <AppText style={styles.emptyHistoryText} variant="bodyMuted">
                Henüz çekim yok
              </AppText>
            ) : (
              withdrawals.map((withdrawal) => (
                <View key={withdrawal.id} style={styles.historyRow}>
                  <View style={styles.historyBody}>
                    <AppText style={styles.historyTitle} variant="body">
                      {withdrawal.tokenAmount} token → {withdrawal.netAmount} TL
                    </AppText>
                    <AppText style={styles.historyDate} variant="caption">
                      {formatDate(withdrawal.createdAt)}
                    </AppText>
                  </View>
                  <View style={[styles.tierBadge, getWaitTierStyle(withdrawal.waitTier)]}>
                    <AppText style={styles.tierBadgeText} variant="caption">
                      {WAIT_TIER_LABELS[withdrawal.waitTier]}
                    </AppText>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <WithdrawModal
        event={selectedEvent}
        isSubmitting={isSubmittingWithdraw}
        visible={isWithdrawModalOpen}
        onClose={closeWithdrawModal}
        onSubmit={(amount) => void handleWithdraw(amount)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  container: {
    paddingBottom: theme.spacing.xxl,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  topTitle: {
    fontSize: 18,
  },
  topSpacer: {
    width: 26,
  },
  mockNote: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    textAlign: "center",
  },
  stateWrap: {
    alignItems: "center",
    gap: theme.spacing.md,
    justifyContent: "center",
    minHeight: 240,
    paddingHorizontal: theme.spacing.lg,
  },
  stateText: {
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryDivider: {
    backgroundColor: theme.colors.border,
    height: 48,
    width: 1,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  summaryPendingValue: {
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  summaryAvailableValue: {
    color: theme.colors.primary,
    fontSize: 36,
    lineHeight: 42,
  },
  summaryAvailableUnit: {
    color: theme.colors.textSecondary,
  },
  summaryHint: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  sectionTitle: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  sectionDivider: {
    backgroundColor: "#ECEEF2",
    height: 1,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  emptySection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  eventHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  eventTitle: {
    color: theme.colors.textPrimary,
    flex: 1,
  },
  tierBadge: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tierEarly: {
    backgroundColor: "#FEE2E2",
  },
  tierMid: {
    backgroundColor: "#FEF3C7",
  },
  tierPatient: {
    backgroundColor: "#D1FAE5",
  },
  eventTokens: {
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  eventNetPreview: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    marginTop: theme.spacing.xs,
  },
  eventHint: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  withdrawButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
    minHeight: 40,
    justifyContent: "center",
  },
  withdrawButtonText: {
    color: "#FFFFFF",
  },
  emptyHistoryText: {
    marginHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  historyRow: {
    alignItems: "center",
    borderBottomColor: "#ECEEF2",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    minHeight: 58,
    paddingVertical: theme.spacing.sm,
  },
  historyBody: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    color: theme.colors.textPrimary,
  },
  historyDate: {
    color: theme.colors.textSecondary,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  modalHandle: {
    alignSelf: "center",
    backgroundColor: theme.colors.border,
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.md,
    width: 36,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  modalSubtitle: {
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  amountInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    fontSize: 18,
    marginBottom: theme.spacing.sm,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  validationText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  previewText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  modalCancelButton: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  modalCancelText: {
    color: theme.colors.textPrimary,
  },
  modalSubmitButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  modalSubmitText: {
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
