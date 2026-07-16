import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { planGuidedCaptureUpload } from "../src/features/events/utils/organizer-verification-capture-queue";
import {
  mapCoverFrameToPhotoCrop,
  resolveGuidedCaptureFrameRect,
} from "../src/features/events/utils/organizer-verification-guided-crop";

test("guided capture queue starts upload immediately when idle", () => {
  const plan = planGuidedCaptureUpload({
    activeUploadType: null,
    pending: null,
    incoming: { documentType: "IDENTITY_BACK", uri: "file://back.jpg" },
    hasApplication: true,
  });
  assert.deepEqual(plan.startUpload, { documentType: "IDENTITY_BACK", uri: "file://back.jpg" });
  assert.equal(plan.nextPending, null);
});

test("guided capture queue holds BACK while FRONT upload is active (regression)", () => {
  const whileBusy = planGuidedCaptureUpload({
    activeUploadType: "IDENTITY_FRONT",
    pending: null,
    incoming: { documentType: "IDENTITY_BACK", uri: "file://back.jpg" },
    hasApplication: true,
  });
  assert.equal(whileBusy.startUpload, null);
  assert.deepEqual(whileBusy.nextPending, { documentType: "IDENTITY_BACK", uri: "file://back.jpg" });

  const afterFrontFinishes = planGuidedCaptureUpload({
    activeUploadType: null,
    pending: whileBusy.nextPending,
    incoming: null,
    hasApplication: true,
  });
  assert.deepEqual(afterFrontFinishes.startUpload, {
    documentType: "IDENTITY_BACK",
    uri: "file://back.jpg",
  });
  assert.equal(afterFrontFinishes.nextPending, null);
});

test("guided capture queue replaces pending with newer incoming capture", () => {
  const plan = planGuidedCaptureUpload({
    activeUploadType: "IDENTITY_FRONT",
    pending: { documentType: "IDENTITY_BACK", uri: "file://old-back.jpg" },
    incoming: { documentType: "IDENTITY_BACK", uri: "file://new-back.jpg" },
    hasApplication: true,
  });
  assert.equal(plan.startUpload, null);
  assert.deepEqual(plan.nextPending, { documentType: "IDENTITY_BACK", uri: "file://new-back.jpg" });
});

test("guided capture queue holds capture until the draft application is loaded (remount race regression)", () => {
  // Device-verified bug: returning from the capture screen remounts the
  // application screen; captureResult arrives before loadCurrent resolves.
  const beforeLoad = planGuidedCaptureUpload({
    activeUploadType: null,
    pending: null,
    incoming: { documentType: "IDENTITY_BACK", uri: "file://back.jpg" },
    hasApplication: false,
  });
  assert.equal(beforeLoad.startUpload, null);
  assert.deepEqual(beforeLoad.nextPending, { documentType: "IDENTITY_BACK", uri: "file://back.jpg" });

  const afterLoad = planGuidedCaptureUpload({
    activeUploadType: null,
    pending: beforeLoad.nextPending,
    incoming: null,
    hasApplication: true,
  });
  assert.deepEqual(afterLoad.startUpload, { documentType: "IDENTITY_BACK", uri: "file://back.jpg" });
  assert.equal(afterLoad.nextPending, null);
});

