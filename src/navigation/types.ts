import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  LoginScreen: undefined;
  SignupScreen: undefined;
  PhoneVerificationScreen: undefined;
  EmailVerificationScreen: undefined;
};

export type OnboardingStackParamList = {
  CommunityScreen: undefined;
  CountryScreen: { community: string };
  CityScreen: { community: string; country: string };
  LocationPermissionScreen: { community: string; country: string; city: string };
};

export type ExploreStackParamList = {
  ExploreFeedScreen: undefined;
};

export type HelpStackParamList = {
  HelpListScreen: { refreshToken?: string } | undefined;
  CreateHelpRequestScreen: undefined;
  HelpDetailScreen: { helpId: string };
};

export type MessagesStackParamList = {
  MessagesInboxScreen: undefined;
  MessageThreadScreen: { threadId: string };
};

export type EventsStackParamList = {
  EventsListScreen: undefined;
  EventDetailScreen: { eventId: string };
  CreateEventScreen: undefined;
  OrganizerApplicationScreen: undefined;
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  SettingsScreen: undefined;
  BlockedUsersScreen: undefined;
  ReportProblemScreen: undefined;
};

export type MainTabParamList = {
  ExploreTab: NavigatorScreenParams<ExploreStackParamList>;
  HelpTab: NavigatorScreenParams<HelpStackParamList>;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList>;
  EventsTab: NavigatorScreenParams<EventsStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};
