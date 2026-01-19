/**
 * Domain model for JourneyFork entities
 * 
 * This file contains pure TypeScript types for journey forks.
 * A JourneyFork represents a user-owned copy of a JourneySource
 * with personal state and customizations.
 */

import type { UserStop } from './stop';
import type { Author } from '../../types';

/**
 * JourneyStatus: Lifecycle state of a user's journey fork
 * 
 * Tracks the progression of a journey through the user's workflow:
 * - DISCOVERED: User has seen it but not yet forked it (never actually stored as a fork)
 * - PLANNED: Forked and saved, but not yet started
 * - LIVE: Currently being executed in real-time
 * - COMPLETED: Finished and archived
 */
export type JourneyStatus = "DISCOVERED" | "PLANNED" | "LIVE" | "COMPLETED";

/**
 * JourneyFork: User-owned copy with personal state
 * 
 * Represents a user's personal instance of a journey, forked from a JourneySource.
 * Unlike the immutable source, this contains mutable user state:
 * - Personal notes on stops
 * - Visit status tracking
 * - Custom moments/photos
 * - Journey lifecycle status
 * 
 * The fork maintains a reference to its source journey but operates independently.
 * Changes to the fork do not affect the original source.
 */
export interface JourneyFork {
    /** Unique identifier for this fork instance */
    id: string;

    /** Reference to the source journey this was forked from */
    sourceJourneyId: string;

    /** Title (initially copied from source, can be customized) */
    title: string;

    /** Location (initially copied from source, can be customized) */
    location: string;

    /** Duration (initially copied from source, can be customized) */
    duration: string;

    /** Cover image URL (initially copied from source, can be customized) */
    imageUrl: string;

    /** UserStops containing both template data and user state */
    stops: UserStop[];

    /**
     * Original author (inherited from JourneySource, Phase 3.1)
     * 
     * When a journey is forked, the original author information is preserved
     * for attribution purposes. Optional because custom journeys don't have a source.
     */
    author?: Author;

    /** User's personal moments/photos captured during the journey */
    moments?: Array<{
        id: string;
        coordinates: [number, number];
        imageUrl: string;
        caption: string;
        author?: {
            name: string;
            avatar: string;
            bio?: string;
        };
    }>;

    /** Current status of this journey fork */
    status: JourneyStatus;

    /** Timestamp when this journey was forked from the source */
    clonedAt: number;

    /** Timestamp when journey was completed (if applicable) */
    /** Timestamp when journey was completed (if applicable) */
    completedAt?: string;

    /** Flag indicating if this is a custom user-created journey (not forked from a source) */
    isCustom?: boolean;


}

/**
 * Runtime validation: Check if a journey fork can become LIVE
 * 
 * Rules enforced:
 * - Must be a valid JourneyFork (has sourceJourneyId, clonedAt)
 * - Cannot be completed
 * - Status must be PLANNED or LIVE
 * 
 * @param fork - The journey fork to validate
 * @returns True if the fork can be set to LIVE status
 */
export function canBeLive(fork: JourneyFork): boolean {
    // Cannot set completed journeys to LIVE
    if (fork.status === 'COMPLETED') {
        return false;
    }

    // Must have required fork properties
    if (!fork.sourceJourneyId || !fork.clonedAt) {
        return false;
    }

    // Status must be PLANNED or already LIVE
    if (fork.status !== 'PLANNED' && fork.status !== 'LIVE') {
        return false;
    }

    return true;
}
