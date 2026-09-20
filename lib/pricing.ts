export const IXIS_TO_USD = 100; // 100 Ixis = $1

export type PricingSKU = {
  id: string;
  name: string;
  ixis: number;
  usd: number;
  description: string;
  type: "per-job" | "monthly-seat" | "one-off";
};

export const PRICING_CATALOG: PricingSKU[] = [
  {
    id: "video-clip",
    name: "60s Video Clip",
    ixis: 800,
    usd: 8,
    description: "Script + storyboard + render (9:16 or 16:9)",
    type: "per-job",
  },
  {
    id: "ai-text-job",
    name: "AI Text Job",
    ixis: 40,
    usd: 0.4,
    description: "Script generation only",
    type: "per-job",
  },
  {
    id: "ai-image",
    name: "AI Image",
    ixis: 150,
    usd: 1.5,
    description: "Generated image for visuals",
    type: "per-job",
  },
  {
    id: "ad-set",
    name: "Ad Set",
    ixis: 400,
    usd: 4,
    description: "Multiple variations for A/B testing",
    type: "per-job",
  },
  {
    id: "contentbot-creator-monthly",
    name: "Creator Seat (Monthly)",
    ixis: 20000,
    usd: 200,
    description: "Unlimited 60s videos for 30 days",
    type: "monthly-seat",
  },
  {
    id: "template-skin",
    name: "Template/Skin",
    ixis: 1000,
    usd: 10,
    description: "One-off custom template or visual skin",
    type: "one-off",
  },
];

export function formatIxis(ixis: number): string {
  return `${ixis.toLocaleString()} Ixis`;
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
