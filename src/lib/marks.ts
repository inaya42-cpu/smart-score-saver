export const SUBJECTS = [
  { key: "math", name: "Mathematics" },
  { key: "eng", name: "English" },
  { key: "urdu", name: "Urdu" },
  { key: "isl", name: "Islamiat" },
  { key: "comp", name: "Computer" },
  { key: "phy", name: "Physics" },
  { key: "tq", name: "Tarjuma-tul-Quran" },
] as const;
export type SubjectKey = (typeof SUBJECTS)[number]["key"];
export type ExamType = "Class Test" | "Send-up" | "Pre-board";
export const EXAM_ORDER: Record<ExamType, number> = { "Class Test": 0, "Send-up": 1, "Pre-board": 2 };

export interface Exam {
  id: string;
  name: string;
  type: ExamType;
  marks: Partial<Record<SubjectKey, { o: number; t: number }>>;
}

export const pct = (o: number, t: number) => (t > 0 ? Math.round((o / t) * 1000) / 10 : 0);

export function sortExams(exams: Exam[]) {
  return exams
    .map((e, i) => ({ e, i }))
    .sort((a, b) => EXAM_ORDER[a.e.type] - EXAM_ORDER[b.e.type] || a.i - b.i)
    .map((x) => x.e);
}

export interface SubjectStat {
  key: SubjectKey;
  name: string;
  series: number[];
  avg: number;
  latest: number;
  trend: number;
  target: number;
  gap: number;
  predicted: number;
  status: "On track" | "Close" | "Weak" | "No data";
}

export function analyse(exams: Exam[], targets: Record<SubjectKey, number>): SubjectStat[] {
  const sorted = sortExams(exams);
  return SUBJECTS.map(({ key, name }) => {
    const series = sorted.flatMap((e) => {
      const m = e.marks[key];
      return m && m.t > 0 ? [pct(m.o, m.t)] : [];
    });
    const target = targets[key] ?? 80;
    if (!series.length)
      return { key, name, series, avg: 0, latest: 0, trend: 0, target, gap: target, predicted: 0, status: "No data" as const };
    const avg = Math.round((series.reduce((a, b) => a + b, 0) / series.length) * 10) / 10;
    const latest = series[series.length - 1];
    const trend = Math.round((latest - series[0]) * 10) / 10;
    const gap = Math.round((target - latest) * 10) / 10;
    const predicted = Math.max(0, Math.min(100, Math.round((latest * 0.7 + avg * 0.3 + Math.max(-5, Math.min(5, trend / 2))) * 10) / 10));
    const status = gap <= 0 ? "On track" : gap <= 7 ? "Close" : "Weak";
    return { key, name, series, avg, latest, trend, target, gap, predicted, status };
  });
}
