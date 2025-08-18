/* ======= PWA boot ======= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

/* ======= State ======= */
const state = {
  programs: {},           // {name: {workouts: {Day: [ex...]}}}
  selectedProgram: null,  // "UpperLower" | "PPL" | "FullBody" | custom
  selectedDay: null,      // string
  todayPlan: [],          // current workout list
  log: JSON.parse(localStorage.getItem('pb_log') || '[]'),
  library: { exercises: [] },
  resources: [
    { label: "The Hypertrophy Handbook (PDF)", file: "The_Hypertrophy_Handbook.pdf" },
    { label: "The Nutrition Booklet (PDF)", file: "The_Nutrition_Booklet.pdf" },
    { label: "PB Program — Full Body (PDF)", file: "The_Pure_Bodybuilding_Program_-_Full_Body.pdf" },
    { label: "PB Program — PPL (PDF)", file: "The_Pure_Bodybuilding_Program_-_PPL.pdf" },
    { label: "PB Program — Upper/Lower (PDF)", file: "The_Pure_Bodybuilding_Program_-_UpperLower.pdf" }
  ],
  excelPresets: [
    { name: "UpperLower (Excel)", file: "Pure_Bodybuilding_-_Upper_Lower.xlsx" },
    { name: "PPL (Excel)", file: "Pure_Bodybuilding_-_PPL 2.xlsx" },
    { name: "FullBody (Excel)", file: "Pure_Bodybuilding_-_Full_Body.xlsx" }
  ]
};

const el = sel => document.querySelector(sel);
const fmt = s => (s ?? "").toString().trim();

/* ======= Loaders ======= */
async function safeFetch(url, type='json') {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    if (type === 'arraybuffer') return res.arrayBuffer();
    if (type === 'json') return res.json();
    return res.text();
  } catch { return null; }
}

async function loadProgramsJson() {
  const data = await safeFetch('programs.json', 'json');
  if (data && typeof data === 'object') state.programs = data;
}

async function loadExerciseLibrary() {
  const lib = await safeFetch('exercise_library.json', 'json');
  if (lib && lib.exercises) state.library = lib;
}

function normalizeHeader(s) {
  s = (s || '').toString().toLowerCase();
  return s.replace(/\s+/g,' ').trim();
}

function pickCol(columns, candidates) {
  const norm = columns.map(c => normalizeHeader(c));
  for (const cand of candidates) {
    const i = norm.indexOf(cand);
    if (i !== -1) return columns[i];
  }
  for (const cand of candidates) {
    const hit = columns.find(c => normalizeHeader(c).includes(cand));
    if (hit) return hit;
  }
  return null;
}

function rowsFromSheet(ws) {
  const arr = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
  if (!arr.length) return [];
  let headerRowIdx = arr.findIndex(r => r.some(cell => /exercise/i.test(cell)));
  if (headerRowIdx === -1) headerRowIdx = 0;
  const headers = arr[headerRowIdx].map(String);
  const body = arr.slice(headerRowIdx + 1);

  const colDay  = pickCol(headers, ['day','workout','session']);
  const colEx   = pickCol(headers, ['exercise','movement','lift']);
  if (!colEx) return [];

  const colSets = pickCol(headers, ['sets','# sets','set','set(s)']);
  const colReps = pickCol(headers, ['reps','rep','repetitions']);
  const colRpe  = pickCol(headers, ['rpe','rir']);
  const colRest = pickCol(headers, ['rest']);
  const colNote = pickCol(headers, ['notes','tempo','cue','comment']);

  const idx = name => headers.indexOf(name);
  return body.map(r => {
    const get = (c) => (c ? r[idx(c)] ?? "" : "");
    const exercise = fmt(get(colEx));
    if (!exercise) return null;
    return {
      day: fmt(get(colDay)) || 'Session',
      exercise,
      sets: fmt(get(colSets)),
      reps: fmt(get(colReps)),
      rpe: fmt(get(colRpe)),
      rest: fmt(get(colRest)),
      notes: fmt(get(colNote))
    };
  }).filter(Boolean);
}

