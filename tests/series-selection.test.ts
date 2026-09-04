import { describe, expect, it } from "vitest";
import { availableSeries, canSelectSeries, reconcileSeriesSelection } from "../src/seriesSelection";

describe("series selection", () => {
  it("shows selectors for every multi-series chart except bars", () => {
    const series = ["Biology", "Physics"];
    expect(canSelectSeries("line", series)).toBe(true);
    expect(canSelectSeries("scatter", series)).toBe(true);
    expect(canSelectSeries("bubble", series)).toBe(true);
    expect(canSelectSeries("graph", series)).toBe(true);
    expect(canSelectSeries("bar", series)).toBe(false);
  });

  it("reconciles stale selections when a variant changes", () => {
    expect(reconcileSeriesSelection(["Old"], ["Biology", "Physics"], ["Physics"])).toEqual(["Physics"]);
    expect(reconcileSeriesSelection(["Biology", "Old"], ["Biology", "Physics"], [])).toEqual(["Biology"]);
  });

  it("returns stable sorted series options", () => {
    expect(availableSeries({ Physics: [], Biology: [] })).toEqual(["Biology", "Physics"]);
  });
});
