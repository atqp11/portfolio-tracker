/**
 * Task Repository (Supabase-based with RLS)
 *
 * Uses Supabase client for RLS-protected checklist task operations.
 * Use this for regular user operations.
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';

type ChecklistTask = Database['public']['Tables']['checklist_tasks']['Row'];
type ChecklistTaskInsert = Database['public']['Tables']['checklist_tasks']['Insert'];
type ChecklistTaskUpdate = Database['public']['Tables']['checklist_tasks']['Update'];

export class TaskRepository {
  /**
   * Find all tasks for a checklist (RLS enforced)
   */
  async findByChecklistId(checklistId: string): Promise<ChecklistTask[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('checklist_tasks')
      .select('*')
      .eq('checklist_id', checklistId)
      .order('urgency', { ascending: false })
      .order('completed', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find active tasks for a portfolio (RLS enforced)
   */
  async findActiveByPortfolioId(portfolioId: string): Promise<ChecklistTask[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('checklist_tasks')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('completed', false)
      .order('urgency', { ascending: false })
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find task by ID (RLS enforced - user can only access their own)
   */
  async findById(id: string): Promise<ChecklistTask | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('checklist_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching task:', error);
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    return data;
  }

  /**
   * Create task (RLS enforced - portfolio ownership checked)
   */
  async create(data: ChecklistTaskInsert): Promise<ChecklistTask> {
    const supabase = await createClient();

    const { data: task, error } = await supabase
      .from('checklist_tasks')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return task;
  }

  /**
   * Update task (RLS enforced - user can only update their own)
   */
  async update(id: string, data: ChecklistTaskUpdate): Promise<ChecklistTask> {
    const supabase = await createClient();

    const { data: task, error } = await supabase
      .from('checklist_tasks')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Task not found or access denied');
      }
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return task;
  }

  /**
   * Delete task (RLS enforced - user can only delete their own)
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('checklist_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository();
