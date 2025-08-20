import React, { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import Chart from "chart.js/auto";

/** ---------------------------
 * Icons (Inline SVG to avoid dependencies)
 * -------------------------- */
const icons = {
  Home: ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>),
  Dumbbell: ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m14.4 14.4-1.8 1.8a2 2 0 0 1-2.8 0L9.4 13.4a2 2 0 0 1 0-2.8l1.8-1.8"/><path d="m16 2-3 3"/><path d="m21 7-3-3"/><path d="M3 15 2 16"/><path d="M8 20l-1 1"/><path d="m20 8-1 1"/><path d="m4 19-1 1"/></svg>),
  ChartLine: ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>),
  Settings: ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.5a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.5a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>),
  Plus: ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>),
  Trash: ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>),
  X: ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>)
};

/** ---------------------------
 * Local storage keys & helpers
 * -------------------------- */
const LS = {
  SETTINGS: "fitnessapp.settings",
  ACTIVE: "fitnessapp.active",
  LOGS: "fitnessapp.logs",
  BODY: "fitnessapp.body",
  NUTRITION: "fitnessapp.nutrition",
};

const loadLS = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? fallback;
  } catch (e) {
    console.error(`Failed to load key '${k}' from local storage:`, e);
    return fallback;
  }
};

const saveLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    console.error(`Failed to save key '${k}' to local storage:`, e);
  }
};

const today = new Date().toISOString().split('T')[0];

/** ---------------------------
 * Programs Data
 * -------------------------- */
