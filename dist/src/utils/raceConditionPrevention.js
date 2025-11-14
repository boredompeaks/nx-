/**
 * Race Condition Prevention System
 *
 * This module provides utilities to prevent race conditions in realtime updates
 * by implementing optimistic locking, version control, and operation ordering.
 */
/**
 * Race condition prevention manager
 */
export class RaceConditionManager {
    constructor() {
        this.operations = new Map();
        this.resourceVersions = new Map();
        this.pendingOperations = new Map();
        this.operationQueue = [];
        this.maxQueueSize = 1000;
        this.operationTimeout = 30000; // 30 seconds
    }
    /**
     * Generate unique operation ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate unique resource version
     */
    generateVersion() {
        return Date.now() * 1000 + Math.floor(Math.random() * 1000);
    }
    /**
     * Add operation to queue with proper ordering
     */
    addOperation(type, resourceId, data, conflictResolution = { strategy: 'lastWriteWins' }) {
        const operation = {
            id: this.generateOperationId(),
            type,
            resourceId,
            timestamp: Date.now(),
            version: this.generateVersion(),
            data,
            status: 'pending'
        };
        // Add to operations map
        this.operations.set(operation.id, operation);
        // Add to resource's pending operations
        if (!this.pendingOperations.has(resourceId)) {
            this.pendingOperations.set(resourceId, new Set());
        }
        this.pendingOperations.get(resourceId).add(operation.id);
        // Add to queue with proper ordering
        this.operationQueue.push(operation);
        this.operationQueue.sort((a, b) => {
            // Sort by timestamp first, then by version as tiebreaker
            if (a.timestamp !== b.timestamp) {
                return a.timestamp - b.timestamp;
            }
            return a.version - b.version;
        });
        // Maintain queue size limit
        if (this.operationQueue.length > this.maxQueueSize) {
            const removed = this.operationQueue.shift();
            if (removed) {
                this.operations.delete(removed.id);
                const pendingSet = this.pendingOperations.get(removed.resourceId);
                if (pendingSet) {
                    pendingSet.delete(removed.id);
                    if (pendingSet.size === 0) {
                        this.pendingOperations.delete(removed.resourceId);
                    }
                }
            }
        }
        // Set timeout for operation
        setTimeout(() => {
            if (operation.status === 'pending') {
                this.cancelOperation(operation.id);
            }
        }, this.operationTimeout);
        return operation;
    }
    /**
     * Apply operation with conflict detection and resolution
     */
    applyOperation(operationId, currentResource) {
        const operation = this.operations.get(operationId);
        if (!operation) {
            return { success: false, conflict: { reason: 'Operation not found' } };
        }
        if (operation.status !== 'pending') {
            return { success: false, conflict: { reason: 'Operation already processed' } };
        }
        // Check for conflicts
        const conflict = this.detectConflict(operation, currentResource);
        if (conflict) {
            return { success: false, conflict };
        }
        // Apply operation
        operation.status = 'applied';
        // Update resource version
        const newResource = {
            id: operation.resourceId,
            version: operation.version,
            lastModified: operation.timestamp,
            operationId: operation.id
        };
        this.resourceVersions.set(operation.resourceId, newResource);
        // Remove from pending operations
        const pendingSet = this.pendingOperations.get(operation.resourceId);
        if (pendingSet) {
            pendingSet.delete(operation.id);
            if (pendingSet.size === 0) {
                this.pendingOperations.delete(operation.resourceId);
            }
        }
        return { success: true, mergedData: operation.data };
    }
    /**
     * Detect conflicts between operations
     */
    detectConflict(operation, currentResource) {
        if (!currentResource) {
            return null; // No existing resource, no conflict
        }
        // Check if resource was modified after this operation was created
        if (currentResource.lastModified >= operation.timestamp) {
            return {
                type: 'concurrent_modification',
                resourceVersion: currentResource.version,
                operationVersion: operation.version,
                resourceModifiedAt: currentResource.lastModified,
                operationCreatedAt: operation.timestamp
            };
        }
        // Check if there are pending operations for this resource
        const pendingOps = this.pendingOperations.get(operation.resourceId);
        if (pendingOps && pendingOps.size > 1) {
            const operations = Array.from(pendingOps).map(id => this.operations.get(id)).filter(op => op && op.id !== operation.id);
            if (operations.length > 0) {
                return {
                    type: 'pending_operations',
                    pendingOperations: operations.map(op => ({
                        id: op.id,
                        type: op.type,
                        timestamp: op.timestamp
                    }))
                };
            }
        }
        return null;
    }
    /**
     * Resolve conflicts using specified strategy
     */
    resolveConflict(conflict, localData, remoteData, strategy) {
        switch (strategy.strategy) {
            case 'lastWriteWins':
                return { resolved: true, data: remoteData };
            case 'firstWriteWins':
                return { resolved: true, data: localData };
            case 'merge':
                if (strategy.mergeFunction) {
                    return { resolved: true, data: strategy.mergeFunction(localData, remoteData) };
                }
                // Fallback to lastWriteWins if no merge function
                return { resolved: true, data: remoteData };
            case 'reject':
                return { resolved: false };
            default:
                return { resolved: false };
        }
    }
    /**
     * Cancel operation
     */
    cancelOperation(operationId) {
        const operation = this.operations.get(operationId);
        if (!operation || operation.status !== 'pending') {
            return false;
        }
        operation.status = 'cancelled';
        // Remove from pending operations
        const pendingSet = this.pendingOperations.get(operation.resourceId);
        if (pendingSet) {
            pendingSet.delete(operation.id);
            if (pendingSet.size === 0) {
                this.pendingOperations.delete(operation.resourceId);
            }
        }
        // Remove from queue
        const index = this.operationQueue.findIndex(op => op.id === operationId);
        if (index !== -1) {
            this.operationQueue.splice(index, 1);
        }
        return true;
    }
    /**
     * Get operation status
     */
    getOperationStatus(operationId) {
        return this.operations.get(operationId) || null;
    }
    /**
     * Get resource version
     */
    getResourceVersion(resourceId) {
        return this.resourceVersions.get(resourceId) || null;
    }
    /**
     * Get pending operations for resource
     */
    getPendingOperations(resourceId) {
        const pendingSet = this.pendingOperations.get(resourceId);
        if (!pendingSet) {
            return [];
        }
        return Array.from(pendingSet)
            .map(id => this.operations.get(id))
            .filter(op => op && op.status === 'pending');
    }
    /**
     * Wait for operation completion
     */
    async waitForOperation(operationId, timeout = 5000) {
        const operation = this.operations.get(operationId);
        if (!operation) {
            throw new Error('Operation not found');
        }
        if (operation.status !== 'pending') {
            return operation;
        }
        return new Promise((resolve, reject) => {
            const checkInterval = 100; // Check every 100ms
            const timeoutId = setTimeout(() => {
                clearInterval(intervalId);
                reject(new Error('Operation wait timeout'));
            }, timeout);
            const intervalId = setInterval(() => {
                const currentOp = this.operations.get(operationId);
                if (currentOp && currentOp.status !== 'pending') {
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    resolve(currentOp);
                }
            }, checkInterval);
        });
    }
    /**
     * Clean up old operations
     */
    cleanup(olderThan = 3600000) {
        const cutoff = Date.now() - olderThan;
        let cleaned = 0;
        for (const [id, operation] of this.operations) {
            if (operation.timestamp < cutoff && operation.status !== 'pending') {
                this.operations.delete(id);
                cleaned++;
            }
        }
        // Clean up resource versions
        for (const [id, resource] of this.resourceVersions) {
            if (resource.lastModified < cutoff) {
                this.resourceVersions.delete(id);
            }
        }
        return cleaned;
    }
    /**
     * Get statistics
     */
    getStats() {
        const stats = {
            totalOperations: this.operations.size,
            pendingOperations: 0,
            appliedOperations: 0,
            rejectedOperations: 0,
            cancelledOperations: 0,
            resourceCount: this.resourceVersions.size,
            queueSize: this.operationQueue.length
        };
        for (const operation of this.operations.values()) {
            switch (operation.status) {
                case 'pending':
                    stats.pendingOperations++;
                    break;
                case 'applied':
                    stats.appliedOperations++;
                    break;
                case 'rejected':
                    stats.rejectedOperations++;
                    break;
                case 'cancelled':
                    stats.cancelledOperations++;
                    break;
            }
        }
        return stats;
    }
}
/**
 * Singleton instance
 */
export const raceConditionManager = new RaceConditionManager();
/**
 * Utility function for optimistic updates
 */
export function optimisticUpdate(resourceId, updateFn, options = {}) {
    const manager = raceConditionManager;
    const currentResource = manager.getResourceVersion(resourceId);
    // Create operation for the update
    const operation = manager.addOperation('update', resourceId, { updateFn: updateFn.toString() }, options.conflictResolution || { strategy: 'lastWriteWins' });
    return new Promise((resolve) => {
        // Simulate the update
        const result = manager.applyOperation(operation.id, currentResource || undefined);
        if (result.success) {
            resolve({ success: true, data: updateFn(currentResource) });
        }
        else {
            resolve({ success: false, conflict: result.conflict });
        }
    });
}
/**
 * Utility function for conflict-free operations
 */
export function conflictFreeOperation(resourceId, operationType, data, options = {}) {
    const manager = raceConditionManager;
    const operation = manager.addOperation(operationType, resourceId, data, options.conflictResolution || { strategy: 'lastWriteWins' });
    if (options.waitForCompletion) {
        return manager.waitForOperation(operation.id);
    }
    return Promise.resolve(operation);
}
