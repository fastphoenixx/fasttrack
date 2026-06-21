import { useEffect, useState } from 'react'
import { AuthGate } from '../auth/AuthGate'
import { createTask, deleteTask, listTasks, moveTask } from '../../db/queries'
import type { TaskRow, TaskStatus, Urgency } from '../../db/types'
import { Button, Card, Field, Select, TextInput } from '../../ui/components'

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
]

const URGENCY_TONE: Record<Urgency, string> = {
  low: 'var(--color-muted)',
  medium: 'var(--color-accent)',
  high: 'var(--color-danger)',
}

const nextStatus = (s: TaskStatus): TaskStatus | null =>
  s === 'inbox' ? 'doing' : s === 'doing' ? 'done' : null
const prevStatus = (s: TaskStatus): TaskStatus | null =>
  s === 'done' ? 'doing' : s === 'doing' ? 'inbox' : null

function overdue(due: string | null): boolean {
  return !!due && due < new Date().toISOString().slice(0, 10)
}

function TaskCard({ task, onChange }: { task: TaskRow; onChange: () => void }) {
  const prev = prevStatus(task.status)
  const next = nextStatus(task.status)
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{task.title}</span>
        <span
          className="text-[10px] uppercase font-semibold shrink-0"
          style={{ color: URGENCY_TONE[task.urgency] }}
        >
          {task.urgency}
        </span>
      </div>
      {task.description && <p className="text-[var(--color-muted)] mt-1">{task.description}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[var(--color-muted)]">
        {task.due_date && (
          <span style={overdue(task.due_date) ? { color: 'var(--color-danger)' } : undefined}>
            📅 {task.due_date}
          </span>
        )}
        {task.assignee && <span>👤 {task.assignee}</span>}
        {task.source !== 'manual' && <span>🎙 {task.source}</span>}
      </div>
      <div className="flex items-center gap-1 mt-3">
        {prev && (
          <button className="text-xs px-2 py-1 rounded hover:bg-[var(--color-surface-2)]"
            onClick={async () => { await moveTask(task.id, prev, task.position); onChange() }}>
            ←
          </button>
        )}
        {next && (
          <button className="text-xs px-2 py-1 rounded hover:bg-[var(--color-surface-2)]"
            onClick={async () => { await moveTask(task.id, next, task.position); onChange() }}>
            →
          </button>
        )}
        <button className="text-xs px-2 py-1 rounded hover:bg-[var(--color-surface-2)] ml-auto text-[var(--color-danger)]"
          onClick={async () => { await deleteTask(task.id); onChange() }}>
          ✕
        </button>
      </div>
    </div>
  )
}

function NewTaskForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [assignee, setAssignee] = useState('')

  return (
    <Card title="New task">
      <form
        className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!title.trim()) return
          await createTask({
            title: title.trim(),
            due_date: due || null,
            urgency,
            assignee: assignee || null,
          })
          setTitle('')
          setDue('')
          setAssignee('')
          setUrgency('medium')
          onCreated()
        }}
      >
        <div className="md:col-span-2">
          <Field label="Title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
          </Field>
        </div>
        <Field label="Prazo">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2"
          />
        </Field>
        <Field label="Urgência">
          <Select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </Select>
        </Field>
        <Field label="Para quem">
          <TextInput value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="optional" />
        </Field>
        <div className="md:col-span-5">
          <Button type="submit">Add task</Button>
        </div>
      </form>
    </Card>
  )
}

function Board() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = () =>
    listTasks()
      .then(setTasks)
      .catch((e) => setError(e.message))

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <NewTaskForm onCreated={refresh} />
      {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = tasks
            .filter((t) => t.status === col.key)
            .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
          return (
            <div key={col.key} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-[var(--color-muted)]">
                {col.label} <span className="text-xs">({items.length})</span>
              </h3>
              {items.map((t) => (
                <TaskCard key={t.id} task={t} onChange={refresh} />
              ))}
            </div>
          )
        })}
      </div>
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
