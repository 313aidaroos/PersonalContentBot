// Apixis Wallet API client

const WALLET_API_BASE = process.env.WALLET_API_URL || "https://apixis-wallet.vercel.app";
const WALLET_API_KEY = process.env.WALLET_API_KEY; // Service role key for server calls

export type WalletQuote = {
  quoteId: string;
  productKey: string;
  app: string;
  name: string;
  xp: number;
  usdEquivalent: number;
  expiresAt: string;
  payable: string;
};

export type WalletReservation = {
  reservationId: string;
  status: "held" | "captured" | "released";
  productKey: string;
  xp: number;
};

export type WalletBalance = {
  currency: string;
  available: number;
  paid: number;
  bonus: number;
  reserved: number;
  rate: { xpPerDollar: number };
};

/**
 * Request a quote for a SKU from Apixis Wallet
 * POST /api/v1/quotes
 */
export async function requestQuote(productKey: string): Promise<WalletQuote> {
  const res = await fetch(`${WALLET_API_BASE}/api/v1/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productKey }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Quote failed: ${res.status} ${error}`);
  }

  return res.json();
}

/**
 * Reserve Ixis for a product
 * POST /api/v1/reservations
 */
export async function reserveIxis(
  productKey: string,
  idempotencyKey: string,
  userToken: string
): Promise<WalletReservation> {
  if (!WALLET_API_KEY) {
    throw new Error("Wallet API key not configured (contact @hermes)");
  }

  const res = await fetch(`${WALLET_API_BASE}/api/v1/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WALLET_API_KEY}`,
    },
    body: JSON.stringify({ productKey, idempotencyKey }),
  });

  if (!res.ok) {
    const error = await res.text();
    if (res.status === 402) {
      throw new Error("Insufficient Ixis balance. Buy more at https://apixis-wallet.vercel.app");
    }
    throw new Error(`Reservation failed: ${res.status} ${error}`);
  }

  return res.json();
}

/**
 * Capture a reservation (finalize the spend)
 * POST /api/v1/reservations/:id/capture
 */
export async function captureReservation(reservationId: string): Promise<{ receiptId: string }> {
  if (!WALLET_API_KEY) {
    throw new Error("Wallet API key not configured (contact @hermes)");
  }

  const res = await fetch(`${WALLET_API_BASE}/api/v1/reservations/${reservationId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WALLET_API_KEY}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Capture failed: ${res.status} ${error}`);
  }

  return res.json();
}

/**
 * Release a reservation (refund/rollback)
 * POST /api/v1/reservations/:id/release
 */
export async function releaseReservation(reservationId: string): Promise<void> {
  if (!WALLET_API_KEY) {
    throw new Error("Wallet API key not configured (contact @hermes)");
  }

  const res = await fetch(`${WALLET_API_BASE}/api/v1/reservations/${reservationId}/release`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WALLET_API_KEY}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Release failed: ${res.status} ${error}`);
  }
}

/**
 * Check user's wallet balance
 * GET /api/v1/wallet
 */
export async function getWalletBalance(userToken: string): Promise<WalletBalance> {
  const res = await fetch(`${WALLET_API_BASE}/api/v1/wallet`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Balance check failed: ${res.status} ${error}`);
  }

  return res.json();
}
