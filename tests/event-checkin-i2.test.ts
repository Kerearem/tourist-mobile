import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { ApiRequestError } from "../src/services/api/apiRequestError";
import {
  CHECKIN_OFFLINE_MESSAGE_TR,
  canShowAttendeeQrEntry,
  canShowHostQrScanner,
  isCheckinNetworkOffline,
  resolveCheckinResultPresentation,
  resolveCheckinScanError,
  resolveQrRefreshDelayMs,
  resolveQrTokenError,
  resolveQrWindowRetryDelayMs,
  shouldProcessQrScan,
  shouldRefreshQrOnAppStateTransition,
} from "../src/features/events/utils/eventCheckinUi";
import { resolveEventAttendanceError } from "../src/features/events/utils/resolveEventAttendanceError";

describe("attendee check-in QR lifecycle", () => {
  it("uses the backend refreshAfterSeconds value (45 seconds)", () => {
    const now = Date.parse("2026-07-30T12:00:00.000Z");
    assert.equal(
      resolveQrRefreshDelayMs(
        {
          refreshAfterSeconds: 45,
          expiresAt: "2026-07-30T12:01:00.000Z",
        },
        now,
      ),
      45_000,
    );
  });

  it("refreshes when the app returns from background or inactive", () => {
    assert.equal(shouldRefreshQrOnAppStateTransition("background", "active"), true);
    assert.equal(shouldRefreshQrOnAppStateTransition("inactive", "active"), true);
    assert.equal(shouldRefreshQrOnAppStateTransition("active", "active"), false);
    assert.equal(shouldRefreshQrOnAppStateTransition("active", "background"), false);
  });

  it("formats the not-started state in the event timezone", () => {
    const error = new ApiRequestError(
      "Giriş saati henüz başlamadı",
      400,
      undefined,
      {
        windowStartsAt: "2026-07-30T18:00:00.000Z",
        windowEndsAt: "2026-07-30T23:00:00.000Z",
      },
    );

    assert.deepEqual(resolveQrTokenError(error, "Europe/Berlin"), {
      kind: "not_started",
      title: "Giriş 20:00'te açılır",
      subtitle: "QR kodun giriş saati başladığında burada görünecek.",
    });
  });

  it("shows the closed-window state", () => {
    const error = new ApiRequestError("Giriş kapandı", 400);
    assert.deepEqual(resolveQrTokenError(error, "Europe/Istanbul"), {
      kind: "closed",
      title: "Giriş kapandı",
      subtitle: "Bu etkinlik için QR ile giriş süresi sona erdi.",
    });
  });

  it("automatically retries when the not-started window opens", () => {
    const error = new ApiRequestError(
      "Giriş saati henüz başlamadı",
      400,
      undefined,
      { windowStartsAt: "2026-07-30T18:00:00.000Z" },
    );
    assert.equal(
      resolveQrWindowRetryDelayMs(error, Date.parse("2026-07-30T17:59:15.000Z")),
      45_250,
    );
    assert.equal(
      resolveQrWindowRetryDelayMs(
        new ApiRequestError("Giriş kapandı", 400),
        Date.parse("2026-07-30T17:59:15.000Z"),
      ),
      null,
    );
  });

  it("renders the checked-in banner while keeping the QR present", () => {
    const source = readFileSync(
      "src/features/events/screens/EventAttendanceQrScreen.tsx",
      "utf8",
    );
    assert.match(source, /qrToken\.alreadyCheckedIn/);
    assert.match(source, /Girişin yapıldı ✓/);
    assert.match(source, /checkedInAt/);
    assert.match(source, /<QRCode/);
  });
});

