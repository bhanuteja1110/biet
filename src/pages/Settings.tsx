import { useEffect, useState } from 'react';

export default function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark' | null) ?? 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="card p-5">
      <div className="font-semibold">Settings</div>
      <div className="mt-4 flex items-center gap-4">
        <span>Theme</span>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
          Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </div>
    </div>
  );
}


