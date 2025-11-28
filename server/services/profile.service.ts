import { ProfileRepository } from '@/server/repositories/profile.repository';

const profileRepository = new ProfileRepository();

export class ProfileService {
  async getProfiles(): Promise<any[]> {
    try {
      return await profileRepository.findAll();
    } catch (error) {
      console.error('Error in ProfileService:', error);
      throw error;
    }
  }

  async getProfileById(id: string): Promise<any> {
    try {
      return await profileRepository.findById(id);
    } catch (error) {
      console.error('Error in ProfileService (getProfileById):', error);
      throw error;
    }
  }
}