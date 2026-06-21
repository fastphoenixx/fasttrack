import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { CalculatorsPage } from './features/calculators/CalculatorsPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { DailyLogPage } from './features/daily-log/DailyLogPage'
import { HistoryPage } from './features/history/HistoryPage'
import { TrainingPage } from './features/training/TrainingPage'
import { ImportPage } from './features/data/ImportPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { KanbanPage } from './features/tasks/KanbanPage'
import { isConfigured } from './db/client'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/training', label: 'Training' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/calculators', label: 'Calculators' },
  { to: '/import', label: 'Import' },
  { to: '/profile', label: 'Profile' },
]

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl flex items-center gap-5 px-4 h-16">
          <span className="font-display font-bold text-lg tracking-tight">
            Fast<span className="text-[var(--color-accent)]">Track</span>
          </span>
          <nav className="flex gap-1 text-sm">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-[var(--color-surface-2)] text-[var(--color-text)] font-medium'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/log"
            className="ml-auto rounded-md bg-[var(--color-accent)] text-[var(--color-bg)] px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Register
          </NavLink>
        </div>
      </header>

      {!isConfigured && (
        <div className="bg-[var(--color-signal)] text-[var(--color-text)] text-sm px-4 py-2 text-center border-b border-[var(--color-border)]">
          Backend not connected yet — calculators work offline; logging, history &amp;
          tasks light up once the database is wired.
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/log" element={<DailyLogPage />} />
          <Route path="/tasks" element={<KanbanPage />} />
          <Route path="/calculators" element={<CalculatorsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