async function loadExcelPreset(file, programName) {
  try {
    const buf = await safeFetch(file, 'arraybuffer');
    if (!buf) return false;
    const wb = XLSX.read(buf);
    const workouts = {};
    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name];
      const rows = rowsFromSheet(ws);
      rows.forEach(row => {
        const day = row.day || name || 'Session';
        (workouts[day] ||= []).push({
          exercise: row.exercise, sets: row.sets, reps: row.reps,
          rpe: row.rpe, rest: row.rest, notes: row.notes
        });
      });
    });
    if (Object.keys(workouts).length) {
      state.programs[programName] = { workouts };
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

async function loadEverything() {
  await Promise.all([loadProgramsJson(), loadExerciseLibrary()]);
  for (const p of state.excelPresets) {
    await loadExcelPreset(p.file, p.name.replace(' (Excel)',''));
  }
}

/* ======= UI ======= */
function setActiveTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
}

function render() {
  const tab = document.querySelector('.tabs button.active')?.dataset.tab || 'program';
  if (tab === 'program') return renderProgram();
  if (tab === 'workout') return renderWorkout();
  if (tab === 'log') return renderLog();
  if (tab === 'library') return renderLibrary();
  if (tab === 'resources') return renderResources();
  if (tab === 'settings') return renderSettings();
}

function renderProgram() {
  const parts = [];
  parts.push(`<div class="panel"><h2>Choose a Program</h2>
    <div class="subtle">Pick from presets (JSON/Excel). You can mix & match days.</div>
    <div class="row">`);

  const names = Object.keys(state.programs);
  if (!names.length) {
    parts.push(`<div class="subtle">No presets found yet. Upload <code>programs.json</code> and/or your Excel files to the repo root.</div>`);
  }
  names.forEach(name => {
    const days = Object.keys(state.programs[name].workouts || {});
    if (!days.length) return;
    parts.push(`
      <div class="panel">
        <h3>${name}</h3>
        <div class="subtle">${days.length} day(s)</div>
        <div class="stack">
          <select data-prog-day="${name}">
            ${days.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
          <button class="primary" onclick="startDay('${name}')">Start Selected Day</button>
        </div>
      </div>
    `);
  });

  parts.push(`</div></div>`);
  el('#view').innerHTML = parts.join('');
}

function startDay(programName) {
  const sel = document.querySelector(`select[data-prog-day="${programName}"]`);
  const day = sel?.value;
  state.selectedProgram = programName;
  state.selectedDay = day;
  state.todayPlan = (state.programs[programName]?.workouts?.[day] || []).map(x => ({...x, weight:"", userNotes:"", completed:false}));
  setActiveTab('workout'); render();
}

function renderWorkout() {
  const plan = state.todayPlan || [];
  const head = `<div class="panel"><h2>Workout</h2>
    <div class="subtle">${state.selectedProgram || '—'} • ${state.selectedDay || '—'}</div></div>`;
  const list = plan.map((x,i) => `
    <div class="panel">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
        <div><strong>${x.exercise}</strong><br>
          <small class="key">${x.sets ? x.sets + " sets" : ""} ${x.reps ? "× " + x.reps : ""} ${x.rpe ? "• RPE " + x.rpe : ""} ${x.rest ? "• Rest " + x.rest : ""}</small>
          ${x.notes ? `<div class="subtle">${x.notes}</div>` : ""}
        </div>
        <label class="badge"><input type="checkbox" onchange="toggleDone(${i})" ${x.completed?'checked':''}/> Done</label>
      </div>
      <div class="row">
        <input placeholder="Weight / load" value="${x.weight||''}" onchange="setWeight(${i}, this.value)" />
        <input placeholder="Notes" value="${x.userNotes||''}" onchange="setUserNotes(${i}, this.value)" />
      </div>
    </div>
  `).join('');
  const actions = `
    <div class="panel row">
      <button class="good" onclick="finishWorkout()">Finish & Save</button>
      <button class="ghost" onclick="setActiveTab('program'); render()">Back to Programs</button>
    </div>
  `;
  el('#view').innerHTML = head + list + actions;
}

function toggleDone(i){ state.todayPlan[i].completed = !state.todayPlan[i].completed; }
function setWeight(i,v){ state.todayPlan[i].weight = v; }
function setUserNotes(i,v){ state.todayPlan[i].userNotes = v; }

function finishWorkout() {
  if (!state.todayPlan.length) return;
  const entry = {
    date: new Date().toISOString().slice(0,10),
    program: state.selectedProgram,
    day: state.selectedDay,
    items: state.todayPlan
  };
  state.log.unshift(entry);
  localStorage.setItem('pb_log', JSON.stringify(state.log));
  state.todayPlan = [];
  alert('Saved to Log ✅');
  setActiveTab('log'); render();
}

