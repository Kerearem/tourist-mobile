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
import {
  isAspectCloseEnough,
  resolveCenterCropRect,
} from "../src/services/media/resolveCenterCropRect";

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

  it("event cover picker is images-only and locked to the 16:9 contract", () => {
    const androidOptions = getImagePickerOptionsForKind("eventCover", "android");
    assert.deepEqual(androidOptions.mediaTypes, ["images"]);
    assert.deepEqual(androidOptions.aspect, [16, 9]);
    assert.equal(androidOptions.allowsEditing, true);
    assert.deepEqual(getMediaContentContract("eventCover").pickerAspect, [16, 9]);

    const iosOptions = getImagePickerOptionsForKind("eventCover", "ios");
    assert.deepEqual(iosOptions.aspect, [16, 9]);
    // iOS native crop is square-only; disable it so we don't fight the 16:9 card.
    assert.equal(iosOptions.allowsEditing, false);
  });

  it("does not change reel/moment/snap picker media types", () => {
    assert.deepEqual(getImagePickerOptionsForKind("reel").mediaTypes, ["images", "videos"]);
    assert.deepEqual(getImagePickerOptionsForKind("moment").mediaTypes, ["images", "videos"]);
    assert.deepEqual(getImagePickerOptionsForKind("snap").mediaTypes, ["images", "videos"]);
    assert.equal(getImagePickerOptionsForKind("reel", "ios").allowsEditing, true);
    assert.equal(getImagePickerOptionsForKind("moment", "ios").allowsEditing, true);
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

describe("event cover center-crop geometry (matches display cover framing)", () => {
  it("returns null when the source is already ~16:9", () => {
    assert.equal(resolveCenterCropRect(1600, 900, 16, 9), null);
    assert.equal(isAspectCloseEnough(1600, 900, 16, 9), true);
  });

  it("trims the sides of a landscape-wide image to 16:9", () => {
    const crop = resolveCenterCropRect(2000, 900, 16, 9);
    assert.ok(crop);
    assert.equal(crop.height, 900);
    assert.equal(crop.width, Math.round(900 * (16 / 9)));
    assert.equal(crop.originY, 0);
    assert.equal(crop.originX, Math.round((2000 - crop.width) / 2));
  });

  it("trims top/bottom of a tall image to 16:9 (iOS square-crop case)", () => {
    const crop = resolveCenterCropRect(1200, 1200, 16, 9);
    assert.ok(crop);
    assert.equal(crop.width, 1200);
    assert.equal(crop.height, Math.round(1200 / (16 / 9)));
    assert.equal(crop.originX, 0);
    assert.equal(crop.originY, Math.round((1200 - crop.height) / 2));
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

  it("event cover pick path normalizes to the 16:9 contract after selection", () => {
    const pickSource = readFileSync(
      join(process.cwd(), "src/services/media/pickUserContentMedia.ts"),
      "utf8",
    );
    const contractsSource = readFileSync(
      join(process.cwd(), "src/services/media/mediaContentContracts.ts"),
      "utf8",
    );

    assert.match(pickSource, /normalizeImageToMediaAspect\(uri, "eventCover"\)/);
    assert.match(pickSource, /kind === "eventCover"/);
    assert.match(pickSource, /getImagePickerOptionsForKind\(kind, Platform\.OS\)/);
    assert.match(contractsSource, /pickerAspect: \[16, 9\]/);
    assert.match(contractsSource, /platformOS === "ios"/);
    assert.doesNotMatch(pickSource, /normalizeImageToMediaAspect\(uri, "reel"\)/);
    assert.doesNotMatch(pickSource, /normalizeImageToMediaAspect\(uri, "moment"\)/);
  });

  it("does not add incompatible native crop packages in package.json", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    assert.doesNotMatch(packageJson, /react-native-image-crop-picker/);
    assert.doesNotMatch(packageJson, /ffmpeg/);
    assert.match(packageJson, /expo-image-picker/);
    assert.match(packageJson, /expo-image-manipulator/);
    assert.match(packageJson, /expo-video/);
  });
});