test("OrganizerApplicationScreen drains queue when the application id becomes available", () => {
  const source = readFileSync(
    join(process.cwd(), "src/features/events/screens/OrganizerApplicationScreen.tsx"),
    "utf8",
  );
  assert.match(source, /hasApplication: Boolean\(applicationId\) && !showReadOnly/);
  // A dedicated effect must drain the queue once applicationId is loaded.
  assert.match(source, /if \(applicationId\) \{\s*drainGuidedCaptureRef\.current\(\);/);
});

test("OrganizerApplicationScreen drains queued capture after upload finally", () => {
  const source = readFileSync(
    join(process.cwd(), "src/features/events/screens/OrganizerApplicationScreen.tsx"),
    "utf8",
  );
  assert.match(source, /planGuidedCaptureUpload/);
  assert.match(source, /pendingGuidedCaptureRef/);
  assert.match(source, /drainGuidedCaptureRef\.current\(\)/);
  assert.match(source, /disabled=\{activeUploadType !== null\}/);
  // Must not clear-and-fire handleUpload without the queue when busy.
  assert.match(source, /activeUploadTypeRef\.current/);
});

test("identity frame geometry is landscape-ish; selfie is portrait", () => {
  const identity = resolveGuidedCaptureFrameRect("identity", 390, 844);
  const selfie = resolveGuidedCaptureFrameRect("selfie", 390, 844);

  assert.ok(identity.width > identity.height);
  assert.ok(selfie.height > selfie.width);
  assert.equal(identity.left, (390 - identity.width) / 2);
  assert.equal(identity.top, 844 * 0.26);
});

test("overlay and crop util share resolveGuidedCaptureFrameRect", () => {
  const overlaySource = readFileSync(
    join(
      process.cwd(),
      "src/features/events/components/organizer-application/VerificationGuidedCaptureOverlay.tsx",
    ),
    "utf8",
  );
  const captureSource = readFileSync(
    join(process.cwd(), "src/features/events/screens/VerificationGuidedCaptureScreen.tsx"),
    "utf8",
  );
  assert.match(overlaySource, /resolveGuidedCaptureFrameRect/);
  assert.match(captureSource, /cropGuidedCaptureToOverlayFrame/);
  assert.doesNotMatch(overlaySource, /width \* 0\.88/);
});

test("cover mapping: landscape photo on tall phone crops identity frame into photo pixels", () => {
  const screenWidth = 390;
  const screenHeight = 844;
  const photoWidth = 4032;
  const photoHeight = 3024;
  const frame = resolveGuidedCaptureFrameRect("identity", screenWidth, screenHeight);
  const crop = mapCoverFrameToPhotoCrop({
    screenWidth,
    screenHeight,
    photoWidth,
    photoHeight,
    frame,
  });

  assert.ok(crop.width > crop.height, "identity crop should stay landscape");
  assert.ok(crop.originX >= 0 && crop.originY >= 0);
  assert.ok(crop.originX + crop.width <= photoWidth);
  assert.ok(crop.originY + crop.height <= photoHeight);

  // Cover scale uses height (taller phone vs landscape photo).
  const scale = Math.max(screenWidth / photoWidth, screenHeight / photoHeight);
  assert.ok(Math.abs(crop.width - frame.width / scale) <= 1);
});

test("cover mapping: portrait selfie photo maps tall frame", () => {
  const screenWidth = 390;
  const screenHeight = 844;
  const photoWidth = 3024;
  const photoHeight = 4032;
  const frame = resolveGuidedCaptureFrameRect("selfie", screenWidth, screenHeight);
  const crop = mapCoverFrameToPhotoCrop({
    screenWidth,
    screenHeight,
    photoWidth,
    photoHeight,
    frame,
    mirrorHorizontal: false,
  });

  assert.ok(crop.height > crop.width, "selfie crop should stay portrait");
  assert.ok(crop.originX + crop.width <= photoWidth);
  assert.ok(crop.originY + crop.height <= photoHeight);
});

test("front-camera mirror flips crop originX horizontally", () => {
  const screenWidth = 390;
  const screenHeight = 844;
  const photoWidth = 1080;
  const photoHeight = 1920;
  const frame = resolveGuidedCaptureFrameRect("selfie", screenWidth, screenHeight);

  const normal = mapCoverFrameToPhotoCrop({
    screenWidth,
    screenHeight,
    photoWidth,
    photoHeight,
    frame,
    mirrorHorizontal: false,
  });
  const mirrored = mapCoverFrameToPhotoCrop({
    screenWidth,
    screenHeight,
    photoWidth,
    photoHeight,
    frame,
    mirrorHorizontal: true,
  });

  assert.equal(mirrored.width, normal.width);
  assert.equal(mirrored.height, normal.height);
  assert.equal(mirrored.originY, normal.originY);
  // Rounding can differ by 1px vs flipping already-rounded values.
  assert.ok(
    Math.abs(mirrored.originX - (photoWidth - normal.originX - normal.width)) <= 1,
  );
});
