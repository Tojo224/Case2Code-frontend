import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Modo Oscuro activo (cambiar a Modo Claro)' : 'Modo Claro activo (cambiar a Modo Oscuro)'}
      className="p-2 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs flex items-center justify-center cursor-pointer"
    >
      {isDark ? (
        <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20 animate-fade-in" />
      ) : (
        <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20 animate-fade-in" />
      )}
    </button>
  );
};
