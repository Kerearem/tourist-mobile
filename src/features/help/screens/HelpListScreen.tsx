import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { HelpRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList } from "../../../navigation/types";
import { HelpRequestCard } from "../components/HelpRequestCard";
import { getHelpRequests, respondToHelpRequest } from "../services/help.service";
import type { HelpRequest } from "../types";

type Props = NativeStackScreenProps<HelpStackParamList, "HelpListScreen">;

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

  const renderContent = () => {
    if (isLoading) {
      return <Loader label="Loading help requests..." />;
    }

    if (error) {
      return <ErrorState subtitle={error} title="Could not load requests" />;
    }

    if (requests.length === 0) {
      return <EmptyState subtitle="No open requests yet in your area." title="Nothing to help with yet" />;
    }

    return (
      <FlatList
        data={requests}
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
        <AppButton label="Create Help Request" onPress={() => navigation.navigate(HelpRoutes.CreateHelpRequestScreen)} />
        <View style={styles.listBody}>{renderContent()}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  listBody: {
    flex: 1,
  },
});
