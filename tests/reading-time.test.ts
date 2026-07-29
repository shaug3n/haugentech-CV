import { describe, it, expect } from "vitest";
import { readingTimeMinutes } from "@/lib/reading-time";

describe("readingTimeMinutes", () => {
  it("minimum 1 minute", () => {
    expect(readingTimeMinutes("short text")).toBe(1);
  });
  it("200 words = 1 minute, 201 rounds up", () => {
    expect(readingTimeMinutes(Array(200).fill("word").join(" "))).toBe(1);
    expect(readingTimeMinutes(Array(201).fill("word").join(" "))).toBe(2);
  });
  it("empty string is 1", () => {
    expect(readingTimeMinutes("")).toBe(1);
  });
});
