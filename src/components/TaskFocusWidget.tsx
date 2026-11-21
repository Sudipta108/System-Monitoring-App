import React, { useEffect, useState } from 'react';
import { Check, Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';

type TimerMode = 'focus' | 'break';

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const STORAGE_KEY_TODOS = 'aegis_focus_todos_v1';

const DEFAULT_TODOS: TodoItem[] = [
  { id: 1, text: 'Review SSD thermal & SMART health telemetry', done: true },
  { id: 2, text: 'Profile memory allocation across active threads', done: false },
  { id: 3, text: 'Verify network latency stability under load', done: false },
];

function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const TaskFocusWidget: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(2);

  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TODOS);
      if (saved) {
        const parsed = JSON.parse(saved) as TodoItem[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_TODOS;
  });
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TODOS, JSON.stringify(todos));
    } catch {
      // Ignore storage errors
    }
  }, [todos]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (mode === 'focus') {
            setSessionsCompleted((s) => s + 1);
            setMode('break');
            return BREAK_SECONDS;
          } else {
            setMode('focus');
            return FOCUS_SECONDS;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, mode]);

  const switchMode = (nextMode: TimerMode) => {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(nextMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  const totalModeSeconds = mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;
  const progressPercent = ((totalModeSeconds - secondsLeft) / totalModeSeconds) * 100;

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTask.trim();
    if (!trimmed) return;
    setTodos((prev) => [
      { id: Date.now(), text: trimmed, done: false },
      ...prev,
    ]);
    setNewTask('');
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const deleteTodo = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const remainingCount = todos.filter((t) => !t.done).length;

  return (
    <section
      aria-label="Task and Focus Timer"
      className="flex flex-col rounded-xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            Task &amp; Focus Timer
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            <span>Pomodoro 25m / 5m</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {sessionsCompleted} sessions done
            </span>
          </p>
        </div>

        {/* Mode Switch */}
        <div
          role="tablist"
          aria-label="Timer mode"
          className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/60 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'focus'}
            onClick={() => switchMode('focus')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'focus'
                ? 'bg-cyan-500/20 text-cyan-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Focus 25m
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'break'}
            onClick={() => switchMode('break')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'break'
                ? 'bg-emerald-500/20 text-emerald-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Break 5m
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left: Pomodoro Countdown */}
        <div className="flex flex-col justify-between md:col-span-5 md:border-r md:border-white/10 md:pr-5">
          <div>
            <div className="text-xs text-slate-400">
              {mode === 'focus' ? 'Deep Work Session' : 'Recovery Break'}
            </div>
            <div
              className={`mt-2 font-mono text-4xl font-semibold tracking-tight tabular-nums ${
                mode === 'focus' ? 'text-cyan-300' : 'text-emerald-300'
              }`}
            >
              {formatCountdown(secondsLeft)}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  mode === 'focus' ? 'bg-cyan-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 whitespace-nowrap ${
                isRunning
                  ? 'border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                  : 'border-cyan-400/35 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              aria-label="Reset timer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Right: Interactive To-Do List */}
        <div className="flex flex-col md:col-span-7">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-200">Session Tasks</span>
            <span className="font-mono tabular-nums text-slate-400">
              {remainingCount} remaining
            </span>
          </div>

          <form onSubmit={handleAddTodo} className="mt-2.5 flex items-center gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a focus task..."
              aria-label="New task description"
              className="h-9 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </form>

          <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {todos.length === 0 ? (
              <li className="py-5 text-center text-xs text-slate-500">
                No tasks queued. Add a task above to track your focus block.
              </li>
            ) : (
              todos.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs transition-colors hover:border-white/15"
                >
                  <button
                    type="button"
                    onClick={() => toggleTodo(item.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        item.done
                          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                          : 'border-white/20 bg-transparent text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span
                      className={`truncate ${
                        item.done ? 'text-slate-500 line-through' : 'text-slate-200'
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTodo(item.id)}
                    aria-label={`Delete task ${item.text}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
};
