import { RaceConditionManager, raceConditionManager, optimisticUpdate, conflictFreeOperation } from '../src/utils/raceConditionPrevention';

describe('RaceConditionManager', () => {
  let manager: RaceConditionManager;

  beforeEach(() => {
    manager = new RaceConditionManager();
  });

  afterEach(() => {
    manager.cleanup(0);
  });

  describe('Operation Management', () => {
    test('should create operation with unique ID', () => {
      const op1 = manager.addOperation('update', 'resource1', { data: 'test1' });
      const op2 = manager.addOperation('update', 'resource1', { data: 'test2' });

      expect(op1.id).toBeDefined();
      expect(op2.id).toBeDefined();
      expect(op1.id).not.toBe(op2.id);
    });

    test('should apply operation successfully when no conflicts', () => {
      const operation = manager.addOperation('update', 'resource1', { data: 'test' });
      const result = manager.applyOperation(operation.id);

      expect(result.success).toBe(true);
      expect(result.conflict).toBeUndefined();
      expect(manager.getOperationStatus(operation.id)?.status).toBe('applied');
    });
  });

  describe('Conflict Detection', () => {
    test('should detect concurrent modification conflict', () => {
      // First, create and apply an operation to establish a resource version
      const initialOperation = manager.addOperation('update', 'resource1', { data: 'initial' });
      manager.applyOperation(initialOperation.id);
      
      // Get the current resource version
      const currentResource = manager.getResourceVersion('resource1');
      expect(currentResource).toBeDefined();
      
      // Create a new operation that conflicts with the current resource
      const conflictingOperation = manager.addOperation('update', 'resource1', { data: 'conflicting' });
      
      // This should detect a conflict since the resource has been modified
      const result = manager.applyOperation(conflictingOperation.id, currentResource!);

      expect(result.success).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict.type).toBe('concurrent_modification');
    });
  });

  describe('Conflict Resolution', () => {
    test('should resolve conflict with lastWriteWins strategy', () => {
      const conflict = { type: 'concurrent_modification' };
      const localData = { value: 'local' };
      const remoteData = { value: 'remote' };
      
      const result = manager.resolveConflict(conflict, localData, remoteData, { strategy: 'lastWriteWins' });

      expect(result.resolved).toBe(true);
      expect(result.data).toEqual(remoteData);
    });
  });

  describe('Statistics', () => {
    test('should provide accurate statistics', () => {
      const op1 = manager.addOperation('update', 'resource1', { data: 'test1' });
      const op2 = manager.addOperation('update', 'resource2', { data: 'test2' });
      
      manager.applyOperation(op1.id);
      
      const stats = manager.getStats();
      
      expect(stats.totalOperations).toBe(2);
      expect(stats.appliedOperations).toBe(1);
      expect(stats.pendingOperations).toBe(1);
    });
  });
});