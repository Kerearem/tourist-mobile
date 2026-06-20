import { USE_MOCK_BACKEND } from "../../../constants/env";
import type { AppUser } from "../../../models/user";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState, saveCanonicalUser } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";
import { uploadImage } from "../../../services/media/cloudinary";
import { pickProfileImage, type ProfileImageSource } from "../utils/pickProfileImage";

const mergeAvatarUrl = (user: AppUser, avatarUrl: string): AppUser => ({
  ...user,
  updatedAt: new Date().toISOString(),
  publicProfile: {
    ...user.publicProfile,
    avatarUrl,
  },
});

export async function updateAvatarUrl(avatarUrl: string): Promise<AppUser> {
  const authState = await loadAuthState();
  if (!authState) {
    throw new Error("Oturum bulunamadı.");
  }

  if (USE_MOCK_BACKEND) {
    const updatedUser = mergeAvatarUrl(authState.user, avatarUrl);
    await saveCanonicalUser(updatedUser);
    return updatedUser;
  }

  try {
    const updatedUser = await apiRequest<AppUser>(API_ENDPOINTS.profile.updateAvatar, {
      method: "PATCH",
      body: { avatarUrl },
      token: authState.tokens.accessToken,
    });
    await saveCanonicalUser(updatedUser);
    return updatedUser;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profil fotoğrafı kaydedilemedi.";
    throw new Error(message);
  }
}

export async function uploadProfileAvatar(source: ProfileImageSource): Promise<AppUser> {
  const localUri = await pickProfileImage(source);
  if (!localUri) {
    throw new Error("CANCELLED");
  }

  const secureUrl = await uploadImage(localUri, { folder: "profiles" });
  return updateAvatarUrl(secureUrl);
}
