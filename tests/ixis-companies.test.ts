import { describe, it, expect } from "@jest/globals";
import { IXIS_COMPANIES } from "@/lib/ixis-companies";

describe("Other Ixis companies", () => {
  it("lists https links only, no duplicates, and not Apixis itself", () => {
    const urls = IXIS_COMPANIES.map((c) => c.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u).toMatch(/^https:\/\//);
    expect(urls.some((u) => /\/\/(www\.)?apixis\.dev/.test(u))).toBe(false);
  });
});
