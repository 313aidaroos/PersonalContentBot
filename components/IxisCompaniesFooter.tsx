import { IXIS_COMPANIES } from "@/lib/ixis-companies";

/** "Other Ixis companies" footer. Reuses the .apixis-badge look (same muted 11px text). */
export function IxisCompaniesFooter() {
  return (
    <footer
      className="apixis-badge ixis-companies"
      style={{ borderBottom: "none", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", padding: "14px 12px" }}
    >
      <span>Other Ixis companies:</span>
      {IXIS_COMPANIES.map((c) => (
        <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer">
          {c.name}
        </a>
      ))}
    </footer>
  );
}
