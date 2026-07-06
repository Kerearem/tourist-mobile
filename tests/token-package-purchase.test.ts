import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProfileRoutes } from "../src/constants/routes";
import {
  canStartTokenPackagePurchase,
  resolvePackagePurchaseButtonState,
} from "../src/features/token/utils/tokenPackagePurchase";

describe("ProfileRoutes token package navigation", () => {
  it("registers TokenPackagesScreen in profile routes", () => {
    assert.equal(ProfileRoutes.TokenPackagesScreen, "TokenPackagesScreen");
    assert.equal(ProfileRoutes.TokenWalletScreen, "TokenWalletScreen");
  });
});

describe("resolvePackagePurchaseButtonState", () => {
  it("enables all package buttons when no purchase is in progress", () => {
    assert.deepEqual(resolvePackagePurchaseButtonState("pkg-1", null), {
      isLoading: false,
      isDisabled: false,
    });
  });

  it("shows loading only on the selected package", () => {
    assert.deepEqual(resolvePackagePurchaseButtonState("pkg-1", "pkg-1"), {
      isLoading: true,
      isDisabled: true,
    });
    assert.deepEqual(resolvePackagePurchaseButtonState("pkg-2", "pkg-1"), {
      isLoading: false,
      isDisabled: true,
    });
  });
});

describe("canStartTokenPackagePurchase", () => {
  it("allows purchase when no request is active", () => {
    assert.equal(canStartTokenPackagePurchase(null), true);
  });

  it("blocks purchase while another package is processing", () => {
    assert.equal(canStartTokenPackagePurchase("pkg-1"), false);
  });
});
