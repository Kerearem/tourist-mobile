import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { ExplorePostCard } from "../components/ExplorePostCard";
import { loadExploreFeed } from "../services/explore.service";
import type { ExploreFeedScope, ExplorePost } from "../types";

export function ExploreFeedScreen() {
  const { user } = useAuth();
  const [scope, setScope] = useState<ExploreFeedScope>("city");
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const feedContext = useMemo(
    () => ({
      community: user?.community ?? "",
      countryCode: user?.currentCountryCode ?? "",
      city: user?.currentCity ?? "",
    }),
    [user?.community, user?.currentCountryCode, user?.currentCity],
  );

  const fetchFeed = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!feedContext.countryCode || !feedContext.city) {
        setPosts([]);
        setError(null);
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
        const result = await loadExploreFeed({
          scope,
          community: feedContext.community,
          countryCode: feedContext.countryCode,
          city: feedContext.city,
        });
        setPosts(result);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load explore feed.";
        setPosts([]);
        setError(message);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [feedContext.city, feedContext.community, feedContext.countryCode, scope],
  );

  useEffect(() => {
    void fetchFeed("initial");
  }, [fetchFeed]);

  const renderContent = () => {
    if (isLoading) {
      return <Loader label="Loading explore feed..." />;
    }

    if (error) {
      return <ErrorState subtitle={error} title="Could not load feed" />;
    }

    if (!feedContext.countryCode || !feedContext.city) {
      return <EmptyState subtitle="Complete onboarding location to see your feed." title="No location context" />;
    }

    if (posts.length === 0) {
      return (
        <EmptyState
          subtitle={scope === "city" ? "No posts in your city yet." : "No posts in your country yet."}
          title="Nothing to show"
        />
      );
    }

    return (
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        onRefresh={() => void fetchFeed("refresh")}
        refreshing={refreshing}
        renderItem={({ item }) => <ExplorePostCard post={item} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.toggleRow}>
          <Pressable onPress={() => setScope("city")} style={[styles.toggleButton, scope === "city" && styles.activeToggle]}>
            <AppText style={[styles.toggleLabel, scope === "city" && styles.activeLabel]}>City</AppText>
          </Pressable>
          <Pressable onPress={() => setScope("country")} style={[styles.toggleButton, scope === "country" && styles.activeToggle]}>
            <AppText style={[styles.toggleLabel, scope === "country" && styles.activeLabel]}>Country</AppText>
          </Pressable>
        </View>

        <View style={styles.feedBody}>{renderContent()}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  toggleButton: {
    borderColor: theme.colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeToggle: {
    backgroundColor: "#DBEAFE",
    borderColor: theme.colors.primary,
  },
  toggleLabel: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  activeLabel: {
    color: theme.colors.primary,
  },
  feedBody: {
    flex: 1,
  },
});
