/* ===== Fitness App (iPhone-ish PWA) =====
 * Data saved in localStorage under FITNESS_V1
 * Presets load from programs.json (fallback built-in).
 */

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const state = {
  units: 'imperial',         // 'metric' or 'imperial'
  restSec: 90,
  split: 'UpperLower',       // 'UpperLower' | 'PPL' | 'FullBody'
  library: [],               // exercises
  programs: {},              // split presets
  session: null,             // active workout
  history: [],               // finished workouts
  metrics: [],               // {date, weightKg, bodyFat}
  prs: {},                   // { exerciseName: bestWeightKg }
  streak: 0,                 // days in a row
};

const STORAGE_KEY = 'FITNESS_V1';
const TODAY = () => new Date().toISOString().slice(0,10);
const KG = (lb) => +(lb/2.20462).toFixed(2);
const LB = (kg) => +(kg*2.20462).toFixed(1);
const unitWeight = (kg, units) => units==='imperial' ? `${LB(kg)} lb` : `${kg} kg`;

// ---------- Storage ----------
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch {}
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- Presets & Library ----------
const FALLBACK = {
  UpperLower: {
    workouts: {
      "Upper A": [
        {name:"Bench Press", muscle:"Chest"},
        {name:"Bent Over Row", muscle:"Back"},
        {name:"Overhead Press", muscle:"Shoulders"},
        {name:"Incline DB Press", muscle:"Chest"},
        {name:"Lat Pulldown", muscle:"Back"},
        {name:"Lateral Raise", muscle:"Shoulders"},
        {name:"Triceps Pushdown", muscle:"Triceps"},
        {name:"Cable Curl", muscle:"Biceps"},
      ],
      "Lower A": [
        {name:"Back Squat", muscle:"Quads"},
        {name:"Romanian Deadlift", muscle:"Hamstrings"},
        {name:"Leg Press", muscle:"Quads"},
        {name:"Leg Curl", muscle:"Hamstrings"},
        {name:"Calf Raise", muscle:"Calves"},
        {name:"Hanging Leg Raise", muscle:"Abs"},
      ],
      "Upper B": [
        {name:"Weighted Pull-up", muscle:"Back"},
        {name:"Flat DB Press", muscle:"Chest"},
        {name:"Seated Cable Row", muscle:"Back"},
        {name:"Arnold Press", muscle:"Shoulders"},
        {name:"Chest Fly", muscle:"Chest"},
        {name:"Hammer Curl", muscle:"Biceps"},
        {name:"Skullcrusher", muscle:"Triceps"},
      ],
      "Lower B": [
        {name:"Deadlift", muscle:"Back"},
        {name:"Front Squat", muscle:"Quads"},
        {name:"Hip Thrust", muscle:"Glutes"},
        {name:"Leg Extension", muscle:"Quads"},
        {name:"Calf Raise", muscle:"Calves"},
        {name:"Cable Crunch", muscle:"Abs"},
      ],
    }
  },
  PPL: {
    workouts: {
      "Push": [
        {name:"Bench Press", muscle:"Chest"},
        {name:"Overhead Press", muscle:"Shoulders"},
        {name:"Incline Press", muscle:"Chest"},
        {name:"Lateral Raise", muscle:"Shoulders"},
        {name:"Triceps Rope", muscle:"Triceps"},
      ],
      "Pull": [
        {name:"Barbell Row", muscle:"Back"},
        {name:"Lat Pulldown", muscle:"Back"},
        {name:"Face Pull", muscle:"Rear Delts"},
        {name:"EZ Bar Curl", muscle:"Biceps"},
        {name:"Hammer Curl", muscle:"Biceps"},
      ],
      "Legs": [
        {name:"Back Squat", muscle:"Quads"},
        {name:"Romanian Deadlift", muscle:"Hamstrings"},
        {name:"Leg Press", muscle:"Quads"},
        {name:"Leg Curl", muscle:"Hamstrings"},
        {name:"Calf Raise", muscle:"Calves"},
      ],
    }
  },
  FullBody: {
    workouts: {
      "Full A": [
        {name:"Squat", muscle:"Quads"},
        {name:"Bench Press", muscle:"Chest"},
        {name:"Row", muscle:"Back"},
        {name:"Lateral Raise", muscle:"Shoulders"},
        {name:"Curl", muscle:"Biceps"},
        {name:"Triceps Pushdown", muscle:"Triceps"},
      ],
      "Full B": [
        {name:"Deadlift", muscle:"Back"},
        {name:"Overhead Press", muscle:"Shoulders"},
        {name:"Pulldown", muscle:"Back"},
        {name:"Leg Press", muscle:"Quads"},
        {name:"Calf Raise", muscle:"Calves"},
        {name:"Abs Wheel", muscle:"Abs"},
      ],
    }
  }
};

