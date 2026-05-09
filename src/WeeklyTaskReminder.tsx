import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  X,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  ListTodo,
  Target,
  Bell,
  TrendingUp,
  CircleDot,
  CheckCheck,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
interface Step {
  id: string;
  name: string;
  done: boolean;
}

interface Task {
  id: string;
  name: string;
  days: string[]; // 't2'|'t3'|'t4'|'t5'|'t6'
  steps: Step[];
}

type View = 'overview' | 'detail' | 'add';
type TaskStatus = 'pending' | 'inprogress' | 'done';

const DAY_KEYS: string[] = ['t2', 't3', 't4', 't5', 't6'];

const DAY_LABELS: Record<string, string> = {
  t2: 'Thứ Hai',
  t3: 'Thứ Ba',
  t4: 'Thứ Tư',
  t5: 'Thứ Năm',
  t6: 'Thứ Sáu',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Chưa bắt đầu',
  inprogress: 'Đang làm',
  done: 'Hoàn thành',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-slate-100 text-slate-500',
  inprogress: 'bg-amber-50 text-amber-600',
  done: 'bg-emerald-50 text-emerald-600',
};

const STATUS_ICONS: Record<TaskStatus, JSX.Element> = {
  pending: <Circle className="w-4 h-4" />,
  inprogress: <CircleDot className="w-4 h-4" />,
  done: <CheckCircle2 className="w-4 h-4" />,
};

/* ─── Demo Data ──────────────────────────────────────────────── */
const DEMO_TASKS: Task[] = [
  {
    id: 'demo-1',
    name: 'Họp team cả tuần',
    days: ['t2', 't3', 't4', 't5', 't6'],
    steps: [
      { id: 'd1-1', name: 'Chuẩn bị agenda', done: false },
      { id: 'd1-2', name: 'Gửi thư mời cho team', done: false },
      { id: 'd1-3', name: 'Ghi chép biên bản', done: false },
      { id: 'd1-4', name: 'Theo dõi follow-up tasks', done: false },
    ],
  },
  {
    id: 'demo-2',
    name: 'Review code pull requests',
    days: ['t2', 't4', 't6'],
    steps: [
      { id: 'd2-1', name: 'Mở PR trên GitHub', done: false },
      { id: 'd2-2', name: 'Kiểm tra logic & style', done: false },
      { id: 'd2-3', name: 'Viết review comments', done: false },
      { id: 'd2-4', name: 'Merge hoặc request changes', done: false },
    ],
  },
  {
    id: 'demo-3',
    name: 'Cập nhật báo cáo tuần',
    days: ['t6'],
    steps: [
      { id: 'd3-1', name: 'Thu thập số liệu từ các module', done: false },
      { id: 'd3-2', name: 'Viết nội dung báo cáo', done: false },
      { id: 'd3-3', name: 'Đính kèm biểu đồ & metrics', done: false },
      { id: 'd3-4', name: 'Gửi email cho manager', done: false },
    ],
  },
];

/* ─── Helpers ───────────────────────────────────────────────── */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTodayKey(): string {
  const d = new Date().getDay(); // 0=Sun,1=Mon,...,6=Sat
  const map: Record<number, string> = { 1: 't2', 2: 't3', 3: 't4', 4: 't5', 5: 't6' };
  return map[d] ?? 't2';
}

function getTaskStatus(task: Task): TaskStatus {
  if (task.steps.length === 0) return 'pending';
  const done = task.steps.every((s) => s.done);
  if (done) return 'done';
  const any = task.steps.some((s) => s.done);
  return any ? 'inprogress' : 'pending';
}

function getProgress(task: Task): number {
  if (task.steps.length === 0) return 0;
  const done = task.steps.filter((s) => s.done).length;
  return Math.round((done / task.steps.length) * 100);
}

function getRemainingSteps(task: Task): number {
  return task.steps.filter((s) => !s.done).length;
}

function isToday(dayKey: string): boolean {
  return dayKey === getTodayKey();
}

