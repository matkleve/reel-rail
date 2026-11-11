import { useReel } from "@/store/useReel";
import { media } from "@/test-utils";
import { emptyReel } from "@/types";

import { decide, deckOrder, restartDeck, topOf, undoDecision } from "./deck";

function seed() {
  const list = ["a", "b", "c"].map((id, i) =>
    media(id, { takenAt: new Date(Date.UTC(2026, 9, 14, 10, i)).toISOString() }),
  );
  useReel.getState().load({ ...emptyReel(), media: Object.fromEntries(list.map((m) => [m.id, m])) });
  useReel.getState().setFilters({ rating: "all", hideDiscards: false, neverExported: false, tags: [] });
  while (undoDecision());
}

const s = () => useReel.getState();
const rating = (id: string) => s().reel.media[id]!.rating;

beforeEach(seed);

describe("the deck", () => {
  it("rates the top card and deals the next", () => {
    expect(decide("good")).toBe(true);
    expect(rating("a")).toBe(1);
    expect(s().currentId).toBe("b");
    decide("delete");
    expect(rating("b")).toBe(-2);
    decide("top");
    expect(rating("c")).toBe(2);
  });

  it("says when the last card is gone", () => {
    decide("good");
    decide("good");
    expect(decide("bad")).toBe(false);
    expect(rating("c")).toBe(-1);
  });

  it("undo brings the card back with its old rating — even when the swipe changed nothing", () => {
    s().setRatings([{ id: "a", rating: 1 }]);
    decide("delete"); // a: 1 → −2
    decide("good"); // b: 0 → 1
    expect(undoDecision()).toBe(true);
    expect(s().currentId).toBe("b");
    expect(rating("b")).toBe(0);
    expect(undoDecision()).toBe(true);
    expect(s().currentId).toBe("a");
    expect(rating("a")).toBe(1);
    expect(undoDecision()).toBe(false);
  });

  it("a repeated good is undone without touching an older decision", () => {
    decide("top"); // a: 0 → 2
    s().setRatings([{ id: "b", rating: 1 }]);
    decide("good"); // b stays 1: no store undo step
    undoDecision();
    expect(rating("a")).toBe(2);
    expect(s().currentId).toBe("b");
  });

  it("deals only what passes the filters", () => {
    s().setRatings([{ id: "b", rating: 2 }]);
    s().setFilters({ rating: "favorite" });
    expect(deckOrder(s())).toEqual(["b"]);
  });

  it("shows a burst by its cover and starts over from the first card", () => {
    const close = ["x", "y"].map((id, i) => media(id, { takenAt: new Date(Date.UTC(2026, 9, 15, 9, 0, i)).toISOString() }));
    close[1]!.rating = 2;
    s().load({ ...emptyReel(), media: Object.fromEntries(close.map((m) => [m.id, m])) });
    s().setCurrent("x");
    expect(topOf(s())).toBe("y");
    restartDeck();
    expect(s().currentId).toBe("y");
  });
});
