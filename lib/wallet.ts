// Apixis Wallet API client (stub until INTEGRATION.md published)

const WALLET_API_BASE = process.env.APIXIS_WALLET_API_URL || "https://apixiswallet.vercel.app/api/v1";

export type WalletQuote = {
  quote_id: string;
  sku: string;
  ixis: number;
  usd_equivalent: number;
  expires_at: string;
};

export type WalletReservation = {
  reservation_id: string;
  quote_id: string;
  status: "reserved" | "captured" | "released";
  ixis_reserved: number;
};

export type WalletEntitlement = {
  entitlement_id: string;
  sku: string;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
};

/**
 * Request a quote for a SKU from Apixis Wallet
 * POST /api/v1/quotes
 */
export async function requestQuote(sku: string, email: string): Promise<WalletQuote> {
  // TODO: implement after @apixiswallet publishes INTEGRATION.md
  throw new Error("Wallet connecting… (quote API pending)");
}

/**
 * Reserve Ixis for a quote
 * POST /api/v1/reservations
 */
export async function reserveIxis(quoteId: string, email: string): Promise<WalletReservation> {
  // TODO: implement after @apixiswallet publishes INTEGRATION.md
  throw new Error("Wallet connecting… (reservation API pending)");
}

/**
 * Capture a reservation (charge the user)
 * POST /api/v1/reservations/:id/capture
 */
export async function captureReservation(reservationId: string): Promise<WalletEntitlement> {
  // TODO: implement after @apixiswallet publishes INTEGRATION.md
  throw new Error("Wallet connecting… (capture API pending)");
}

/**
 * Release a reservation (refund/rollback)
 * POST /api/v1/reservations/:id/release
 */
export async function releaseReservation(reservationId: string): Promise<void> {
  // TODO: implement after @apixiswallet publishes INTEGRATION.md
  throw new Error("Wallet connecting… (release API pending)");
}

/**
 * Check user's entitlements
 * GET /api/v1/entitlements?email=...
 */
export async function getEntitlements(email: string): Promise<WalletEntitlement[]> {
  // TODO: implement after @apixiswallet publishes INTEGRATION.md
  throw new Error("Wallet connecting… (entitlements API pending)");
}
