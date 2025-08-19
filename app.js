import React, { useState } from "react";
import "./style.css";

import programs from "./programs.json";

export default function App() {
  const [tab, setTab] = useState("workouts");

  return (
    <div className="app">
      {/* Main Screen */}
      <div className="content">
        {tab === "workouts" && <Workouts />}
        {tab === "log" && <Log />}
        {tab === "stats" && <Stats />}
        {tab === "settings" && <Settings />}
      </div>

      {/* iOS-style Bottom Tab Bar */}
      <div className="tab-bar">
        <button
          className={tab === "workouts" ? "active" : ""}
          onClick={() => setTab("workouts")}
        >
          🏋️ Workouts
        </button>
        <button
          className={tab === "log" ? "active" : ""}
          onClick={() => setTab("log")}
        >
          📓 Log
        </button>
        <button
          className={tab === "stats" ? "active" : ""}
          onClick={() => setTab("stats")}
        >
          📊 Stats
        </button>
        <button
          className={tab === "settings" ? "active" : ""}
          onClick={() => setTab("settings")}
        >
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
}

function Workouts() {
  return (
    <div>
      <h1>Programs</h1>
      {programs.programs.map((program) => (
        <div className="card" key={program.id}>
          <h2>{program.name}</h2>
          {program.days.map((day) => (
            <div className="sub-card" key={day.day}>
              <h3>{day.day}</h3>
              <ul>
                {day.exercises.map((ex, i) => (
                  <li key={i}>
                    <strong>{ex.name}</strong> — {ex.sets} x {ex.reps}
                    {ex.notes && <p className="notes">{ex.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Log() {
  return (
    <div>
      <h1>Workout Log</h1>
      <p>Here you’ll track weights, sets, and reps.</p>
    </div>
  );
}

function Stats() {
  return (
    <div>
      <h1>Progress Stats</h1>
      <p>Graphs will go here (weight, body fat, PRs).</p>
    </div>
  );
}

function Settings() {
  return (
    <div>
      <h1>Settings</h1>
      <p>Units, preferences, and account options.</p>
    </div>
  );
}
