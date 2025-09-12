import { BaseRepository } from '../base-repository';
import type { Interaction } from '../types/interactions';

export class InteractionsRepository extends BaseRepository<Interaction> {
  constructor() {
    super('interactions');
  }
}
