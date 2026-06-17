import React, { useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

export type StoryItem = {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
};

export type StoryHighlightItem = {
  id: string;
  title: string;
  coverImageUrl: string;
  stories: StoryItem[];
};

type ProfileEventHighlightsProps = {
  highlights: StoryHighlightItem[];
};

const shorten = (label: string) => {
  if (label.length <= 11) {
    return label;
  }
  return `${label.slice(0, 10)}...`;
};

const formatStoryDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Shared recently";
  }
  return date.toLocaleDateString([], { month: "short", day: "2-digit" });
};

export function ProfileEventHighlights({ highlights }: ProfileEventHighlightsProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  const visibleHighlights = useMemo(() => highlights.filter((highlight) => highlight.stories.length > 0), [highlights]);

  const activeHighlight = useMemo(
    () => visibleHighlights.find((highlight) => highlight.id === activeHighlightId) ?? null,
    [activeHighlightId, visibleHighlights],
  );
  const activeStory = activeHighlight?.stories[activeStoryIndex] ?? null;

  useEffect(() => {
    setActiveStoryIndex(0);
  }, [activeHighlightId]);

  const closeViewer = () => {
    setActiveHighlightId(null);
    setActiveStoryIndex(0);
  };

  const onNextStory = () => {
    if (!activeHighlight) {
      return;
    }
    if (activeStoryIndex >= activeHighlight.stories.length - 1) {
      closeViewer();
      return;
    }
    setActiveStoryIndex((prev) => prev + 1);
  };

  const onPrevStory = () => {
    if (!activeHighlight) {
      return;
    }
    if (activeStoryIndex === 0) {
      return;
    }
    setActiveStoryIndex((prev) => prev - 1);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} horizontal showsHorizontalScrollIndicator={false}>
        {visibleHighlights.map((highlight) => (
          <Pressable key={highlight.id} onPress={() => setActiveHighlightId(highlight.id)} style={styles.item}>
            <View style={styles.outerCircle}>
              <ImageBackground imageStyle={styles.innerImage} source={{ uri: highlight.coverImageUrl }} style={styles.innerCircle} />
            </View>
            <AppText numberOfLines={1} style={styles.label} variant="caption">
              {shorten(highlight.title)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <Modal animationType="fade" onRequestClose={closeViewer} visible={Boolean(activeHighlight && activeStory)}>
        <SafeAreaView style={styles.viewerRoot}>
          <View style={styles.viewerFrame}>
            <ImageBackground imageStyle={styles.viewerImage} source={{ uri: activeStory?.imageUrl }} style={styles.viewerImageWrap}>
            <View style={styles.viewerTopShade}>
              <View style={styles.progressRow}>
                {(activeHighlight?.stories ?? []).map((story, index) => (
                  <View key={story.id} style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        index < activeStoryIndex && styles.progressFillDone,
                        index === activeStoryIndex && styles.progressFillActive,
                      ]}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.viewerHeader}>
                <View style={styles.viewerIdentity}>
                  <View style={styles.avatarCircle}>
                    <AppText style={styles.avatarText} variant="caption">
                      {activeHighlight?.title.slice(0, 2).toUpperCase() ?? "ST"}
                    </AppText>
                  </View>
                  <View>
                    <AppText numberOfLines={1} style={styles.viewerTitle} variant="label">
                      {activeHighlight?.title ?? "Highlight"}
                    </AppText>
                    <AppText style={styles.viewerTime} variant="caption">
                      {activeStory ? formatStoryDate(activeStory.createdAt) : ""}
                    </AppText>
                  </View>
                </View>

                <View style={styles.viewerActions}>
                  <Ionicons color="#FFFFFF" name="pause" size={22} />
                  <Pressable onPress={closeViewer}>
                    <Ionicons color="#FFFFFF" name="close" size={28} />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.tapZones}>
              <Pressable onPress={onPrevStory} style={styles.tapZoneLeft} />
              <Pressable onPress={onNextStory} style={styles.tapZoneRight} />
            </View>

            <View style={styles.bottomShade}>
              <AppText numberOfLines={3} style={styles.storyCaption} variant="body">
                {activeStory?.caption ?? ""}
              </AppText>
              <View style={styles.replyRow}>
                <TextInput placeholder={`Reply to ${(activeHighlight?.title ?? "highlight").toLowerCase()}...`} placeholderTextColor="#D1D5DB" style={styles.replyInput} />
                <Ionicons color="#FFFFFF" name="heart-outline" size={28} />
                <Ionicons color="#FFFFFF" name="paper-plane-outline" size={26} />
              </View>
            </View>
            </ImageBackground>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  item: {
    alignItems: "center",
    gap: theme.spacing.sm,
    width: 78,
  },
  outerCircle: {
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    borderRadius: 38,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  innerCircle: {
    borderRadius: 33,
    height: 66,
    overflow: "hidden",
    width: 66,
  },
  innerImage: {
    borderRadius: 33,
  },
  label: {
    color: theme.colors.textPrimary,
    textAlign: "center",
    width: 76,
  },
  viewerRoot: {
    backgroundColor: "#000000",
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  viewerFrame: {
    borderRadius: 20,
    flex: 1,
    overflow: "hidden",
  },
  viewerImageWrap: {
    flex: 1,
    justifyContent: "space-between",
  },
  viewerImage: {
    resizeMode: "cover",
  },
  viewerTopShade: {
    backgroundColor: "rgba(17, 24, 39, 0.18)",
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: theme.spacing.md,
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    flex: 1,
    height: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    width: "0%",
  },
  progressFillDone: {
    backgroundColor: "#FFFFFF",
    width: "100%",
  },
  progressFillActive: {
    backgroundColor: "#FFFFFF",
    width: "56%",
  },
  viewerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  viewerIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  avatarCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarText: {
    color: "#111827",
    fontWeight: "700",
  },
  viewerTitle: {
    color: "#FFFFFF",
    maxWidth: 220,
  },
  viewerTime: {
    color: "rgba(255,255,255,0.86)",
  },
  viewerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  tapZones: {
    bottom: 0,
    flexDirection: "row",
    left: 0,
    position: "absolute",
    right: 0,
    top: 84,
  },
  tapZoneLeft: {
    flex: 1,
  },
  tapZoneRight: {
    flex: 1,
  },
  bottomShade: {
    backgroundColor: "rgba(17, 24, 39, 0.28)",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  storyCaption: {
    color: "#FFFFFF",
    lineHeight: 24,
  },
  replyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  replyInput: {
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 28,
    borderWidth: 1,
    color: "#FFFFFF",
    flex: 1,
    minHeight: 46,
    paddingHorizontal: theme.spacing.lg,
  },
});
