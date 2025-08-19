import React, { useEffect, useMemo, useRef, useState } from "react";
import "./style.css";

/** ---------------------------
 * Local storage keys & helpers
 * -------------------------- */
const LS = {
  SETTINGS: "fitnessapp.settings",
  ACTIVE: "fitnessapp.active",
  LOGS: "fitnessapp.logs",
  BODY: "fitnessapp.body",
};
const loadLS = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/** ---------------------------
 * Unit helpers
 * -------------------------- */
const round2 = (n) => Math.round(n * 100) / 100;

function parseSetsFromReps(reps) {
  if (!reps) return null;
  const s = String(reps);
  const m = s.match(/(\d+)\s*[xX]/);
  return m ? Number(m[1]) : null;
}

function dayKey(day) {
  return (day?.day || "").replace(/\s+/g, "_").toLowerCase();
}

/** ---------------------------
 * Main App
 * -------------------------- */
export default function App() {
  const [tab, setTab] = useState("workouts"); // workouts | today | explore | log | stats | settings
  const [programsData, setProgramsData] = useState(null);
  const [err, setErr] = useState("");

  const [settings, setSettings] = useState(
    loadLS(LS.SETTINGS, {
      units: "lb",
      accent: "#007aff",
      theme: "system", // system | light | dark
      rest: 90, // default rest seconds
    })
  );
  useEffect(() => saveLS(LS.SETTINGS, settings), [settings]);

  const [active, setActive] = useState(
    loadLS(LS.ACTIVE, { programId: null, dayKey: null })
  );
  useEffect(() => saveLS(LS.ACTIVE, active), [active]);

  const [logs, setLogs] = useState(loadLS(LS.LOGS, []));
  useEffect(() => saveLS(LS.LOGS, logs), [logs]);

  const [body, setBody] = useState(loadLS(LS.BODY, []));
  useEffect(() => saveLS(LS.BODY, body), [body]);

  // theme management
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme =
      settings.theme === "system" ? (prefersDark ? "dark" : "light") : settings.theme;
    document.documentElement.dataset.theme = theme;
  }, [settings.theme]);

  // load programs
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/programs.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProgramsData(data);
      } catch (e) {
        setErr(
          "Couldn't load programs.json. Ensure it’s in your /public folder. (If your file is named programs_full.json, either rename it to programs.json or change the fetch path in App.js.)"
        );
      }
    })();
  }, []);

  const programs = programsData?.programs || [];
  const activeProgram = useMemo(
    () => programs.find((p) => p.id === active.programId) || null,
    [programs, active.programId]
  );
  const activeDay = useMemo(() => {
    if (!activeProgram) return null;
    return activeProgram.days.find((d) => dayKey(d) === active.dayKey) || null;
  }, [activeProgram, active.dayKey]);

  return (
    <div className="app">
      <div className="content">
        {err && <div className="error">{err}</div>}

        {tab === "workouts" && (
          <Workouts
            programs={programs}
            active={active}
            setActive={setActive}
            settings={settings}
          />
        )}

        {tab === "today" && (
          <Today
            activeProgram={activeProgram}
            activeDay={activeDay}
            settings={settings}
            onSaveLog={(entry) => setLogs((prev) => [entry, ...prev])}
            onPickProgram={() => setTab("workouts")}
          />
        )}

        {tab === "explore" && (
          <Explore programs={programs} units={settings.units} />
        )}

        {tab === "log" && <Log logs={logs} />}

        {tab === "stats" && (
          <Stats logs={logs} body={body} units={settings.units} />
        )}

        {tab === "settings" && (
          <Settings
            settings={settings}
            setSettings={setSettings}
            body={body}
            setBody={setBody}
            logs={logs}
          />
        )}
      </div>

      <TabBar tab={tab} setTab={setTab} accent={settings.accent} />
    </div>
  );
}

/** ---------------------------
 * Tab bar
 * -------------------------- */
