import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ToastContainer } from './components/ui/toast';
import { Dashboard } from './pages/Dashboard';
import { Income } from './pages/Income';
import { Bills } from './pages/Bills';
import { Expenses } from './pages/Expenses';
import { Debts } from './pages/Debts';
import { People } from './pages/People';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { useSettingsStore } from './stores/settingsStore';
import { usePersonsStore } from './stores/personsStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const PAGES_WITH_MONTH = new Set(['/dashboard', '/income', '/bills', '/expenses', '/people']);

export default function App(): React.ReactElement {
  const loadSettings = useSettingsStore((s) => s.load);
  const loadPersons = usePersonsStore((s) => s.load);
  const theme = useSettingsStore((s) => s.theme);
  const { pathname } = useLocation();
  const [newRequestKey, setNewRequestKey] = useState(0);
  const [exportKey, setExportKey] = useState(0);
  const newReqRef = useRef(newRequestKey);
  newReqRef.current = newRequestKey;

  useEffect(() => {
    loadSettings();
    loadPersons();
  }, [loadSettings, loadPersons]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'light') root.classList.remove('dark');
    else if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.toggle('dark', mq.matches);
    }
  }, [theme]);

  useKeyboardShortcuts(
    () => setNewRequestKey((k) => k + 1),
    () => setExportKey((k) => k + 1),
  );

  const showMonth = PAGES_WITH_MONTH.has(pathname);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar showMonthSelector={showMonth} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/income" element={<Income newRequestKey={newRequestKey} />} />
            <Route path="/bills" element={<Bills newRequestKey={newRequestKey} />} />
            <Route path="/expenses" element={<Expenses newRequestKey={newRequestKey} />} />
            <Route path="/debts" element={<Debts newRequestKey={newRequestKey} />} />
            <Route path="/people" element={<People newRequestKey={newRequestKey} />} />
            <Route path="/reports" element={<Reports exportKey={exportKey} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
