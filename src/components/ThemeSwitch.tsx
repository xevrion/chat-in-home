import React from "react";

interface ThemeSwitchProps {
  theme: string;
  setTheme: (theme: string) => void;
}

export default function ThemeSwitch({ theme, setTheme }: ThemeSwitchProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none">
      <input
        type="checkbox"
        checked={theme === 'dark'}
        onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="sr-only peer"
        aria-label="Toggle dark mode"
      />
      <div
        className={`w-12 h-7 flex items-center rounded-full border border-gray-300 dark:border-gray-700 transition-colors duration-300
          bg-gray-200 dark:bg-gray-800 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-400 shadow-inner`}
      >
        <div
          className={`w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-all duration-300
            bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 transform
            ${theme === 'dark' ? 'translate-x-[20px]' : 'translate-x-0'}`}
        >
          <span className="text-lg">
            {theme === 'dark' ? '🌙' : '☀️'}
          </span>
        </div>
      </div>
    </label>
  );
} 