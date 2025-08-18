function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// Load workouts from JSON
fetch("programs.json")
  .then(res => res.json())
  .then(data => {
    const workoutList = document.getElementById("workout-list");
    Object.keys(data).forEach(split => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<h3>${split}</h3>`;

      card.onclick = () => {
        card.innerHTML = `<h3>${split}</h3>`;
        const workouts = data[split].workouts;
        Object.keys(workouts).forEach(day => {
          const exDiv = document.createElement("div");
          exDiv.className = "exercise";
          exDiv.textContent = `${day}: ${workouts[day]}`;
          card.appendChild(exDiv);
        });
      };

      workoutList.appendChild(card);
    });
  });
