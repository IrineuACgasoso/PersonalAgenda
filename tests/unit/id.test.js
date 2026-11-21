import { afterEach, describe, expect, it, vi } from "vitest";
import { uid } from "../../src/utils/id.js";

describe("uid (#29)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("gera UUID quando o navegador oferece crypto.randomUUID", () => {
    expect(uid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("não repete em muitas gerações", () => {
    const ids = new Set(Array.from({ length: 5000 }, uid));
    expect(ids.size).toBe(5000);
  });

  it("fora de contexto seguro (sem randomUUID) cai num id aleatório sem '|'", () => {
    vi.stubGlobal("crypto", {});
    const id = uid();
    expect(id).toMatch(/^[0-9a-z]+$/);
    expect(id.length).toBeGreaterThanOrEqual(8);
  });
});
