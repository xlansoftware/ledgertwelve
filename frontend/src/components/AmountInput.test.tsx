import { describe, it, expect } from "vitest";
import { parseAmount } from "@/components/AmountInput";

describe("parseAmount", () => {
  // --- Plain number ---
  it('returns amount for plain number ("42.50" → 42.50)', () => {
    const result = parseAmount("42.50");
    expect(result.amount).toBe(42.5);
    expect(result.currency).toBeUndefined();
  });

  // --- Math expressions ---
  it('returns amount for addition ("2 + 3" → 5)', () => {
    const result = parseAmount("2 + 3");
    expect(result.amount).toBe(5);
    expect(result.currency).toBeUndefined();
  });

  it('returns amount for subtraction ("10 - 3" → 7)', () => {
    const result = parseAmount("10 - 3");
    expect(result.amount).toBe(7);
  });

  it('returns amount for multiplication ("10 * 4" → 40)', () => {
    const result = parseAmount("10 * 4");
    expect(result.amount).toBe(40);
  });

  it('returns amount for division ("100 / 2" → 50)', () => {
    const result = parseAmount("100 / 2");
    expect(result.amount).toBe(50);
  });

  it('returns amount for parenthesized expression ("(10+5)/3" → 5)', () => {
    const result = parseAmount("(10+5)/3");
    expect(result.amount).toBe(5);
  });

  // --- Currency suffix ---
  it('returns amount and currency for suffix with space ("22 USD" → 22, USD)', () => {
    const result = parseAmount("22 USD");
    expect(result.amount).toBe(22);
    expect(result.currency).toBe("USD");
  });

  it('returns amount and currency for prefix with space ("USD 22" → 22, USD)', () => {
    const result = parseAmount("USD 22");
    expect(result.amount).toBe(22);
    expect(result.currency).toBe("USD");
  });

  it('returns amount and currency for suffix no space ("22USD" → 22, USD)', () => {
    const result = parseAmount("22USD");
    expect(result.amount).toBe(22);
    expect(result.currency).toBe("USD");
  });

  it('returns amount and currency for prefix no space ("USD22" → 22, USD)', () => {
    const result = parseAmount("USD22");
    expect(result.amount).toBe(22);
    expect(result.currency).toBe("USD");
  });

  // --- Currency before/after math ---
  it('returns amount and currency for currency before math ("EUR 10 * 3" → 30, EUR)', () => {
    const result = parseAmount("EUR 10 * 3");
    expect(result.amount).toBe(30);
    expect(result.currency).toBe("EUR");
  });

  it('returns amount and currency for currency after math ("10 * 3 EUR" → 30, EUR)', () => {
    const result = parseAmount("10 * 3 EUR");
    expect(result.amount).toBe(30);
    expect(result.currency).toBe("EUR");
  });

  it('returns amount and currency for math + currency no space ("10*3EUR" → 30, EUR)', () => {
    const result = parseAmount("10*3EUR");
    expect(result.amount).toBe(30);
    expect(result.currency).toBe("EUR");
  });

  // --- Invalid input ---
  it('returns null amount for invalid expression ("abc" → null)', () => {
    const result = parseAmount("abc");
    expect(result.amount).toBeNull();
  });

  it("returns null amount for division by zero (\"10 / 0\" → null)", () => {
    const result = parseAmount("10 / 0");
    expect(result.amount).toBeNull();
  });

  it('returns null amount for empty string ("" → null)', () => {
    const result = parseAmount("");
    expect(result.amount).toBeNull();
  });

  // --- Negative result ---
  it('returns negative amount ("5 - 10" → -5)', () => {
    const result = parseAmount("5 - 10");
    expect(result.amount).toBe(-5);
  });

  // --- Floating point ---
  it('handles floating point ("3.33 * 3" → 9.99)', () => {
    const result = parseAmount("3.33 * 3");
    expect(result.amount).toBe(9.99);
  });

  // --- Additional spec examples ---
  it('returns amount for "33 EUR" (33, EUR)', () => {
    const result = parseAmount("33 EUR");
    expect(result.amount).toBe(33);
    expect(result.currency).toBe("EUR");
  });

  it('returns amount for "USD 22" (22, USD)', () => {
    const result = parseAmount("USD 22");
    expect(result.amount).toBe(22);
    expect(result.currency).toBe("USD");
  });

  // --- Edge: multiple spaces ---
  it('handles multiple spaces ("  42.50  ")', () => {
    const result = parseAmount("  42.50  ");
    expect(result.amount).toBe(42.5);
  });

  it('handles multiple spaces before currency ("42.50   USD")', () => {
    const result = parseAmount("42.50   USD");
    expect(result.amount).toBe(42.5);
    expect(result.currency).toBe("USD");
  });

  // --- Case insensitivity ---
  it('handles lowercase currency ("22 usd")', () => {
    const result = parseAmount("22 usd");
    expect(result.amount).toBe(22);
    expect(result.currency).toBe("USD");
  });

  it('handles mixed case currency ("22 UsD")', () => {
    const result = parseAmount("22 UsD");
    expect(result.amount).toBe(22);
    expect(result.currency).toBe("USD");
  });

  // --- Complex expression with currency ---
  it('handles complex expression with currency ("(10 + 5) * 2 EUR")', () => {
    const result = parseAmount("(10 + 5) * 2 EUR");
    expect(result.amount).toBe(30);
    expect(result.currency).toBe("EUR");
  });

  // --- Negative number ---
  it('handles negative number with prefix currency ("USD -10")', () => {
    const result = parseAmount("USD -10");
    expect(result.amount).toBe(-10);
    expect(result.currency).toBe("USD");
  });
});
