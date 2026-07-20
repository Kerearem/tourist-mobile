import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { ApiRequestError } from "../src/services/api/apiRequestError";
import { resolveEventAttendanceError } from "../src/features/events/utils/resolveEventAttendanceError";
import {
  MUTE_DURATION_OPTIONS,
  ORGANIZER_BAN_JOIN_MESSAGE_TR,
  canCloseEventGroup,
  formatMuteRemainingLabel,
  isActiveMutedUntil,
  isValidModerationReason,
  resolveGroupComposerGate,
  resolveGroupMemberActionFlags,
} from "../src/features/messages/utils/groupModeration";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("group member action sheet visibility", () => {
  it("hides the sheet on the viewer's own row", () => {
    const flags = resolveGroupMemberActionFlags({
      viewerId: "me",
      viewerIsOrganizer: true,
      member: { id: "me", role: "ORGANIZER" },
    });
    assert.equal(flags.canOpenSheet, false);
  });

  it("gives normal members only profile + report", () => {
    const flags = resolveGroupMemberActionFlags({
      viewerId: "me",
      viewerIsOrganizer: false,
      member: { id: "other", role: "MEMBER" },
    });
    assert.equal(flags.canOpenSheet, true);
    assert.equal(flags.showProfile, true);
    assert.equal(flags.showReport, true);
    assert.equal(flags.showKick, false);
    assert.equal(flags.showBan, false);
    assert.equal(flags.showMute, false);
  });

  it("gives organizers kick/ban/mute on other members", () => {
    const flags = resolveGroupMemberActionFlags({
      viewerId: "org",
      viewerIsOrganizer: true,
      member: { id: "other", role: "MEMBER" },
    });
    assert.equal(flags.showKick, true);
    assert.equal(flags.showBan, true);
    assert.equal(flags.showMute, true);
    assert.equal(flags.showUnmute, false);
    assert.equal(flags.showReport, true);
  });

  it("switches mute to unmute when mutedUntil is active", () => {
    const flags = resolveGroupMemberActionFlags({
      viewerId: "org",
      viewerIsOrganizer: true,
      member: {
        id: "other",
        role: "MEMBER",
        mutedUntil: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    assert.equal(flags.showMute, false);
    assert.equal(flags.showUnmute, true);
  });
});

describe("moderation reason and mute options", () => {
  it("requires at least 3 characters for kick/ban reasons", () => {
    assert.equal(isValidModerationReason("ab"), false);
    assert.equal(isValidModerationReason("abc"), true);
    assert.equal(isValidModerationReason("  ab  "), false);
  });

  it("exposes the four allowed mute durations", () => {
    assert.deepEqual(
      MUTE_DURATION_OPTIONS.map((item) => item.minutes),
      [15, 60, 480, 1440],
    );
  });
});

describe("closed and muted composer gates", () => {
  it("prioritizes closed over muted and archived", () => {
    assert.equal(
      resolveGroupComposerGate({
        isClosed: true,
        isArchived: true,
        viewerMutedUntil: new Date(Date.now() + 60_000).toISOString(),
      }).kind,
      "closed",
    );
  });

  it("disables composer while mute is active and opens after expiry", () => {
    const mutedUntil = new Date(Date.now() + 120_000).toISOString();
    const muted = resolveGroupComposerGate({ viewerMutedUntil: mutedUntil });
    assert.equal(muted.kind, "muted");
    if (muted.kind === "muted") {
      assert.ok(muted.remainingLabel.includes("dk") || muted.remainingLabel.includes("sa"));
    }

    assert.equal(
      resolveGroupComposerGate({
        viewerMutedUntil: new Date(Date.now() - 1_000).toISOString(),
      }).kind,
      "open",
    );
    assert.equal(isActiveMutedUntil(new Date(Date.now() - 1_000).toISOString()), false);
    assert.ok(formatMuteRemainingLabel(mutedUntil));
  });

  it("allows close-group only for organizer on COMPLETED open groups", () => {
    assert.equal(
      canCloseEventGroup({
        viewerIsOrganizer: true,
        isClosed: false,
        eventStatus: "COMPLETED",
      }),
      true,
    );
    assert.equal(
      canCloseEventGroup({
        viewerIsOrganizer: true,
        isClosed: false,
        eventStatus: "APPROVED",
      }),
      false,
    );
  });
});

describe("organizer ban join error surface", () => {
  it("surfaces the backend 403 text through the existing attendance error helper", () => {
    const error = new ApiRequestError(ORGANIZER_BAN_JOIN_MESSAGE_TR, 403);
    assert.equal(resolveEventAttendanceError(error), ORGANIZER_BAN_JOIN_MESSAGE_TR);

    const detailSource = source("src/features/events/screens/EventDetailScreen.tsx");
    assert.match(detailSource, /joinBlockReason/);
    assert.match(detailSource, /attendanceError/);
    assert.match(detailSource, /resolveEventAttendanceError/);
  });
});

describe("group moderation UI wiring", () => {
  const infoSource = source("src/features/messages/screens/GroupInfoScreen.tsx");
  const detailSource = source("src/features/messages/screens/GroupDetailScreen.tsx");
  const serviceSource = source("src/features/events/services/eventGroup.service.ts");

  it("replaces inline Çıkar with long-press GroupMemberActionSheet", () => {
    assert.match(infoSource, /GroupMemberActionSheet/);
    assert.match(infoSource, /onLongPress=/);
    assert.doesNotMatch(infoSource, />Çıkar</);
    assert.match(infoSource, /kickEventGroupMember/);
    assert.match(infoSource, /banEventGroupMember/);
    assert.match(infoSource, /muteEventGroupMember/);
    assert.match(infoSource, /unmuteEventGroupMember/);
    assert.match(infoSource, /closeEventGroup/);
    assert.match(infoSource, /ComplaintReasonSheet/);
    assert.match(infoSource, /createUserComplaint/);
  });

  it("wires closed/muted composer banners in GroupDetailScreen", () => {
    assert.match(detailSource, /resolveGroupComposerGate/);
    assert.match(detailSource, /GROUP_CLOSED_COMPOSER_MESSAGE_TR/);
    assert.match(detailSource, /GROUP_MUTED_COMPOSER_MESSAGE_TR/);
  });

  it("calls the H1 moderation endpoints", () => {
    assert.match(serviceSource, /kickGroupMember/);
    assert.match(serviceSource, /banGroupMember/);
    assert.match(serviceSource, /muteGroupMember/);
    assert.match(serviceSource, /closeGroup/);
  });
});
