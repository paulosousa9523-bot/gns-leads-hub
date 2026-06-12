import { describe, expect, it } from "vitest";
import { parseCurrencyInput } from "../../src/lib/leads";

describe("parseCurrencyInput", () => {
  it("keeps Brazilian currency values with thousand separators", () => {
    expect(parseCurrencyInput("R$ 12.345,67")).toBe(12345.67);
    expect(parseCurrencyInput("1.234,56")).toBe(1234.56);
  });

  it("keeps plain decimal values instead of dropping them", () => {
    expect(parseCurrencyInput("12345.67")).toBe(12345.67);
    expect(parseCurrencyInput("12345,67")).toBe(12345.67);
  });

  it("treats empty values as null and invalid values as NaN", () => {
    expect(parseCurrencyInput("")).toBeNull();
    expect(Number.isNaN(parseCurrencyInput("abc"))).toBe(true);
  });
});