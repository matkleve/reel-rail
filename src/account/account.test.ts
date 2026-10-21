import { planOf } from "./account";

const NOW = new Date("2026-10-21T12:00:00Z").getTime();
const row = (status: string, end: string | null) => ({ status, plan: "pro", current_period_end: end });

describe("planOf", () => {
  it("is active while an active or trialing period runs", () => {
    expect(planOf(row("active", "2026-11-21T00:00:00Z"), NOW).active).toBe(true);
    expect(planOf(row("trialing", null), NOW).active).toBe(true);
  });

  it("is not active without a row, after the period, or when cancelled / unpaid", () => {
    expect(planOf(null, NOW).active).toBe(false);
    expect(planOf(row("active", "2026-10-01T00:00:00Z"), NOW).active).toBe(false);
    expect(planOf(row("canceled", "2026-11-21T00:00:00Z"), NOW).active).toBe(false);
    expect(planOf(row("past_due", "2026-11-21T00:00:00Z"), NOW).active).toBe(false);
  });
});
