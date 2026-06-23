import { USE_MOCK_BACKEND } from "../../../constants/env";
import type { AppUser } from "../../../models/user";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState, saveCanonicalUser } from "../../../services/api/authSession";
import { ApiRequestError, apiRequest } from "../../../services/api/client";
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

export async function deleteAccount(password: string): Promise<void> {
  const trimmedPassword = password.trim();
  if (!trimmedPassword) {
    throw new Error("Şifre gerekli.");
  }

  if (USE_MOCK_BACKEND) {
    return;
  }

  const authState = await loadAuthState();
  if (!authState?.tokens.accessToken) {
    throw new Error("Oturum bulunamadı.");
  }

  try {
    await apiRequest<{ success: boolean }>(API_ENDPOINTS.profile.deleteAccount, {
      method: "POST",
      body: { password: trimmedPassword },
      token: authState.tokens.accessToken,
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      throw new Error("Şifre hatalı");
    }
    const message = error instanceof Error ? error.message : "Hesap silinemedi.";
    throw new Error(message);
  }
}
