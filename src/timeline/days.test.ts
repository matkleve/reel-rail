import { describe, expect, it } from "vitest";

import { dayDate, dayKey } from "./days";

describe("days", () => {
  it("keys a shot by its local calendar day", () => {
    expect(dayKey(new Date(2026, 9, 14, 23, 30).toISOString())).toBe("2026-10-14");
    expect(dayDate("2026-10-14").getDate()).toBe(14);
  });
});
