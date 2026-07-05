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

export type EarningWaitTier = "EARLY" | "MID" | "PATIENT";

export type EarningEvent = {
  eventId: string;
  eventTitle: string;
  availableTokens: number;
  availableAt: string;
  waitTier: EarningWaitTier;
  previewNetAmount: number;
};

export type EarningsSummary = {
  totalPending: number;
  totalAvailable: number;
  events: EarningEvent[];
};

export type WithdrawResult = {
  success: boolean;
  withdrawal: {
    tokenAmount: number;
    baseValue: number;
    platformFeePct: number;
    serviceFeePct: number;
    netAmount: number;
    waitTier: EarningWaitTier;
  };
};

export type WithdrawalHistoryItem = {
  id: string;
  tokenAmount: number;
  netAmount: number;
  serviceFeePct: number;
  platformFeePct: number;
  waitTier: EarningWaitTier;
  createdAt: string;
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

let mockEarnings: EarningsSummary = {
  totalPending: 150,
  totalAvailable: 300,
  events: [
    {
      eventId: "mock_event_early",
      eventTitle: "Berlin Rooftop Networking",
      availableTokens: 100,
      availableAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      waitTier: "EARLY",
      previewNetAmount: 50,
    },
    {
      eventId: "mock_event_mid",
      eventTitle: "Berlin Jazz Gecesi",
      availableTokens: 100,
      availableAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
      waitTier: "MID",
      previewNetAmount: 60,
    },
    {
      eventId: "mock_event_patient",
      eventTitle: "Münih Tech Meetup",
      availableTokens: 100,
      availableAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
      waitTier: "PATIENT",
      previewNetAmount: 65,
    },
  ],
};

let mockWithdrawals: WithdrawalHistoryItem[] = [
  {
    id: "mock_wd_1",
    tokenAmount: 50,
    netAmount: 25,
    serviceFeePct: 20,
    platformFeePct: 30,
    waitTier: "EARLY",
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

export async function getEarnings(): Promise<EarningsSummary> {
  if (USE_MOCK_BACKEND) {
    return {
      ...mockEarnings,
      events: mockEarnings.events.filter((event) => event.availableTokens > 0),
    };
  }

  const token = await getAccessToken();
  return apiRequest<EarningsSummary>(API_ENDPOINTS.token.earnings, {
    method: "GET",
    token,
  });
}

export async function withdrawFromEvent(eventId: string, tokenAmount: number): Promise<WithdrawResult> {
  if (USE_MOCK_BACKEND) {
    const event = mockEarnings.events.find((item) => item.eventId === eventId);
    if (!event || event.availableTokens <= 0) {
      throw new Error("Bu etkinlikte çekilebilir kazanç yok");
    }
    if (tokenAmount <= 0 || tokenAmount > event.availableTokens) {
      throw new Error("Etkinlik kazancından fazla çekemezsin");
    }

    const netAmount = Math.floor((tokenAmount * event.previewNetAmount) / event.availableTokens);
    const serviceFeePct = event.waitTier === "EARLY" ? 20 : event.waitTier === "MID" ? 10 : 5;

    event.availableTokens -= tokenAmount;
    mockEarnings.totalAvailable -= tokenAmount;

    const withdrawal: WithdrawalHistoryItem = {
      id: `mock_wd_${Date.now()}`,
      tokenAmount,
      netAmount,
      serviceFeePct,
      platformFeePct: 30,
      waitTier: event.waitTier,
      createdAt: new Date().toISOString(),
    };
    mockWithdrawals = [withdrawal, ...mockWithdrawals];

    return {
      success: true,
      withdrawal: {
        tokenAmount,
        baseValue: tokenAmount,
        platformFeePct: 30,
        serviceFeePct,
        netAmount,
        waitTier: event.waitTier,
      },
    };
  }

  const token = await getAccessToken();
  return apiRequest<WithdrawResult>(API_ENDPOINTS.token.withdraw, {
    method: "POST",
    token,
    body: { eventId, tokenAmount },
  });
}

export async function getWithdrawals(limit = 20): Promise<WithdrawalHistoryItem[]> {
  if (USE_MOCK_BACKEND) {
    return mockWithdrawals.slice(0, limit);
  }

  const token = await getAccessToken();
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  return apiRequest<WithdrawalHistoryItem[]>(
    `${API_ENDPOINTS.token.withdrawals}?${params.toString()}`,
    {
      method: "GET",
      token,
    },
  );
}
