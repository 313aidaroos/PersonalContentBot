import { SignInWithApixis } from "@/components/SignInWithApixis";
import { BillingCancelButton } from "@/components/BillingCancelButton";
import { loadBillingHistory, type BillingEntry } from "@/lib/billing-history";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function signedInEmail(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

function when(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function Row({ entry }: { entry: BillingEntry }) {
  return (
    <tr>
      <td style={{ padding: "10px 8px", borderTop: "1px solid var(--line)", whiteSpace: "nowrap" }}>{when(entry.at)}</td>
      <td style={{ padding: "10px 8px", borderTop: "1px solid var(--line)" }}>
        <div>{entry.amount}</div>
        <div style={{ color: "var(--muted)", fontSize: 11 }}>{entry.detail}</div>
      </td>
      <td style={{ padding: "10px 8px", borderTop: "1px solid var(--line)" }}>
        {entry.description}
        <div style={{ color: "var(--muted)", fontSize: 11 }}>{entry.method === "card" ? "Card" : "Ixis"}</div>
      </td>
      <td style={{ padding: "10px 8px", borderTop: "1px solid var(--line)", whiteSpace: "nowrap" }}>{when(entry.renewsAt)}</td>
      <td style={{ padding: "10px 8px", borderTop: "1px solid var(--line)" }}>
        {entry.subscriptionId ? (
          <BillingCancelButton subscriptionId={entry.subscriptionId} pending={entry.cancelAtPeriodEnd} />
        ) : (
          <span style={{ color: "var(--muted)" }}>—</span>
        )}
      </td>
    </tr>
  );
}

export default async function BillingPage() {
  const email = await signedInEmail();
  const history = email
    ? await loadBillingHistory(email)
    : { cardEnabled: false, cardLedger: false, ixisLedger: false, entries: [] as BillingEntry[] };

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Billing</h1>
          <p>
            Card and Ixis payments for this account. <a href="/pricing" style={{ color: "var(--accent)" }}>Pricing</a>
          </p>
        </div>
      </header>

      {!email ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0 }}>Sign in to see your payments.</p>
          <SignInWithApixis next="/billing" />
        </section>
      ) : null}

      {email && !history.cardLedger ? (
        <p className="meta" style={{ marginTop: 0 }}>
          Card history isn't available until the payments table is created. Nothing was changed in the database.
        </p>
      ) : null}
      {email && !history.cardEnabled ? (
        <p className="meta" style={{ marginTop: 0 }}>Card payments are off. Ixis payments still show here when the Wallet answers.</p>
      ) : null}
      {email && !history.ixisLedger ? (
        <p className="meta" style={{ marginTop: 0 }}>Ixis history isn't available right now. Your Wallet balance is unchanged.</p>
      ) : null}

      <section className="card">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
              <th style={{ padding: "0 8px 8px", fontWeight: 600 }}>Date</th>
              <th style={{ padding: "0 8px 8px", fontWeight: 600 }}>Amount</th>
              <th style={{ padding: "0 8px 8px", fontWeight: 600 }}>What it was for</th>
              <th style={{ padding: "0 8px 8px", fontWeight: 600 }}>Next renewal</th>
              <th style={{ padding: "0 8px 8px", fontWeight: 600 }}>Subscription</th>
            </tr>
          </thead>
          <tbody>
            {history.entries.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "12px 8px", color: "var(--muted)" }}>No payments yet.</td>
              </tr>
            ) : history.entries.map((entry) => <Row key={entry.id} entry={entry} />)}
          </tbody>
        </table>
      </section>
    </main>
  );
}
