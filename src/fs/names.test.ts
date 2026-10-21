import { freeName } from "./names";

describe("freeName", () => {
  const taken = (...names: string[]) => (n: string) => names.includes(n);

  it("keeps the name when it is free, else numbers it before the extension", () => {
    expect(freeName("a.jpg", taken())).toBe("a.jpg");
    expect(freeName("a.jpg", taken("a.jpg", "a (2).jpg"))).toBe("a (3).jpg");
  });

  it("numbers folders at the end, dots and all", () => {
    expect(freeName("Porto – Oct 26.5", taken("Porto – Oct 26.5"), true)).toBe("Porto – Oct 26.5 (2)");
  });
});
