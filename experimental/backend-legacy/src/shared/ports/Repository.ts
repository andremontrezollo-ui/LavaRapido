/**
 * Generic Repository Port
 */

export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: ID): Promise<void>;
}

/**
 * Unit of Work — coordinates transactional persistence.
 */
export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

/**
 * Transactional Repository — base contract with UoW support.
 */
export interface TransactionalRepository<T> extends Repository<T> {
  withUnitOfWork(uow: UnitOfWork): TransactionalRepository<T>;
}
