import { USE_MOCK_BACKEND } from "../../../constants/env";
import type { AppUser } from "../../../models/user";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { apiRequest } from "../../../services/api/client";
import { loadAuthState, saveCanonicalUser } from "../../../services/api/authSession";

type CompleteOnboardingInput = {
  userId: string;
  community: string;
  country: string;
  city: string;
};

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<AppUser> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    if (!state || state.user.id !== input.userId) {
      throw new Error("No auth state found for onboarding update.");
    }

    const user: AppUser = {
      ...state.user,
      community: input.community.trim(),
      currentCountryCode: input.country.trim(),
      currentCity: input.city.trim(),
      hasCompletedOnboarding: true,
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
      community: input.community,
      countryCode: input.country,
      city: input.city,
    },
  });

  await saveCanonicalUser(user);
  return user;
}
