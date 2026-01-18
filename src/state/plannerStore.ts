/**
 * Framework-agnostic store for managing JourneyFork instances
 * 
 * This store provides:
 * - Type-safe storage of user's forked journeys
 * - Persistence via localStorage
 * - Subscription pattern for reactive updates
 * - Pure functions for state mutations
 * 
 * NOTE: This is parallel infrastructure alongside JourneyContext.
 * Migration will happen in a future refactoring step.
 */

import type { JourneyFork } from '../domain/journeyFork';

const STORAGE_KEY = 'trippin_planner_forks';

/**
 * Listener function type for store subscriptions
 */
type StoreListener = (forks: JourneyFork[]) => void;

/**
 * PlannerStore class - Framework-agnostic state management
 */
class PlannerStore {
    private forks: JourneyFork[] = [];
    private listeners: Set<StoreListener> = new Set();

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Load forks from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.forks = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load planner forks from storage:', error);
            this.forks = [];
        }
    }

    /**
     * Save forks to localStorage
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.forks));
        } catch (error) {
            console.error('Failed to save planner forks to storage:', error);
        }
    }

    /**
     * Notify all subscribers of state change
     */
    private notify(): void {
        this.listeners.forEach(listener => listener(this.getForks()));
    }

    /**
     * Subscribe to store changes
     * 
     * @param listener - Function to call when forks change
     * @returns Unsubscribe function
     */
    subscribe(listener: StoreListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Get all forks (immutable copy)
     * 
     * @returns Array of all journey forks
     */
    getForks(): JourneyFork[] {
        return [...this.forks];
    }

    /**
     * Get a specific fork by ID
     * 
     * @param forkId - ID of the fork to retrieve
     * @returns The fork if found, undefined otherwise
     */
    getForkById(forkId: string): JourneyFork | undefined {
        return this.forks.find(fork => fork.id === forkId);
    }

    /**
     * Add a new fork to the store
     * 
     * @param fork - The JourneyFork to add
     */
    addFork(fork: JourneyFork): void {
        // Prevent duplicates
        if (this.forks.some(f => f.id === fork.id)) {
            console.warn(`Fork with ID ${fork.id} already exists`);
            return;
        }

        this.forks = [fork, ...this.forks]; // Add to beginning
        this.saveToStorage();
        this.notify();
    }

    /**
     * Remove a fork from the store
     * 
     * @param forkId - ID of the fork to remove
     * @returns True if fork was removed, false if not found
     */
    removeFork(forkId: string): boolean {
        const initialLength = this.forks.length;
        this.forks = this.forks.filter(fork => fork.id !== forkId);

        if (this.forks.length < initialLength) {
            this.saveToStorage();
            this.notify();
            return true;
        }

        return false;
    }

    /**
     * Update an existing fork
     * 
     * @param forkId - ID of the fork to update
     * @param updates - Partial fork object with updates to apply
     * @returns True if fork was updated, false if not found
     */
    updateFork(forkId: string, updates: Partial<JourneyFork>): boolean {
        const index = this.forks.findIndex(fork => fork.id === forkId);

        if (index === -1) {
            console.warn(`Fork with ID ${forkId} not found`);
            return false;
        }

        // Merge updates with existing fork
        this.forks[index] = {
            ...this.forks[index],
            ...updates,
            // Prevent ID from being changed
            id: this.forks[index].id,
        };

        this.saveToStorage();
        this.notify();
        return true;
    }

    /**
     * Replace an entire fork (full update)
     * 
     * @param fork - The complete fork object to replace
     * @returns True if fork was replaced, false if not found
     */
    replaceFork(fork: JourneyFork): boolean {
        const index = this.forks.findIndex(f => f.id === fork.id);

        if (index === -1) {
            console.warn(`Fork with ID ${fork.id} not found`);
            return false;
        }

        this.forks[index] = fork;
        this.saveToStorage();
        this.notify();
        return true;
    }

    /**
     * Check if a journey has already been forked
     * 
     * @param sourceJourneyId - ID of the source journey
     * @returns True if a fork exists for this source
     */
    hasForkForSource(sourceJourneyId: string): boolean {
        return this.forks.some(fork => fork.sourceJourneyId === sourceJourneyId);
    }

    /**
     * Get all forks for a specific source journey
     * 
     * @param sourceJourneyId - ID of the source journey
     * @returns Array of forks from this source
     */
    getForksForSource(sourceJourneyId: string): JourneyFork[] {
        return this.forks.filter(fork => fork.sourceJourneyId === sourceJourneyId);
    }

    /**
     * Clear all forks (use with caution)
     */
    clearAll(): void {
        this.forks = [];
        this.saveToStorage();
        this.notify();
    }

    /**
     * Get count of forks
     */
    getCount(): number {
        return this.forks.length;
    }
}

/**
 * Singleton instance of the planner store
 * 
 * Import this in any module to access the shared store:
 * ```ts
 * import { plannerStore } from './state/plannerStore';
 * ```
 */
export const plannerStore = new PlannerStore();

/**
 * Export the store class for testing purposes
 */
export { PlannerStore };
