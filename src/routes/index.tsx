import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SUBJECTS, analyse, sortExams, type Exam, type ExamType, type SubjectKey } from "@/lib/marks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Board Ready — Marks Analyser" },
      { name: "description", content: "Enter class test, send-up and pre-board marks to find your weak subjects and gap to your board target." },
      { property: "og:title", content: "Board Ready — Marks Analyser" },
      { property: "og:description", content: "Find your weak subjects before the board exams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const KEY = "board-ready-v1";
const defaultTargets = Object.fromEntries(SUBJECTS.map((s) => [s.key, 85])) as Record<SubjectKey, number>;
const statusCls = { "On track": "bg-success text-primary-foreground", Close: "bg-warning text-accent-foreground", Weak: "bg-destructive text-destructive-foreground", "No data": "bg-muted text-muted-foreground" };

function advice(s: ReturnType<typeof analyse>[number]) {
  if (s.status === "No data") return "Add marks to analyse this subject.";
  const parts: string[] = [];
  if (s.status === "On track") parts.push(`Already at target. Keep revising past papers to hold ${s.latest}%.`);
  else parts.push(`Need +${s.gap}% to reach your ${s.target}% board target.`);
  if (s.trend < -3) parts.push(`Dropping (${s.trend}% since first test) — revisit recent chapters.`);
  else if (s.trend > 3) parts.push(`Improving (+${s.trend}%) — keep this pace.`);
  if (s.series.length > 1 && Math.max(...s.series) - Math.min(...s.series) > 15) parts.push("Scores are inconsistent — practise timed full papers.");
  return parts.join(" ");
}

function Index() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [targets, setTargets] = useState(defaultTargets);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Class Test" as ExamType, marks: {} as Record<string, { o: string; t: string }> });

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (d.exams) setExams(d.exams);
      if (d.targets) setTargets({ ...defaultTargets, ...d.targets });
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify({ exams, targets })); }, [exams, targets, loaded]);

  const stats = useMemo(() => analyse(exams, targets), [exams, targets]);
  const withData = stats.filter((s) => s.status !== "No data");
  const weakest = [...withData].sort((a, b) => b.gap - a.gap);
  const overallPred = withData.length ? Math.round(withData.reduce((a, s) => a + s.predicted, 0) / withData.length) : 0;
  const overallTarget = Math.round(SUBJECTS.reduce((a, s) => a + targets[s.key], 0) / SUBJECTS.length);

  const addExam = () => {
    const marks: Exam["marks"] = {};
    for (const s of SUBJECTS) {
      const m = form.marks[s.key];
      if (m && m.o !== "" && Number(m.t) > 0) marks[s.key] = { o: Math.min(Number(m.o), Number(m.t)), t: Number(m.t) };
    }
    if (!Object.keys(marks).length) return alert("Enter marks for at least one subject.");
    setExams([...exams, { id: crypto.randomUUID(), name: form.name || `${form.type} ${exams.filter((e) => e.type === form.type).length + 1}`, type: form.type, marks }]);
    setForm({ ...form, name: "", marks: {} });
  };
  const setM = (k: string, f: "o" | "t", v: string) => setForm({ ...form, marks: { ...form.marks, [k]: { o: "", t: "", ...form.marks[k], [f]: v } } });
  const input = "w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Matric / Inter prep</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Board Ready</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Add your class tests, send-up and pre-board marks. See where you're weak and how far you are from your board target.</p>
      </header>

      <section className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">Add exam marks</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ExamType })}>
            <option>Class Test</option><option>Send-up</option><option>Pre-board</option>
          </select>
          <input className={input} placeholder="Name (optional, e.g. CT 2)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SUBJECTS.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-sm font-medium">{s.name}</span>
              <input className={input} type="number" min={0} placeholder="Got" value={form.marks[s.key]?.o ?? ""} onChange={(e) => setM(s.key, "o", e.target.value)} />
              <span className="text-muted-foreground">/</span>
              <input className={input} type="number" min={1} placeholder="Total" value={form.marks[s.key]?.t ?? ""} onChange={(e) => setM(s.key, "t", e.target.value)} />
            </div>
          ))}
        </div>
        <button onClick={addExam} className="mt-5 rounded-md bg-primary px-5 py-2 font-semibold text-primary-foreground hover:opacity-90">Save exam</button>
      </section>

      <section className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">Board targets (%)</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUBJECTS.map((s) => (
            <label key={s.key} className="text-sm">
              <span className="mb-1 block text-muted-foreground">{s.name}</span>
              <input className={input} type="number" min={0} max={100} value={targets[s.key]} onChange={(e) => setTargets({ ...targets, [s.key]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
      </section>

      {exams.length > 0 && (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-primary p-5 text-primary-foreground">
              <p className="text-sm opacity-80">Predicted board %</p>
              <p className="font-display text-4xl font-bold">{overallPred}%</p>
              <p className="text-sm opacity-80">Target {overallTarget}%</p>
            </div>
            <div className="rounded-xl border bg-card p-5 sm:col-span-2">
              <p className="text-sm text-muted-foreground">Focus first on</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {weakest.filter((s) => s.gap > 0).slice(0, 3).map((s) => (
                  <span key={s.key} className="rounded-full bg-destructive px-3 py-1 text-sm font-semibold text-destructive-foreground">{s.name} (−{s.gap}%)</span>
                ))}
                {weakest.every((s) => s.gap <= 0) && <span className="font-semibold text-success">All subjects on target!</span>}
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">Subject analysis</h2>
            <div className="mt-4 space-y-4">
              {(weakest.concat(stats.filter((s) => s.status === "No data"))).map((s) => (
                <div key={s.key} className="border-b pb-4 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{s.name}</h3>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${statusCls[s.status]}`}>{s.status}</span>
                  </div>
                  {s.status !== "No data" && (
                    <>
                      <div className="relative mt-2 h-3 rounded-full bg-muted">
                        <div className="h-3 rounded-full bg-primary" style={{ width: `${s.latest}%` }} />
                        <div className="absolute -top-1 h-5 w-0.5 bg-accent" style={{ left: `${s.target}%` }} title="Target" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Latest {s.latest}% · Avg {s.avg}% · Predicted {s.predicted}% · Journey: {s.series.join("% → ")}%</p>
                    </>
                  )}
                  <p className="mt-1 text-sm">{advice(s)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">Your exams</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3">Exam</th>{SUBJECTS.map((s) => <th key={s.key} className="pr-3">{s.name.split("-")[0].slice(0, 6)}</th>)}<th /></tr></thead>
                <tbody>
                  {sortExams(exams).map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="py-2 pr-3 font-medium">{e.name}<div className="text-xs text-muted-foreground">{e.type}</div></td>
                      {SUBJECTS.map((s) => <td key={s.key} className="pr-3">{e.marks[s.key] ? `${e.marks[s.key]!.o}/${e.marks[s.key]!.t}` : "—"}</td>)}
                      <td><button className="text-destructive hover:underline" onClick={() => setExams(exams.filter((x) => x.id !== e.id))}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
