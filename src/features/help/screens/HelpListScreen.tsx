import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { HelpRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList } from "../../../navigation/types";
import { HelpRequestCard } from "../components/HelpRequestCard";
import { getHelpRequests, respondToHelpRequest } from "../services/help.service";
import type { HelpRequest } from "../types";

type Props = NativeStackScreenProps<HelpStackParamList, "HelpListScreen">;

const demoRequests: HelpRequest[] = [
  {
    id: "help_demo_home",
    author: { id: "user_demo_1", displayName: "Merve Y." },
    community: "Turkish",
    countryCode: "DE",
    city: "Kreuzberg",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    title: "Need help moving a sofa",
    description: "I just bought a sofa from IKEA but it does not fit in my car. Can anyone with a van help me?",
    category: "Home",
    status: "open",
    responsesCount: 0,
    viewerState: { hasResponded: false },
  },
  {
    id: "help_demo_visa",
    author: { id: "user_demo_2", displayName: "Ayse Y." },
    community: "Turkish",
    countryCode: "DE",
    city: "Berlin",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    title: "Student Visa extension question",
    description: "Has anyone recently renewed their student visa? I have a specific question about the finance proof.",
    category: "Visa",
    status: "open",
    responsesCount: 0,
    viewerState: { hasResponded: false },
  },
  {
    id: "help_demo_health",
    author: { id: "user_demo_3", displayName: "Burak A." },
    community: "Turkish",
    countryCode: "DE",
    city: "Mitte",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    title: "English speaking dentist?",
    description: "Looking for recommendations for a good English speaking dentist in Mitte area. Just for a checkup.",
    category: "Health",
    status: "open",
    responsesCount: 0,
    viewerState: { hasResponded: false },
  },
];

export function HelpListScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewerId = user?.id ?? "";
  const locationContext = useMemo(
    () => ({
      community: user?.community ?? "",
      countryCode: user?.currentCountryCode ?? "",
      city: user?.currentCity ?? "",
    }),
    [user?.community, user?.currentCountryCode, user?.currentCity],
  );

  const loadRequests = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!viewerId) {
        setRequests([]);
        setError("No active user.");
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
          community: locationContext.community,
          countryCode: locationContext.countryCode,
          city: locationContext.city,
        });
        setRequests(result);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load help requests.";
        setRequests([]);
        setError(message);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [locationContext.city, locationContext.community, locationContext.countryCode, viewerId],
  );

  useEffect(() => {
    void loadRequests("initial");
  }, [loadRequests, route.params?.refreshToken]);

  const onRespond = async (requestId: string) => {
    if (!viewerId) {
      return;
    }
    await respondToHelpRequest({ requestId, viewerId });
    await loadRequests("refresh");
  };

  const requestsForUi = useMemo(() => {
    if (requests.length > 0) {
      return requests;
    }
    if (error) {
      return demoRequests;
    }
    return requests;
  }, [error, requests]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Card style={styles.stateCard}>
          <Loader label="Loading help requests..." />
        </Card>
      );
    }

    if (requestsForUi.length === 0) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            actionLabel="Refresh"
            description="No open requests in your current area yet. Check back soon."
            onActionPress={() => void loadRequests("initial")}
            title="Nothing to help with yet"
          />
        </Card>
      );
    }

    return (
      <FlatList
        data={requestsForUi}
        keyExtractor={(item) => item.id}
        onRefresh={() => void loadRequests("refresh")}
        refreshing={refreshing}
        renderItem={({ item }) => (
          <HelpRequestCard
            onHelp={() => void onRespond(item.id)}
            onOpen={() => navigation.navigate(HelpRoutes.HelpDetailScreen, { helpId: item.id })}
            request={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText style={styles.title} variant="title">
              Yardımlaşma
            </AppText>
            <AppText variant="bodyMuted">Anlık ihtiyaçlar</AppText>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.searchButton}>
              <Ionicons color={theme.colors.textSecondary} name="search" size={24} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate(HelpRoutes.CreateHelpRequestScreen)} style={styles.createButton}>
              <Ionicons color="#FFFFFF" name="add" size={22} />
            </Pressable>
          </View>
        </View>

        <View style={styles.listBody}>{renderContent()}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
    gap: theme.spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: {
    gap: 2,
  },
  title: {
    color: theme.colors.textPrimary,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  createButton: {
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  listBody: {
    flex: 1,
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
});
