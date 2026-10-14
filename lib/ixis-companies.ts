/**
 * Other Ixis companies, copied from the ONE canonical list: Apixis.dev `js/ixis-companies.js`
 * (IXIS_COMPANIES). Edit the canonical file first, then copy here. Apixis itself is not listed
 * (the "A Apixis Company" badge already links to it).
 *
 * 2026-10-14 (Content Bot Lead, Grok): every URL returned 200 except Recovra
 * (https://recovra-three.vercel.app → 404), which is left out until its live host is confirmed.
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
  { name: "Deduxis", url: "https://deduxis.vercel.app" },
  { name: "Geoxis", url: "https://spatial-dashboard-xi.vercel.app" },
  { name: "Wattixis", url: "https://wattixis.vercel.app" },
]);
