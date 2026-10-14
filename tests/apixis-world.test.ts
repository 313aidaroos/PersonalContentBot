import { describe, it, expect, afterEach } from "@jest/globals";
import { enterApixisUrl } from "@/lib/apixis-world";
import { provisionApixisWorldAgent } from "@/lib/apixis-world-provision";

describe("Apixis world entry", () => {
  const prev = process.env.APIXIS_WORLD_KEY;
  afterEach(() => {
    if (prev === undefined) delete process.env.APIXIS_WORLD_KEY;
    else process.env.APIXIS_WORLD_KEY = prev;
  });
  it("links to www.apixis.dev/enter?from=contentbot", () => {
    expect(enterApixisUrl("contentbot")).toBe("https://www.apixis.dev/enter?from=contentbot");
  });
  it("stays off without APIXIS_WORLD_KEY (no network call)", async () => {
    delete process.env.APIXIS_WORLD_KEY;
    const r = await provisionApixisWorldAgent({ client: "contentbot", email: "a@b.co" });
    expect(r).toEqual({ ok: false, error: "apixis_world_key_missing" });
  });
});
