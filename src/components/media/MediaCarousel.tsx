import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { requireOptionalNativeModule } from "expo-modules-core";

import { AppText } from "../ui/AppText";
import type { CarouselVideoSlideProps } from "./CarouselVideoSlideNative";
import { cloudinaryVideoPoster } from "./cloudinaryVideoPoster";

export { cloudinaryVideoPoster } from "./cloudinaryVideoPoster";

export type CarouselMediaItem = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
};

type MediaCarouselProps = {
  media: CarouselMediaItem[];
  height?: number;
  isFocused?: boolean;
  autoPlayVideo?: boolean;
  borderRadius?: number;
};

type CarouselVideoSlideComponent = React.ComponentType<CarouselVideoSlideProps>;

const isExpoVideoNativeModuleAvailable = requireOptionalNativeModule("ExpoVideo") != null;

const resolveNativeVideoSlide = (): CarouselVideoSlideComponent | null => {
  if (!isExpoVideoNativeModuleAvailable) {
    return null;
  }

  try {
    return require("./CarouselVideoSlideNative").CarouselVideoSlideNative as CarouselVideoSlideComponent;
  } catch {
    return null;
  }
};

const NativeVideoSlide = resolveNativeVideoSlide();

function CarouselVideoSlideFallback({
  url,
  width,
  height,
}: Pick<CarouselVideoSlideProps, "url" | "width" | "height">) {
  return (
    <View style={[styles.slide, styles.fallbackSlide, { width, height }]}>
      <Image resizeMode="cover" source={{ uri: cloudinaryVideoPoster(url) }} style={styles.mediaFill} />
      <View style={styles.fallbackOverlay}>
        <Ionicons color="#FFFFFF" name="videocam-outline" size={40} />
        <AppText style={styles.fallbackText} variant="caption">
          Video telefonda oynatılır
        </AppText>
      </View>
    </View>
  );
}

function CarouselVideoSlide(props: CarouselVideoSlideProps) {
  if (NativeVideoSlide) {
    return <NativeVideoSlide {...props} />;
  }

  return <CarouselVideoSlideFallback height={props.height} url={props.url} width={props.width} />;
}

export function MediaCarousel({
  media,
  height = 280,
  isFocused = true,
  autoPlayVideo = false,
  borderRadius = 0,
}: MediaCarouselProps) {
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isFocused) {
      setActiveIndex(0);
    }
  }, [isFocused]);

  if (media.length === 0) {
    return null;
  }

  return (
    <View
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0 && width !== carouselWidth) {
          setCarouselWidth(width);
        }
      }}
      style={[styles.container, { height, borderRadius }]}
    >
      <ScrollView
        horizontal
        onMomentumScrollEnd={(event) => {
          if (carouselWidth <= 0) {
            return;
          }
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
          setActiveIndex(nextIndex);
        }}
        pagingEnabled
        scrollEnabled={media.length > 1}
        showsHorizontalScrollIndicator={false}
      >
        {media.map((item, index) => {
          const slideWidth = carouselWidth > 0 ? carouselWidth : undefined;
          const slideIsActive = isFocused && activeIndex === index;

          if (item.type === "VIDEO") {
            return (
              <CarouselVideoSlide
                key={item.id}
                autoPlayVideo={autoPlayVideo}
                height={height}
                isActive={slideIsActive}
                url={item.url}
                width={slideWidth ?? 0}
              />
            );
          }

          return (
            <Image
              key={item.id}
              resizeMode="cover"
              source={{ uri: item.url }}
              style={[styles.slide, styles.mediaFill, slideWidth ? { width: slideWidth, height } : { height }]}
            />
          );
        })}
      </ScrollView>
      {media.length > 1 ? (
        <View style={styles.dots}>
          {media.map((item, index) => (
            <View key={item.id} style={[styles.dot, activeIndex === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    overflow: "hidden",
    width: "100%",
  },
  slide: {
    overflow: "hidden",
  },
  fallbackSlide: {
    backgroundColor: "#111111",
  },
  mediaFill: {
    height: "100%",
    width: "100%",
  },
  fallbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  fallbackText: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  dots: {
    bottom: 12,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    position: "absolute",
    width: "100%",
  },
  dot: {
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 16,
  },
});
