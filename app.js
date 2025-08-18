// ======= State =======
let programs = [];
let state = JSON.parse(localStorage.getItem("fitnessData")) || {
  units: "kg",                // "kg" | "lb"
  bodyweight: [],             // [{date, weight}]
  bodyfat: [],                // [{date, bodyfat}]
  // logs[exerciseName] = [{date, weight, reps}]
  logs: {}
};

// ======= Utils =======
const today = () => new Date().toISOString().split("T")[0];
const kgToLb = kg => Math.round(kg * 2.20462262 * 10) / 10;
const lbToKg = lb => Math.round((lb / 2.20462262) * 10) / 10;
const convertVal = (val, toUnits) => {
  if (val === "" || val === null || Number.isNaN(Number(val))) return "";
  const n = Number(val);
  return toUnits === "kg" ? lbToKg(n) : kgToLb(n);
};
// Epley estimated 1RM
const e1RM = (w, r) => (Number(w) || 0) * (1 + (Number(r) || 0) / 30);

// Persist
function save() {
  localStorage.setItem("fitnessData", JSON.stringify(state));
}

// ======= Init =======
fetch("programs.json")
  .then(r => r.json())
  .then(data => {
    programs = data.programs || [];
    renderPrograms();
    initUI();
    buildExercisePicker();
    renderCharts();
  });

// ======= UI Wiring =======
function initUI() {
  const unitBtn = document.getElementById("unitToggle");
  unitBtn.textContent = state.units;
  unitBtn.onclick = () => {
    const newUnits = state.units === "kg" ? "lb" : "kg";

    // convert bodyweight values
    state.bodyweight = state.bodyweight.map(x => ({
      date: x.date,
      weight: convertVal(x.weight, newUnits)
    }));
    // convert exercise logs
    Object.keys(state.logs).forEach(name => {
      state.logs[name] = state.logs[name].map(e => ({
        ...e,
        weight: convertVal(e.weight, newUnits)
      }));
    });

    state.units = newUnits;
    save();
    unitBtn.textContent = newUnits;
    renderExerciseCards();
    renderCharts();
    alert(`Units switched to ${newUnits}.`);
  };

  document.getElementById("exportData").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fitness-data-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById("importData").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      if (!imported || typeof imported !== "object") throw new Error("Invalid data");
      state = { ...state, ...imported };
      save();
      renderPrograms();
      buildExercisePicker();
      renderCharts();
      renderExerciseCards();
      alert("Import complete.");
    } catch {
      alert("Import failed: bad file.");
    }
    e.target.value = "";
  };

  // body logs
  document.getElementById("logBodyBtn").onclick = () => {
    const bw = document.getElementById("bodyweightInput").value;
    const bf = document.getElementById("bodyfatInput").value;
    if (bw) state.bodyweight.push({ date: today(), weight: Number(bw) });
    if (bf) state.bodyfat.push({ date: today(), bodyfat: Number(bf) });
    save();
    document.getElementById("bodyweightInput").value = "";
    document.getElementById("bodyfatInput").value = "";
    renderCharts();
  };

  // rest timer
  let restInterval = null; let restLeft = 90;
  const restEl = document.getElementById("restTimer");
  document.getElementById("startRest").onclick = () => {
    restLeft = 90;
    restEl.textContent = `Rest: ${restLeft}s`;
    if (restInterval) clearInterval(restInterval);
    restInterval = setInterval(() => {
      restLeft--;
      restEl.textContent = `Rest: ${restLeft}s`;
      if (restLeft <= 0) { clearInterval(restInterval); restInterval = null; restEl.textContent = "Rest: done ✅"; }
    }, 1000);
  };

  document.getElementById("refreshExerciseChart").onclick = () => renderExerciseChart();
}

// ======= Program & Day selection =======
let selectedProgram = null;
let selectedDay = null;

function renderPrograms() {
  const wrap = document.getElementById("program-select");
  wrap.innerHTML = "";
  programs.forEach((p, i) => {
    const b = document.createElement("button");
    b.textContent = p.name;
    b.onclick = () => {
      selectedProgram = i;
      selectedDay = null;
      renderDays();
      renderExerciseCards();
    };
    wrap.appendChild(b);
  });
}

function renderDays() {
  const wrap = document.getElementById("day-select");
  wrap.innerHTML = "";
  if (selectedProgram == null) return;
  programs[selectedProgram].days.forEach((d, i) => {
    const b = document.createElement("button");
    b.className = "ghost";
    b.textContent = d.day;
    b.onclick = () => {
      selectedDay = i;
      renderExerciseCards();
      buildExercisePicker();
    };
    wrap.appendChild(b);
  });
}

