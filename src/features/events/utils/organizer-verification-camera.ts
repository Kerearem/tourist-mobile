export const SIMULATOR_CAMERA_UNAVAILABLE_MESSAGE =
  "Simülatörde kamera kullanılamıyor. Galeriden seçerek devam edebilirsin.";

export type VerificationCameraAvailabilityState =
  | "checking"
  | "ready"
  | "unavailable"
  | "permission_denied";

export function resolveVerificationCameraAvailabilityState(input: {
  isChecking: boolean;
  cameraAvailable: boolean | null;
  permissionGranted: boolean | null;
}): VerificationCameraAvailabilityState {
  if (input.isChecking || input.cameraAvailable === null) {
    return "checking";
  }

  if (!input.cameraAvailable) {
    return "unavailable";
  }

  if (!input.permissionGranted) {
    return "permission_denied";
  }

  return "ready";
}

export async function checkVerificationCameraAvailable(
  isAvailableAsync: () => Promise<boolean> = async () => {
    const { CameraView } = await import("expo-camera");
    return CameraView.isAvailableAsync();
  },
): Promise<boolean> {
  try {
    return await isAvailableAsync();
  } catch {
    return false;
  }
}
