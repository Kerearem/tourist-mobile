import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { HelpRoutes, MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList, MainTabParamList } from "../../../navigation/types";
import {
  DEFAULT_HELP_IDENTITY_SCOPE,
  DEFAULT_HELP_LOCATION_SCOPE,
  getHelpCategoryLabel,
  getHelpFilterSummary,
  HELP_CATEGORIES,
  HELP_FILTER_GREEN,
  HELP_FILTER_APPLY_GREEN,
  HELP_FILTER_GREEN_BORDER,
  HELP_FILTER_CHIP_ACTIVE_BG,
  HELP_FILTER_CHIP_ACTIVE_BORDER,
  HELP_FILTER_CHIP_ACTIVE_TEXT,
  HELP_IDENTITY_SCOPE_OPTIONS,
  HELP_LOCATION_SCOPE_OPTIONS,
  type HelpCategoryValue,
  type HelpIdentityScope,
  type HelpLocationScope,
} from "../constants/helpCategories";
import { getHelpRequests, respondToHelpRequest } from "../services/help.service";
import type { HelpRequest } from "../types";

type Props = NativeStackScreenProps<HelpStackParamList, "HelpListScreen">;

type HelpFilterState = {
  locationScope: HelpLocationScope;
  identityScope: HelpIdentityScope;
  category: HelpCategoryValue | null;
};

const DEFAULT_HELP_FILTERS: HelpFilterState = {
  locationScope: DEFAULT_HELP_LOCATION_SCOPE,
  identityScope: DEFAULT_HELP_IDENTITY_SCOPE,
  category: null,
};

const SHEET_EDGE = 20;

