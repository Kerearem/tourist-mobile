import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type TokenWallet = {
  paidBalance: number;
  bonusBalance: number;
  totalBalance: number;
};

export type TokenPackage = {
  id: string;
  tokenAmount: number;
  priceUsd: number;
  priceUsdFormatted: string;
};

export type TokenTransactionType =
  | "PURCHASE"
  | "EVENT_JOIN"
  | "EVENT_REFUND"
  | "REWARD_REFERRAL"
  | "REWARD_MOMENT"
  | "ORGANIZER_EARNING"
  | "WITHDRAWAL";

export type TokenTransaction = {
  id: string;
  type: TokenTransactionType;
  tokenKind: "PAID" | "BONUS";
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
};

export type PurchaseResult = {
  success: boolean;
  wallet: TokenWallet;
  addedTokens: number;
};

export type TransactionsPage = {
  items: TokenTransaction[];
  nextCursor: string | null;
};

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

let mockWallet: TokenWallet = {
  paidBalance: 250,
  bonusBalance: 50,
  totalBalance: 300,
};

const mockPackages: TokenPackage[] = [
  { id: "mock_pkg_100", tokenAmount: 100, priceUsd: 100, priceUsdFormatted: "1.00" },
  { id: "mock_pkg_500", tokenAmount: 500, priceUsd: 450, priceUsdFormatted: "4.50" },
  { id: "mock_pkg_1000", tokenAmount: 1000, priceUsd: 800, priceUsdFormatted: "8.00" },
];

let mockTransactions: TokenTransaction[] = [
  {
    id: "mock_tx_1",
    type: "PURCHASE",
    tokenKind: "PAID",
    amount: 100,
    balanceAfter: 100,
    description: "Mock satın alma: 100 token",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "mock_tx_2",
    type: "REWARD_REFERRAL",
    tokenKind: "BONUS",
    amount: 50,
    balanceAfter: 50,
    description: "Arkadaş daveti ödülü",
    createdAt: new Date(Date.now() - 172_800_000).toISOString(),
  },
];

export async function getWallet(): Promise<TokenWallet> {
  if (USE_MOCK_BACKEND) {
    return { ...mockWallet };
  }

  const token = await getAccessToken();
  return apiRequest<TokenWallet>(API_ENDPOINTS.token.wallet, {
    method: "GET",
    token,
  });
}

export async function getPackages(): Promise<TokenPackage[]> {
  if (USE_MOCK_BACKEND) {
    return [...mockPackages];
  }

  const token = await getAccessToken();
  return apiRequest<TokenPackage[]>(API_ENDPOINTS.token.packages, {
    method: "GET",
    token,
  });
}

export async function purchaseTokens(packageId: string): Promise<PurchaseResult> {
  if (USE_MOCK_BACKEND) {
    const tokenPackage = mockPackages.find((item) => item.id === packageId);
    if (!tokenPackage || tokenPackage.tokenAmount <= 0) {
      throw new Error("Token paketi bulunamadı.");
    }

    mockWallet = {
      paidBalance: mockWallet.paidBalance + tokenPackage.tokenAmount,
      bonusBalance: mockWallet.bonusBalance,
      totalBalance: mockWallet.totalBalance + tokenPackage.tokenAmount,
    };

    const transaction: TokenTransaction = {
      id: `mock_tx_${Date.now()}`,
      type: "PURCHASE",
      tokenKind: "PAID",
      amount: tokenPackage.tokenAmount,
      balanceAfter: mockWallet.paidBalance,
      description: `Mock satın alma: ${tokenPackage.tokenAmount} token`,
      createdAt: new Date().toISOString(),
    };
    mockTransactions = [transaction, ...mockTransactions];

    return {
      success: true,
      wallet: { ...mockWallet },
      addedTokens: tokenPackage.tokenAmount,
    };
  }

  const token = await getAccessToken();
  return apiRequest<PurchaseResult>(API_ENDPOINTS.token.purchase, {
    method: "POST",
    token,
    body: { packageId },
  });
}

export async function getTransactions(limit = 20, cursor?: string): Promise<TransactionsPage> {
  if (USE_MOCK_BACKEND) {
    const startIndex = cursor ? mockTransactions.findIndex((item) => item.id === cursor) + 1 : 0;
    const safeStart = startIndex > 0 ? startIndex : 0;
    const items = mockTransactions.slice(safeStart, safeStart + limit);
    const hasMore = safeStart + limit < mockTransactions.length;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    };
  }

  const token = await getAccessToken();
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) {
    params.set("cursor", cursor);
  }

  return apiRequest<TransactionsPage>(`${API_ENDPOINTS.token.transactions}?${params.toString()}`, {
    method: "GET",
    token,
  });
}
