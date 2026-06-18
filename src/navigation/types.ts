import type { NavigatorScreenParams } from "@react-navigation/native";
import type { UserLanguage } from "../models/user";

export type AuthStackParamList = {
  LoginScreen: undefined;
  SignupDisplayNameScreen: undefined;
  SignupBirthDateScreen: undefined;
  SignupUsernameScreen: undefined;
  SignupAccountScreen: undefined;
  PhoneVerificationScreen: undefined;
  EmailVerificationScreen: undefined;
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
  ExploreFeedScreen: undefined;
  ExploreCameraScreen: undefined;
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
