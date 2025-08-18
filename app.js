function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  if (pageId === "progress") {
    renderProgress();
  }
}

let workoutStreak = 0;
let unitSystem = localStorage.getItem("unitSystem") || "kg";

// Update unit placeholders
function updateUnitLabels() {
  document.querySelectorAll(".weight-input").forEach(input => {
    input.placeholder = unitSystem;
  });
}

// Show rest reminder
function showRestReminder(message) {
  const reminder = document.createElement("div");
  reminder.className = "rest-reminder";
  reminder.textContent = message;

  document.body.appendChild(reminder);
  setTimeout(() => reminder.classList.add("show"), 100);
  setTimeout(() => {
    reminder.classList.remove("show");
    setTimeout(() => reminder.remove(), 500);
  }, 4000);
}

// Save exercise progress
function saveProgress() {
  const data = {};
  document.querySelectorAll("li").forEach((li, i) => {
    const checkbox = li.querySelector(".exercise-check");
    const weightInput = li.querySelector(".weight-input");
    data[i] = {
      done: checkbox.checked,
      weight: weightInput.value
    };
  });
  localStorage.setItem("workoutProgress", JSON.stringify(data));
}

// Load exercise progress
function loadProgress() {
  const saved = JSON.parse(localStorage.getItem("workoutProgress") || "{}");
  document.querySelectorAll("li").forEach((li, i) => {
    if (saved[i]) {
      li.querySelector(".exercise-check").checked = saved[i].done;
      li.querySelector(".weight-input").value = saved[i].weight;
    }
  });
}

// Toggle kg/lbs
function toggleUnit() {
  unitSystem = unitSystem === "kg" ? "lbs" : "kg";
  localStorage.setItem("unitSystem", unitSystem);
  updateUnitLabels();
  document.getElementById("unit-toggle").textContent =
    `Switch to ${unitSystem === "kg" ? "lbs" : "kg"}`;
}

// Save workout completion log
function logWorkout(split, day) {
  const logs = JSON.parse(localStorage.getItem("workoutLogs") || "[]");
  logs.push({
    split,
    day,
    date: new Date().toLocaleDateString(),
    exercises: Array.from(document.querySelectorAll(".muscle ul li")).map(li => {
      return {
        name: li.querySelector("span").textContent,
        weight: li.querySelector(".weight-input").value
      };
    })
  });
  localStorage.setItem("workoutLogs", JSON.stringify(logs));
}

// Render progress tab
function renderProgress() {
  const container = document.getElementById("progress-content");
  container.innerHTML = "";

  const logs = JSON.parse(localStorage.getItem("workoutLogs") || "[]");
  if (logs.length === 0) {
    container.innerHTML = "<p>No progress yet. Complete a workout to see history!</p>";
    return;
  }

  // Workout History
  const history = document.createElement("div");
  history.innerHTML = "<h3>Workout History</h3>";

  logs.slice(-10).reverse().forEach(log => {
    const entry = document.createElement("div");
    entry.className = "history-entry";

    const summary = document.createElement("p");
    summary.className = "history-summary";
    summary.textContent = `${log.date}: ${log.split} - ${log.day}`;

    const details = document.createElement("div");
    details.className = "history-details";

    log.exercises.forEach(ex => {
      if (ex.name) {
        const line = document.createElement("p");
        line.textContent = `${ex.name}: ${ex.weight || "-"} ${unitSystem}`;
        details.appendChild(line);
      }
    });

    summary.onclick = () => {
      details.classList.toggle("show");
    };

    entry.appendChild(summary);
    entry.appendChild(details);
    history.appendChild(entry);
  });

  // Personal Records
  const prs = {};
  logs.forEach(log => {
    log.exercises.forEach(ex => {
      if (ex.weight) {
        const w = parseFloat(ex.weight);
        if (!prs[ex.name] || w > prs[ex.name]) {
          prs[ex.name] = w;
        }
      }
    });
  });

  const prSection = document.createElement("div");
  prSection.innerHTML = "<h3>Personal Records</h3>";
  Object.keys(prs).forEach(exName => {
    const record = document.createElement("p");
    record.textContent = `${exName}: ${prs[exName]} ${unitSystem}`;
    prSection.appendChild(record);
  });

  container.appendChild(history);
  container.appendChild(prSection);
}

