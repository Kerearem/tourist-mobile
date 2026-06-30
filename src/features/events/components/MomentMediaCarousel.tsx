import React from "react";

import { MediaCarousel } from "../../../components/media/MediaCarousel";
import { theme } from "../../../constants/theme";
import type { EventAlbumMomentMedia } from "../types";

type MomentMediaCarouselProps = {
  media: EventAlbumMomentMedia[];
  height?: number;
};

export function MomentMediaCarousel({ media, height = 280 }: MomentMediaCarouselProps) {
  return (
    <MediaCarousel
      autoPlayVideo={false}
      borderRadius={theme.radius.md}
      height={height}
      isFocused
      media={media.map((item) => ({
        id: item.id,
        url: item.url,
        type: item.type,
      }))}
    />
  );
}
