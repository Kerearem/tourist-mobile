export function resolveSocketConnectNotification(hasConnectedOnce: boolean): {
  notifyReconnect: boolean;
  nextHasConnectedOnce: boolean;
} {
  return {
    notifyReconnect: hasConnectedOnce,
    nextHasConnectedOnce: true,
  };
}

export function clearAppStateSubscription(
  subscription: { remove: () => void } | null,
): null {
  subscription?.remove();
  return null;
}
