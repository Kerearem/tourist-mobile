import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, type NavigationProp } from "@react-navigation/native";

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

type CategoryFilter = { value: HelpCategoryValue | null; label: string };

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
  const selectedPreviewItems = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];
    const locationLabel =
      HELP_LOCATION_SCOPE_OPTIONS.find((item) => item.value === filters.locationScope)?.label ?? "Şehrim";
    const identityLabel =
      HELP_IDENTITY_SCOPE_OPTIONS.find((item) => item.value === filters.identityScope)?.label ?? "Herkes";

    items.push({ key: `location:${filters.locationScope}`, label: locationLabel });
    items.push({ key: `identity:${filters.identityScope}`, label: identityLabel });

    if (filters.category) {
      items.push({
        key: `category:${filters.category}`,
        label: getHelpCategoryLabel(filters.category),
      });
    }
    return items;
  }, [filters]);

  const setLocationScope = (value: HelpLocationScope) => onChange({ ...filters, locationScope: value });
  const setIdentityScope = (value: HelpIdentityScope) => onChange({ ...filters, identityScope: value });
  const setCategory = (value: HelpCategoryValue) =>
    onChange({ ...filters, category: filters.category === value ? null : value });

  const removeSelectedItem = (key: string) => {
    const [group, value] = key.split(":");
    if (group === "location") {
      onChange({ ...filters, locationScope: DEFAULT_HELP_LOCATION_SCOPE });
    } else if (group === "identity") {
      onChange({ ...filters, identityScope: DEFAULT_HELP_IDENTITY_SCOPE });
    } else if (group === "category" && value) {
      onChange({ ...filters, category: null });
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.sheetBackdrop}>
        <Pressable onPress={onClose} style={styles.sheetBackdropTapArea} />

        <SafeAreaView style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderSpacer} />
            <AppText style={styles.sheetTitle} variant="sectionTitle">
              Filtreler
            </AppText>
            <Pressable onPress={onClose} style={styles.sheetCloseButton}>
              <Ionicons color={theme.colors.textPrimary} name="close" size={20} />
            </Pressable>
          </View>

          {selectedPreviewItems.length > 0 ? (
            <ScrollView contentContainerStyle={styles.sheetSelectedRow} horizontal showsHorizontalScrollIndicator={false}>
              {selectedPreviewItems.map((item) => (
                <Pressable key={item.key} onPress={() => removeSelectedItem(item.key)} style={styles.sheetSelectedChip}>
                  <AppText style={styles.sheetSelectedText} variant="caption">
                    {item.label}
                  </AppText>
                  <Ionicons color="#6B7280" name="close" size={14} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <ScrollView contentContainerStyle={styles.sheetScrollContent} showsVerticalScrollIndicator={false}>
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

            <View style={styles.sheetSection}>
              <AppText style={styles.sheetSectionTitle} variant="label">
                Kategori
              </AppText>
              <View style={styles.sheetChipWrap}>
                {HELP_CATEGORIES.map((item) => (
                  <FilterChip
                    active={filters.category === item.value}
                    key={item.value}
                    label={item.label}
                    onPress={() => setCategory(item.value)}
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
            <Ionicons color="#059669" name="hand-left-outline" size={16} />
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
  const [selectedCategory, setSelectedCategory] = useState<HelpCategoryValue | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<HelpFilterState>(DEFAULT_HELP_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<HelpFilterState>(DEFAULT_HELP_FILTERS);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const viewerId = user?.id ?? "";
  const { locationScope, identityScope } = appliedFilters;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (isFilterOpen) {
      setDraftFilters({
        locationScope: appliedFilters.locationScope,
        identityScope: appliedFilters.identityScope,
        category: selectedCategory,
      });
    }
  }, [appliedFilters.identityScope, appliedFilters.locationScope, isFilterOpen, selectedCategory]);

  const scopeSummaryLabel = useMemo(
    () => getHelpFilterSummary(locationScope, identityScope),
    [identityScope, locationScope],
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
          locationScope,
          identityScope,
          category: selectedCategory ?? undefined,
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
    [debouncedSearch, identityScope, locationScope, selectedCategory, viewerId],
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

  const categoryFilters = useMemo<CategoryFilter[]>(
    () => [{ value: null, label: "Tümü" }, ...HELP_CATEGORIES.map((item) => ({ value: item.value, label: item.label }))],
    [],
  );

  const onApplyFilters = () => {
    setAppliedFilters({
      locationScope: draftFilters.locationScope,
      identityScope: draftFilters.identityScope,
      category: draftFilters.category,
    });
    setSelectedCategory(draftFilters.category);
    setIsFilterOpen(false);
  };

  const onClearFilters = () => {
    setDraftFilters(DEFAULT_HELP_FILTERS);
  };

  const onCategoryChipPress = (value: HelpCategoryValue | null) => {
    setSelectedCategory(value);
    setAppliedFilters((previous) => ({ ...previous, category: value }));
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

        <ScrollView
          horizontal
          contentContainerStyle={styles.categoryScrollContent}
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {categoryFilters.map((item) => {
            const active = selectedCategory === item.value;
            return (
              <Pressable
                key={item.label}
                onPress={() => onCategoryChipPress(item.value)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
              >
                <AppText numberOfLines={1} style={[styles.categoryChipText, active && styles.categoryChipTextActive]} variant="caption">
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

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
    backgroundColor: "#059669",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  categoryScroll: {
    flexGrow: 0,
    maxHeight: 34,
  },
  categoryScrollContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: theme.spacing.xs,
    paddingRight: theme.spacing.md,
  },
  categoryChip: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoryChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  categoryChipText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
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
    color: "#059669",
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
    maxHeight: "88%",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.md,
    width: 44,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sheetHeaderSpacer: {
    width: 34,
  },
  sheetTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
  sheetCloseButton: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  sheetScrollContent: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  sheetSelectedRow: {
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  sheetSelectedChip: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  sheetSelectedText: {
    color: "#374151",
    fontWeight: "600",
  },
  sheetSection: {
    gap: theme.spacing.sm,
  },
  sheetSectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  sheetChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  sheetChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  sheetChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  sheetChipLabel: {
    color: "#6B7280",
    fontWeight: "600",
  },
  sheetChipLabelActive: {
    color: "#FFFFFF",
  },
  sheetFooter: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  sheetClearButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  sheetClearText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  sheetApplyButton: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 12,
    flex: 1.2,
    justifyContent: "center",
    minHeight: 48,
  },
  sheetApplyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
