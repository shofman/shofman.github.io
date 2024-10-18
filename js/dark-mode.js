const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
const toggleButton = document.getElementById("dark-mode-toggle");

if (prefersDarkMode && prefersDarkMode.matches) {
  document.body.classList.add("dark-mode");
}

let isExpanding = false;
toggleButton.addEventListener("click", () => {
  if (isExpanding) return;
  isExpanding = true;
  const isDarkMode = document.body.classList.toggle("dark-mode");

  setTimeout(() => {
    isExpanding = false;
    localStorage.setItem("darkMode", isDarkMode);
    toggleButton.classList.remove("expand");
  }, 500); // Delay duration matches the CSS transition time
});

const savedDarkMode = localStorage.getItem("darkMode");
if (savedDarkMode === "true") {
  document.body.classList.add("dark-mode");
}