// Load workouts
fetch("programs.json")
  .then(res => res.json())
  .then(data => {
    const workoutList = document.getElementById("workout-list");

    Object.keys(data).forEach(split => {
      const splitDiv = document.createElement("div");
      splitDiv.className = "card";
      splitDiv.innerHTML = `<h2>${split}</h2>`;

      const splitData = data[split];
      Object.keys(splitData).forEach(day => {
        const dayDiv = document.createElement("div");
        dayDiv.className = "day";
        dayDiv.innerHTML = `<h3>${day}</h3>`;

        const muscleGroups = splitData[day];
        Object.keys(muscleGroups).forEach(muscle => {
          const muscleDiv = document.createElement("div");
          muscleDiv.className = "muscle";
          muscleDiv.innerHTML = `<h4>${muscle}</h4>`;

          const exList = document.createElement("ul");
          muscleGroups[muscle].forEach(ex => {
            const li = document.createElement("li");

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "exercise-check";
            checkbox.onchange = saveProgress;

            const label = document.createElement("span");
            label.textContent = ex;

            const weightInput = document.createElement("input");
            weightInput.type = "number";
            weightInput.placeholder = unitSystem;
            weightInput.className = "weight-input";
            weightInput.oninput = saveProgress;

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(weightInput);
            exList.appendChild(li);
          });

          muscleDiv.appendChild(exList);
          dayDiv.appendChild(muscleDiv);
        });

        const doneBtn = document.createElement("button");
        doneBtn.className = "done-btn";
        doneBtn.textContent = "✔ Mark as Done";
        doneBtn.onclick = () => {
          const isCompleted = dayDiv.classList.toggle("completed");
          if (isCompleted) {
            workoutStreak++;
            doneBtn.textContent = "✅ Completed";

            logWorkout(split, day);

            if (workoutStreak >= 3) {
              showRestReminder("⚠️ Nate, you've trained 3 days in a row. Take a rest day 💪");
            }
          } else {
            workoutStreak = Math.max(0, workoutStreak - 1);
            doneBtn.textContent = "✔ Mark as Done";
          }
        };
        dayDiv.appendChild(doneBtn);

        splitDiv.appendChild(dayDiv);
      });

      workoutList.appendChild(splitDiv);
    });

    loadProgress();
    updateUnitLabels();
  });
// Save weight + body fat logs
function saveBodyLog() {
  const weight = document.getElementById("weight-input").value;
  const bodyFat = document.getElementById("bodyfat-input").value;

  if (!weight && !bodyFat) return;

  const logs = JSON.parse(localStorage.getItem("bodyLogs") || "[]");
  logs.push({
    date: new Date().toLocaleDateString(),
    weight,
    bodyFat
  });
  localStorage.setItem("bodyLogs", JSON.stringify(logs));

  document.getElementById("weight-input").value = "";
  document.getElementById("bodyfat-input").value = "";
  renderBodyLogs();
}

// Render weight/body fat history
function renderBodyLogs() {
  const container = document.getElementById("body-log-history");
  container.innerHTML = "";

  const logs = JSON.parse(localStorage.getItem("bodyLogs") || "[]");
  logs.slice(-5).reverse().forEach(log => {
    const entry = document.createElement("p");
    entry.textContent = `${log.date} - Weight: ${log.weight || "-"} ${unitSystem}, Body Fat: ${log.bodyFat || "-"}%`;
    container.appendChild(entry);
  });
}

// Call on load
document.addEventListener("DOMContentLoaded", renderBodyLogs);
