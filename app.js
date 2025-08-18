function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// Track streak of consecutive completed days
let workoutStreak = 0;

// Function to show rest reminder banner
function showRestReminder(message) {
  const reminder = document.createElement("div");
  reminder.className = "rest-reminder";
  reminder.textContent = message;

  document.body.appendChild(reminder);

  // Slide in
  setTimeout(() => reminder.classList.add("show"), 100);

  // Slide out after 4s
  setTimeout(() => {
    reminder.classList.remove("show");
    setTimeout(() => reminder.remove(), 500);
  }, 4000);
}

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
            li.textContent = ex;
            exList.appendChild(li);
          });

          muscleDiv.appendChild(exList);
          dayDiv.appendChild(muscleDiv);
        });

        // Add "Mark as Done" button
        const doneBtn = document.createElement("button");
        doneBtn.className = "done-btn";
        doneBtn.textContent = "✔ Mark as Done";
        doneBtn.onclick = () => {
          const isCompleted = dayDiv.classList.toggle("completed");
          if (isCompleted) {
            workoutStreak++;
            doneBtn.textContent = "✅ Completed";

            // Rest reminder if streak gets high
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
  });
