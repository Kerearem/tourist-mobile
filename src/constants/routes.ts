export const AuthRoutes = {
  LoginScreen: "LoginScreen",
  SignupDisplayNameScreen: "SignupDisplayNameScreen",
  SignupBirthDateScreen: "SignupBirthDateScreen",
  SignupUsernameScreen: "SignupUsernameScreen",
  SignupAccountScreen: "SignupAccountScreen",
  PhoneVerificationScreen: "PhoneVerificationScreen",
  EmailVerificationScreen: "EmailVerificationScreen",
  ForgotPasswordScreen: "ForgotPasswordScreen",
  ResetPasswordScreen: "ResetPasswordScreen",
} as const;

export const OnboardingRoutes = {
  CommunityScreen: "CommunityScreen",
  CountryScreen: "CountryScreen",
  CityScreen: "CityScreen",
  LocationPermissionScreen: "LocationPermissionScreen",
} as const;

export const ExploreRoutes = {
  ExploreFeedScreen: "ExploreFeedScreen",
  ExploreCameraScreen: "ExploreCameraScreen",
  PublishSnapScreen: "PublishSnapScreen",
} as const;

export const HelpRoutes = {
  HelpListScreen: "HelpListScreen",
  CreateHelpRequestScreen: "CreateHelpRequestScreen",
  HelpDetailScreen: "HelpDetailScreen",
} as const;

export const MessagesRoutes = {
  MessagesInboxScreen: "MessagesInboxScreen",
  MessageRequestsScreen: "MessageRequestsScreen",
  MessageThreadScreen: "MessageThreadScreen",
  GroupDetailScreen: "GroupDetailScreen",
  GroupInfoScreen: "GroupInfoScreen",
  NotificationsScreen: "NotificationsScreen",
} as const;

export const EventsRoutes = {
  EventsListScreen: "EventsListScreen",
  EventDetailScreen: "EventDetailScreen",
  EventAlbumScreen: "EventAlbumScreen",
  CreateEventScreen: "CreateEventScreen",
  OrganizerApplicationScreen: "OrganizerApplicationScreen",
  MyOrganizerEventsScreen: "MyOrganizerEventsScreen",
} as const;

export const ProfileRoutes = {
  ProfileScreen: "ProfileScreen",
  SettingsScreen: "SettingsScreen",
  AccountManagementScreen: "AccountManagementScreen",
  BlockedUsersScreen: "BlockedUsersScreen",
  FollowConnectionsScreen: "FollowConnectionsScreen",
  ReportProblemScreen: "ReportProblemScreen",
  DeleteAccountScreen: "DeleteAccountScreen",
  ChangePasswordScreen: "ChangePasswordScreen",
  CreateEventScreen: "CreateEventScreen",
  MyOrganizerEventsScreen: "MyOrganizerEventsScreen",
  OrganizerApplicationScreen: "OrganizerApplicationScreen",
  EventDetailScreen: "EventDetailScreen",
  EventAlbumScreen: "EventAlbumScreen",
} as const;

export const TabRoutes = {
  ExploreTab: "ExploreTab",
  HelpTab: "HelpTab",
  MessagesTab: "MessagesTab",
  EventsTab: "EventsTab",
  ProfileTab: "ProfileTab",
} as const;