const relativeTimeTr = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const diffMin = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMin < 60) {
    return `${diffMin} dk önce`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} sa önce`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
};

type HelpTopSearchProps = {
  value: string;
  onChangeText: (value: string) => void;
  scopeLabel: string;
};

function HelpTopSearch({ value, onChangeText, scopeLabel }: HelpTopSearchProps) {
  const inputRef = useRef<TextInput>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const openSearch = () => {
    setIsSearchActive(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <Pressable onPress={openSearch} style={styles.searchPill}>
      <Ionicons color={theme.colors.textPrimary} name="search" size={22} />
      <View style={styles.searchTextBlock}>
        {isSearchActive ? (
          <TextInput
            onBlur={() => setIsSearchActive(false)}
            onChangeText={onChangeText}
            onFocus={() => setIsSearchActive(true)}
            placeholder="Başlık veya açıklamada ara..."
            placeholderTextColor="#9CA3AF"
            ref={inputRef}
            style={styles.searchInput}
            value={value}
          />
        ) : (
          <>
            <AppText style={styles.searchTitle} variant="label">
              Yardım ara
            </AppText>
            <AppText style={styles.searchSubtitle} variant="caption">
              {scopeLabel}
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.sheetChip, active && styles.sheetChipActive]}>
      <AppText style={[styles.sheetChipLabel, active && styles.sheetChipLabelActive]} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

type HelpFilterSheetProps = {
  visible: boolean;
  filters: HelpFilterState;
  onChange: (next: HelpFilterState) => void;
  onClose: () => void;
  onClearAll: () => void;
  onApply: () => void;
};

function HelpFilterSheet({ visible, filters, onChange, onClose, onClearAll, onApply }: HelpFilterSheetProps) {
  const setLocationScope = (value: HelpLocationScope) => onChange({ ...filters, locationScope: value });
  const setIdentityScope = (value: HelpIdentityScope) => onChange({ ...filters, identityScope: value });
  const setCategory = (value: HelpCategoryValue) =>
    onChange({ ...filters, category: filters.category === value ? null : value });

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.sheetBackdrop}>
        <Pressable onPress={onClose} style={styles.sheetBackdropTapArea} />

        <SafeAreaView edges={["bottom"]} style={styles.sheetContainer}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderSpacer} />
              <AppText style={styles.sheetTitle} variant="sectionTitle">
                Filtreler
              </AppText>
              <Pressable onPress={onClose} style={styles.sheetCloseButton}>
                <Ionicons color={theme.colors.textPrimary} name="close" size={22} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sheetSection}>
              <AppText style={styles.sheetSectionTitle} variant="label">
                Kategori
              </AppText>
              <View style={styles.sheetHorizontalScrollHost}>
                <ScrollView
                  contentContainerStyle={styles.sheetHorizontalChipRow}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.sheetHorizontalScroll}
                >
                  <FilterChip
                    active={filters.category === null}
                    label="Tümü"
                    onPress={() => onChange({ ...filters, category: null })}
                  />
                  {HELP_CATEGORIES.map((item) => (
                    <FilterChip
                      active={filters.category === item.value}
                      key={item.value}
                      label={item.label}
                      onPress={() => setCategory(item.value)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.sheetSection}>
              <AppText style={styles.sheetSectionTitle} variant="label">
                Konum
              </AppText>
              <View style={styles.sheetChipWrap}>
                {HELP_LOCATION_SCOPE_OPTIONS.map((item) => (
                  <FilterChip
                    active={filters.locationScope === item.value}
                    key={item.value}
                    label={item.label}
                    onPress={() => setLocationScope(item.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sheetSection}>
              <AppText style={styles.sheetSectionTitle} variant="label">
                Kimlik
              </AppText>
              <View style={styles.sheetChipWrap}>
                {HELP_IDENTITY_SCOPE_OPTIONS.map((item) => (
                  <FilterChip
                    active={filters.identityScope === item.value}
                    key={item.value}
                    label={item.label}
                    onPress={() => setIdentityScope(item.value)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable onPress={onClearAll} style={styles.sheetClearButton}>
                <AppText style={styles.sheetClearText} variant="label">
                  Temizle
                </AppText>
              </Pressable>
              <Pressable onPress={onApply} style={styles.sheetApplyButton}>
                <AppText style={styles.sheetApplyText} variant="label">
                  Uygula
                </AppText>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

type HelpListItemProps = {
  request: HelpRequest;
  isOwnRequest: boolean;
  isResponding: boolean;
  onOpen: () => void;
  onHelp: () => void;
};

function HelpListItem({ request, isOwnRequest, isResponding, onOpen, onHelp }: HelpListItemProps) {
  const categoryLabel = getHelpCategoryLabel(request.category);
  const timeLabel = relativeTimeTr(request.createdAt);
  const canRespond = !isOwnRequest && !request.viewerState.hasResponded && request.status !== "resolved";
  const metaLine = [request.city, timeLabel].filter(Boolean).join(" · ");

  return (
    <Pressable onPress={onOpen} style={styles.listItemPressable}>
      <View style={styles.listItemCard}>
        <View style={styles.listItemHeader}>
          <Avatar initials={request.author.displayName.slice(0, 2).toUpperCase()} size={44} uri={request.author.avatarUrl} />
          <View style={styles.listItemHeaderText}>
            <AppText style={styles.listItemAuthor} variant="label">
              {request.author.displayName}
            </AppText>
            {metaLine ? (
              <AppText style={styles.listItemMeta} variant="caption">
                {metaLine}
              </AppText>
            ) : null}
          </View>
          <View style={styles.listItemCategoryTag}>
            <AppText style={styles.listItemCategoryTagText} variant="caption">
              {categoryLabel}
            </AppText>
          </View>
        </View>

        <AppText style={styles.listItemTitle} variant="label">
          {request.title}
        </AppText>
        <AppText numberOfLines={2} style={styles.listItemDescription} variant="bodyMuted">
          {request.description}
        </AppText>

        {canRespond ? (
          <Pressable
            disabled={isResponding}
            onPress={(event) => {
              event.stopPropagation?.();
              onHelp();
            }}
            style={[styles.listItemHelpButton, isResponding && styles.listItemHelpButtonDisabled]}
          >
            <Ionicons color={HELP_FILTER_GREEN} name="hand-left-outline" size={16} />
            <AppText style={styles.listItemHelpButtonText} variant="caption">
              {isResponding ? "Açılıyor..." : "Yardım edebilirim"}
            </AppText>
          </Pressable>
        ) : request.viewerState.hasResponded ? (
          <AppText style={styles.listItemResponded} variant="caption">
            Yanıtladın
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

export function HelpListScreen({ navigation, route }: Props) {
  const tabNavigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<HelpFilterState>(DEFAULT_HELP_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<HelpFilterState>(DEFAULT_HELP_FILTERS);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const viewerId = user?.id ?? "";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (isFilterOpen) {
      setDraftFilters(appliedFilters);
    }
  }, [appliedFilters, isFilterOpen]);

  const scopeSummaryLabel = useMemo(
    () => getHelpFilterSummary(appliedFilters.locationScope, appliedFilters.identityScope),
    [appliedFilters.identityScope, appliedFilters.locationScope],
  );

  const loadRequests = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!viewerId) {
        setRequests([]);
        setError("Oturum bulunamadı.");
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await getHelpRequests({
          viewerId,
          locationScope: appliedFilters.locationScope,
          identityScope: appliedFilters.identityScope,
          category: appliedFilters.category ?? undefined,
          search: debouncedSearch || undefined,
        });
        setRequests(result);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Yardım istekleri yüklenemedi.";
        setRequests([]);
        setError(message);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [appliedFilters, debouncedSearch, viewerId],
  );

  useEffect(() => {
    void loadRequests("initial");
  }, [loadRequests, route.params?.refreshToken]);

  const onRespond = async (request: HelpRequest) => {
    if (!viewerId || respondingId) {
      return;
    }

    if (request.author.id === viewerId) {
      return;
    }

    setRespondingId(request.id);
    try {
      const result = await respondToHelpRequest({ requestId: request.id, viewerId });
      tabNavigation.navigate(TabRoutes.MessagesTab, {
        screen: MessagesRoutes.MessageThreadScreen,
        params: { threadId: result.conversationId },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sohbet açılamadı.");
    } finally {
      setRespondingId(null);
      void loadRequests("refresh");
    }
  };

  const onApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const onClearFilters = () => {
    setDraftFilters(DEFAULT_HELP_FILTERS);
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <Card style={styles.stateCard}>
          <Loader label="Yardım istekleri yükleniyor..." />
        </Card>
      );
    }

    if (error && requests.length === 0) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            actionLabel="Yenile"
            description={error}
            onActionPress={() => void loadRequests("initial")}
            title="Liste yüklenemedi"
          />
        </Card>
      );
    }

    return (
      <Card style={styles.stateCard}>
        <EmptyState
          actionLabel="Yenile"
          description="Bu filtrelerde açık istek yok. Yeni bir istek oluşturabilirsin."
          onActionPress={() => void loadRequests("initial")}
          title="Henüz yardım isteği yok"
        />
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.topSearchWrap}>
          <HelpTopSearch onChangeText={setSearchText} scopeLabel={scopeSummaryLabel} value={searchText} />
          <Pressable onPress={() => setIsFilterOpen(true)} style={styles.filterTapTarget}>
            <Ionicons color={theme.colors.textPrimary} name="options-outline" size={20} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate(HelpRoutes.CreateHelpRequestScreen)} style={styles.createButton}>
            <Ionicons color="#FFFFFF" name="add" size={22} />
          </Pressable>
        </View>

        <FlatList
          contentContainerStyle={requests.length === 0 ? styles.emptyListContent : styles.listContent}
          data={isLoading ? [] : requests}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          onRefresh={() => void loadRequests("refresh")}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <HelpListItem
              isOwnRequest={item.author.id === viewerId}
              isResponding={respondingId === item.id}
              onHelp={() => void onRespond(item)}
              onOpen={() => navigation.navigate(HelpRoutes.HelpDetailScreen, { helpId: item.id })}
              request={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <HelpFilterSheet
        filters={draftFilters}
        onApply={onApplyFilters}
        onChange={setDraftFilters}
        onClearAll={onClearFilters}
        onClose={() => setIsFilterOpen(false)}
        visible={isFilterOpen}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
    gap: theme.spacing.md,
  },
  topSearchWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  searchPill: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8ECF1",
    borderRadius: 32,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 64,
    paddingHorizontal: theme.spacing.lg,
  },
  searchTextBlock: {
    flex: 1,
  },
  searchTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  searchSubtitle: {
    color: "#6B7280",
    marginTop: 1,
  },
  searchInput: {
    color: theme.colors.textPrimary,
    ...theme.typography.body,
    fontSize: 18,
    fontWeight: "500",
    minHeight: 30,
    paddingVertical: 0,
  },
  filterTapTarget: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8ECF1",
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  createButton: {
    alignItems: "center",
    backgroundColor: HELP_FILTER_GREEN,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  listContent: {
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.xs,
  },
  emptyListContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  listItemPressable: {
    marginBottom: theme.spacing.md,
  },
  listItemCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 18,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  listItemHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  listItemHeaderText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  listItemAuthor: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  listItemMeta: {
    color: theme.colors.textSecondary,
  },
  listItemCategoryTag: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  listItemCategoryTagText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  listItemTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  listItemDescription: {
    color: "#4B5563",
    lineHeight: 20,
  },
  listItemHelpButton: {
    alignSelf: "flex-start",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  listItemHelpButtonDisabled: {
    opacity: 0.6,
  },
  listItemHelpButtonText: {
    color: HELP_FILTER_GREEN,
    fontWeight: "700",
  },
  listItemResponded: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    marginTop: 4,
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginTop: theme.spacing.lg,
    minHeight: 240,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdropTapArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    overflow: "hidden",
  },
  sheetContent: {
    paddingHorizontal: SHEET_EDGE,
    paddingTop: theme.spacing.sm,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    width: 44,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: theme.spacing.md,
  },
  sheetHeaderSpacer: {
    width: 34,
  },
  sheetTitle: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  sheetCloseButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  sheetScrollContent: {
    gap: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  sheetSection: {
    gap: theme.spacing.md,
  },
  sheetSectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    paddingLeft: 2,
  },
  sheetChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    paddingRight: 2,
  },
  sheetHorizontalScrollHost: {
    marginHorizontal: -SHEET_EDGE,
  },
  sheetHorizontalScroll: {
    flexGrow: 0,
  },
  sheetHorizontalChipRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: SHEET_EDGE,
    paddingRight: SHEET_EDGE + theme.spacing.md,
  },
  sheetChip: {
    backgroundColor: "#FFFFFF",
    borderColor: HELP_FILTER_GREEN_BORDER,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 11,
  },
  sheetChipActive: {
    backgroundColor: HELP_FILTER_CHIP_ACTIVE_BG,
    borderColor: HELP_FILTER_CHIP_ACTIVE_BORDER,
  },
  sheetChipLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  sheetChipLabelActive: {
    color: HELP_FILTER_CHIP_ACTIVE_TEXT,
  },
  sheetFooter: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  sheetClearButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  sheetClearText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  sheetApplyButton: {
    alignItems: "center",
    backgroundColor: HELP_FILTER_APPLY_GREEN,
    borderRadius: 14,
    flex: 1.2,
    justifyContent: "center",
    minHeight: 50,
  },
  sheetApplyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
