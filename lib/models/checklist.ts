// Checklist data models

export interface ChecklistTask {
  id: string;
  portfolioId: string;
  
  // From StrategyAccordion MonitoringTask
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Ad-hoc';
  task: string;
  urgency: 'green' | 'yellow' | 'red';
  condition?: string;
  
  // Enhanced fields
  category: 'morning_routine' | 'market_hours' | 'evening_review' | 'event_driven';
  
  // Event-driven metadata
  trigger?: TaskTrigger;
  
  // Completion tracking
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  
  // Actions
  actions: TaskAction[];
  
  // Metadata
  createdAt: Date;
  dueDate: Date;
}

export interface TaskTrigger {
  type: 'sec_filing' | 'sentiment_shift' | 'stop_loss_proximity' | 'rebalance_needed' | 'margin_warning';
  ticker?: string;
  threshold?: number;
  description: string;
}

export interface TaskAction {
  label: string;
  type: 'investigate' | 'complete' | 'snooze' | 'recurring';
  handler: string;
  params?: Record<string, any>;
}

export interface DailyChecklist {
  id: string;
  portfolioId: string;
  date: Date;
  
  // Task groups
  morningRoutine: ChecklistTask[];
  marketHours: ChecklistTask[];
  eveningReview: ChecklistTask[];
  eventDriven: ChecklistTask[];
  
  // Tracking
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  
  // Streak
  currentStreak: number;
  longestStreak: number;
}

/**
 * Helper to convert StrategyAccordion MonitoringTask to ChecklistTask
 * Preserves existing monitoring logic while making it extensible
 */
export function monitoringTaskToChecklistTask(
  task: {
    frequency: 'Daily' | 'Weekly' | 'Monthly';
    task: string;
    urgency: 'green' | 'yellow' | 'red';
    condition?: string;
  },
  portfolioId: string
): ChecklistTask {
  // Determine category based on frequency and task content
  let category: ChecklistTask['category'] = 'morning_routine';
  if (task.frequency === 'Weekly') {
    category = 'market_hours';
  } else if (task.frequency === 'Monthly') {
    category = 'evening_review';
  }
  
  // Check if this is an event-driven task based on keywords
  const isEventDriven = task.task.toLowerCase().includes('alert') || 
                        task.task.toLowerCase().includes('verify') ||
                        task.urgency === 'red';
  
  if (isEventDriven && task.frequency === 'Daily') {
    category = 'event_driven';
  }

  return {
    id: `task_${portfolioId}_${task.frequency}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    portfolioId,
    frequency: task.frequency,
    task: task.task,
    urgency: task.urgency,
    condition: task.condition,
    category,
    completed: false,
    actions: [
      { label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' },
    ],
    createdAt: new Date(),
    dueDate: new Date(),
  };
}

/**
 * Helper to generate a daily checklist from monitoring tasks
 */
export function generateDailyChecklist(
  tasks: ChecklistTask[],
  portfolioId: string,
  date: Date = new Date()
): DailyChecklist {
  const morningRoutine = tasks.filter(t => t.category === 'morning_routine');
  const marketHours = tasks.filter(t => t.category === 'market_hours');
  const eveningReview = tasks.filter(t => t.category === 'evening_review');
  const eventDriven = tasks.filter(t => t.category === 'event_driven');
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return {
    id: `checklist_${portfolioId}_${date.toISOString().split('T')[0]}`,
    portfolioId,
    date,
    morningRoutine,
    marketHours,
    eveningReview,
    eventDriven,
    totalTasks,
    completedTasks,
    completionPercentage,
    currentStreak: 0, // To be calculated from history
    longestStreak: 0, // To be calculated from history
  };
}
