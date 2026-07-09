import type { NavigatorScreenParams } from "@react-navigation/native";
import type { UserLanguage } from "../models/user";

export type AuthStackParamList = {
  LoginScreen: undefined;
  SignupDisplayNameScreen: undefined;
  SignupBirthDateScreen: undefined;
  SignupUsernameScreen: undefined;
  SignupAccountScreen: undefined;
  PhoneVerificationScreen: undefined;
  EmailVerificationScreen: { infoMessage?: string } | undefined;
  ForgotPasswordScreen: undefined;
  ResetPasswordScreen: { email: string };
};

export type OnboardingStackParamList = {
  CommunityScreen: undefined;
  CountryScreen: { nationalityCountryCode: string; homeCommunity: string };
  CityScreen: {
    nationalityCountryCode: string;
    homeCommunity: string;
    destinationCountryCode: string;
    destinationCity: string;
    currentCity: string;
  };
  LocationPermissionScreen: {
    nationalityCountryCode: string;
    homeCommunity: string;
    destinationCountryCode: string;
    destinationCity: string;
    currentCity: string;
    spokenLanguages: UserLanguage[];
  };
};

export type ExploreStackParamList = {
  ExploreFeedScreen:
    | {
        openUser?: {
          id: string;
          username: string;
          displayName: string;
          avatarUrl?: string;
          isOrganizer?: boolean;
        };
      }
    | undefined;
  ExploreCameraScreen: undefined;
  PublishSnapScreen: {
    frontUri: string;
    backUri: string;
  };
  CreateReelScreen: undefined;
};

export type HelpStackParamList = {
  HelpListScreen: { refreshToken?: string } | undefined;
  CreateHelpRequestScreen: undefined;
  HelpDetailScreen: { helpId: string };
};

export type MessageUserProfileScreenParams = {
  userId: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  isOrganizer?: boolean;
  sourceThreadId?: string;
};

export type MessagesStackParamList = {
  MessagesInboxScreen: undefined;
  MessageRequestsScreen: { hideThreadId?: string } | undefined;
  MessageThreadScreen: { threadId: string };
  ConversationInfoScreen: { threadId: string };
  MessageUserProfileScreen: MessageUserProfileScreenParams;
  GroupDetailScreen: { eventId: string; conversationId?: string };
  GroupInfoScreen: { eventId: string };
  NotificationsScreen: undefined;
};

export type EventsStackParamList = {
  EventsListScreen: undefined;
  EventDetailScreen: { eventId: string };
  EventAlbumScreen: { eventId: string };
  CreateMomentScreen: { eventId: string };
  CreateEventScreen: undefined;
  OrganizerApplicationScreen: undefined;
  MyOrganizerEventsScreen: undefined;
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  SettingsScreen: undefined;
  AccountManagementScreen: undefined;
  ChangePasswordScreen: undefined;
  BlockedUsersScreen: undefined;
  FollowConnectionsScreen: { listType: "following" | "followers" | "friends" };
  ReportProblemScreen: undefined;
  DeleteAccountScreen: undefined;
  CreateEventScreen: undefined;
  MyOrganizerEventsScreen: undefined;
  OrganizerApplicationScreen: undefined;
  EventDetailScreen: { eventId: string };
  EventAlbumScreen: { eventId: string };
  CreateMomentScreen: { eventId: string };
  CreateReelScreen: undefined;
  TokenWalletScreen: undefined;
  TokenPackagesScreen: undefined;
  FinanceScreen: undefined;
};

export type MainTabParamList = {
  ExploreTab: NavigatorScreenParams<ExploreStackParamList>;
  HelpTab: NavigatorScreenParams<HelpStackParamList>;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList>;
  EventsTab: NavigatorScreenParams<EventsStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};
