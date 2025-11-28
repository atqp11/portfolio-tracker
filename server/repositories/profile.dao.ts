import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export class ProfileRepository {
  async getProfiles(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching profiles from Supabase:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in ProfileRepository:', error);
      throw error;
    }
  }

  async getProfileById(id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching profile by ID from Supabase:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in ProfileRepository (getProfileById):', error);
      throw error;
    }
  }
}