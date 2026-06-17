import { USE_MOCK_BACKEND } from "../../../constants/env";
import type { AppUser, RelocationReason, UserLanguage } from "../../../models/user";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { apiRequest } from "../../../services/api/client";
import { loadAuthState, saveCanonicalUser } from "../../../services/api/authSession";

type CompleteOnboardingInput = {
  userId: string;
  nationalityCountryCode: string;
  homeCommunity: string;
  destinationCountryCode: string;
  destinationCity: string;
  currentCity: string;
  spokenLanguages: UserLanguage[];
  relocationReason: RelocationReason;
  interests: string[];
};

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<AppUser> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    if (!state || state.user.id !== input.userId) {
      throw new Error("No auth state found for onboarding update.");
    }

    const user: AppUser = {
      ...state.user,
      updatedAt: new Date().toISOString(),
      publicProfile: {
        ...state.user.publicProfile,
        homeCommunity: input.homeCommunity.trim(),
        currentCity: input.currentCity.trim(),
        interests: input.interests,
      },
      privateProfile: {
        ...state.user.privateProfile,
        nationalityCountryCode: input.nationalityCountryCode.trim(),
        destinationCountryCode: input.destinationCountryCode.trim(),
        destinationCity: input.destinationCity.trim(),
        spokenLanguages: input.spokenLanguages,
        relocationReason: input.relocationReason,
      },
    };

    await saveCanonicalUser(user);
    return user;
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }

  const user = await apiRequest<AppUser>(API_ENDPOINTS.onboarding.complete, {
    method: "POST",
    token: state.tokens.accessToken,
    body: {
      nationalityCountryCode: input.nationalityCountryCode,
      homeCommunity: input.homeCommunity,
      destinationCountryCode: input.destinationCountryCode,
      destinationCity: input.destinationCity,
      currentCity: input.currentCity,
      spokenLanguages: input.spokenLanguages,
      relocationReason: input.relocationReason,
      interests: input.interests,
    },
  });

  await saveCanonicalUser(user);
  return user;
}
