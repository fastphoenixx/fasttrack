import { useEffect, useMemo, useRef, useState } from 'react'
import { AuthGate } from '../auth/AuthGate'
import {
  createColumn,
  createTask,
  deleteColumn,
  deleteTask,
  listColumns,
  listTasks,
  moveTaskToColumn,
  updateColumn,
  updateTask,
} from '../../db/queries'
import type { TaskColumnRow, TaskInput, TaskRow, Urgency } from '../../db/types'
import { Button, Card, Field, Select, TextInput } from '../../ui/components'

const URGENCY_TONE: Record<Urgency, string> = {
  low: 'var(--color-muted)',
  medium: 'var(--color-accent)',
  high: 'var(--color-danger)',
}
const today = () => new Date().toISOString().slice(0, 10)
const overdue = (d: string | null) => !!d && d < today()

/** Due-date filter buckets. */
function matchesDate(due: string | null, filter: string): boolean {
  if (!filter) return true
  if (filter === 'none') return !due
  if (!due) return false
  const td = today()
  if (filter === 'overdue') return due < td
  if (filter === 'today') return due === td
  if (filter === 'week') {
    const wk = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
    return due >= td && due <= wk
  }
  return true
}

// --- card -----------------------------------------------------------------
function TaskCard({
  task,
  onOpen,
  onDragStart,
}: {
  task: TaskRow
  onOpen: (t: TaskRow) => void
  onDragStart: (id: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        // Firefox/Zen require dataTransfer to be set or the drag never starts.
        e.dataTransfer.setData('text/plain', task.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(task.id)
      }}
      onClick={() => onOpen(task)}
      className="relative cursor-pointer overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 pl-4 text-sm hover:border-[var(--color-accent)] transition-colors"
    >
      <span className="absolute left-0 top-0 h-full w-1.5" style={{ background: URGENCY_TONE[task.urgency] }} />
      <div className="font-medium">{task.title}</div>
      {task.description && <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted)]">{task.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-muted)]">
        {task.due_date && (
          <span style={overdue(task.due_date) ? { color: 'var(--color-danger)' } : undefined}>📅 {task.due_date}</span>
        )}
        {task.assignee && (
          <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[var(--color-text)]">
            {task.assignee}
          </span>
        )}
        {task.source !== 'manual' && <span>🎙 {task.source}</span>}
      </div>
    </div>
  )
}

// --- column ---------------------------------------------------------------
function Column({
  col,
  tasks,
  isFirst,
  isLast,
  onDrop,
  onAdd,
  onRename,
  onDelete,
  onMove,
  onOpen,
  onDragStart,
}: {
  col: TaskColumnRow
  tasks: TaskRow[]
  isFirst: boolean
  isLast: boolean
  onDrop: (columnId: string, droppedId?: string) => void
  onAdd: (columnId: string, title: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onOpen: (t: TaskRow) => void
  onDragStart: (id: string) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(col.title)
  const [newTitle, setNewTitle] = useState('')
  const [over, setOver] = useState(false)

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex items-center gap-1 border-b border-[var(--color-border)] px-3 py-2">
        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setRenaming(false)
              if (title.trim() && title !== col.title) onRename(col.id, title.trim())
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-full rounded bg-[var(--color-bg)] border border-[var(--color-border)] px-2 py-0.5 text-sm font-semibold"
          />
        ) : (
          <button onClick={() => setRenaming(true)} className="text-sm font-semibold">
            {col.title}
          </button>
        )}
        <span className="ml-1 font-mono text-xs text-[var(--color-muted)]">{tasks.length}</span>
        <div className="ml-auto flex items-center gap-0.5 text-[var(--color-muted)]">
          <button disabled={isFirst} onClick={() => onMove(col.id, -1)} className="px-1 disabled:opacity-30 hover:text-[var(--color-text)]">‹</button>
          <button disabled={isLast} onClick={() => onMove(col.id, 1)} className="px-1 disabled:opacity-30 hover:text-[var(--color-text)]">›</button>
          <button onClick={() => onDelete(col.id)} className="px-1 hover:text-[var(--color-danger)]">✕</button>
        </div>
      </header>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { setOver(false); onDrop(col.id, e.dataTransfer.getData('text/plain')) }}
        className={`flex min-h-24 flex-1 flex-col gap-2 p-2 transition-colors ${over ? 'bg-[var(--color-surface-2)]' : ''}`}
      >
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onOpen={onOpen} onDragStart={onDragStart} />
        ))}
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTitle.trim()) {
              onAdd(col.id, newTitle.trim())
              setNewTitle('')
            }
          }}
          placeholder="+ add card"
          className="rounded-md border border-dashed border-[var(--color-border)] bg-transparent px-3 py-2 text-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] outline-none"
        />
      </div>
    </div>
  )
}

