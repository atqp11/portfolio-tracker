import { UserRepository, userRepository } from '@backend/modules/user/repository/user.repository';

const repository = userRepository;

export class UserService {
  async getProfiles(): Promise<any[]> {
    try {
      return await repository.findAll();
    } catch (error) {
      console.error('Error in UserService:', error);
      throw error;
    }
  }

  async getProfileById(id: string): Promise<any> {
    try {
      return await repository.findById(id);
    } catch (error) {
      console.error('Error in UserService (getProfileById):', error);
      throw error;
    }
  }
}