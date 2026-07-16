import type { ImagePickerOptions } from "expo-image-picker";

export type UserContentMediaKind = "reel" | "moment" | "snap" | "eventCover";

export type MediaDisplayResizeMode = "cover";

export type MediaContentContract = {
  kind: UserContentMediaKind;
  aspectWidth: number;
  aspectHeight: number;
  displayResizeMode: MediaDisplayResizeMode;
  videoContentFit: "cover";
  /** width / height for profile/album grid cells */
  gridCellWidthOverHeight: number;
  pickerAllowsEditingForImages: boolean;
  pickerAspect: [number, number];
  previewGuidance: string;
  videoAspectWarning: string;
  requiresPreviewBeforeAdd: boolean;
};

export const MEDIA_GRID_COLUMNS = 3;

export const MEDIA_CONTENT_CONTRACTS: Record<UserContentMediaKind, MediaContentContract> = {
  reel: {
    kind: "reel",
    aspectWidth: 9,
    aspectHeight: 16,
    displayResizeMode: "cover",
    videoContentFit: "cover",
    gridCellWidthOverHeight: 9 / 16,
    pickerAllowsEditingForImages: true,
    pickerAspect: [9, 16],
    previewGuidance: "Bu medya tanıtım akışında dikey görünecek. Önemli detayları ortada tut.",
    videoAspectWarning: "Dikey olmayan videolar kenarlardan kırpılabilir; kırpmayı kontrol edemezsin.",
    requiresPreviewBeforeAdd: true,
  },
  moment: {
    kind: "moment",
    aspectWidth: 1,
    aspectHeight: 1,
    displayResizeMode: "cover",
    videoContentFit: "cover",
    gridCellWidthOverHeight: 1,
    pickerAllowsEditingForImages: true,
    pickerAspect: [1, 1],
    previewGuidance: "Bu medya anı albümünde kare görünecek. Önemli detayları ortada tut.",
    videoAspectWarning: "Kare olmayan videolar kenarlardan kırpılabilir; kırpmayı kontrol edemezsin.",
    requiresPreviewBeforeAdd: true,
  },
  snap: {
    kind: "snap",
    aspectWidth: 3,
    aspectHeight: 4,
    displayResizeMode: "cover",
    videoContentFit: "cover",
    gridCellWidthOverHeight: 0.58,
    pickerAllowsEditingForImages: false,
    pickerAspect: [3, 4],
    previewGuidance: "Snap akışında bu kadrajla görünecek. Önemli detayları ortada tut.",
    videoAspectWarning: "",
    requiresPreviewBeforeAdd: false,
  },
  eventCover: {
    kind: "eventCover",
    aspectWidth: 16,
    aspectHeight: 9,
    displayResizeMode: "cover",
    videoContentFit: "cover",
    gridCellWidthOverHeight: 16 / 9,
    // Android honors pickerAspect; iOS ignores it and forces a square crop UI
    // (see getImagePickerOptionsForKind) — covers must never use that square path.
    pickerAllowsEditingForImages: true,
    pickerAspect: [16, 9],
    previewGuidance: "Bu görsel etkinlik kartında yatay banner olarak görünecek.",
    videoAspectWarning: "",
    requiresPreviewBeforeAdd: true,
  },
};

export function getMediaContentContract(kind: UserContentMediaKind): MediaContentContract {
  return MEDIA_CONTENT_CONTRACTS[kind];
}

export function getMediaAspectRatio(kind: UserContentMediaKind): number {
  const contract = getMediaContentContract(kind);
  return contract.aspectWidth / contract.aspectHeight;
}

export function getMediaGridTileMetrics(kind: UserContentMediaKind, containerWidth: number) {
  const contract = getMediaContentContract(kind);
  const tileSize = Math.floor(containerWidth / MEDIA_GRID_COLUMNS);
  const tileHeight = Math.floor(tileSize / contract.gridCellWidthOverHeight);
  return { tileSize, tileHeight };
}

export function getImagePickerOptionsForKind(
  kind: UserContentMediaKind,
  platformOS: string = "android",
): Pick<ImagePickerOptions, "allowsEditing" | "aspect" | "quality" | "mediaTypes" | "videoMaxDuration"> {
  const contract = getMediaContentContract(kind);
  const isEventCover = kind === "eventCover";

  // iOS UIImagePickerController crop UI is always square and ignores `aspect`.
  // For 16:9 event covers that square editor fights the display contract, so we
  // skip native editing on iOS and normalize pixels after pick instead.
  const allowsEditing =
    isEventCover && platformOS === "ios" ? false : contract.pickerAllowsEditingForImages;

  return {
    mediaTypes: isEventCover ? ["images"] : ["images", "videos"],
    quality: 0.85,
    videoMaxDuration: 60,
    allowsEditing,
    aspect: contract.pickerAspect,
  };
}

export function getDisplayResizeMode(kind: UserContentMediaKind): MediaDisplayResizeMode {
  return getMediaContentContract(kind).displayResizeMode;
}

export function requiresMediaPreviewBeforeAdd(kind: UserContentMediaKind): boolean {
  return getMediaContentContract(kind).requiresPreviewBeforeAdd;
}

export function isVideoCropSupported(): boolean {
  return false;
}

export function shouldApplyImageCropOnPick(kind: UserContentMediaKind, mediaType: "IMAGE" | "VIDEO"): boolean {
  if (mediaType === "VIDEO") {
    return false;
  }
  return getMediaContentContract(kind).pickerAllowsEditingForImages;
}

export function getCreationTileSize(kind: UserContentMediaKind, tileWidth = 104) {
  const aspectRatio = getMediaAspectRatio(kind);
  return {
    width: tileWidth,
    height: Math.round(tileWidth / aspectRatio),
  };
}

/** @deprecated Use getMediaGridTileMetrics('snap', width) */
export const SNAP_GRID_COLUMNS = MEDIA_GRID_COLUMNS;
/** @deprecated Use MEDIA_CONTENT_CONTRACTS.snap.gridCellWidthOverHeight */
export const SNAP_GRID_CELL_ASPECT = MEDIA_CONTENT_CONTRACTS.snap.gridCellWidthOverHeight;

/** @deprecated Use getMediaGridTileMetrics('snap', containerWidth) */
export function getSnapGridTileMetrics(containerWidth: number) {
  return getMediaGridTileMetrics("snap", containerWidth);
}
