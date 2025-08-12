import { BaseRepository } from '../base-repository';
import type { User } from '../types/user';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users'); // Table name (plural)
  }
}