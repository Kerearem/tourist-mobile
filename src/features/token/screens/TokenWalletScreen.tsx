import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ProfileRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { ProfileStackParamList } from "../../../navigation/types";
import {
  getTransactions,
  getWallet,
  type TokenTransaction,
  type TokenTransactionType,
  type TokenWallet,
} from "../services/token.service";

type Props = NativeStackScreenProps<ProfileStackParamList, "TokenWalletScreen">;

const TRANSACTION_TITLES: Record<TokenTransactionType, string> = {
  PURCHASE: "Satın alma",
  REWARD_REFERRAL: "Arkadaş ödülü",
  REWARD_MOMENT: "Moment ödülü",
  EVENT_JOIN: "Etkinlik katılımı",
  EVENT_REFUND: "İade",
  ORGANIZER_EARNING: "Kazanç",
  WITHDRAWAL: "Çekim",
};

function getTransactionIcon(type: TokenTransactionType): keyof typeof Ionicons.glyphMap {
  if (type === "PURCHASE") {
    return "wallet-outline";
  }
  if (type.startsWith("REWARD_")) {
    return "gift-outline";
  }
  if (type === "EVENT_JOIN") {
    return "ticket-outline";
  }
  if (type === "EVENT_REFUND") {
    return "refresh-outline";
  }
  if (type === "WITHDRAWAL") {
    return "arrow-down-circle-outline";
  }
  return "cash-outline";
}

function formatTransactionDate(iso: string) {
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

export function TokenWalletScreen({ navigation }: Props) {
  const [wallet, setWallet] = useState<TokenWallet | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [walletResult, transactionsResult] = await Promise.all([getWallet(), getTransactions()]);

      setWallet(walletResult);
      setTransactions(transactionsResult.items);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Cüzdan bilgileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={26} />
          </Pressable>
          <AppText style={styles.topTitle} variant="label">
            Cüzdanım
          </AppText>
          <View style={styles.topSpacer} />
        </View>

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
              title="Cüzdan yüklenemedi"
            />
          </View>
        ) : (
          <>
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons color={theme.colors.primary} name="wallet" size={28} />
                <AppText style={styles.balanceLabel} variant="label">
                  Toplam bakiye
                </AppText>
              </View>
              <AppText style={styles.balanceAmount} variant="hero">
                {wallet?.totalBalance ?? 0}
              </AppText>
              <AppText style={styles.balanceSubtext} variant="caption">
                Satın alınan: {wallet?.paidBalance ?? 0} • Ödül: {wallet?.bonusBalance ?? 0}
              </AppText>
              <Pressable
                onPress={() => navigation.navigate(ProfileRoutes.TokenPackagesScreen)}
                style={styles.addBalanceButton}
              >
                <Ionicons color="#FFFFFF" name="add-circle-outline" size={20} />
                <AppText style={styles.addBalanceButtonText} variant="label">
                  Bakiye Ekle
                </AppText>
              </Pressable>
            </View>

            <AppText style={styles.sectionTitle} variant="label">
              Geçmiş
            </AppText>

            {transactions.length === 0 ? (
              <View style={styles.emptyHistory}>
                <EmptyState title="Henüz işlem yok" />
              </View>
            ) : (
              transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionRow}>
                  <View style={styles.transactionIconWrap}>
                    <Ionicons
                      color={theme.colors.textPrimary}
                      name={getTransactionIcon(transaction.type)}
                      size={22}
                    />
                  </View>
                  <View style={styles.transactionBody}>
                    <AppText style={styles.transactionTitle} variant="body">
                      {TRANSACTION_TITLES[transaction.type]}
                    </AppText>
                    <AppText style={styles.transactionDate} variant="caption">
                      {formatTransactionDate(transaction.createdAt)}
                    </AppText>
                  </View>
                  <View style={styles.transactionRight}>
                    <AppText
                      style={[
                        styles.transactionAmount,
                        transaction.amount > 0 ? styles.amountPositive : styles.amountNegative,
                      ]}
                      variant="label"
                    >
                      {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                    </AppText>
                    <View style={styles.kindBadge}>
                      <AppText style={styles.kindBadgeText} variant="caption">
                        {transaction.tokenKind === "PAID" ? "Satın alınan" : "Ödül"}
                      </AppText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
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
  balanceCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  balanceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  balanceLabel: {
    color: theme.colors.textSecondary,
  },
  balanceAmount: {
    color: theme.colors.textPrimary,
    fontSize: 40,
    lineHeight: 48,
  },
  balanceSubtext: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  addBalanceButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    marginTop: theme.spacing.lg,
    minHeight: 48,
    width: "100%",
  },
  addBalanceButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  sectionTitle: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: theme.spacing.xs,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  emptyHistory: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  transactionRow: {
    alignItems: "center",
    borderBottomColor: "#ECEEF2",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    minHeight: 64,
    paddingVertical: theme.spacing.sm,
  },
  transactionIconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  transactionBody: {
    flex: 1,
    gap: 2,
  },
  transactionTitle: {
    color: theme.colors.textPrimary,
  },
  transactionDate: {
    color: theme.colors.textSecondary,
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  transactionAmount: {
    fontSize: 15,
  },
  amountPositive: {
    color: "#059669",
  },
  amountNegative: {
    color: theme.colors.danger,
  },
  kindBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  kindBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
});
