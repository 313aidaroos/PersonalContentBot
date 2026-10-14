import { describe, it, expect } from "@jest/globals";
import { IXIS_COMPANIES } from "@/lib/ixis-companies";

describe("Other Ixis companies", () => {
  it("lists https links only, no duplicates, and not Apixis itself", () => {
    const urls = IXIS_COMPANIES.map((c) => c.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u).toMatch(/^https:\/\//);
    expect(urls.some((u) => /\/\/(www\.)?apixis\.dev/.test(u))).toBe(false);
  });

  it("keeps Deduxis on the shared-list host and points Recovra at that live site", () => {
    const deduxis = IXIS_COMPANIES.find((c) => c.name === "Deduxis (incl. Recovra)");
    const recovra = IXIS_COMPANIES.find((c) => c.name === "Recovra");
    expect(deduxis?.url).toBe("https://deduxis.vercel.app");
    expect(recovra?.url.startsWith("https://deduxis.vercel.app")).toBe(true);
    expect(IXIS_COMPANIES.some((c) => c.url.includes("recovra-three.vercel.app"))).toBe(false);
  });
});
