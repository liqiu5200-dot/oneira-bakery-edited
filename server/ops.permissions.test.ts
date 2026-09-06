import { describe, expect, it } from "vitest";
import { canManageSuggestion, canStoreAccess } from "./routers";

describe("ops store access rules", () => {
  it("allows managers and admins to access any store", () => {
    expect(canStoreAccess("manager", undefined, "西湖店")).toBe(true);
    expect(canStoreAccess("admin", undefined, "滨江店")).toBe(true);
  });

  it("treats admin as a global editor for report-like records", () => {
    const record = { authorName: "张店长", storeName: "西湖店" };
    expect(canStoreAccess("admin", undefined, "滨江店")).toBe(true);
    expect(canManageSuggestion("admin", "管理员", undefined, record)).toBe(true);
  });

  it("allows a store manager to access only the bound store", () => {
    expect(canStoreAccess("store", "西湖店", "西湖店")).toBe(true);
    expect(canStoreAccess("store", "西湖店", "滨江店")).toBe(false);
  });

  it("rejects a store identity without a binding", () => {
    expect(canStoreAccess("store", undefined, "西湖店")).toBe(false);
  });

  it("allows managers and admins to manage every suggestion or issue", () => {
    const record = { authorName: "张店长", storeName: "西湖店" };
    expect(canManageSuggestion("manager", "其他人", undefined, record)).toBe(true);
    expect(canManageSuggestion("admin", "其他人", undefined, record)).toBe(true);
  });

  it("allows a store manager to manage only their own suggestion or issue", () => {
    const record = { authorName: "张店长", storeName: "西湖店" };
    expect(canManageSuggestion("store", "张店长", "西湖店", record)).toBe(true);
    expect(canManageSuggestion("store", "李店长", "西湖店", record)).toBe(false);
    expect(canManageSuggestion("store", "张店长", "滨江店", record)).toBe(false);
  });
});
