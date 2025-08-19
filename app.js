import React, { useEffect, useMemo, useState } from "react";
import "./style.css";

/** ---------------------------
 * Local storage helpers
 * -------------------------- */
const LS_KEYS = {
  SETTINGS: "fitnessapp.settings",
  ACTIVE: "fitnessapp.active", // { programId, dayKey }
  WORKOUT_LOGS: "fitnessapp.logs", // [{date, programId, dayKey, entries:[{exercise, sets:[{weight, reps}]}]}]
  BODY: "fitnessapp.body", // [{date, bodyWeight, bodyFat}]
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
const toKg = (lb) => round2(lb * 0.45359237);
const toLb = (kg) => round2(kg / 0.45359237);

function convertWeight(value, fromUnit, toUnit) {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (fromUnit === toUnit) return num;
  return fromUnit === "lb" ? toKg(num) : toLb(num);
}

/** ---------------------------
 * App
 * -------------------------- */
export default function App() {
  const [tab, setTab] = useState("workouts"); // workouts | today | log | stats | settings
  const [programs, setPrograms] = useState(null);
  const [err, setErr] = useState("");

  // settings
  const [settings, setSettings] = useState(
    loadLS(LS_KEYS.SETTINGS, { units: "lb", accent: "#007aff" })
  );
  useEffect(() => saveLS(LS_KEYS.SETTINGS, settings), [settings]);

  // active selection (program/day)
  const [active, setActive] = useState(
    loadLS(LS_KEYS.ACTIVE, { programId: null, dayKey: null })
  );
  useEffect(() => saveLS(LS_KEYS.ACTIVE, active), [active]);

  // logs
  const [logs, setLogs] = useState(loadLS(LS_KEYS.WORKOUT_LOGS, []));
  useEffect(() => saveLS(LS_KEYS.WORKOUT_LOGS, logs), [logs]);

  // body data
  const [body, setBody] = useState(loadLS(LS_KEYS.BODY, []));
  useEffect(() => saveLS(LS_KEYS.BODY, body), [body]);

  // load programs.json from /public
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/programs.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPrograms(data);
      } catch (e) {
        setErr(
          "Couldn't load programs.json. Make sure the file is in your /public folder."
        );
      }
    })();
  }, []);

  const activeProgram = useMemo(() => {
    if (!programs || !programs.programs) return null;
    return programs.programs.find((p) => p.id === active.programId) || null;
  }, [programs, active.programId]);

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
            programs={programs?.programs || []}
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
            onStartBlank={() => setTab("workouts")}
            onSaveLog={(entry) => setLogs((prev) => [entry, ...prev])}
          />
        )}

        {tab === "log" && <Log logs={logs} settings={settings} />}

        {tab === "stats" && (
          <Stats logs={logs} body={body} units={settings.units} />
        )}

        {tab === "settings" && (
          <Settings
            settings={settings}
            setSettings={setSettings}
            body={body}
            setBody={setBody}
          />
        )}
      </div>

      <TabBar tab={tab} setTab={setTab} accent={settings.accent} />
    </div>
  );
}

/** ---------------------------
 * Utility: unique day key
 * -------------------------- */
function dayKey(day) {
  // Use day title; if absent, hash by index in UI layer
  return (day?.day || "").replace(/\s+/g, "_").toLowerCase();
}

/** ---------------------------
 * Tab Bar
 * -------------------------- */
function TabBar({ tab, setTab, accent }) {
  return (
    <div className="tab-bar" style={{ ["--accent"]: accent }}>
      <button
        className={tab === "workouts" ? "active" : ""}
        onClick={() => setTab("workouts")}
      >
        Workouts
      </button>
      <button
        className={tab === "today" ? "active" : ""}
        onClick={() => setTab("today")}
      >
        Today
      </button>
      <button
        className={tab === "log" ? "active" : ""}
        onClick={() => setTab("log")}
      >
        Log
      </button>
      <button
        className={tab === "stats" ? "active" : ""}
        onClick={() => setTab("stats")}
      >
        Stats
      </button>
      <button
        className={tab === "settings" ? "active" : ""}
        onClick={() => setTab("settings")}
      >
        Settings
      </button>
    </div>
  );
}

/** ---------------------------
 * Workouts tab
 * -------------------------- */
