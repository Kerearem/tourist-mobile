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

/**
 * The camera is considered available on every real device (iOS/Android) and
 * unavailable only on simulators/emulators. expo-camera's availability check
 * is a web-oriented API and is unreliable on real iOS hardware (returns false
 * or throws), which used to strand real users on the simulator message.
 */
export async function checkVerificationCameraAvailable(
  isRealDevice: () => boolean | Promise<boolean> = async () => {
    const Device = await import("expo-device");
    return Device.isDevice;
  },
): Promise<boolean> {
  try {
    return await isRealDevice();
  } catch {
    // If device detection fails, assume a real device: never drop a real user
    // to the simulator/gallery path because of a module error.
    return true;
  }
}
