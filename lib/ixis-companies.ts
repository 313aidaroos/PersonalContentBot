/**
 * Other Ixis companies, copied from the ONE canonical list: Apixis.dev `js/ixis-companies.js`
 * (IXIS_COMPANIES). Edit the canonical file first, then copy here. Apixis itself is not listed
 * (the "A Apixis Company" badge already links to it).
 *
 * 2026-10-14 (Content Bot Lead, Grok): every URL returned 200 except Recovra's old host
 * (https://recovra-three.vercel.app → 404). Recovra has merged into Deduxis. The shared list's
 * Deduxis host is https://deduxis.vercel.app (200). Recovra points there, at /recover (200),
 * which is the Recover section Deduxis took over. Label matches the shared-list naming.
 */
export type IxisCompany = { name: string; url: string };

export const IXIS_COMPANIES: readonly IxisCompany[] = Object.freeze([
  { name: "Apixis Wallet", url: "https://apixis-wallet.vercel.app" },
  { name: "Socixis", url: "https://socixis.dev" },
  { name: "Renoxis", url: "https://renoxis.dev" },
  { name: "Rawixis", url: "https://rawixis.vercel.app" },
  { name: "Contraxis", url: "https://contraxis-dev.vercel.app" },
  { name: "Lyrixis", url: "https://lyrixis.vercel.app" },
  { name: "Halaxis", url: "https://halaxis.vercel.app" },
  { name: "Deduxis (incl. Recovra)", url: "https://deduxis.vercel.app" },
  { name: "Recovra", url: "https://deduxis.vercel.app/recover" },
  { name: "Geoxis", url: "https://spatial-dashboard-xi.vercel.app" },
  { name: "Wattixis", url: "https://wattixis.vercel.app" },
]);
