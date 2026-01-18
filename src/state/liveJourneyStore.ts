/**
 * Store for managing the single LIVE journey
 * 
 * Rules enforced:
 * - Only ONE journey can be LIVE at a time
 * - Only JourneyFork can be LIVE (never JourneySource)
 * - LIVE journeys must be user-owned
 * 
 * This store coordinates with plannerStore to ensure:
 * - Setting a journey LIVE updates its status in plannerStore
 * - Only forks that exist in plannerStore can become LIVE
 * - When journey becomes LIVE, all other journeys become PLANNED
 */

import type { JourneyFork } from '../domain/journeyFork';
import type { JourneySource } from '../domain/journeySource';
import { isJourneyFork } from '../domain/forkJourney';
import { plannerStore } from './plannerStore';

const STORAGE_KEY = 'trippin_live_journey_id';

/**
 * Listener function type for live journey changes
 */
type LiveJourneyListener = (liveJourney: JourneyFork | null) => void;

/**
 * LiveJourneyStore - Manages the single active/live journey
 */
class LiveJourneyStore {
    private liveJourneyId: string | null = null;
    private listeners: Set<LiveJourneyListener> = new Set();

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Load live journey ID from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.liveJourneyId = stored;
                // Validate that the journey still exists in plannerStore
                const fork = plannerStore.getForkById(stored);
                if (!fork) {
                    // Journey no longer exists, clear it
                    this.liveJourneyId = null;
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch (error) {
            console.error('Failed to load live journey from storage:', error);
            this.liveJourneyId = null;
        }
    }

    /**
     * Save live journey ID to localStorage
     */
    private saveToStorage(): void {
        try {
            if (this.liveJourneyId) {
                localStorage.setItem(STORAGE_KEY, this.liveJourneyId);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error('Failed to save live journey to storage:', error);
        }
    }

    /**
     * Notify all subscribers of live journey change
     */
    private notify(): void {
        const liveJourney = this.getLiveJourney();
        this.listeners.forEach(listener => listener(liveJourney));
    }

    /**
     * Subscribe to live journey changes
     * 
     * @param listener - Function to call when live journey changes
     * @returns Unsubscribe function
     */
    subscribe(listener: LiveJourneyListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Get the current live journey
     * 
     * @returns The live JourneyFork, or null if no journey is live
     */
    getLiveJourney(): JourneyFork | null {
        if (!this.liveJourneyId) return null;

        const fork = plannerStore.getForkById(this.liveJourneyId);
        if (!fork) {
            // Journey was deleted, clear live state
            this.liveJourneyId = null;
            this.saveToStorage();
            return null;
        }

        return fork;
    }

    /**
     * Get the ID of the live journey
     * 
     * @returns The live journey ID, or null
     */
    getLiveJourneyId(): string | null {
        return this.liveJourneyId;
    }

    /**
     * Check if a specific journey is currently live
     * 
     * @param journeyId - ID to check
     * @returns True if this journey is live
     */
    isLive(journeyId: string): boolean {
        return this.liveJourneyId === journeyId;
    }

    /**
     * Set a journey as LIVE
     * 
     * TYPE GUARD: Only accepts JourneyFork, never JourneySource
     * RUNTIME CHECK: Verifies journey exists in plannerStore
     * 
     * @param journey - The JourneyFork to set as live
     * @throws Error if journey is not a valid fork
     */
    setLive(journey: JourneyFork): void {
        // GUARD 1: Type-level check (compile-time)
        // The parameter type 'JourneyFork' prevents JourneySource from being passed

        // GUARD 2: Runtime check - verify it's actually a fork
        if (!isJourneyFork(journey)) {
            throw new Error('Cannot set LIVE: Journey is not a fork. Only JourneyFork can be LIVE.');
        }

        // GUARD 3: Verify journey exists in plannerStore (user-owned)
        const existingFork = plannerStore.getForkById(journey.id);
        if (!existingFork) {
            throw new Error('Cannot set LIVE: Journey fork not found in planner. Only user-owned forks can be LIVE.');
        }

        // GUARD 4: Prevent completed journeys from becoming LIVE
        if (journey.isCompleted) {
            throw new Error('Cannot set LIVE: Journey is already completed.');
        }

        // If a different journey was live, set it back to PLANNED
        if (this.liveJourneyId && this.liveJourneyId !== journey.id) {
            const previousLiveFork = plannerStore.getForkById(this.liveJourneyId);
            if (previousLiveFork) {
                plannerStore.updateFork(this.liveJourneyId, { status: 'PLANNED' });
            }
        }

        // Update the journey's status to LIVE in plannerStore
        plannerStore.updateFork(journey.id, { status: 'LIVE' });

        // Set as live journey
        this.liveJourneyId = journey.id;
        this.saveToStorage();
        this.notify();
    }

    /**
     * Clear the live journey (stop navigation)
     * Sets the journey status back to PLANNED
     */
    clearLive(): void {
        if (this.liveJourneyId) {
            // Set journey back to PLANNED status
            const fork = plannerStore.getForkById(this.liveJourneyId);
            if (fork && !fork.isCompleted) {
                plannerStore.updateFork(this.liveJourneyId, { status: 'PLANNED' });
            }
        }

        this.liveJourneyId = null;
        this.saveToStorage();
        this.notify();
    }

    /**
     * Type guard helper - prevents JourneySource from being set as live
     * 
     * @param journey - Journey to check
     * @returns Type predicate confirming it's a JourneyFork
     */
    canBeLive(journey: JourneySource | JourneyFork): journey is JourneyFork {
        return isJourneyFork(journey);
    }
}

/**
 * Singleton instance of the live journey store
 * 
 * Import this to access the shared live journey state:
 * ```ts
 * import { liveJourneyStore } from './state/liveJourneyStore';
 * ```
 */
export const liveJourneyStore = new LiveJourneyStore();

/**
 * Export the store class for testing
 */
export { LiveJourneyStore };