const PROGRAMS = {
  "programs": [
    {
      "id": "full_body",
      "name": "Full Body",
      "program_notes": [
        "Train 3x per week on non-consecutive days.",
        "Rest at least 1 day between sessions.",
        "The first two weeks are RPE ~7-8, after that push sets to RPE 9-10.",
        "See the Hypertrophy Handbook for more details."
      ],
      "warmups": {
        "general": [
          "5-10 minutes light cardio (bike, jog, row)",
          "Dynamic stretches (arm circles, leg swings)"
        ],
        "exercise_specific": [
          "Do 1-2 lighter sets of each main lift before working sets."
        ]
      },
      "weak_points": [
        "If chest is weak: add extra set of Dumbbell Press.",
        "If back is weak: add extra set of Barbell Rows."
      ],
      "days": [
        {
          "day": "Day 1 - Full Body A",
          "type": "training",
          "exercises": [
            { "name": "Barbell Back Squat", "sets": 4, "reps": "6-8", "notes": "Focus on depth; keep core tight.", "muscle": "Quads" },
            { "name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "notes": "Pause 1s at chest, explosive press.", "muscle": "Chest" },
            { "name": "Barbell Row", "sets": 4, "reps": "8-10", "notes": "Squeeze shoulder blades together.", "muscle": "Back" },
            { "name": "Overhead Press", "sets": 3, "reps": "8-10", "notes": "Keep core tight, push head through at top.", "muscle": "Shoulders" },
            { "name": "Dumbbell Bicep Curl", "sets": 3, "reps": "10-12", "notes": "Don’t swing weights.", "muscle": "Biceps" },
            { "name": "Skullcrushers", "sets": 3, "reps": "10-12", "notes": "Keep elbows tucked.", "muscle": "Triceps" }
          ]
        },
        {
          "day": "Day 2 - Full Body B",
          "type": "training",
          "exercises": [
            { "name": "Barbell Deadlift", "sets": 3, "reps": "5-6", "notes": "Maintain flat back, drive through heels.", "muscle": "Full Body" },
            { "name": "Incline Dumbbell Press", "sets": 3, "reps": "8-10", "notes": "Get a good stretch at the bottom.", "muscle": "Chest" },
            { "name": "Lat Pulldown", "sets": 3, "reps": "10-12", "notes": "Feel the stretch at the top, squeeze lats down.", "muscle": "Back" },
            { "name": "Lateral Raises", "sets": 3, "reps": "12-15", "notes": "Lead with elbows, lift to shoulder height.", "muscle": "Shoulders" },
            { "name": "Hammer Curl", "sets": 3, "reps": "8-10", "notes": "Keep palms facing each other.", "muscle": "Biceps" },
            { "name": "Triceps Pressdown", "sets": 3, "reps": "10-12", "notes": "Full extension.", "muscle": "Triceps" }
          ]
        },
        {
          "day": "Day 3 - Full Body C",
          "type": "training",
          "exercises": [
            { "name": "Leg Press", "sets": 3, "reps": "10-12", "notes": "Don’t lock knees at the top.", "muscle": "Quads" },
            { "name": "Machine Chest Press", "sets": 3, "reps": "10-12", "notes": "Focus on muscle contraction.", "muscle": "Chest" },
            { "name": "Seated Cable Row", "sets": 3, "reps": "10-12", "notes": "Pull with your back, not your arms.", "muscle": "Back" },
            { "name": "Machine Shoulder Press", "sets": 3, "reps": "10-12", "notes": "Control the weight throughout the movement.", "muscle": "Shoulders" },
            { "name": "Preacher Curl", "sets": 3, "reps": "10-12", "notes": "Keep arms fixed on the pad.", "muscle": "Biceps" },
            { "name": "Overhead Triceps Extension", "sets": 3, "reps": "10-12", "notes": "Keep elbows close to your head.", "muscle": "Triceps" }
          ]
        }
      ]
    },
    {
      "id": "upper_lower",
      "name": "Upper/Lower",
      "program_notes": [
        "Train 4x per week.",
        "Upper/Lower split is effective for muscle growth and strength.",
        "Most sets are taken to an RPE of 9-10 (0-1 reps shy of failure).",
        "See the Hypertrophy Handbook for full details."
      ],
      "warmups": {
        "general": [
          "5-10 minutes light cardio (bike, jog, row)",
          "Dynamic stretches (arm circles, leg swings)"
        ],
        "exercise_specific": [
          "Do 1-2 lighter sets of each main lift before working sets."
        ]
      },
      "weak_points": [
        "Select a weak point from the Hypertrophy Handbook."
      ],
      "days": [
        {
          "day": "Day 1 - Upper",
          "type": "training",
          "exercises": [
            { "name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "notes": "Pause 1s at chest, explosive press.", "muscle": "Chest" },
            { "name": "Lat Pulldown", "sets": 3, "reps": "10-12", "notes": "Squeeze lats at the bottom.", "muscle": "Back" },
            { "name": "Incline Dumbbell Press", "sets": 3, "reps": "8-10", "notes": "Get a good stretch at the bottom.", "muscle": "Chest" },
            { "name": "Seated Cable Row", "sets": 3, "reps": "10-12", "notes": "Pull with your back, not your arms.", "muscle": "Back" },
            { "name": "Overhead Triceps Extension", "sets": 3, "reps": "10-12", "notes": "Keep elbows close to your head.", "muscle": "Triceps" },
            { "name": "Dumbbell Bicep Curl", "sets": 3, "reps": "10-12", "notes": "Don't swing the weights.", "muscle": "Biceps" }
          ]
        },
        {
          "day": "Day 2 - Lower",
          "type": "training",
          "exercises": [
            { "name": "Barbell Back Squat", "sets": 4, "reps": "6-8", "notes": "Parallel or deeper.", "muscle": "Quads" },
            { "name": "Romanian Deadlift", "sets": 3, "reps": "8-10", "notes": "Stretch hamstrings at bottom.", "muscle": "Hamstrings" },
            { "name": "Bulgarian Split Squats", "sets": 3, "reps": "10-12 each leg", "notes": "Drive through front heel.", "muscle": "Quads" },
            { "name": "Leg Press", "sets": 3, "reps": "12-15", "notes": "Don’t lock knees.", "muscle": "Quads" },
            { "name": "Standing Calf Raises", "sets": 3, "reps": "12-20", "notes": "Full stretch at bottom, squeeze at top.", "muscle": "Calves" }
          ]
        },
        {
          "day": "Day 3 - Upper",
          "type": "training",
          "exercises": [
            { "name": "Overhead Press", "sets": 4, "reps": "6-8", "notes": "Push head through at top.", "muscle": "Shoulders" },
            { "name": "Barbell Row", "sets": 4, "reps": "8-10", "notes": "Squeeze shoulder blades together.", "muscle": "Back" },
            { "name": "Cable Crossover", "sets": 3, "reps": "12-15", "notes": "Feel the contraction in your chest.", "muscle": "Chest" },
            { "name": "Pull-ups", "sets": 3, "reps": "Max Reps", "notes": "Use assistance if needed.", "muscle": "Back" },
            { "name": "Close-Grip Triceps Pressdown", "sets": 3, "reps": "10-12", "notes": "Keep elbows fixed.", "muscle": "Triceps" },
            { "name": "Incline Dumbbell Curl", "sets": 3, "reps": "10-12", "notes": "Emphasize stretch at bottom.", "muscle": "Biceps" }
          ]
        },
        {
          "day": "Day 4 - Lower",
          "type": "training",
          "exercises": [
            { "name": "Leg Extension", "sets": 3, "reps": "12-15", "notes": "Squeeze quads hard at the top.", "muscle": "Quads" },
            { "name": "Lying Leg Curl", "sets": 3, "reps": "10-12", "notes": "Get a full contraction on your hamstrings.", "muscle": "Hamstrings" },
            { "name": "Calf Press on Leg Press", "sets": 3, "reps": "15-20", "notes": "Slow and controlled.", "muscle": "Calves" },
            { "name": "Glute Bridges", "sets": 3, "reps": "15-20", "notes": "Squeeze glutes at the top.", "muscle": "Glutes" }
          ]
        }
      ]
    },
    {
      "id": "ppl",
      "name": "Push/Pull/Legs",
      "program_notes": [
        "Train 6x per week.",
        "Most sets are taken to an RPE of 9-10 (0-1 reps shy of failure).",
        "This is a 10-day asynchronous split.",
        "See the Hypertrophy Handbook for full details."
      ],
      "warmups": {
        "general": [
          "5-10 minutes light cardio (bike, jog, row)",
          "Dynamic stretches (arm circles, leg swings)"
        ],
        "exercise_specific": [
          "Do 1-2 lighter sets of each main lift before working sets."
        ]
      },
      "weak_points": [
        "Select a weak point from the Hypertrophy Handbook."
      ],
      "days": [
        {
          "day": "Day 1 - Push",
          "type": "training",
          "exercises": [
            { "name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "notes": "Push to RPE 9-10.", "muscle": "Chest" },
            { "name": "Incline Dumbbell Press", "sets": 3, "reps": "8-10", "notes": "Control the negative.", "muscle": "Chest" },
            { "name": "Overhead Press", "sets": 3, "reps": "8-10", "notes": "Keep core tight.", "muscle": "Shoulders" },
            { "name": "Lateral Raises", "sets": 3, "reps": "12-15", "notes": "Lift with elbows.", "muscle": "Shoulders" },
            { "name": "Skullcrushers", "sets": 3, "reps": "10-12", "notes": "Keep elbows tucked.", "muscle": "Triceps" },
            { "name": "Triceps Pressdown (Bar)", "sets": 2, "reps": "12-15", "notes": "Squeeze triceps at the bottom.", "muscle": "Triceps" }
          ]
        },
        {
          "day": "Day 2 - Pull",
          "type": "training",
          "exercises": [
            { "name": "Barbell Row", "sets": 4, "reps": "6-8", "notes": "Explosive pull, controlled negative.", "muscle": "Back" },
            { "name": "Lat Pulldown", "sets": 3, "reps": "10-12", "notes": "Get a full stretch at the top.", "muscle": "Back" },
            { "name": "Seated Cable Row", "sets": 3, "reps": "10-12", "notes": "Pull with your back, not your arms.", "muscle": "Back" },
            { "name": "Face Pulls", "sets": 3, "reps": "15-20", "notes": "Focus on external rotation.", "muscle": "Back" },
            { "name": "Hammer Curl", "sets": 2, "reps": "12-15", "notes": "Keep palms facing each other.", "muscle": "Biceps" },
            { "name": "Cable Curl", "sets": 2, "reps": "12-15", "notes": "Keep tension on the biceps.", "muscle": "Biceps" }
          ]
        },
        {
          "day": "Day 3 - Legs",
          "type": "training",
          "exercises": [
            { "name": "Barbell Back Squat", "sets": 4, "reps": "6-8", "notes": "Parallel or deeper.", "muscle": "Quads" },
            { "name": "Romanian Deadlift", "sets": 3, "reps": "8-10", "notes": "Stretch hamstrings at bottom.", "muscle": "Hamstrings" },
            { "name": "Bulgarian Split Squats", "sets": 3, "reps": "10-12 each leg", "notes": "Drive through front heel.", "muscle": "Quads" },
            { "name": "Leg Extension", "sets": 3, "reps": "12-15", "notes": "Squeeze quads hard.", "muscle": "Quads" },
            { "name": "Standing Calf Raises", "sets": 3, "reps": "12-20", "notes": "Full stretch at bottom, squeeze at top.", "muscle": "Calves" }
          ]
        },
        {
          "day": "Day 4 - Rest",
          "type": "rest",
          "exercises": []
        },
        {
          "day": "Day 5 - Push 2",
          "type": "training",
          "exercises": [
            { "name": "Machine Chest Press", "sets": 4, "reps": "8-10", "notes": "Focus on the contraction.", "muscle": "Chest" },
            { "name": "Decline Press", "sets": 3, "reps": "8-10", "notes": "Good for lower chest.", "muscle": "Chest" },
            { "name": "Machine Shoulder Press", "sets": 3, "reps": "10-12", "notes": "Controlled movement.", "muscle": "Shoulders" },
            { "name": "Lateral Raises (Machine)", "sets": 3, "reps": "12-15", "notes": "Isolation exercise.", "muscle": "Shoulders" },
            { "name": "Triceps Diverging Pressdown", "sets": 2, "reps": "12-15", "notes": "Lean slightly forward, flare elbows out.", "muscle": "Triceps" },
            { "name": "Reverse-Grip Cable Curl", "sets": 2, "reps": "12-15", "notes": "Works forearms, brachialis and biceps.", "muscle": "Biceps" }
          ]
        },
        {
          "day": "Day 6 - Pull 2",
          "type": "training",
          "exercises": [
            { "name": "Pull-ups", "sets": 4, "reps": "Max Reps", "notes": "Use assistance if needed.", "muscle": "Back" },
            { "name": "T-Bar Row", "sets": 3, "reps": "8-10", "notes": "Focus on the squeeze.", "muscle": "Back" },
            { "name": "Single-Arm Dumbbell Row", "sets": 3, "reps": "10-12 each arm", "notes": "Controlled stretch at the bottom.", "muscle": "Back" },
            { "name": "Shrugs", "sets": 3, "reps": "12-15", "notes": "Squeeze traps at the top.", "muscle": "Traps" },
            { "name": "Preacher Curl", "sets": 2, "reps": "10-12", "notes": "Keep arms fixed on the pad.", "muscle": "Biceps" },
            { "name": "Roman Chair Leg Raise", "sets": 2, "reps": "10-20", "notes": "Round lower back as you curl legs up.", "muscle": "Abs" }
          ]
        }
      ]
    }
  ]
};

/** ---------------------------
 * Local storage keys & helpers
 * -------------------------- */
const LS = {
  SETTINGS: "fitnessapp.settings",
  ACTIVE: "fitnessapp.active",
  LOGS: "fitnessapp.logs",
  BODY: "fitnessapp.body",
  NUTRITION: "fitnessapp.nutrition",
};

const loadLS = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? fallback;
  } catch (e) {
    console.error(`Failed to load key '${k}' from local storage:`, e);
    return fallback;
  }
};

const saveLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    console.error(`Failed to save key '${k}' to local storage:`, e);
  }
};