function TabBar({ tab, setTab, accent }) {
  return (
    <div className="tab-bar" style={{ ["--accent"]: accent }}>
      {["workouts", "today", "explore", "log", "stats", "settings"].map((t) => (
        <button
          key={t}
          className={tab === t ? "active" : ""}
          onClick={() => setTab(t)}
        >
          {t[0].toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}

/** ---------------------------
 * Workouts (Program & Day picker)
 * -------------------------- */
function Workouts({ programs, active, setActive, settings }) {
  const [open, setOpen] = useState({});

  if (!programs.length) return <p>Loading programs…</p>;

  return (
    <div>
      <h1>Programs</h1>
      {programs.map((p) => (
        <div className="card" key={p.id}>
          <div className="card-head">
            <h2>{p.name}</h2>
            <button
              className={active.programId === p.id ? "chip chip-active" : "chip"}
              onClick={() =>
                setActive((prev) => ({
                  programId: p.id,
                  dayKey:
                    p.days && p.days.length ? dayKey(p.days[0]) : prev.dayKey,
                }))
              }
            >
              {active.programId === p.id ? "Selected" : "Select"}
            </button>
          </div>

          {p.program_notes?.length ? (
            <details className="notes-block">
              <summary>Program Notes</summary>
              <ul className="bulleted">
                {p.program_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {p.warmups?.general?.length ? (
            <details className="notes-block">
              <summary>General Warm-Up</summary>
              <ul className="bulleted">
                {p.warmups.general.map((g, i) => (
                  <li key={i}>
                    {g.instruction}
                    {g.reps ? ` — ${g.reps}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="day-list">
            {p.days.map((d, i) => {
              const k = dayKey(d) || `day_${i}`;
              const expanded = !!open[k];
              return (
                <div className="sub-card" key={k}>
                  <div className="row-between">
                    <h3>{d.day || `Day ${i + 1}`}</h3>
                    <div className="row-gap">
                      <button
                        className="ghost"
                        onClick={() => setActive({ programId: p.id, dayKey: k })}
                      >
                        Set as Today
                      </button>
                      <button
                        className="ghost"
                        onClick={() =>
                          setOpen((o) => ({ ...o, [k]: !expanded }))
                        }
                      >
                        {expanded ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <ul className="exercise-list">
                      {d.exercises.map((ex, idx) => (
                        <ExerciseRow key={idx} ex={ex} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExerciseRow({ ex }) {
  return (
    <li className="exercise-row">
      <div className="ex-head">
        <div className="ex-title">
          <div
            className={`muscle-dot m-${(ex.muscle || "Other")
              .split(" ")[0]
              .replace(/[^a-z]/gi, "")}`}
          ></div>
          <strong>{ex.name}</strong>
        </div>
        <div className="ex-meta">
          {ex.sets ? `${ex.sets} sets` : ""} {ex.reps ? `× ${ex.reps}` : ""}
        </div>
      </div>
      {ex.notes && <div className="ex-notes">{ex.notes}</div>}
      {(ex.warmup_sets || ex.early_set_RPE || ex.last_set_RPE) && (
        <div className="ex-warmups">
          {ex.warmup_sets && <span>Warm-up: {ex.warmup_sets} sets</span>}
          {ex.early_set_RPE && <span>Early RPE: {ex.early_set_RPE}</span>}
          {ex.last_set_RPE && <span>Last RPE: {ex.last_set_RPE}</span>}
        </div>
      )}
    </li>
  );
}

/** ---------------------------
 * Today (guided workout flow + rest timer)
 * -------------------------- */
function Today({ activeProgram, activeDay, settings, onSaveLog, onPickProgram }) {
  const [idx, setIdx] = useState(0);
  const [workingSets, setWorkingSets] = useState({});
  const [saved, setSaved] = useState(false);

  // rest timer
  const [rest, setRest] = useState(settings.rest || 90);
  const [left, setLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setIdx(0);
    setWorkingSets({});
    setSaved(false);
    stopTimer();
    setLeft(0);
  }, [activeDay?.day]);

  function startTimer(sec) {
    const seconds = sec || rest;
    clearInterval(timerRef.current);
    setLeft(seconds);
    timerRef.current = setInterval(() => {
      setLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // light haptic if supported
          if (navigator.vibrate) navigator.vibrate([80, 80, 80]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerRef.current);
    setLeft(0);
  }

  if (!activeProgram || !activeDay) {
    return (
      <div className="empty">
        <p>No day selected.</p>
        <button onClick={onPickProgram}>Choose a Program & Day</button>
      </div>
    );
  }

  const ex = activeDay.exercises[idx];
  const total = activeDay.exercises.length;
  const setsTarget =
    (ex?.sets && Number(ex.sets)) || parseSetsFromReps(ex?.reps) || 3;
  const currentSets =
    workingSets[idx] || Array.from({ length: setsTarget }, () => ({ weight: "", reps: "" }));

  function updateSet(si, field, val) {
    const updated = [...currentSets];
    updated[si] = { ...updated[si], [field]: val };
    setWorkingSets((m) => ({ ...m, [idx]: updated }));
  }

  function nextExercise() {
    if (idx < total - 1) setIdx(idx + 1);
  }
  function prevExercise() {
    if (idx > 0) setIdx(idx - 1);
  }

  function saveWorkout() {
    const date = new Date().toISOString().slice(0, 10);
    const entry = {
      date,
      programId: activeProgram.id,
      dayKey: dayKey(activeDay),
      dayName: activeDay.day,
      units: settings.units,
      entries: Object.keys(workingSets).map((k) => {
        const i = Number(k);
        const e = activeDay.exercises[i];
        return {
          exercise: e.name,
          muscle: e.muscle || "Other",
          sets: (workingSets[i] || []).map((s) => ({
            weight: s.weight,
            reps: s.reps,
          })),
        };
      }),
    };
    onSaveLog(entry);
    setSaved(true);
  }

  return (
    <div>
      <h1>Today</h1>
      <div className="card">
        <div className="row-between">
          <div>
            <div className="muted">{activeProgram.name}</div>
            <h2>{activeDay.day}</h2>
          </div>
          <div className="muted">
            {idx + 1} / {total}
          </div>
        </div>

        <div className="flow-exercise">
          <div className="ex-title big">
            <div
              className={`muscle-dot m-${(ex?.muscle || "Other")
                .split(" ")[0]
                .replace(/[^a-z]/gi, "")}`}
            ></div>
            <strong>{ex?.name}</strong>
          </div>
          <div className="ex-meta big">
            {ex?.sets ? `${ex.sets} sets` : ""} {ex?.reps ? `× ${ex.reps}` : ""}
          </div>

          {ex?.notes && <div className="ex-notes">{ex.notes}</div>}
          {(ex?.warmup_sets || ex?.early_set_RPE || ex?.last_set_RPE) && (
            <div className="ex-warmups">
              {ex?.warmup_sets && <span>Warm-up: {ex.warmup_sets} sets</span>}
              {ex?.early_set_RPE && <span>Early RPE: {ex.early_set_RPE}</span>}
              {ex?.last_set_RPE && <span>Last RPE: {ex.last_set_RPE}</span>}
            </div>
          )}

          <div className="sets-grid">
            {currentSets.map((s, si) => (
              <div className="set-row" key={si}>
                <div className="set-num">Set {si + 1}</div>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder={`Weight (${settings.units})`}
                  value={s.weight}
                  onChange={(e) => updateSet(si, "weight", e.target.value)}
                />
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Reps"
                  value={s.reps}
                  onChange={(e) => updateSet(si, "reps", e.target.value)}
                />
                <button
                  className="ghost"
                  onClick={() => startTimer()}
                  title="Start rest timer"
                >
                  Rest
                </button>
              </div>
            ))}
          </div>

          <div className="row-between">
            <button className="ghost" onClick={prevExercise} disabled={idx === 0}>
              Back
            </button>
            <div className="row-gap">
              <button className="ghost" onClick={() => startTimer(60)}>60s</button>
              <button className="ghost" onClick={() => startTimer(90)}>90s</button>
              <button className="ghost" onClick={() => startTimer(120)}>120s</button>
              {left > 0 ? (
                <span className="timer">{formatTime(left)}</span>
              ) : (
                <span className="timer muted">Ready</span>
              )}
              <button className="ghost" onClick={stopTimer}>Stop</button>
            </div>
            <button
              className="ghost"
              onClick={nextExercise}
              disabled={idx === total - 1}
            >
              Next
            </button>
          </div>

          <div className="divider" />
          <button className="primary" onClick={saveWorkout} disabled={saved}>
            {saved ? "Saved" : "Save Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** ---------------------------
 * Explore (search + filter)
 * -------------------------- */
function Explore({ programs, units }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("All");

  const allExercises = useMemo(() => {
    const list = [];
    programs.forEach((p) =>
      p.days?.forEach((d) =>
        d.exercises?.forEach((ex) =>
          list.push({
            programId: p.id,
            dayName: d.day,
            ...ex,
          })
        )
      )
    );
    return list;
  }, [programs]);

  const muscles = useMemo(() => {
    const mset = new Set(["All"]);
    allExercises.forEach((e) => mset.add(e.muscle || "Other"));
    return Array.from(mset);
  }, [allExercises]);

  const results = allExercises.filter((e) => {
    const okMuscle = muscle === "All" || (e.muscle || "Other") === muscle;
    const okQ =
      !q ||
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      (e.notes || "").toLowerCase().includes(q.toLowerCase());
    return okMuscle && okQ;
  });

  return (
    <div>
      <h1>Explore</h1>
      <div className="card">
        <div className="row-gap">
          <input
            className="input"
            placeholder="Search exercises…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="input"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
          >
            {muscles.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sub-card">
        <ul className="exercise-list">
          {results.map((ex, i) => (
            <li className="exercise-row" key={i}>
              <div className="ex-head">
                <div className="ex-title">
                  <div
                    className={`muscle-dot m-${(ex.muscle || "Other")
                      .split(" ")[0]
                      .replace(/[^a-z]/gi, "")}`}
                  ></div>
                  <strong>{ex.name}</strong>
                </div>
                <div className="ex-meta">
                  {ex.sets ? `${ex.sets} sets` : ""} {ex.reps ? `× ${ex.reps}` : ""}
                </div>
              </div>
              <div className="muted">
                {ex.dayName} • {ex.programId}
              </div>
              {ex.notes && <div className="ex-notes">{ex.notes}</div>}
            </li>
          ))}
          {!results.length && <p className="muted">No results.</p>}
        </ul>
      </div>
    </div>
  );
}

/** ---------------------------
 * Log
 * -------------------------- */
function Log({ logs }) {
  if (!logs.length) return <p>No workouts logged yet.</p>;
  return (
    <div>
      <h1>Workout Log</h1>
      {logs.map((w, i) => (
        <div className="card" key={i}>
          <div className="row-between">
            <h2>
              {w.date} — {w.dayName || w.dayKey}
            </h2>
            <span className="muted">{w.programId}</span>
          </div>
          {w.entries.map((e, j) => (
            <div className="log-ex" key={j}>
              <div className="ex-title">
                <div
                  className={`muscle-dot m-${(e.muscle || "Other")
                    .split(" ")[0]
                    .replace(/[^a-z]/gi, "")}`}
                ></div>
                <strong>{e.exercise}</strong>
              </div>
              <div className="set-list">
                {e.sets.map((s, k) => (
                  <div className="pill" key={k}>
                    {(s.weight || "-") + " " + (w.units || "lb")} × {s.reps || "-"}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** ---------------------------
 * Stats (canvas charts)
 * -------------------------- */
function Stats({ logs, body, units }) {
  return (
    <div>
      <h1>Stats</h1>
      <div className="stats-grid">
        <StatCard label="Total Workouts" value={logs.length} />
        <StatCard label="Last Workout" value={logs[0]?.date || "—"} />
      </div>

      <ChartCard
        title={`Body Weight (${units.toUpperCase()})`}
        data={body
          .filter((b) => b.bodyWeight)
          .map((b) => ({ x: b.date, y: Number(b.bodyWeight) }))}
      />
      <ChartCard
        title="Body Fat %"
        data={body
          .filter((b) => b.bodyFat)
          .map((b) => ({ x: b.date, y: Number(b.bodyFat) }))}
      />
      <p className="muted">(Charts are local; no external libraries.)</p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function ChartCard({ title, data }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = (c.width = c.offsetWidth * 2);
    const H = (c.height = 160 * 2);
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, W, H);

    // frame
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(
      "--border"
    );
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W / 2 - 1, H / 2 - 1);

    if (!data || data.length < 2) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
        "--muted"
      );
      ctx.font = "12px -apple-system, system-ui, sans-serif";
      ctx.fillText("Not enough data", 10, 20);
      return;
    }

    // sort by date
    const points = [...data].sort((a, b) => (a.x > b.x ? 1 : -1));
    const xs = points.map((p) => new Date(p.x).getTime());
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const pad = 12;

    const X = (t) =>
      pad + ((t - minX) / Math.max(1, maxX - minX)) * (W / 2 - pad * 2);
    const Y = (v) =>
      pad + (1 - (v - minY) / Math.max(1, maxY - minY)) * (H / 2 - pad * 2);

    // line
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = X(new Date(p.x).getTime());
      const y = Y(p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(
      "--accent"
    );
    ctx.lineWidth = 2;
    ctx.stroke();

    // dots
    ctx.fillStyle = ctx.strokeStyle;
    points.forEach((p) => {
      const x = X(new Date(p.x).getTime());
      const y = Y(p.y);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [data]);

  return (
    <div className="card">
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      <canvas ref={ref} style={{ width: "100%", height: 160 }} />
    </div>
  );
}

/** ---------------------------
 * Settings (units, theme, body, export)
 * -------------------------- */
function Settings({ settings, setSettings, body, setBody, logs }) {
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");

  function addBody() {
    if (!weight && !fat) return;
    const date = new Date().toISOString().slice(0, 10);
    setBody((prev) => [{ date, bodyWeight: weight || "", bodyFat: fat || "" }, ...prev]);
    setWeight("");
    setFat("");
  }

  function exportCSV() {
    const rows = [];
    rows.push(["TYPE", "DATE", "PROGRAM_ID", "DAY", "EXERCISE", "SET#", "WEIGHT", "REPS", "UNITS"]);
    logs.forEach((w) => {
      w.entries.forEach((e) => {
        e.sets.forEach((s, idx) => {
          rows.push([
            "WORKOUT",
            w.date,
            w.programId,
            w.dayName || w.dayKey,
            e.exercise,
            idx + 1,
            s.weight || "",
            s.reps || "",
            w.units || "",
          ]);
        });
      });
    });
    body.forEach((b) => {
      rows.push(["BODY", b.date, "", "", "Body", "", b.bodyWeight || "", b.bodyFat || "", ""]);
    });

    const csv = rows.map((r) => r.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitnessapp_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Settings</h1>

      <div className="card">
        <h2>Appearance</h2>
        <div className="row-gap">
          {["system", "light", "dark"].map((t) => (
            <button
              key={t}
              className={settings.theme === t ? "chip chip-active" : "chip"}
              onClick={() => setSettings((s) => ({ ...s, theme: t }))}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <h2 style={{ marginTop: 12 }}>Accent Color</h2>
        <div className="row-gap">
          {["#007aff", "#34c759", "#ff3b30", "#5856d6", "#ff9500"].map((c) => (
            <button
              key={c}
              className="swatch"
              onClick={() => setSettings((s) => ({ ...s, accent: c }))}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Units</h2>
        <div className="row-gap">
          {["lb", "kg"].map((u) => (
            <button
              key={u}
              className={settings.units === u ? "chip chip-active" : "chip"}
              onClick={() => setSettings((s) => ({ ...s, units: u }))}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>

        <h2 style={{ marginTop: 12 }}>Default Rest Timer</h2>
        <div className="row-gap">
          {[60, 90, 120, 180].map((sec) => (
            <button
              key={sec}
              className={settings.rest === sec ? "chip chip-active" : "chip"}
              onClick={() => setSettings((s) => ({ ...s, rest: sec }))}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Body Tracking</h2>
        <div className="set-row">
          <input
            className="input"
            inputMode="decimal"
            placeholder={`Body Weight (${settings.units})`}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <input
            className="input"
            inputMode="decimal"
            placeholder="Body Fat %"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
          <button className="primary" onClick={addBody}>
            Add
          </button>
        </div>

        {body.length ? (
          <div className="table">
            <div className="table-head">
              <div>Date</div>
              <div>Body Weight ({settings.units})</div>
              <div>Body Fat %</div>
            </div>
            {body.map((b, i) => (
              <div className="table-row" key={i}>
                <div>{b.date}</div>
                <div>{b.bodyWeight || "—"}</div>
                <div>{b.bodyFat || "—"}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No body entries yet.</p>
        )}
      </div>

      <div className="card">
        <h2>Data</h2>
        <button className="primary" onClick={exportCSV}>
          Export Logs & Body to CSV
        </button>
      </div>
    </div>
  );
}

function escapeCSV(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
