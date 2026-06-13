import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, CheckSquare, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: { name: string; avatar: string };
}

const columns = ['todo', 'in-progress', 'review', 'completed'] as const;

const columnLabels: Record<string, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'review': 'Review',
  'completed': 'Completed',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30',
  medium: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
  high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

// Sortable Item Component
const SortableTaskItem = ({ task, updateTaskStatus }: { task: Task; updateTaskStatus: (id: string, status: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task._id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-100 dark:bg-dark-200/80 backdrop-blur-sm border border-white/5 rounded-xl p-4 mb-3 group hover:border-primary-500/40 transition-colors shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button
          className="text-slate-500 hover:text-slate-900 dark:text-white cursor-grab active:cursor-grabbing pt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1">
          <p className="text-slate-900 dark:text-white text-sm font-semibold mb-2">{task.title}</p>
          {task.description && (
            <p className="text-slate-600 dark:text-slate-400 text-xs mb-3 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={task.status}
                onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                className="text-[10px] uppercase font-bold tracking-wider bg-white dark:bg-dark-300 border border-white/10 text-slate-700 dark:text-slate-300 rounded px-2 py-1 outline-none focus:border-primary-500"
              >
                {columns.map(s => <option key={s} value={s}>{columnLabels[s]}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', status: 'todo' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/tasks');
      setTasks(data.tasks);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) { toast.error('Task title required'); return; }
    try {
      const { data } = await api.post('/tasks', newTask);
      setTasks(prev => [...prev, data.task]);
      setShowAddTask(false);
      setNewTask({ title: '', description: '', priority: 'medium', status: 'todo' });
      toast.success('Task created!');
    } catch {
      toast.error('Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, { status });
      setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dragging over a column container directly
    if (columns.includes(overId as any)) {
      const task = tasks.find(t => t._id === activeId);
      if (task && task.status !== overId) {
        updateTaskStatus(activeId, overId);
      }
      return;
    }

    // Dragging over another item
    const activeTask = tasks.find(t => t._id === activeId);
    const overTask = tasks.find(t => t._id === overId);

    if (activeTask && overTask && activeTask.status !== overTask.status) {
      updateTaskStatus(activeId, overTask.status);
    } else if (activeTask && overTask && activeTask._id !== overTask._id) {
      // Reordering within the same column (frontend only for now)
      setTasks((items) => {
        const oldIndex = items.findIndex(t => t._id === activeId);
        const newIndex = items.findIndex(t => t._id === overId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  return (
    <div className="flex-1 h-screen overflow-auto bg-slate-50 dark:bg-dark-400 p-8 lg:p-12 relative flex flex-col">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight flex items-center gap-3">
            <CheckSquare className="text-primary-500" size={32} />
            Task Board
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your action items and project tasks.</p>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className="btn-primary py-2.5 px-5 flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      <div className="flex-1 overflow-x-auto relative z-10 pb-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 h-full min-w-max">
              {columns.map(col => {
                const columnTasks = getTasksByStatus(col);
                return (
                  <div key={col} className="w-80 flex flex-col glass-panel rounded-2xl bg-white dark:bg-dark-300/40">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                      <h3 className="text-slate-900 dark:text-white font-bold tracking-tight">{columnLabels[col]}</h3>
                      <span className="bg-slate-100 dark:bg-dark-200 text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full border border-white/5">
                        {columnTasks.length}
                      </span>
                    </div>
                    
                    <div className="flex-1 p-4 overflow-y-auto min-h-[200px]" id={col}>
                      <SortableContext items={columnTasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                        {columnTasks.map(task => (
                          <SortableTaskItem key={task._id} task={task} updateTaskStatus={updateTaskStatus} />
                        ))}
                      </SortableContext>
                      
                      {columnTasks.length === 0 && (
                        <div className="h-full border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center">
                          <p className="text-slate-500 text-sm font-medium">Drop tasks here</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DndContext>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-dark-400/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="glass-panel p-8 w-full max-w-md rounded-3xl animate-float" style={{ animationDuration: '0.3s', animationName: 'zoomIn' }}>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Create New Task</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 glass-input"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description <span className="text-slate-500 font-normal">(optional)</span></label>
                <textarea
                  placeholder="Task details..."
                  value={newTask.description}
                  onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 glass-input resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-4 py-3 glass-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-4 py-3 glass-input"
                  >
                    {columns.map(s => <option key={s} value={s}>{columnLabels[s]}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowAddTask(false)} className="flex-1 py-3 btn-secondary">
                Cancel
              </button>
              <button onClick={createTask} className="flex-1 py-3 btn-primary">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;