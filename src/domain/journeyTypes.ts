/**
 * Domain Types: Journey System
 * 
 * This file defines the core types for the journey domain model.
 * 
 * KEY CONCEPTS:
 * - JourneySource: Immutable templates created by authors (discovered)
 * - JourneyFork: Mutable user-owned copies with personal state
 * - StopTemplate: Immutable stop defined by author
 * - UserStop: Mutable stop with user-specific state (visited, notes)
 * 
 * OWNERSHIP MODEL:
 * - JourneySource: Owned by author, read-only for users
 * - JourneyFork: Owned by user, mutable
 * 
 * This is the canonical source of truth for journey types.
 */

import type { Author, Moment } from '../../types';

// ============================================================================
// STOP TYPES
// ============================================================================

/**
 * StopTemplate: Immutable stop definition from journey author
 * 
 * Represents a stop as defined by the journey creator.
 * This is part of a JourneySource and should never be modified by users.
 * 
 * Users can view StopTemplates but must fork the journey to add personal state.
 */
export interface StopTemplate {
    /** Unique identifier for this stop */
    readonly id: string;

    /** Stop name */
    readonly name: string;

    /** Geographic coordinates [longitude, latitude] */
    readonly coordinates: readonly [number, number];

    /** Primary image URL */
    readonly imageUrl: string;

    /** Optional: Additional images for gallery */
    readonly images?: readonly string[];

    /** Optional: Description of the stop */
    readonly description?: string;

    /** Optional: Author who created/curated this stop */
    readonly author?: Readonly<Author>;

    /** Optional: Gallery images for destination overlay */
    readonly gallery?: readonly string[];

    /** Optional: List of activities available at this stop */
    readonly activities?: readonly string[];
}

/**
 * UserStop: Mutable stop with user-specific state
 * 
 * Extends StopTemplate with user-owned mutable properties.
 * This is part of a JourneyFork and can be modified by the user.
 * 
 * User state:
 * - visited: Has the user visited this stop?
 * - note: User's personal note about the stop
 */
export interface UserStop extends StopTemplate {
    /** User-added note for this stop (mutable) */
    note?: string;

    /** Whether user has visited this stop (mutable) */
    visited?: boolean;
}

// ============================================================================
// JOURNEY STATUS
// ============================================================================

/**
 * JourneyStatus: Lifecycle state of a user's journey
 * 
 * State transitions:
 * DISCOVERED → [Fork] → PLANNED → [Start] → LIVE → [Complete] → COMPLETED
 * 
 * - DISCOVERED: Template journey, not yet forked (not stored as fork)
 * - PLANNED: Forked, saved, but not started
 * - LIVE: Currently being executed with active navigation
 * - COMPLETED: Finished and archived
 * 
 * Note: DISCOVERED is not a stored state for forks,
 * it represents the template before forking.
 */
export type JourneyStatus = 'DISCOVERED' | 'PLANNED' | 'LIVE' | 'COMPLETED';

// ============================================================================
// JOURNEY SOURCE (TEMPLATE)
// ============================================================================

/**
 * JourneySource: Immutable template journey created by author
 * 
 * Represents a public, read-only journey template that users can discover.
 * These are the canonical journey definitions created by content authors.
 * 
 * IMMUTABILITY:
 * - All properties are readonly
 * - Users cannot modify templates
 * - To make changes, users must fork (create JourneyFork)
 * 
 * OWNERSHIP:
 * - Owned by: Author (content creator)
 * - Stored in: Application code (defaultJourneys)
 * - Users can: View, fork
 * - Users cannot: Modify, add notes, mark visited
 * 
 * DISCOVERY:
 * - Displayed in Discover tab
 * - Viewable via inspection mode (read-only)
 * - Must be forked before user can add personal state
 */
export interface JourneySource {
    /** Unique identifier for this journey source */
    readonly id: string;

    /** Journey title */
    readonly title: string;

    /** Location/region name */
    readonly location: string;

    /** Duration estimate (e.g., "3 days", "1 week") */
    readonly duration: string;

    /** Cover image URL */
    readonly imageUrl: string;

