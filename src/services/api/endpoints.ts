export const API_ENDPOINTS = {
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
    signOut: "/auth/sign-out",
    me: "/auth/me",
    verifyPhone: "/auth/verify-phone",
    verifyEmail: "/auth/verify-email",
    resendPhoneCode: "/auth/resend-phone-code",
    resendEmailCode: "/auth/resend-email-code",
  },
  onboarding: {
    complete: "/onboarding/complete",
  },
  explore: {
    feed: "/explore/feed",
  },
  events: {
    list: "/events",
    detail: "/events/:eventId",
    toggleAttendance: "/events/:eventId/attendance/toggle",
    create: "/events",
    myAttendances: "/events/my-attendances",
    group: "/events/:eventId/group",
    removeGroupMember: "/events/:eventId/group/members/:userId",
  },
  help: {
    list: "/help/requests",
    detail: "/help/requests/:requestId",
    create: "/help/requests",
    respond: "/help/requests/:requestId/respond",
  },
  messages: {
    conversations: "/messages/conversations",
    conversationDetail: "/messages/conversations/:threadId",
    messages: "/messages/conversations/:threadId/messages",
    sendMessage: "/messages/conversations/:threadId/messages",
    directConversation: "/messages/conversations/direct",
    markRead: "/messages/conversations/:threadId/read",
    pinMessage: "/messages/conversations/:threadId/pin",
    unpinMessage: "/messages/conversations/:threadId/pin",
    helpConversation: "/messages/help-conversations",
  },
  profile: {
    updateAvatar: "/profile/avatar",
  },
  users: {
    search: "/users/search",
  },
  organizer: {
    apply: "/organizer/apply",
    status: "/organizer/status",
    myEvents: "/organizer/events",
  },
} as const;
