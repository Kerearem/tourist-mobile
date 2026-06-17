import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import type { NavigationProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList, MainTabParamList } from "../../../navigation/types";
import { getOrCreateHelpConversation } from "../../messages/services/messages.service";
import { getHelpRequestById } from "../services/help.service";
import type { HelpRequest } from "../types";

type Props = NativeStackScreenProps<HelpStackParamList, "HelpDetailScreen">;

const demoHelpDetails: Record<string, HelpRequest> = {
  help_demo_home: {
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
  help_demo_visa: {
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
  help_demo_health: {
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
};

const isDemoHelpId = (helpId: string) => helpId.startsWith("help_demo_");
const getDemoHelpDetail = (helpId: string) => demoHelpDetails[helpId] ?? null;
const isAbortError = (error: unknown) =>
  error instanceof Error && (error.name === "AbortError" || /abort/i.test(error.message));

const getCategoryCover = (category?: string) => {
  const normalized = category?.trim().toLowerCase();
  if (normalized === "visa") {
    return "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80";
  }
  if (normalized === "home") {
    return "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80";
  }
  if (normalized === "health") {
    return "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=80";
  }
  return "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80";
};

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Time unknown";
  }
  const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

const mapStatusLabel = (status: HelpRequest["status"]) => {
  if (status === "in_progress") {
    return "In Progress";
  }
  if (status === "resolved") {
    return "Resolved";
  }
  return "Open";
};

export function HelpDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadDetail = async () => {
      if (!user?.id) {
        if (isActive) {
          setError("No active user.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const detail = await getHelpRequestById(route.params.helpId, user.id);
        if (!isActive) {
          return;
        }

        if (detail) {
          setRequest(detail);
          setError(null);
          return;
        }

        if (isDemoHelpId(route.params.helpId)) {
          setRequest(getDemoHelpDetail(route.params.helpId));
          setError(null);
          return;
        }

        setRequest(null);
        setError("Request not found.");
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (isAbortError(error)) {
          if (isDemoHelpId(route.params.helpId)) {
            setRequest(getDemoHelpDetail(route.params.helpId));
            setError(null);
          } else {
            setError("Request loading timed out. Please try again.");
          }
          return;
        }

        if (isDemoHelpId(route.params.helpId)) {
          setRequest(getDemoHelpDetail(route.params.helpId));
          setError(null);
          return;
        }

        setRequest(null);
        setError("Failed to load request details.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      isActive = false;
    };
  }, [route.params.helpId, user?.id]);

  const onHelpPress = async () => {
    if (!user?.id || !request) {
      return;
    }

    try {
      const conversation = await getOrCreateHelpConversation({
        helpRequestId: request.id,
        helper: {
          id: user.id,
          displayName: user.displayName,
        },
        requester: {
          id: request.author.id,
          displayName: request.author.displayName,
          avatarUrl: request.author.avatarUrl,
        },
      });
      setMessage("Opening conversation...");
      const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
      tabNavigation?.navigate(TabRoutes.MessagesTab, {
        screen: MessagesRoutes.MessageThreadScreen,
        params: { threadId: conversation.id },
      });
    } catch (error) {
      if (isAbortError(error)) {
        setMessage("Connection timed out. Please try again.");
        return;
      }
      setMessage("Could not open conversation. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Card style={styles.stateCard}>
          <Loader label="Loading request..." />
        </Card>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Card style={styles.stateCard}>
          <ErrorState subtitle={error} title="Could not load request" />
        </Card>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Card style={styles.stateCard}>
          <EmptyState subtitle="This request may have been removed." title="Request not found" />
        </Card>
      </SafeAreaView>
    );
  }

  const categoryLabel = request.category?.trim() || "General";
  const statusLabel = mapStatusLabel(request.status);
  const locationLabel = `${request.city}, ${request.countryCode}`;
  const relativeTime = formatRelativeTime(request.createdAt);
  const requesterContext = `${request.community} community · ${locationLabel}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <ImageBackground imageStyle={styles.heroImage} source={{ uri: getCategoryCover(request.category) }} style={styles.heroCover}>
            <View style={styles.heroTopRow}>
              <Badge label={categoryLabel} />
              <Badge label={statusLabel} />
            </View>
            <View style={styles.heroBottom}>
              <AppText style={styles.heroTitle} variant="title">
                {request.title}
              </AppText>
              <AppText style={styles.heroMeta} variant="body">
                {locationLabel}
              </AppText>
              <AppText style={styles.heroMeta} variant="body">
                {relativeTime}
              </AppText>
            </View>
          </ImageBackground>
        </Card>

        <Card>
          <AppText style={styles.sectionTitle} variant="sectionTitle">
            Requester
          </AppText>
          <View style={styles.requesterRow}>
            <Avatar initials={request.author.displayName.slice(0, 2).toUpperCase()} size="md" uri={request.author.avatarUrl} />
            <View style={styles.requesterTextWrap}>
              <AppText variant="label">{request.author.displayName}</AppText>
              <AppText style={styles.requesterMeta} variant="caption">
                {requesterContext}
              </AppText>
            </View>
          </View>
        </Card>

        <Card>
          <AppText style={styles.sectionTitle} variant="sectionTitle">
            Request details
          </AppText>
          <AppText style={styles.description} variant="body">
            {request.description}
          </AppText>
          <View style={styles.detailsMeta}>
            <Badge label={`Category: ${categoryLabel}`} />
            <Badge label={`Status: ${statusLabel}`} />
            <Badge label={`${request.responsesCount} responders`} />
          </View>
          {message ? (
            <AppText style={styles.message} variant="caption">
              {message}
            </AppText>
          ) : null}
        </Card>

        <Pressable onPress={() => void onHelpPress()} style={styles.helpButton}>
          <AppText style={styles.helpButtonLabel} variant="label">
            Yardım Et
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  container: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  heroCard: {
    overflow: "hidden",
    padding: 0,
  },
  heroCover: {
    height: 230,
    justifyContent: "space-between",
    padding: theme.spacing.lg,
  },
  heroImage: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  heroBottom: {
    gap: 4,
  },
  heroTitle: {
    color: "#FFFFFF",
  },
  heroMeta: {
    color: "rgba(255,255,255,0.9)",
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  requesterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  requesterTextWrap: {
    flex: 1,
    gap: 2,
  },
  requesterMeta: {
    color: theme.colors.textSecondary,
  },
  description: {
    lineHeight: 22,
  },
  detailsMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  message: {
    color: "#16A34A",
    marginTop: theme.spacing.sm,
  },
  helpButton: {
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: theme.radius.md,
    justifyContent: "center",
    minHeight: 48,
  },
  helpButtonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