    /** Immutable stops defined by author */
    readonly stops: readonly StopTemplate[];

    /** Optional: Author-provided moments (photos, stories) */
    readonly moments?: readonly Moment[];

    /** Optional: Journey author/curator */
    readonly author?: Readonly<Author>;
}

// ============================================================================
// JOURNEY FORK (USER JOURNEY)
// ============================================================================

/**
 * JourneyFork: Mutable user-owned copy of a JourneySource
 * 
 * Represents a user's personal instance of a journey template.
 * Created by forking a JourneySource, this becomes the user's mutable version.
 * 
 * MUTABILITY:
 * - User can add notes to stops
 * - User can mark stops as visited
 * - User can reorder/remove stops
 * - User can add personal moments
 * - User can change status (PLANNED → LIVE → COMPLETED)
 * 
 * OWNERSHIP:
 * - Owned by: User
 * - Stored in: localStorage (trippin_user_forks)
 * - Linked to: Original JourneySource via sourceJourneyId
 * 
 * LIFECYCLE:
 * 1. Fork from JourneySource → status: PLANNED
 * 2. User starts navigation → status: LIVE
 * 3. User completes journey → status: COMPLETED
 * 
 * INDEPENDENCE:
 * - Each fork is independent (same template can be forked multiple times)
 * - Visited state is per-fork (same route, different progress)
 * - Changes to fork don't affect original JourneySource
 */
export interface JourneyFork {
    /** Unique identifier for this fork instance */
    id: string;

    /** Reference to the JourneySource this was forked from */
    sourceJourneyId: string;

    /** Journey title (initially from source, user can customize) */
    title: string;

    /** Location (initially from source, user can customize) */
    location: string;

    /** Duration (initially from source, user can customize) */
    duration: string;

    /** Cover image (initially from source, user can customize) */
    imageUrl: string;

    /** User stops with personal state (visited, notes) */
    stops: UserStop[];

    /** User's personal moments/photos captured during journey */
    moments?: Moment[];

    /** Optional: Journey author from source (readonly reference) */
    readonly author?: Readonly<Author>;

    /** Current lifecycle status of this fork */
    status: JourneyStatus;

    /** Timestamp when this journey was forked from source */
    clonedAt: number;

    /** Timestamp when journey was completed (if applicable) */
    completedAt?: string;

    /** Flag indicating if journey is completed */
    isCompleted?: boolean;

    /** Flag indicating if this is a custom user-created journey (not forked) */
    isCustom?: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard: Check if a journey is a JourneyFork
 * 
 * @param journey - Journey to check
 * @returns True if journey is a JourneyFork (has sourceJourneyId and clonedAt)
 */
export function isJourneyFork(journey: JourneySource | JourneyFork): journey is JourneyFork {
    return 'sourceJourneyId' in journey && 'clonedAt' in journey;
}

/**
 * Type guard: Check if a journey is a JourneySource
 * 
 * @param journey - Journey to check
 * @returns True if journey is a JourneySource (template)
 */
export function isJourneySource(journey: JourneySource | JourneyFork): journey is JourneySource {
    return !isJourneyFork(journey);
}

/**
 * Type guard: Check if a stop is a UserStop
 * 
 * @param stop - Stop to check
 * @returns True if stop has user-specific properties
 */
export function isUserStop(stop: StopTemplate | UserStop): stop is UserStop {
    return 'visited' in stop || 'note' in stop;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Union type: Any journey (source or fork)
 */
export type AnyJourney = JourneySource | JourneyFork;

/**
 * Union type: Any stop (template or user)
 */
export type AnyStop = StopTemplate | UserStop;

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate if a journey fork can become LIVE
 * 
 * Rules:
 * - Must be a valid JourneyFork
 * - Cannot be already completed
 * - Status must be PLANNED or LIVE
 * 
 * @param fork - Journey fork to validate
 * @returns True if fork can be set to LIVE status
 */
export function canBeLive(fork: JourneyFork): boolean {
    // Cannot set completed journeys to LIVE
    if (fork.isCompleted) {
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

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export from existing domain files for backward compatibility
export type { Author, Moment } from '../../types';