// --- detail modal ---------------------------------------------------------
function TaskEditor({
  task,
  columns,
  onClose,
  onSaved,
}: {
  task: TaskRow
  columns: TaskColumnRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [f, setF] = useState({
    title: task.title,
    description: task.description ?? '',
    due_date: task.due_date ?? '',
    urgency: task.urgency,
    assignee: task.assignee ?? '',
    column_id: task.column_id ?? columns[0]?.id ?? '',
  })
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }))

  async function save() {
    const patch: Partial<TaskInput> = {
      title: f.title.trim() || task.title,
      description: f.description || null,
      due_date: f.due_date || null,
      urgency: f.urgency,
      assignee: f.assignee || null,
      column_id: f.column_id || null,
    }
    await updateTask(task.id, patch)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Card title="Edit task">
          <div className="flex flex-col gap-3">
            <Field label="Title">
              <TextInput value={f.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="Description">
              <textarea
                value={f.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={3}
                className="rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Column">
                <Select value={f.column_id} onChange={(e) => set({ column_id: e.target.value })}>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Urgency">
                <Select value={f.urgency} onChange={(e) => set({ urgency: e.target.value as Urgency })}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </Select>
              </Field>
              <Field label="Due date">
                <input
                  type="date"
                  value={f.due_date}
                  onChange={(e) => set({ due_date: e.target.value })}
                  className="rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2"
                />
              </Field>
              <Field label="Assignee">
                <TextInput value={f.assignee} onChange={(e) => set({ assignee: e.target.value })} />
              </Field>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={save}>Save</Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                variant="ghost"
                className="ml-auto text-[var(--color-danger)]"
                onClick={async () => { await deleteTask(task.id); onSaved() }}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// --- board ----------------------------------------------------------------
function Board() {
  const [columns, setColumns] = useState<TaskColumnRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')
  const dragId = useRef<string | null>(null)

  const refresh = () =>
    Promise.all([listColumns(), listTasks()])
      .then(([c, t]) => {
        setColumns(c)
        setTasks(t)
      })
      .catch((e) => setError(e.message))

  useEffect(() => {
    refresh()
  }, [])

  const assignees = useMemo(
    () => [...new Set(tasks.map((t) => t.assignee).filter(Boolean) as string[])].sort(),
    [tasks],
  )

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!assigneeFilter || t.assignee === assigneeFilter) &&
          (!urgencyFilter || t.urgency === urgencyFilter) &&
          matchesDate(t.due_date, dateFilter) &&
          (!search || `${t.title} ${t.description ?? ''}`.toLowerCase().includes(search.toLowerCase())),
      ),
    [tasks, assigneeFilter, urgencyFilter, dateFilter, search],
  )

  const tasksFor = (col: TaskColumnRow, index: number) =>
    filtered
      .filter((t) => t.column_id === col.id || (t.column_id == null && index === 0))
      .sort((a, b) => a.position - b.position || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))

  async function onDrop(columnId: string, droppedId?: string) {
    const id = droppedId || dragId.current
    dragId.current = null
    if (!id) return
    const maxPos = Math.max(0, ...tasks.filter((t) => t.column_id === columnId).map((t) => t.position))
    await moveTaskToColumn(id, columnId, maxPos + 1)
    refresh()
  }

  async function addCard(columnId: string, title: string) {
    await createTask({ title, column_id: columnId })
    refresh()
  }

  async function moveColumn(id: string, dir: -1 | 1) {
    const sorted = [...columns].sort((a, b) => a.position - b.position)
    const i = sorted.findIndex((c) => c.id === id)
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    await Promise.all([
      updateColumn(sorted[i].id, { position: sorted[j].position }),
      updateColumn(sorted[j].id, { position: sorted[i].position }),
    ])
    refresh()
  }

  async function addColumn() {
    const maxPos = Math.max(-1, ...columns.map((c) => c.position))
    await createColumn('New stage', maxPos + 1)
    refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <TextInput placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
        <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="">All assignees</option>
          {assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
          <option value="">Any urgency</option>
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </Select>
        <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          <option value="">Any date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="week">Due this week</option>
          <option value="none">No date</option>
        </Select>
        <Button variant="ghost" className="ml-auto" onClick={addColumn}>+ Column</Button>
      </div>

      {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {[...columns]
          .sort((a, b) => a.position - b.position)
          .map((col, i, arr) => (
            <Column
              key={col.id}
              col={col}
              tasks={tasksFor(col, i)}
              isFirst={i === 0}
              isLast={i === arr.length - 1}
              onDrop={onDrop}
              onAdd={addCard}
              onRename={(id, title) => updateColumn(id, { title }).then(refresh)}
              onDelete={(id) => deleteColumn(id).then(refresh)}
              onMove={moveColumn}
              onOpen={setEditing}
              onDragStart={(id) => (dragId.current = id)}
            />
          ))}
      </div>

      {editing && (
        <TaskEditor
          task={editing}
          columns={columns}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

export function KanbanPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Tasks</h1>
      <AuthGate>
        <Board />
      </AuthGate>
    </div>
  )
}