function Workouts({ programs, active, setActive, settings }) {
  const [open, setOpen] = useState({}); // expand/collapse per day

  if (!programs.length) {
    return <p>Loading programs…</p>;
  }

  return (
    <div>
      <h1>Programs</h1>

      {programs.map((p) => (
        <div className="card" key={p.id}>
          <div className="card-head">
            <h2>{p.name}</h2>
            <button
              className={
                active.programId === p.id ? "chip chip-active" : "chip"
              }
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
                        onClick={() =>
                          setActive({ programId: p.id, dayKey: k })
                        }
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
                        <ExerciseRow key={idx} ex={ex} units={settings.units} />
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

function ExerciseRow({ ex, units }) {
  return (
    <li className="exercise-row">
      <div className="ex-head">
        <div className="ex-title">
          <div className={`muscle-dot m-${(ex.muscle || "Other").split(" ")[0]}`}></div>
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
 * Today (Workout Flow)
 * -------------------------- */
function Today({ activeProgram, activeDay, settings, onStartBlank, onSaveLog }) {
  const [idx, setIdx] = useState(0);
  const [workingSets, setWorkingSets] = useState({}); // exerciseIndex -> [{weight, reps}]
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // reset when day changes
    setIdx(0);
    setWorkingSets({});
    setSaved(false);
  }, [activeDay?.day]);

  if (!activeProgram || !activeDay) {
    return (
      <div className="empty">
        <p>No day selected.</p>
        <button onClick={onStartBlank}>Choose a Program & Day</button>
      </div>
    );
  }

  const ex = activeDay.exercises[idx];
  const total = activeDay.exercises.length;

  const setsTarget =
    (ex?.sets && Number(ex.sets)) || parseSetsFromReps(ex?.reps) || 3;

  const currentSets = workingSets[idx] || Array.from({ length: setsTarget }, () => ({ weight: "", reps: "" }));

  function updateSet(si, field, val) {
    const updated = [...currentSets];
    updated[si] = {
      ...updated[si],
      [field]: val,
    };
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
    // convert all weights to current unit persisted
    const entry = {
      date,
      programId: activeProgram.id,
      dayKey: (activeDay.day || "").replace(/\s+/g, "_").toLowerCase(),
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
            <div className={`muscle-dot m-${(ex?.muscle || "Other").split(" ")[0]}`}></div>
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
              </div>
            ))}
          </div>

          <div className="row-between">
            <button className="ghost" onClick={prevExercise} disabled={idx === 0}>
              Back
            </button>
            <button className="ghost" onClick={nextExercise} disabled={idx === total - 1}>
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

function parseSetsFromReps(reps) {
  if (!reps) return null;
  // try patterns like "4x6-8"
  const s = String(reps);
  const m = s.match(/(\d+)\s*[xX]/);
  return m ? Number(m[1]) : null;
}

/** ---------------------------
 * Log tab
 * -------------------------- */
function Log({ logs, settings }) {
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
                <div className={`muscle-dot m-${(e.muscle || "Other").split(" ")[0]}`}></div>
                <strong>{e.exercise}</strong>
              </div>
              <div className="set-list">
                {e.sets.map((s, k) => (
                  <div className="pill" key={k}>
                    {s.weight || "-"} {w.units} × {s.reps || "-"}
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
 * Stats tab (simple summaries)
 * -------------------------- */
function Stats({ logs, body, units }) {
  // simple totals
  const totalWorkouts = logs.length;
  const lastWorkout = logs[0]?.date;

  const lastBody = body[0];
  return (
    <div>
      <h1>Stats</h1>
      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">Total Workouts</div>
          <div className="stat-value">{totalWorkouts}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Last Workout</div>
          <div className="stat-value">{lastWorkout || "—"}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Latest Body Weight</div>
          <div className="stat-value">
            {lastBody?.bodyWeight ? `${lastBody.bodyWeight} ${units}` : "—"}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Latest Body Fat</div>
          <div className="stat-value">
            {lastBody?.bodyFat ? `${lastBody.bodyFat}%` : "—"}
          </div>
        </div>
      </div>
      <p className="muted">
        (Charts can be added later. All data is stored locally on your device.)
      </p>
    </div>
  );
}

/** ---------------------------
 * Settings tab
 * -------------------------- */
function Settings({ settings, setSettings, body, setBody }) {
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");

  function addBody() {
    if (!weight && !fat) return;
    const date = new Date().toISOString().slice(0, 10);
    setBody((prev) => [{ date, bodyWeight: weight || "", bodyFat: fat || "" }, ...prev]);
    setWeight("");
    setFat("");
  }

  return (
    <div>
      <h1>Settings</h1>

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

        <h2>Accent Color</h2>
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
    </div>
  );
}
