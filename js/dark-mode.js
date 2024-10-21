const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
const savedDarkMode = localStorage.getItem("darkMode");

const setDMButtonText = (isDarkMode) => {
  const toggleButtonText = document.getElementById("dark-mode-text");
  if (isDarkMode) {
    toggleButtonText.innerText = "Light";
  } else {
    toggleButtonText.innerText = "Dark";
  }
}

// savedDarkMode === false only when the user has intentionally set the value to true. Ignore 
if ((prefersDarkMode && prefersDarkMode.matches && savedDarkMode !== "false") || savedDarkMode === "true") {
  document.body.classList.add("dark-mode");
  setDMButtonText(true)
} else if (savedDarkMode === 'false') {
  // User has set value to light-mode
  document.body.classList.add('light-mode')
}

const toggleButton = document.getElementById("dark-mode-toggle");
let isChanging = false;
toggleButton.addEventListener("click", () => {
  if (isChanging) return;
  isChanging = true;
  const isDarkMode = document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDarkMode);

  setDMButtonText(isDarkMode)
  if (!isDarkMode || document.body.classList.contains('light-mode')) {
    document.body.classList.toggle('light-mode')
  }

  setTimeout(() => {
    isChanging = false;
  }, 500); // Delay duration matches the CSS transition time
});
