import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "tapnow_theme";

const readInitialTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  } catch (e) {
    return "dark";
  }
};

export default function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {}

    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light", "theme-solarized");
    if (theme === "dark") {
      root.classList.add("theme-dark");
      document.body.style.backgroundColor = "#09090b";
    } else if (theme === "solarized") {
      root.classList.add("theme-solarized");
      document.body.style.backgroundColor = "#fdf6e3";
    } else {
      root.classList.add("theme-light");
      document.body.style.backgroundColor = "#f4f4f5";
    }
  }, [theme]);

  return { theme, setTheme };
}