function renderLog() {
  const out = [];
  out.push(`<div class="panel"><h2>Training Log</h2><div class="subtle">Stored locally on your device.</div></div>`);
  if (!state.log.length) {
    out.push(`<div class="panel">No sessions yet. Start one from the Program tab.</div>`);
  } else {
    state.log.forEach((s, idx) => {
      out.push(`<div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><strong>${s.date}</strong> • ${s.program} — ${s.day}</div>
          <button class="bad" onclick="deleteLog(${idx})">Delete</button>
        </div>
        <table class="table">
          <thead><tr><th>Exercise</th><th>Sets×Reps</th><th>Weight</th><th>Notes</th></tr></thead>
          <tbody>
            ${s.items.map(it=>`<tr>
              <td>${it.exercise}</td>
              <td>${(it.sets||'?')} × ${(it.reps||'?')}</td>
              <td>${it.weight||''}</td>
              <td>${it.userNotes||''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`);
    });
  }
  out.push(`<div class="panel row">
    <button class="ghost" onclick="exportLog()">Export Log (JSON)</button>
    <button class="warn" onclick="clearLog()">Clear All</button>
  </div>`);
  el('#view').innerHTML = out.join('');
}
function deleteLog(i){ state.log.splice(i,1); localStorage.setItem('pb_log', JSON.stringify(state.log)); renderLog(); }
function exportLog(){
  const data = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.log, null, 2));
  const a = Object.assign(document.createElement('a'), { href: data, download: `pb_log_${new Date().toISOString().slice(0,10)}.json` });
  a.click();
}
function clearLog(){ if(confirm('Clear all log entries?')){ state.log=[]; localStorage.removeItem('pb_log'); renderLog(); } }

function renderLibrary() {
  const exs = state.library.exercises || [];
  const items = exs.map(e => `
    <div class="panel">
      <div style="display:flex;justify-content:space-between;gap:8px;">
        <div>
          <strong>${e.name}</strong>
          ${e.notes ? `<div class="subtle">${e.notes}</div>` : ``}
        </div>
        ${e.demo ? `<a class="badge" href="${e.demo}" target="_blank">Demo</a>` : `<span class="badge">No demo</span>`}
      </div>
    </div>
  `).join('');
  el('#view').innerHTML = `<div class="panel"><h2>Exercise Library</h2><div class="subtle">${exs.length} exercises</div></div>` + (items || `<div class="panel subtle">No entries yet.</div>`);
}

function renderResources() {
  const items = state.resources.map(r => `<div class="panel"><strong>${r.label}</strong><div><a href="${r.file}" target="_blank">${r.file}</a></div></div>`).join('');
  el('#view').innerHTML = `<div class="panel"><h2>Resources</h2><div class="subtle">Upload these PDFs to your repo root so the links work.</div></div>${items}`;
}

function renderSettings() {
  el('#view').innerHTML = `
    <div class="panel stack">
      <h2>Settings</h2>
      <button onclick="cacheWarm()">⚡ Preload for Offline</button>
      <button class="ghost" onclick="rebuildLibrary()">Rebuild Library from Programs</button>
      <div class="subtle">Tip: Add to Home Screen on iPhone for app-like experience.</div>
    </div>
  `;
}

async function cacheWarm(){
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const msg = await new Promise(res => {
      const ch = new MessageChannel();
      ch.port1.onmessage = e => res(e.data);
      navigator.serviceWorker.controller.postMessage({type:'WARM_CACHE'}, [ch.port2]);
    });
    alert(msg || 'Cached!');
  } else {
    alert('Service worker not active yet. Refresh once and try again.');
  }
}

function rebuildLibrary(){
  const names = new Set();
  Object.values(state.programs).forEach(p=>{
    Object.values(p.workouts||{}).forEach(day=>{
      day.forEach(e=>names.add(e.exercise));
    });
  });
  state.library.exercises = Array.from(names).sort().map(n=>({name:n, demo:"", notes:""}));
  alert(`Library rebuilt with ${state.library.exercises.length} exercises.`);
  renderLibrary();
}

/* ======= Tab wiring + Init ======= */
document.querySelectorAll('.tabs button').forEach(b=>{
  b.addEventListener('click', () => {
    setActiveTab(b.dataset.tab); render();
  });
});

(async function init(){
  await loadEverything();
  render();
})();
