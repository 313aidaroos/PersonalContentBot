import { PricingCards } from "@/components/PricingCards";
import { cardPaymentsEnabled } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return <PricingCards cardEnabled={cardPaymentsEnabled()} />;
}