describe("host QR scanner states", () => {
  it("distinguishes successful and duplicate scans", () => {
    assert.deepEqual(
      resolveCheckinResultPresentation({
        attendeeName: "Ada Lovelace",
        avatarUrl: null,
        checkedInAt: "2026-07-30T18:05:00.000Z",
        alreadyCheckedIn: false,
      }),
      { tone: "success", title: "Ada Lovelace — giriş yapıldı" },
    );

    assert.deepEqual(
      resolveCheckinResultPresentation({
        attendeeName: "Ada Lovelace",
        avatarUrl: null,
        checkedInAt: "2026-07-30T18:05:00.000Z",
        alreadyCheckedIn: true,
      }),
      { tone: "duplicate", title: "Zaten giriş yapmış" },
    );
  });

  it("preserves controlled backend errors", () => {
    for (const message of [
      "Geçersiz QR kod",
      "QR kodun süresi doldu",
      "Bu QR kod bu etkinliğe ait değil",
      "Katılımcı bulunamadı",
      "Giriş kapandı",
    ]) {
      assert.equal(resolveCheckinScanError(new ApiRequestError(message, 400)), message);
    }
  });

  it("maps network failures to the controlled offline message", () => {
    assert.equal(resolveCheckinScanError(new TypeError("Network request failed")), CHECKIN_OFFLINE_MESSAGE_TR);
    assert.equal(resolveCheckinScanError(new Error(CHECKIN_OFFLINE_MESSAGE_TR)), CHECKIN_OFFLINE_MESSAGE_TR);
  });

  it("debounces an immediate repeat of the same token but permits later duplicate checks", () => {
    const last = { token: "qr-token", processedAtMs: 10_000 };
    assert.equal(shouldProcessQrScan(last, "qr-token", 11_000), false);
    assert.equal(shouldProcessQrScan(last, "another-token", 11_000), true);
    assert.equal(shouldProcessQrScan(last, "qr-token", 12_500), true);
    assert.equal(shouldProcessQrScan(null, "  ", 12_500), false);
  });

  it("loads NetInfo lazily and rejects only when the device is offline", () => {
    const serviceSource = readFileSync(
      "src/features/events/services/eventCheckin.service.ts",
      "utf8",
    );
    assert.doesNotMatch(
      serviceSource,
      /^import NetInfo from "@react-native-community\/netinfo";/m,
    );
    assert.match(serviceSource, /import\("@react-native-community\/netinfo"\)/);
    assert.match(serviceSource, /isCheckinNetworkOffline/);

    assert.equal(isCheckinNetworkOffline({ isConnected: false, isInternetReachable: true }), true);
    assert.equal(isCheckinNetworkOffline({ isConnected: true, isInternetReachable: false }), true);
    assert.equal(isCheckinNetworkOffline({ isConnected: true, isInternetReachable: true }), false);
    assert.equal(isCheckinNetworkOffline(null), false);
  });

  it("uses expo-camera barcode scanning and has no gallery fallback", () => {
    const source = readFileSync(
      "src/features/events/screens/EventQrScannerScreen.tsx",
      "utf8",
    );
    assert.match(source, /barcodeScannerSettings=\{\{ barcodeTypes: \["qr"\] \}\}/);
    assert.match(source, /onBarcodeScanned=/);
    assert.match(source, /Linking\.openSettings/);
    assert.doesNotMatch(source, /ImagePicker|Galeriden|gallery/i);
  });
});

describe("event detail check-in visibility and capacity errors", () => {
  it("shows attendee QR only for approved non-host attendance", () => {
    assert.equal(canShowAttendeeQrEntry(false, "approved"), true);
    assert.equal(canShowAttendeeQrEntry(false, "pending"), false);
    assert.equal(canShowAttendeeQrEntry(false, "none"), false);
    assert.equal(canShowAttendeeQrEntry(true, "approved"), false);
  });

  it("shows the scanner only to the host of an approved event", () => {
    assert.equal(canShowHostQrScanner(true, "APPROVED"), true);
    assert.equal(canShowHostQrScanner(false, "APPROVED"), false);
    assert.equal(canShowHostQrScanner(true, "COMPLETED"), false);
  });

  it("wires EventDetail to both stacks and the QR entry points", () => {
    const detailSource = readFileSync(
      "src/features/events/screens/EventDetailScreen.tsx",
      "utf8",
    );
    assert.match(detailSource, /EventsStackParamList & ProfileStackParamList/);
    assert.match(detailSource, /"EventDetailScreen"/);
    assert.match(detailSource, /EventAttendanceQrScreen/);
    assert.match(detailSource, /EventQrScannerScreen/);

    const eventsStack = readFileSync("src/navigation/events/EventsStack.tsx", "utf8");
    const profileStack = readFileSync("src/navigation/profile/ProfileStack.tsx", "utf8");
    assert.match(eventsStack, /EventAttendanceQrScreen/);
    assert.match(eventsStack, /EventQrScannerScreen/);
    assert.match(profileStack, /EventAttendanceQrScreen/);
    assert.match(profileStack, /EventQrScannerScreen/);
  });

  it("surfaces the backend 409 capacity message through the existing attendance UI", () => {
    const error = new ApiRequestError("Etkinlik dolu", 409);
    assert.equal(resolveEventAttendanceError(error), "Etkinlik dolu");
  });
});
