function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// Load workouts from JSON and display all at once
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

        splitDiv.appendChild(dayDiv);
      });

      workoutList.appendChild(splitDiv);
    });
  });