const today = new Date().toISOString().split('T')[0];

/** ---------------------------
 * App Context
 * -------------------------- */
const AppContext = createContext();

/** ---------------------------
 * Root App Component
 * -------------------------- */
export default function App() {
  const [tab, setTab] = useState("workouts");
  const [activeWorkout, setActiveWorkout] = useState(loadLS(LS.ACTIVE, null));
  const [exerciseLogs, setExerciseLogs] = useState(loadLS(LS.LOGS, []));
  const [bodyStats, setBodyStats] = useState(loadLS(LS.BODY, []));
  const [nutrition, setNutrition] = useState(loadLS(LS.NUTRITION, {}));
  const [settings, setSettings] = useState(loadLS(LS.SETTINGS, { units: "kg" }));
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => { saveLS(LS.ACTIVE, activeWorkout); }, [activeWorkout]);
  useEffect(() => { saveLS(LS.LOGS, exerciseLogs); }, [exerciseLogs]);
  useEffect(() => { saveLS(LS.BODY, bodyStats); }, [bodyStats]);
  useEffect(() => { saveLS(LS.NUTRITION, nutrition); }, [nutrition]);
  useEffect(() => { saveLS(LS.SETTINGS, settings); }, [settings]);
  
  // Handle dark mode setting
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const handleWorkoutSelect = (programId, dayIndex) => {
    const program = PROGRAMS.programs.find(p => p.id === programId);
    if (!program) return;
    const day = program.days[dayIndex];
    if (day.type === "rest") {
      alert("This is a rest day. Enjoy!");
      return;
    }
    setActiveWorkout({
      programId: programId,
      day: day.day,
      exercises: day.exercises.map(ex => ({ ...ex, sets: [] })),
      activeExerciseIndex: 0
    });
    setTab("today");
  };

  const handleLogSet = (exerciseName, set) => {
    const newLog = {
      exercise: exerciseName,
      weight: parseFloat(set.weight) || 0,
      reps: parseInt(set.reps) || 0,
      timestamp: Date.now(),
      date: today
    };
    setExerciseLogs(prev => [...prev, newLog]);
  };

  const handleLogBodyStat = (weight, fat) => {
    const newStat = {
      bodyWeight: parseFloat(weight) || 0,
      bodyFat: parseFloat(fat) || 0,
      timestamp: Date.now(),
      date: today
    };
    setBodyStats(prev => [...prev, newStat]);
  };
  
  const handleLogNutrition = (entry) => {
    const newNutrition = { ...nutrition };
    if (!newNutrition[today]) newNutrition[today] = [];
    newNutrition[today].push(entry);
    setNutrition(newNutrition);
  };
  
  const handleFinishWorkout = () => {
    setActiveWorkout(null);
    setTab("log");
  };

  const value = {
    tab, setTab, programsData: PROGRAMS.programs, activeWorkout, setActiveWorkout, 
    exerciseLogs, bodyStats, nutrition, settings, setSettings, isDarkMode, setIsDarkMode,
    handleWorkoutSelect, handleLogSet, handleLogBodyStat, handleLogNutrition, handleFinishWorkout
  };

  return (
    <AppContext.Provider value={value}>
      <Layout />
    </AppContext.Provider>
  );
}

