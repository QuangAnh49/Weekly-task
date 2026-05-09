import WeeklyTaskReminder from "./WeeklyTaskReminder.js";

export function mount() {
  const root = document.getElementById("root");
  if (!root) return;
  import("react-dom/client").then(({ createRoot }) => {
    createRoot(root).render(<WeeklyTaskReminder />);
  });
}

mount();
