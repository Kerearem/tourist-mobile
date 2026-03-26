export const AuthRoutes = {
  LoginScreen: "LoginScreen",
  SignupScreen: "SignupScreen",
  PhoneVerificationScreen: "PhoneVerificationScreen",
  EmailVerificationScreen: "EmailVerificationScreen",
} as const;

export const OnboardingRoutes = {
  CommunityScreen: "CommunityScreen",
  CountryScreen: "CountryScreen",
  CityScreen: "CityScreen",
  LocationPermissionScreen: "LocationPermissionScreen",
} as const;

export const ExploreRoutes = {
  ExploreFeedScreen: "ExploreFeedScreen",
} as const;

export const HelpRoutes = {
  HelpListScreen: "HelpListScreen",
  CreateHelpRequestScreen: "CreateHelpRequestScreen",
  HelpDetailScreen: "HelpDetailScreen",
} as const;

export const MessagesRoutes = {
  MessagesInboxScreen: "MessagesInboxScreen",
  MessageThreadScreen: "MessageThreadScreen",
} as const;

export const EventsRoutes = {
  EventsListScreen: "EventsListScreen",
  EventDetailScreen: "EventDetailScreen",
  CreateEventScreen: "CreateEventScreen",
  OrganizerApplicationScreen: "OrganizerApplicationScreen",
} as const;

export const ProfileRoutes = {
  ProfileScreen: "ProfileScreen",
  SettingsScreen: "SettingsScreen",
  BlockedUsersScreen: "BlockedUsersScreen",
  ReportProblemScreen: "ReportProblemScreen",
} as const;

export const TabRoutes = {
  ExploreTab: "ExploreTab",
  HelpTab: "HelpTab",
  MessagesTab: "MessagesTab",
  EventsTab: "EventsTab",
  ProfileTab: "ProfileTab",
} as const;
