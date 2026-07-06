export function resolvePackagePurchaseButtonState(
  packageId: string,
  purchasingPackageId: string | null,
): { isLoading: boolean; isDisabled: boolean } {
  if (purchasingPackageId === null) {
    return { isLoading: false, isDisabled: false };
  }

  if (purchasingPackageId === packageId) {
    return { isLoading: true, isDisabled: true };
  }

  return { isLoading: false, isDisabled: true };
}

export function canStartTokenPackagePurchase(purchasingPackageId: string | null): boolean {
  return purchasingPackageId === null;
}
