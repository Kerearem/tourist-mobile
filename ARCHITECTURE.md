# Tourist Mobile Architecture (Phase 1)

## Purpose
Tourist is a mobile community app for people living, studying, traveling, or relocating abroad.
It helps users connect with people from their home-country community in the same city/country, ask for help, join events, and message each other.
This codebase is the Expo React Native end-user app only; admin tools are out of scope here.

## Gate States
- `booting`
- `signed_out`
- `needs_phone_verification`
- `needs_email_verification`
- `needs_onboarding`
- `ready`

Flow: app open -> gate evaluation -> `AuthStack` / `OnboardingStack` / `MainTabs`.

## Navigation Map
- `RootNavigator`
  - `AuthStack`
  - `OnboardingStack`
  - `MainTabs`
    - `ExploreStack`
    - `HelpStack`
    - `MessagesStack`
    - `EventsStack`
    - `ProfileStack`

`RootNavigator` is the only flow decision maker for gate-driven routing.

## Folder Ownership
- `src/navigation/*`: routing tree, stacks, tabs, typed params.
- `src/features/<feature>/*`: feature-owned screens/components/services/types.
- `src/components/ui/*`: shared reusable UI primitives.
- `src/components/feedback/*`: shared feedback/loading wrappers.
- `src/providers/*`: app-wide state providers (single source of truth contexts).
- `src/services/*`: global infrastructure wrappers (Firebase/storage/device).
- `src/models/*`: shared domain models and app-level type shapes.
- `src/constants/*`: app constants (`routes` names, basic theme/limits).
- `src/hooks/*`: provider-facing and derived app hooks.

## Service Boundary Rule
Global services (`src/services`) are infrastructure access only (Firebase clients, secure storage, location/device adapters).
Feature services (`src/features/*/services`) are use-case orchestration for a specific product domain.
Do not place product behavior in global infra wrappers, and do not place raw infra client setup inside screens/components.

## Responsibility Rules
- Screens: compose UI, call hooks, navigate, and keep only lightweight UI state.
- Components: render UI from props and callbacks; no data-fetching or app-flow control.
- Services: data access, mapping, and domain operations (future phases).
- Providers: global app state and gate derivation.

## Owner-File Editing Rule
Before editing UI, identify runtime owner file first.
