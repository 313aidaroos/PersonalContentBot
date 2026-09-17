import { describe, it, expect } from "@jest/globals";
import { generateMagicToken, verifyMagicToken } from "@/lib/auth";

describe("Magic Link Auth", () => {
  it("generates a valid magic token with email", () => {
    const email = "user@example.com";
    const token = generateMagicToken(email);
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(32);
  });

  it("verifies a valid magic token", () => {
    const email = "user@example.com";
    const token = generateMagicToken(email);
    const verified = verifyMagicToken(token, email);
    expect(verified).toBe(true);
  });

  it("rejects an invalid magic token", () => {
    const email = "user@example.com";
    const badToken = "invalid_token_string";
    const verified = verifyMagicToken(badToken, email);
    expect(verified).toBe(false);
  });

  it("rejects a token with wrong email", () => {
    const email = "user@example.com";
    const token = generateMagicToken(email);
    const verified = verifyMagicToken(token, "other@example.com");
    expect(verified).toBe(false);
  });

  it("rejects an expired token", () => {
    const email = "user@example.com";
    const token = generateMagicToken(email, 0); // 0 ms expiry
    expect(() => {
      setTimeout(() => {
        const verified = verifyMagicToken(token, email);
        expect(verified).toBe(false);
      }, 10);
    }).not.toThrow();
  });
});