// Main layout and navigation
const Layout = () => {
  const { tab, isDarkMode } = useContext(AppContext);

  const renderView = () => {
    switch (tab) {
      case "workouts": return <WorkoutsView />;
      case "today": return <TodayView />;
      case "log": return <LogView />;
      case "stats": return <StatsView />;
      case "nutrition": return <NutritionView />;
      case "settings": return <SettingsView />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
        {renderView()}
      </div>
      <Navbar />
    </div>
  );
};

// --- Sub-Components ---
const Header = () => (
  <header className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg shadow-sm border-b border-gray-200 dark:border-neutral-800 p-4 sticky top-0 z-10 flex justify-center items-center">
    <h1 className="text-xl font-bold">FitnessApp</h1>
  </header>
);

const Navbar = () => {
  const { tab, setTab } = useContext(AppContext);
  const navItems = [
    { id: "workouts", label: "Workouts", icon: icons.Home },
    { id: "today", label: "Today", icon: icons.Dumbbell },
    { id: "log", label: "Log", icon: icons.ChartLine },
    { id: "nutrition", label: "Nutrition", icon: icons.Plus },
    { id: "settings", label: "Settings", icon: icons.Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-neutral-800 py-2 safe-area-inset-bottom">
      <div className="flex justify-around items-center max-w-xl mx-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${tab === item.id ? "text-blue-500" : "text-neutral-500"}`}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const WorkoutsView = () => {
  const { programsData, handleWorkoutSelect } = useContext(AppContext);

  return (
    <div className="space-y-6">
      {programsData.map(program => (
        <div key={program.id} className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md space-y-4">
          <h2 className="text-lg font-bold">{program.name}</h2>
          <ul className="list-disc list-inside text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
            {program.program_notes.map((note, i) => (<li key={i}>{note}</li>))}
          </ul>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {program.days.map((day, dayIndex) => (
              <button
                key={dayIndex}
                onClick={() => handleWorkoutSelect(program.id, dayIndex)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  day.type === 'rest'
                    ? 'bg-gray-200 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow'
                }`}
              >
                {day.day}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const TodayView = () => {
  const { activeWorkout, handleFinishWorkout, handleLogSet } = useContext(AppContext);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);

  if (!activeWorkout) {
    return <p className="text-center text-neutral-500">Please select a workout from the "Workouts" tab.</p>;
  }

  const activeExercise = activeWorkout.exercises[activeExerciseIndex];
  const totalExercises = activeWorkout.exercises.length;
  
  const [restTime, setRestTime] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (restTime > 0) {
      timerRef.current = setInterval(() => {
        setRestTime(t => t - 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [restTime]);

  const handleNext = () => {
    if (activeExerciseIndex < totalExercises - 1) {
      setActiveExerciseIndex(prev => prev + 1);
      setRestTime(0);
    } else {
      handleFinishWorkout();
    }
  };

  const handlePrevious = () => {
    if (activeExerciseIndex > 0) {
      setActiveExerciseIndex(prev => prev - 1);
      setRestTime(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-bold">{activeWorkout.day}</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Exercise {activeExerciseIndex + 1} of {totalExercises}
        </p>
      </div>
      
      {activeExercise && (
        <WorkoutSession
          exercise={activeExercise}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isFirst={activeExerciseIndex === 0}
          isLast={activeExerciseIndex === totalExercises - 1}
          restTime={restTime}
          setRestTime={setRestTime}
        />
      )}
    </div>
  );
};

const WorkoutSession = ({ exercise, onNext, onPrevious, isFirst, isLast, restTime, setRestTime }) => {
  const { handleLogSet } = useContext(AppContext);
  const [sets, setSets] = useState(Array(exercise.sets).fill({ weight: "", reps: "" }));

  const handleLog = (setIndex) => {
    if (sets[setIndex].reps && sets[setIndex].weight) {
      handleLogSet(exercise.name, sets[setIndex]);
      setRestTime(90); // Start 90s rest timer
    }
  };
  
  const handleSetChange = (setIndex, field, value) => {
      const newSets = [...sets];
      newSets[setIndex] = { ...newSets[setIndex], [field]: value };
      setSets(newSets);
  };
  
  return (
    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md space-y-4">
      <h3 className="text-xl font-bold">{exercise.name}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{exercise.notes}</p>
      
      {restTime > 0 ? (
        <div className="text-center p-4 bg-blue-500/10 text-blue-500 rounded-lg font-semibold">
          Resting: {restTime}s
        </div>
      ) : (
        <div className="text-center p-4 bg-green-500/10 text-green-500 rounded-lg font-semibold">
          Ready to go!
        </div>
      )}
      
      {sets.map((set, setIndex) => (
        <div key={setIndex} className="grid grid-cols-4 gap-2 items-center">
          <span className="text-sm text-neutral-500">Set {setIndex + 1}</span>
          <input
            type="number"
            placeholder="Weight"
            value={set.weight}
            onChange={(e) => handleSetChange(setIndex, "weight", e.target.value)}
            className="col-span-1 w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Reps"
            value={set.reps}
            onChange={(e) => handleSetChange(setIndex, "reps", e.target.value)}
            className="col-span-1 w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleLog(setIndex)}
            className="py-2 px-2 rounded-lg font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
          >
            Log
          </button>
        </div>
      ))}
      
      <div className="flex justify-between mt-4">
        <button
          onClick={onPrevious}
          disabled={isFirst}
          className="py-2 px-4 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 font-medium disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          className="py-2 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium"
        >
          {isLast ? "Finish Workout" : "Next Exercise"}
        </button>
      </div>
    </div>
  );
};

const NutritionView = () => {
    const { nutrition, handleLogNutrition } = useContext(AppContext);
    const [food, setFood] = useState("");
    const [calories, setCalories] = useState("");
    const [protein, setProtein] = useState("");
    const [carbs, setCarbs] = useState("");
    const [fat, setFat] = useState("");
    
    const handleLog = () => {
      if (!food || !calories) {
        alert("Food and calories are required.");
        return;
      }
      const newEntry = {
        food: food,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        timestamp: Date.now(),
      };
      handleLogNutrition(newEntry);
      setFood("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
    };
    
    const dailyEntries = useMemo(() => {
        return nutrition[today] || [];
    }, [nutrition]);
    
    const totals = useMemo(() => {
        return dailyEntries.reduce((acc, entry) => {
            acc.calories += entry.calories;
            acc.protein += entry.protein;
            acc.carbs += entry.carbs;
            acc.fat += entry.fat;
            return acc;
        }, {calories: 0, protein: 0, carbs: 0, fat: 0});
    }, [dailyEntries]);
    
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md space-y-4">
                <h2 className="text-lg font-bold">Log Food for Today</h2>
                <input
                    type="text"
                    placeholder="Food Item"
                    value={food}
                    onChange={(e) => setFood(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="number" placeholder="Protein (g)" value={protein} onChange={(e) => setProtein(e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="number" placeholder="Carbs (g)" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="number" placeholder="Fat (g)" value={fat} onChange={(e) => setFat(e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleLog} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors">Log Food</button>
            </div>
            
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md space-y-4">
                <h2 className="text-lg font-bold">Daily Totals</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-neutral-500">
                    <div><p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{totals.calories}</p><p>Calories</p></div>
                    <div><p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{totals.protein}g</p><p>Protein</p></div>
                    <div><p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{totals.carbs}g</p><p>Carbs</p></div>
                    <div><p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{totals.fat}g</p><p>Fat</p></div>
                </div>
                
                <h3 className="text-lg font-semibold mt-4">Entries</h3>
                {dailyEntries.length > 0 ? (
                    <ul className="space-y-2">
                        {dailyEntries.map((entry, i) => (
                            <li key={i} className="flex justify-between items-center bg-neutral-100 dark:bg-neutral-700 p-3 rounded-lg">
                                <span className="font-medium">{entry.food}</span>
                                <span className="text-sm text-neutral-500">{entry.calories} cal</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-neutral-500">No food logged for today.</p>
                )}
            </div>
        </div>
    );
};

const LogView = () => {
  const { exerciseLogs, bodyStats, settings } = useContext(AppContext);
  const sortedLogs = useMemo(() => {
    return [...exerciseLogs].sort((a,b) => b.timestamp - a.timestamp);
  }, [exerciseLogs]);
  const sortedBodyStats = useMemo(() => {
      return [...bodyStats].sort((a,b) => b.timestamp - a.timestamp);
  }, [bodyStats]);
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-bold mb-2">Workout Log</h2>
        {sortedLogs.length === 0 ? (
          <p className="text-neutral-500 text-sm">No exercise logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className="bg-neutral-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Exercise</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                {sortedLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-50">{log.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-50">{log.exercise}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-50">
                      {log.reps} reps @ {log.weight}{settings.units}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-bold mb-2">Body Stats</h2>
        {sortedBodyStats.length === 0 ? (
          <p className="text-neutral-500 text-sm">No body stats yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className="bg-neutral-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Weight</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Fat %</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                {sortedBodyStats.map((stat, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-50">{stat.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-50">{stat.bodyWeight}{settings.units}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-50">{stat.bodyFat || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const StatsView = () => {
    const { bodyStats, exerciseLogs, settings } = useContext(AppContext);
    const weightChartRef = useRef(null);
    const fatChartRef = useRef(null);

    const sortedBodyStats = useMemo(() => {
      return [...bodyStats].sort((a,b) => a.timestamp - b.timestamp);
    }, [bodyStats]);
    
    // Total stats
    const totalWorkouts = useMemo(() => {
        const dates = new Set(exerciseLogs.map(log => log.date));
        return dates.size;
    }, [exerciseLogs]);

    const totalSets = exerciseLogs.length;

    useEffect(() => {
        if (!bodyStats || bodyStats.length < 2) return;
        
        const dates = sortedBodyStats.map(d => d.date);
        const weights = sortedBodyStats.map(d => d.bodyWeight);
        const fats = sortedBodyStats.map(d => d.bodyFat);

        // Destroy previous charts to prevent conflicts
        if (weightChartRef.current) weightChartRef.current.destroy();
        if (fatChartRef.current) fatChartRef.current.destroy();

        const weightCtx = document.getElementById("weightChart").getContext("2d");
        const fatCtx = document.getElementById("fatChart").getContext("2d");

        weightChartRef.current = new Chart(weightCtx, {
            type: "line",
            data: {
                labels: dates,
                datasets: [{
                    label: `Body Weight (${settings.units})`,
                    data: weights,
                    borderColor: "rgb(59, 130, 246)",
                    tension: 0.4,
                    pointBackgroundColor: "rgb(59, 130, 246)",
                }],
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: "rgb(156, 163, 175)" }, grid: { color: "rgba(156, 163, 175, 0.2)" } },
                    y: { ticks: { color: "rgb(156, 163, 175)" }, grid: { color: "rgba(156, 163, 175, 0.2)" } },
                }
            }
        });

        fatChartRef.current = new Chart(fatCtx, {
            type: "line",
            data: {
                labels: dates,
                datasets: [{
                    label: "Body Fat %",
                    data: fats,
                    borderColor: "rgb(251, 146, 60)",
                    tension: 0.4,
                    pointBackgroundColor: "rgb(251, 146, 60)",
                }],
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: "rgb(156, 163, 175)" }, grid: { color: "rgba(156, 163, 175, 0.2)" } },
                    y: { ticks: { color: "rgb(156, 163, 175)" }, grid: { color: "rgba(156, 163, 175, 0.2)" } },
                }
            }
        });
        
        return () => {
            if (weightChartRef.current) weightChartRef.current.destroy();
            if (fatChartRef.current) fatChartRef.current.destroy();
        };

    }, [sortedBodyStats, settings.units]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md text-center">
                  <p className="text-3xl font-bold text-blue-500">{totalWorkouts}</p>
                  <p className="text-neutral-500 text-sm">Workouts</p>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md text-center">
                  <p className="text-3xl font-bold text-blue-500">{totalSets}</p>
                  <p className="text-neutral-500 text-sm">Total Sets</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
                <h2 className="text-lg font-bold mb-2">Body Weight Trend</h2>
                {bodyStats.length > 1 ? (
                    <canvas id="weightChart" className="w-full"></canvas>
                ) : (
                    <p className="text-neutral-500 text-sm text-center">Log at least 2 body weight entries to see a chart.</p>
                )}
            </div>

            <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
                <h2 className="text-lg font-bold mb-2">Body Fat Trend</h2>
                {bodyStats.filter(s => s.bodyFat).length > 1 ? (
                    <canvas id="fatChart" className="w-full"></canvas>
                ) : (
                    <p className="text-neutral-500 text-sm text-center">Log at least 2 body fat entries to see a chart.</p>
                )}
            </div>
        </div>
    );
};

const SettingsView = () => {
  const { settings, setSettings, handleLogBodyStat } = useContext(AppContext);
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");

  const handleLog = () => {
    if (weight) {
      handleLogBodyStat(weight, fat);
      setWeight("");
      setFat("");
    }
  };
  
  const handleExportData = () => {
    const data = {
      exerciseLogs: loadLS(LS.LOGS, []),
      bodyStats: loadLS(LS.BODY, []),
      nutrition: loadLS(LS.NUTRITION, {}),
      settings: loadLS(LS.SETTINGS, {})
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fitness_data_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.exerciseLogs) saveLS(LS.LOGS, importedData.exerciseLogs);
        if (importedData.bodyStats) saveLS(LS.BODY, importedData.bodyStats);
        if (importedData.nutrition) saveLS(LS.NUTRITION, importedData.nutrition);
        if (importedData.settings) saveLS(LS.SETTINGS, importedData.settings);
        window.location.reload(); // Reload to reflect changes
      } catch (error) {
        alert("Failed to import data. Please check the file format.");
        console.error("Error importing data:", error);
      }
    };
    reader.readAsText(file);
  };


  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-bold mb-2">Units</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setSettings(prev => ({ ...prev, units: "kg" }))}
            className={`py-2 px-4 rounded-full font-medium transition-colors ${settings.units === "kg" ? "bg-blue-500 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50"}`}
          >
            Kilograms
          </button>
          <button
            onClick={() => setSettings(prev => ({ ...prev, units: "lb" }))}
            className={`py-2 px-4 rounded-full font-medium transition-colors ${settings.units === "lb" ? "bg-blue-500 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50"}`}
          >
            Pounds
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-bold mb-2">Body Stats</h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-2">
          <input
            type="number"
            placeholder={`Body Weight (${settings.units})`}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Body Fat %"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleLog}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors"
        >
          Add Body Stat
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-bold mb-2">Data Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleExportData}
            className="flex-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 py-2 rounded-lg transition-colors"
          >
            Export to JSON
          </button>
          <label className="flex-1 text-center bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 py-2 rounded-lg cursor-pointer transition-colors">
            Import from JSON
            <input type="file" onChange={handleImportData} accept=".json" hidden />
          </label>
        </div>
      </div>
    </div>
  );
};

// Start the app
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
