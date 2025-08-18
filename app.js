function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// Load workouts
async function loadWorkouts() {
  const response = await fetch("programs.json");
  const data = await response.json();
  renderWorkouts(data);
}

function renderWorkouts(programs) {
  const container = document.getElementById("workout-list");
  container.innerHTML = "";

  Object.keys(programs).forEach(split => {
    const splitCard = document.createElement("div");
    splitCard.className = "card";

    const splitTitle = document.createElement("h2");
    splitTitle.textContent = split;
    splitCard.appendChild(splitTitle);

    const days = programs[split];
    Object.keys(days).forEach(day => {
      const dayDiv = document.createElement("div");
      const dayTitle = document.createElement("h3");
      dayTitle.textContent = day;
      dayDiv.appendChild(dayTitle);

      const muscles = days[day];
      Object.keys(muscles).forEach(muscle => {
        const muscleDiv = document.createElement("div");
        const muscleTitle = document.createElement("h4");
        muscleTitle.textContent = muscle;
        muscleDiv.appendChild(muscleTitle);

        const ul = document.createElement("ul");
        muscles[muscle].forEach(exercise => {
          const li = document.createElement("li");
          li.textContent = exercise;
          ul.appendChild(li);
        });

        muscleDiv.appendChild(ul);
        dayDiv.appendChild(muscleDiv);
      });

      splitCard.appendChild(dayDiv);
    });

    container.appendChild(splitCard);
  });
}

// Logs
function saveLog() {
  const exercise = document.getElementById("exercise-name").value;
  const weight = document.getElementById("exercise-weight").value;
  const reps = document.getElementById("exercise-reps").value;
  const unit = document.getElementById("unit").value;

  if (!exercise || !weight || !reps) return;

  const entry = `${exercise} - ${weight}${unit} x ${reps}`;
  const li = document.createElement("li");
  li.textContent = entry;
  document.getElementById("log-list").appendChild(li);

  document.getElementById("exercise-name").value = "";
  document.getElementById("exercise-weight").value = "";
  document.getElementById("exercise-reps").value = "";
}

// Body stats
const weightData = [];
const fatData = [];

function saveBodyStats() {
  const weight = document.getElementById("body-weight").value;
  const fat = document.getElementById("body-fat").value;
  const unit = document.getElementById("body-unit").value;

  if (weight) weightData.push(weight + " " + unit);
  if (fat) fatData.push(fat + "%");

  updateCharts();
}

function updateCharts() {
  new Chart(document.getElementById("weightChart"), {
    type: "line",
    data: {
      labels: weightData.map((_, i) => i + 1),
      datasets: [{
        label: "Weight",
        data: weightData.map(w => parseFloat(w)),
        borderColor: "#007aff",
        fill: false
      }]
    },
    options: { responsive: true }
  });

  new Chart(document.getElementById("fatChart"), {
    type: "line",
    data: {
      labels: fatData.map((_, i) => i + 1),
      datasets: [{
        label: "Body Fat %",
        data: fatData.map(f => parseFloat(f)),
        borderColor: "#ff3b30",
        fill: false
      }]
    },
    options: { responsive: true }
  });
}

document.addEventListener("DOMContentLoaded", loadWorkouts);
