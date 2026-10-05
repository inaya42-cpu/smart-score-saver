import { describe, it, expect } from "vitest";
import { analyse, type Exam } from "@/lib/marks";

const targets = { math: 90, eng: 80, urdu: 80, isl: 80, comp: 80, phy: 80, tq: 80 };

describe("analyse", () => {
  it("orders class test, send-up, pre-board and computes gap to target", () => {
    const exams: Exam[] = [
      { id: "b", name: "Pre", type: "Pre-board", marks: { math: { o: 70, t: 100 } } },
      { id: "a", name: "CT1", type: "Class Test", marks: { math: { o: 10, t: 20 } } },
    ];
    const m = analyse(exams, targets).find((s) => s.key === "math")!;
    expect(m.series).toEqual([50, 70]);
    expect(m.gap).toBe(20);
    expect(m.status).toBe("Weak");
  });
});