// ======= Exercises & Logging =======
function renderExerciseCards() {
  const container = document.getElementById("exercise-list");
  container.innerHTML = "";
  if (selectedProgram == null || selectedDay == null) {
    container.innerHTML = `<div class="small">Pick a program and day to see exercises.</div>`;
    return;
  }
  const list = programs[selectedProgram].days[selectedDay].exercises;

  list.forEach(ex => {
    const nameKey = ex.name;
    const card = document.createElement("div");
    card.className = "exercise-card";

    const header = document.createElement("div");
    header.innerHTML = `<strong>${ex.name}</strong>`;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${ex.muscle} • ${ex.sets} sets • ${ex.reps}`;

    const setWrap = document.createElement("div");

    const lastEntry = (state.logs[nameKey] || [])[ (state.logs[nameKey]||[]).length - 1];
    const helper = document.createElement("div");
    helper.className = "small";
    helper.textContent = lastEntry
      ? `Last: ${lastEntry.weight}${state.units} x ${lastEntry.reps} on ${lastEntry.date}`
      : `No history yet.`;

    for (let s = 1; s <= ex.sets; s++) {
      const row = document.createElement("div");
      row.className = "set-row";
      row.innerHTML = `
        <input type="number" inputmode="decimal" placeholder="Weight (${state.units})" />
        <input type="number" inputmode="numeric" placeholder="Reps" />
        <button class="save">Save</button>
        <button class="delete">✕</button>
      `;
      const [wInput, rInput, saveBtn, delBtn] = row.children;

      if (lastEntry) { wInput.value = lastEntry.weight; rInput.value = lastEntry.reps; }

      saveBtn.onclick = () => {
        const w = Number(wInput.value);
        const r = Number(rInput.value);
        if (!w || !r) return alert("Enter weight and reps.");
        if (!state.logs[nameKey]) state.logs[nameKey] = [];
        state.logs[nameKey].push({ date: today(), weight: w, reps: r });
        save();
        helper.textContent = `Last: ${w}${state.units} x ${r} on ${today()}`;
        buildExercisePicker();
        renderExerciseChart();
      };
      delBtn.onclick = () => {
        if (!state.logs[nameKey] || state.logs[nameKey].length === 0) return;
        state.logs[nameKey].pop();
        save();
        alert("Last set removed.");
        buildExercisePicker();
        renderExerciseChart();
      };

      setWrap.appendChild(row);
    }

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(helper);
    card.appendChild(setWrap);
    container.appendChild(card);
  });
}

// ======= Exercise Picker for Chart =======
function buildExercisePicker() {
  const sel = document.getElementById("exercisePicker");
  sel.innerHTML = "";
  const namesSet = new Set();

  if (selectedProgram != null && selectedDay != null) {
    programs[selectedProgram].days[selectedDay].exercises
      .map(e => e.name).forEach(n => { namesSet.add(n); });
  }
  Object.keys(state.logs).forEach(n => namesSet.add(n));

  Array.from(namesSet).sort().forEach(n => {
    const o = document.createElement("option");
    o.value = o.textContent = n;
    sel.appendChild(o);
  });
}

// ======= Charts (Bodyweight, Bodyfat, Exercise) =======
let weightChart, fatChart, exerciseChart;

function renderCharts() {
  const wctx = document.getElementById("weightChart").getContext("2d");
  const fctx = document.getElementById("fatChart").getContext("2d");

  if (weightChart) weightChart.destroy();
  if (fatChart) fatChart.destroy();

  weightChart = new Chart(wctx, {
    type: "line",
    data: {
      labels: state.bodyweight.map(e => e.date),
      datasets: [{
        label: `Bodyweight (${state.units})`,
        data: state.bodyweight.map(e => e.weight),
        borderColor: "#007aff",
        tension: 0.25
      }]
    },
    options: { responsive: true, plugins: { legend: { display: true } } }
  });

  fatChart = new Chart(fctx, {
    type: "line",
    data: {
      labels: state.bodyfat.map(e => e.date),
      datasets: [{
        label: "Body Fat %",
        data: state.bodyfat.map(e => e.bodyfat),
        borderColor: "#ff3b30",
        tension: 0.25
      }]
    },
    options: { responsive: true, plugins: { legend: { display: true } } }
  });
}

function renderExerciseChart() {
  const name = document.getElementById("exercisePicker").value;
  const ctx = document.getElementById("exerciseChart").getContext("2d");
  if (exerciseChart) exerciseChart.destroy();
  const data = (state.logs[name] || []).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const labels = data.map(e => e.date);
  const oneRM = data.map(e => Math.round(e1RM(e.weight, e.reps)));

  exerciseChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `${name} est 1RM (${state.units})`,
        data: oneRM,
        borderColor: "#34c759",
        tension: 0.25
      }]
    },
    options: { responsive: true, plugins: { legend: { display: true } } }
  });
}