import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  getCreationTileSize,
  getDisplayResizeMode,
  getImagePickerOptionsForKind,
  getMediaAspectRatio,
  getMediaContentContract,
  getMediaGridTileMetrics,
  isVideoCropSupported,
  requiresMediaPreviewBeforeAdd,
  shouldApplyImageCropOnPick,
} from "../src/services/media/mediaContentContracts";

describe("media content contracts", () => {
  it("defines expected aspect ratios per content type", () => {
    assert.equal(getMediaAspectRatio("reel"), 9 / 16);
    assert.equal(getMediaAspectRatio("moment"), 1);
    assert.equal(getMediaAspectRatio("snap"), 3 / 4);
    assert.equal(getMediaAspectRatio("eventCover"), 16 / 9);
  });

  it("maps content types to picker aspect options", () => {
    assert.deepEqual(getImagePickerOptionsForKind("reel").aspect, [9, 16]);
    assert.deepEqual(getImagePickerOptionsForKind("moment").aspect, [1, 1]);
    assert.deepEqual(getImagePickerOptionsForKind("eventCover").aspect, [16, 9]);
  });

  it("uses cover resize mode consistently for previews and display", () => {
    assert.equal(getDisplayResizeMode("reel"), "cover");
    assert.equal(getDisplayResizeMode("moment"), "cover");
    assert.equal(getDisplayResizeMode("eventCover"), "cover");
  });

  it("requires preview before add for reel, moment, and event cover", () => {
    assert.equal(requiresMediaPreviewBeforeAdd("reel"), true);
    assert.equal(requiresMediaPreviewBeforeAdd("moment"), true);
    assert.equal(requiresMediaPreviewBeforeAdd("eventCover"), true);
    assert.equal(requiresMediaPreviewBeforeAdd("snap"), false);
  });

  it("enables image crop on pick but not for video", () => {
    assert.equal(shouldApplyImageCropOnPick("reel", "IMAGE"), true);
    assert.equal(shouldApplyImageCropOnPick("reel", "VIDEO"), false);
    assert.equal(isVideoCropSupported(), false);
  });

  it("sizes creation tiles using the same aspect ratio as feed display", () => {
    const reelTile = getCreationTileSize("reel", 104);
    assert.equal(reelTile.width, 104);
    assert.equal(reelTile.height, Math.round(104 / (9 / 16)));

    const momentTile = getCreationTileSize("moment", 104);
    assert.equal(momentTile.height, 104);
  });

  it("aligns reel profile grid cells to vertical feed aspect", () => {
    const reelGrid = getMediaGridTileMetrics("reel", 360);
    const momentGrid = getMediaGridTileMetrics("moment", 360);
    assert.equal(reelGrid.tileHeight > reelGrid.tileSize, true);
    assert.equal(momentGrid.tileHeight, momentGrid.tileSize);
  });

  it("includes video aspect warnings for reel and moment contracts", () => {
    assert.match(getMediaContentContract("reel").videoAspectWarning, /kırp/i);
    assert.match(getMediaContentContract("moment").videoAspectWarning, /kırp/i);
  });
});

describe("media preview integration", () => {
  it("wires preview modal into reel and moment create screens", () => {
    const reelSource = readFileSync(
      join(process.cwd(), "src/features/profile/screens/CreateReelScreen.tsx"),
      "utf8",
    );
    const momentSource = readFileSync(
      join(process.cwd(), "src/features/events/screens/CreateMomentScreen.tsx"),
      "utf8",
    );
    const basicsSource = readFileSync(
      join(process.cwd(), "src/features/events/components/create-event/steps/BasicsStep.tsx"),
      "utf8",
    );

    assert.match(reelSource, /MediaUploadPreviewModal/);
    assert.match(reelSource, /pickUserContentMedia\("reel"\)/);
    assert.match(momentSource, /MediaUploadPreviewModal/);
    assert.match(momentSource, /pickUserContentMedia\("moment"\)/);
    assert.match(basicsSource, /MediaUploadPreviewModal/);
    assert.match(basicsSource, /pickEventCoverImage/);
  });

  it("does not add new native media dependencies in package.json", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    assert.doesNotMatch(packageJson, /react-native-image-crop-picker/);
    assert.doesNotMatch(packageJson, /ffmpeg/);
    assert.match(packageJson, /expo-image-picker/);
    assert.match(packageJson, /expo-video/);
  });
});
