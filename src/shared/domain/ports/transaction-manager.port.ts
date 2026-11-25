export const TRANSACTION_MANAGER_PORT = Symbol('TRANSACTION_MANAGER_PORT');

export interface TransactionManagerPort {
  runInTransaction<T>(operation: (tx?: unknown) => Promise<T>): Promise<T>;
}