function getStorageKey(): string {
  return 'weekly-task-reminder-v1';
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) return JSON.parse(raw) as Task[];
  } catch {
    // ignore
  }
  return DEMO_TASKS;
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(getStorageKey(), JSON.stringify(tasks));
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function WeeklyTaskReminder() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showReminder, setShowReminder] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [view, setView] = useState<View>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    name: '',
    days: [] as string[],
    steps: [{ id: uid(), name: '', done: false }],
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = loadTasks();
    setTasks(stored);
    setHasLoaded(true);
    // Show reminder on first load
    setShowReminder(true);
  }, []);

  // Persist whenever tasks change
  useEffect(() => {
    if (hasLoaded) saveTasks(tasks);
  }, [tasks, hasLoaded]);

  /* ── Task actions ── */
  const addTask = () => {
    if (!newTask.name.trim()) return;
    const validSteps = newTask.steps.filter((s) => s.name.trim() !== '');
    if (validSteps.length === 0) return;
    if (newTask.days.length === 0) return;
    setTasks((prev) => [
      ...prev,
      { id: uid(), name: newTask.name.trim(), days: newTask.days, steps: validSteps },
    ]);
    setNewTask({ name: '', days: [], steps: [{ id: uid(), name: '', done: false }] });
    setView('overview');
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      setView('overview');
    }
  };

  const toggleStep = (taskId: string, stepId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              steps: t.steps.map((s) =>
                s.id === stepId ? { ...s, done: !s.done } : s
              ),
            }
          : t
      )
    );
  };

  const updateStepName = (taskId: string, stepId: string, name: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, name } : s)) }
          : t
      )
    );
  };

  const addStepToForm = () => {
    setNewTask((prev) => ({
      ...prev,
      steps: [...prev.steps, { id: uid(), name: '', done: false }],
    }));
  };

  const removeStepFromForm = (stepId: string) => {
    setNewTask((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId),
    }));
  };

  const updateStepNameInForm = (stepId: string, name: string) => {
    setNewTask((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, name } : s)),
    }));
  };

  const toggleDay = (day: string) => {
    setNewTask((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const openTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setView('detail');
  };

  const closeDetail = () => {
    setSelectedTaskId(null);
    setView('overview');
  };

  const resetTasks = () => {
    setTasks(DEMO_TASKS);
    localStorage.removeItem(getStorageKey());
    setShowResetConfirm(false);
    setView('overview');
    setSelectedTaskId(null);
  };

  /* ── Derived data ── */
  const todayKey = getTodayKey();
  const todayTasks = tasks.filter((t) => t.days.includes(todayKey));
  const todayRemaining = todayTasks.reduce((sum, t) => sum + getRemainingSteps(t), 0);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const tasksByDay = DAY_KEYS.map((day) => ({
    day,
    label: DAY_LABELS[day],
    tasks: tasks.filter((t) => t.days.includes(day)),
  }));

  /* ──────────────────────────────────────────────────────────── */
  if (!hasLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Reminder Modal ── */}
      {showReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-white/20 rounded-full p-3">
                  <Bell className="w-7 h-7 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white">Công việc hôm nay</h2>
              <p className="text-blue-100 mt-1 text-sm">
                {DAY_LABELS[todayKey]} — {todayTasks.length} công việc
              </p>
            </div>

            {/* Body */}
            <div className="p-5 max-h-80 overflow-y-auto">
              {todayTasks.length === 0 ? (
                <div className="text-center py-6">
                  <div className="bg-emerald-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                    <CheckCheck className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="text-slate-600 font-medium">Không có công việc nào hôm nay</p>
                  <p className="text-slate-400 text-sm mt-1">Chúc bạn một ngày làm việc hiệu quả!</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {todayTasks.map((task) => {
                    const status = getTaskStatus(task);
                    const remaining = getRemainingSteps(task);
                    return (
                      <li
                        key={task.id}
                        className="flex items-center justify-between bg-slate-50 rounded-xl p-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={`mt-0.5 shrink-0 ${STATUS_COLORS[status]}`}>
                            {STATUS_ICONS[status]}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{task.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {remaining === 0
                                ? 'Hoàn thành!'
                                : `${remaining} bước còn lại`}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 pt-0">
              <button
                onClick={() => setShowReminder(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-200 active:scale-[0.98]"
              >
                Bắt đầu làm việc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              Task Reminder
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Tuần làm việc · {new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setView('add')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all duration-200 active:scale-[0.97] shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm Task</span>
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="bg-white hover:bg-slate-50 text-slate-500 rounded-xl px-3 py-2.5 text-sm font-medium flex items-center gap-2 transition-all duration-200 border border-slate-200 active:scale-[0.97]"
            title="Khôi phục dữ liệu mẫu"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* ── Views ── */}

        {/* Add Task View */}
        {view === 'add' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Thêm công việc mới</h2>
              <button
                onClick={() => setView('overview')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Task Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tên công việc
                </label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask((p) => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Họp team cả tuần"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-slate-400"
                />
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ngày trong tuần
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAY_KEYS.map((day) => {
                    const active = newTask.days.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
                {newTask.days.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Vui lòng chọn ít nhất một ngày
                  </p>
                )}
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Các bước thực hiện</label>
                  <button
                    onClick={addStepToForm}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Thêm bước
                  </button>
                </div>
                <div className="space-y-2">
                  {newTask.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-5 text-center shrink-0">{i + 1}</span>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStepNameInForm(step.id, e.target.value)}
                        placeholder={`Bước ${i + 1}`}
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-slate-400"
                      />
                      <button
                        onClick={() => removeStepFromForm(step.id)}
                        disabled={newTask.steps.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setView('overview')}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={addTask}
                  disabled={!newTask.name.trim() || newTask.days.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-md disabled:shadow-none active:scale-[0.98]"
                >
                  Lưu công việc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Detail View */}
        {view === 'detail' && selectedTask && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Back nav */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <button
                onClick={closeDetail}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-800 truncate">{selectedTask.name}</h2>
                <p className="text-xs text-slate-500">
                  {selectedTask.days.map((d) => DAY_LABELS[d]).join(', ')}
                </p>
              </div>
              <button
                onClick={() => deleteTask(selectedTask.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Status + Progress */}
              <div className="flex items-center justify-between mb-5">
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[getTaskStatus(selectedTask)]}`}
                >
                  {STATUS_ICONS[getTaskStatus(selectedTask)]}
                  {STATUS_LABELS[getTaskStatus(selectedTask)]}
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {selectedTask.steps.filter((s) => s.done).length}/{selectedTask.steps.length} bước
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-slate-500 font-medium">Tiến độ</span>
                  <span className="text-xs font-bold text-blue-600">{getProgress(selectedTask)}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${getProgress(selectedTask)}%` }}
                  />
                </div>
              </div>

              {/* Steps */}
              <ul className="space-y-2">
                {selectedTask.steps.map((step, i) => (
                  <li key={step.id}>
                    <button
                      onClick={() => toggleStep(selectedTask.id, step.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group ${
                        step.done
                          ? 'bg-emerald-50 hover:bg-emerald-100'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <span className="shrink-0">
                        {step.done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-sm block transition-colors ${
                            step.done ? 'text-emerald-600 line-through' : 'text-slate-700'
                          }`}
                        >
                          {step.name}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          step.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {step.done ? 'Hoàn thành' : 'Chưa xong'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Weekly Overview */}
        {view === 'overview' && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <ListTodo className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-slate-500 font-medium">Tổng công việc</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{tasks.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-slate-500 font-medium">Hôm nay</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{todayTasks.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-slate-500 font-medium">Còn lại</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{todayRemaining}</p>
              </div>
            </div>

            {/* Weekly columns */}
            <div className="space-y-3">
              {tasksByDay.map(({ day, label, tasks: dayTasks }) => {
                const today = isToday(day);
                return (
                  <div
                    key={day}
                    className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200 ${
                      today ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-100'
                    }`}
                  >
                    {/* Day header */}
                    <div
                      className={`flex items-center justify-between px-4 py-3 border-b ${
                        today ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${today ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span
                          className={`text-sm font-semibold ${
                            today ? 'text-blue-700' : 'text-slate-700'
                          }`}
                        >
                          {label}
                        </span>
                        {today && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                            Hôm nay
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium ${today ? 'text-blue-600' : 'text-slate-400'}`}
                      >
                        {dayTasks.length} task{dayTasks.length !== 1 ? '' : ''}
                      </span>
                    </div>

                    {/* Tasks list */}
                    {dayTasks.length === 0 ? (
                      <div className="px-4 py-5 text-center">
                        <p className="text-sm text-slate-400 italic">Không có công việc</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-50">
                        {dayTasks.map((task) => {
                          const status = getTaskStatus(task);
                          const remaining = getRemainingSteps(task);
                          return (
                            <li key={task.id}>
                              <button
                                onClick={() => openTaskDetail(task.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className={`shrink-0 ${STATUS_COLORS[status]}`}>
                                    {STATUS_ICONS[status]}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                                      {task.name}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {remaining === 0
                                        ? '✓ Hoàn thành'
                                        : `${remaining} bước chưa xong`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}
                                  >
                                    {STATUS_LABELS[status]}
                                  </div>
                                  <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 group-hover:text-blue-400 transition-colors" />
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Floating reminder banner */}
      {!showReminder && todayTasks.length > 0 && todayRemaining > 0 && view === 'overview' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-white border border-blue-200 rounded-2xl shadow-xl shadow-blue-200/50 px-4 py-3 flex items-center gap-3">
            <div className="bg-blue-50 rounded-full p-2 shrink-0">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">Hôm nay có việc cần làm</p>
              <p className="text-xs text-slate-500 truncate">
                {todayRemaining} bước chưa hoàn thành trong {todayTasks.length} công việc
              </p>
            </div>
            <button
              onClick={() => setShowReminder(true)}
              className="shrink-0 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Xem
            </button>
          </div>
        </div>
      )}

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="bg-amber-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Khôi phục dữ liệu mẫu?</h3>
              <p className="text-sm text-slate-500">
                Tất cả công việc hiện tại sẽ bị xóa và thay bằng 3 task mẫu. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={resetTasks}
                className="flex-1 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}