import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { theme } from "../../../constants/theme";
import type { ProfileStackParamList } from "../../../navigation/types";
import { getPackages, purchaseTokens, type TokenPackage } from "../services/token.service";
import {
  canStartTokenPackagePurchase,
  resolvePackagePurchaseButtonState,
} from "../utils/tokenPackagePurchase";

type Props = NativeStackScreenProps<ProfileStackParamList, "TokenPackagesScreen">;

export function TokenPackagesScreen({ navigation }: Props) {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const packagesResult = await getPackages();
      setPackages(packagesResult);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Paketler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPackages();
    }, [loadPackages]),
  );

  const handlePurchase = async (tokenPackage: TokenPackage) => {
    if (!canStartTokenPackagePurchase(purchasingPackageId)) {
      return;
    }

    setPurchasingPackageId(tokenPackage.id);
    try {
      const result = await purchaseTokens(tokenPackage.id);
      Alert.alert("Başarılı", `${result.addedTokens} token eklendi`, [
        {
          text: "Tamam",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Satın alınamadı", error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setPurchasingPackageId(null);
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
            Bakiye Ekle
          </AppText>
          <View style={styles.topSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <AppText style={styles.stateText} variant="bodyMuted">
              Paketler yükleniyor...
            </AppText>
          </View>
        ) : loadError ? (
          <View style={styles.stateWrap}>
            <EmptyState
              actionLabel="Tekrar dene"
              description={loadError}
              onActionPress={() => void loadPackages()}
              title="Paketler yüklenemedi"
            />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.stateWrap}>
            <EmptyState
              actionLabel="Yenile"
              description="Şu anda satın alınabilir paket bulunmuyor."
              onActionPress={() => void loadPackages()}
              title="Paket bulunamadı"
            />
          </View>
        ) : (
          <View style={styles.packageList}>
            {packages.map((tokenPackage) => {
              const buttonState = resolvePackagePurchaseButtonState(tokenPackage.id, purchasingPackageId);

              return (
                <View key={tokenPackage.id} style={styles.packageCard}>
                  <View style={styles.packageInfo}>
                    <AppText style={styles.packageAmount} variant="label">
                      {tokenPackage.tokenAmount} token
                    </AppText>
                    <AppText style={styles.packagePrice} variant="body">
                      ${tokenPackage.priceUsdFormatted}
                    </AppText>
                  </View>
                  <Pressable
                    disabled={buttonState.isDisabled}
                    onPress={() => void handlePurchase(tokenPackage)}
                    style={[styles.purchaseButton, buttonState.isDisabled && styles.purchaseButtonDisabled]}
                  >
                    {buttonState.isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <AppText style={styles.purchaseButtonText} variant="label">
                        Satın Al
                      </AppText>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
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
  packageList: {
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  packageCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  packageInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  packageAmount: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
  packagePrice: {
    color: theme.colors.textSecondary,
  },
  purchaseButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 104,
    paddingHorizontal: theme.spacing.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: "#FFFFFF",
  },
});
