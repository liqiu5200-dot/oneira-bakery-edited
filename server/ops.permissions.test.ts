import { describe, expect, it } from "vitest";
import { canStoreAccess } from "./routers";

describe("ops store access rules", () => {
  it("allows managers and admins to access any store", () => {
    expect(canStoreAccess("manager", undefined, "西湖店")).toBe(true);
    expect(canStoreAccess("admin", undefined, "滨江店")).toBe(true);
  });

  it("allows a store manager to access only the bound store", () => {
    expect(canStoreAccess("store", "西湖店", "西湖店")).toBe(true);
    expect(canStoreAccess("store", "西湖店", "滨江店")).toBe(false);
  });

  it("rejects a store identity without a binding", () => {
    expect(canStoreAccess("store", undefined, "西湖店")).toBe(false);
  });
});