const BASE_LIBRARY = [
  // minimal starter; you can expand freely
  {name:"Bench Press", muscle:"Chest"}, {name:"Incline DB Press", muscle:"Chest"},
  {name:"Barbell Row", muscle:"Back"}, {name:"Lat Pulldown", muscle:"Back"},
  {name:"Deadlift", muscle:"Back"}, {name:"Squat", muscle:"Quads"},
  {name:"Front Squat", muscle:"Quads"}, {name:"Romanian Deadlift", muscle:"Hamstrings"},
  {name:"Hip Thrust", muscle:"Glutes"}, {name:"Calf Raise", muscle:"Calves"},
  {name:"Overhead Press", muscle:"Shoulders"}, {name:"Lateral Raise", muscle:"Shoulders"},
  {name:"Face Pull", muscle:"Rear Delts"}, {name:"Biceps Curl", muscle:"Biceps"},
  {name:"Hammer Curl", muscle:"Biceps"}, {name:"Triceps Pushdown", muscle:"Triceps"},
  {name:"Skullcrusher", muscle:"Triceps"}, {name:"Cable Crunch", muscle:"Abs"},
  {name:"Hanging Leg Raise", muscle:"Abs"}
];

async function loadPrograms() {
  try {
    const res = await fetch('programs.json', {cache:'no-store'});
    if (!res.ok) throw new Error('no programs.json');
    const json = await res.json();
    state.programs = json;
  } catch {
    state.programs = FALLBACK;
  }
  if (!state.library?.length) {
    // derive library from programs + base
    const set = new Map();
    BASE_LIBRARY.forEach(x => set.set(x.name, x));
    Object.values(state.programs).forEach(p => {
      Object.values(p.workouts).forEach(list => {
        list.forEach(ex => set.set(ex.name, ex));
      });
    });
    state.library = [...set.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }
}

// ---------- Views ----------
const root = $('#view-root');
const tpl = (id) => document.importNode($(id).content, true);

function show(tab) {
  $$('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  $('#btn-back').hidden = true;
  $('#btn-add').hidden = true;
  root.innerHTML = '';
  if (tab==='workouts') return renderWorkouts();
  if (tab==='library')  return renderLibrary();
  if (tab==='log')      return renderLog();
  if (tab==='stats')    return renderStats();
  if (tab==='settings') return renderSettings();
}

function renderWorkouts() {
  const v = tpl('#tpl-workouts');
  // segmented control
  const seg = v.querySelector('#split-select');
  ['UpperLower','PPL','FullBody'].forEach(key=>{
    const btn = document.createElement('button');
    btn.textContent = key.replace('UpperLower','Upper/Lower');
    btn.className = 'chip' + (state.split===key?' active':'');
    btn.onclick = () => { state.split = key; save(); renderWorkouts(); };
    seg.append(btn);
  });

  // workouts list
  const list = v.querySelector('#workout-list');
  const plan = state.programs[state.split]?.workouts || {};
  const names = Object.keys(plan);
  if (!names.length) {
    list.innerHTML = `<div class="empty">No workouts in this split yet.</div>`;
  } else {
    names.forEach(wname=>{
      const item = document.createElement('div');
      item.className = 'item';
      item.innerHTML = `
        <div>
          <h3>${wname}</h3>
          <div class="sub">${plan[wname].length} exercises</div>
        </div>
        <button class="btn">Start</button>`;
      item.querySelector('button').onclick = ()=> startSession(wname, plan[wname]);
      list.append(item);
    });
  }

  v.querySelector('#btn-quick-start').onclick = ()=> startSession('Custom Workout', []);
  root.append(v);
}

function renderLibrary() {
  const v = tpl('#tpl-library');
  const muscles = Array.from(new Set(state.library.map(x=>x.muscle))).sort();
  const chipWrap = v.querySelector('#muscle-filter');
  const list = v.querySelector('#exercise-list');
  const search = v.querySelector('#exercise-search');

  let activeMuscle = 'All';
  const renderList = () => {
    const q = search.value.trim().toLowerCase();
    list.innerHTML='';
    state.library
      .filter(x=> activeMuscle==='All' || x.muscle===activeMuscle)
      .filter(x=> x.name.toLowerCase().includes(q))
      .forEach(ex=>{
        const row = document.createElement('div');
        row.className='item';
        row.innerHTML = `<div><h3>${ex.name}</h3><div class="sub">${ex.muscle}</div></div><span class="badge">Add</span>`;
        row.querySelector('.badge').onclick = () => addExerciseToSession(ex);
        list.append(row);
      });
  };

  ['All',...muscles].forEach(m=>{
    const chip = document.createElement('button');
    chip.className='chip'+(m==='All'?' active':'');
    chip.textContent = m;
    chip.onclick = ()=>{
      $$('.chip', chipWrap).forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      activeMuscle = m; renderList();
    };
    chipWrap.append(chip);
  });
  search.oninput = renderList;
  renderList();
  root.append(v);
}

function renderLog() {
  const v = tpl('#tpl-log');
  v.querySelector('#btn-add-metric').onclick = () => {
    const w = parseFloat($('#metric-weight',v).value);
    const bf = parseFloat($('#metric-bf',v).value);
    if (Number.isFinite(w)) {
      const weightKg = state.units==='imperial' ? KG(w) : w;
      state.metrics.push({date:TODAY(), weightKg:+weightKg.toFixed(2), bodyFat: Number.isFinite(bf)? +bf.toFixed(1): null});
      save(); renderLog();
    }
  };
  const history = v.querySelector('#history-list');
  const days = [...state.history].reverse();
  if (!days.length) history.innerHTML = `<div class="empty">No workouts logged yet.</div>`;
  else days.slice(0,30).forEach(s=>{
    const vol = s.sets.reduce((a,x)=> a + x.reps * x.weightKg, 0);
    const item = document.createElement('div');
    item.className='item';
    item.innerHTML = `<div><h3>${s.name}</h3><div class="sub">${s.date} • ${s.sets.length} sets • Volume ${unitWeight(vol, state.units)}</div></div>`;
    history.append(item);
  });
  root.append(v);
}

function renderStats() {
  const v = tpl('#tpl-stats');
  root.append(v);
  drawChart('#chart-weight', state.metrics.map(m=>({x:m.date, y: state.units==='imperial'? LB(m.weightKg) : m.weightKg})), state.units==='imperial'?'lb':'kg');
  drawChart('#chart-bf', state.metrics.filter(m=>m.bodyFat!=null).map(m=>({x:m.date, y:m.bodyFat})), '%');
  renderStreaksAndPRs();
}

function renderSettings() {
  const v = tpl('#tpl-settings');
  const unitSelect = $('#unit-select', v);
  unitSelect.value = state.units;
  unitSelect.onchange = () => { state.units = unitSelect.value; save(); renderStats(); };

  const rest = $('#rest-seconds', v);
  rest.value = state.restSec;
  rest.onchange = () => { state.restSec = Math.max(15, Math.min(600, +rest.value||90)); save(); };

  $('#btn-export', v).onclick = exportData;
  $('#file-import', v).onchange = importData;

  root.append(v);
}

// ---------- Session / Logging ----------
function startSession(name, exercises) {
  state.session = {
    name,
    date: TODAY(),
    sets: exercises.map(ex => ({exercise:ex.name, muscle:ex.muscle, weightKg:0, reps:0, rpe:null, notes:''}))
  };
  save();
  showSession();
}

function addExerciseToSession(ex) {
  if (!state.session) startSession('Custom Workout', []);
  state.session.sets.push({exercise:ex.name, muscle:ex.muscle, weightKg:0, reps:0, rpe:null, notes:''});
  save();
  showSession();
}

let restTimer = null;
function showSession() {
  const v = tpl('#tpl-session');
  $('#btn-back').hidden = false;
  $('#btn-back').onclick = ()=>{ state.session=null; save(); show('workouts'); };
  $('#session-title', v).textContent = state.session?.name || 'Workout';

  const list = $('#session-sets', v);
  list.innerHTML='';
  state.session.sets.forEach((s,idx)=>{
    const item = document.createElement('div');
    item.className='item';
    const weight = state.units==='imperial' ? (s.weightKg? LB(s.weightKg):'') : (s.weightKg||'');
    item.innerHTML = `
      <div>
        <h3>${s.exercise}</h3>
        <div class="sub">${s.muscle}</div>
      </div>
      <div style="display:grid;grid-template-columns:80px 60px 60px;gap:6px;align-items:center">
        <input type="number" placeholder="${state.units==='imperial'?'lb':'kg'}" value="${weight}"/>
        <input type="number" placeholder="reps" value="${s.reps||''}"/>
        <input type="number" placeholder="RPE" value="${s.rpe??''}" step="0.5" />
      </div>`;
    const [wEl,rEl,rpeEl] = $$('input', item);
    wEl.onchange = ()=> {
      const v = parseFloat(wEl.value)||0;
      s.weightKg = state.units==='imperial' ? KG(v) : v; save();
    };
    rEl.onchange = ()=> { s.reps = parseInt(rEl.value)||0; save(); };
    rpeEl.onchange = ()=> { s.rpe = parseFloat(rpeEl.value)||null; save(); };
    list.append(item);
  });

  $('#btn-add-set', v).onclick = ()=>{
    // quick add from library chooser: use the last muscle or default
    const first = state.library[0] || {name:'Custom', muscle:'Other'};
    addExerciseToSession(first);
  };

  $('#btn-rest', v).onclick = ()=>{
    const t = $('#timer', v);
    t.hidden=false;
    let remaining = state.restSec;
    t.textContent = formatSec(remaining);
    clearInterval(restTimer);
    restTimer = setInterval(()=>{
      remaining--;
      t.textContent = formatSec(Math.max(0,remaining));
      if (remaining<=0) {
        clearInterval(restTimer);
        try { new AudioContext(); } catch {}
        t.textContent = "GO!";
        setTimeout(()=>{ t.hidden=true; }, 1200);
      }
    }, 1000);
  };

  $('#btn-finish', v).onclick = finishSession;

  root.innerHTML='';
  root.append(v);
}

function finishSession() {
  if (!state.session) return;
  // clean empty rows
  state.session.sets = state.session.sets.filter(s=> (s.reps>0 && s.weightKg>0));
  if (!state.session.sets.length) { state.session=null; save(); show('workouts'); return; }

  // PRs
  state.session.sets.forEach(s=>{
    const best = state.prs[s.exercise] || 0;
    if (s.weightKg>best) state.prs[s.exercise]=s.weightKg;
  });

  // streak update
  const last = state.history.at(-1)?.date;
  const today = new Date(TODAY());
  let nextStreak = state.streak||0;
  if (!last) nextStreak = 1;
  else {
    const d = (new Date(TODAY()) - new Date(last)) / 86400000;
    nextStreak = (d<=2 && d>=0) ? (d>=1? state.streak+1 : state.streak) : 1;
  }
  state.streak = nextStreak;

  state.history.push(state.session);
  state.session=null;
  save();
  show('log');
  alert('Workout saved!');
}

// ---------- Charts (no external libs) ----------
function drawChart(sel, data, unitLabel) {
  const el = $(sel);
  const ctx = el.getContext('2d');
  ctx.clearRect(0,0,el.width,el.height);
  if (!data.length) { ctx.fillStyle='#8c90a3'; ctx.fillText('No data yet', 10, 20); return; }

  const w = el.width = el.clientWidth * devicePixelRatio;
  const h = el.height = el.clientHeight * devicePixelRatio;
  const pad = 30*devicePixelRatio;
  const xs = data.map(d=> new Date(d.x).getTime());
  const ys = data.map(d=> d.y);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);
  const fx = (t)=> pad + (w-2*pad) * ( (t-xmin) / (xmax-xmin || 1) );
  const fy = (v)=> h-pad - (h-2*pad) * ( (v-ymin) / ( (ymax-ymin) || 1) );

  ctx.lineWidth = 2*devicePixelRatio;
  ctx.strokeStyle = '#5b8cff';
  ctx.beginPath();
  data.forEach((d,i)=> {
    const x = fx(new Date(d.x).getTime()), y = fy(d.y);
    i? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  });
  ctx.stroke();

  ctx.fillStyle = '#8c90a3';
  ctx.font = `${12*devicePixelRatio}px system-ui`;
  ctx.fillText(unitLabel, 6*devicePixelRatio, 14*devicePixelRatio);
}

function renderStreaksAndPRs() {
  const s = $('#streaks'); s.innerHTML='';
  const b = document.createElement('span');
  b.className='badge'; b.textContent = `🔥 ${state.streak}-day streak`;
  s.append(b);

  const list = $('#prs'); list.innerHTML='';
  Object.entries(state.prs).sort().forEach(([name,kg])=>{
    const row = document.createElement('div');
    row.className='item';
    row.innerHTML = `<div><h3>${name}</h3><div class="sub">PR</div></div><div>${unitWeight(kg, state.units)}</div>`;
    list.append(row);
  });
}

// ---------- Helpers ----------
function exportData() {
  const blob = new Blob([JSON.stringify(state)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `fitness-export-${TODAY()}.json`;
  a.click(); URL.revokeObjectURL(url);
}
function importData(e) {
  const f = e.target.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      Object.assign(state, data);
      save(); location.reload();
    } catch { alert('Invalid file'); }
  };
  r.readAsText(f);
}
function formatSec(s){ const m=Math.floor(s/60), ss=(s%60).toString().padStart(2,'0'); return `${m}:${ss}`; }

// ---------- Boot ----------
async function init() {
  load();
  await loadPrograms();
  save();

  // nav
  $$('.tab').forEach(b=> b.onclick = ()=> show(b.dataset.tab));
  $('#btn-back').onclick = ()=> show('workouts');

  // initial view
  show('workouts');

  // PWA SW (if exists)
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('service-worker.js'); } catch {}
  }
}
init();