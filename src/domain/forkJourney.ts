/**
 * Pure utility function for creating journey forks
 * 
 * This module contains the canonical logic for forking a JourneySource
 * into a user-owned JourneyFork with clean initial state.
 * 
 * NOTE: This function is currently UNUSED. It will replace the existing
 * JSON.parse(JSON.stringify()) cloning logic in a future refactoring step.
 */

import type { JourneySource } from './journeySource';
import type { JourneyFork } from './journeyFork';
import type { StopTemplate, UserStop } from './stop';

/**
 * Creates a new JourneyFork from a JourneySource
 * 
 * This function performs a deep clone of the source journey and initializes
 * user-specific state with clean defaults:
 * - All stops are marked as unvisited
 * - No personal notes
 * - Status set to "PLANNED"
 * - Empty moments array (user will add their own)
 * - Timestamp for fork creation
 * 
 * @param source - The immutable JourneySource to fork from
 * @param ownerId - The user ID who owns this fork (future use)
 * @returns A new JourneyFork instance with initialized user state
 */
export function createJourneyFork(source: JourneySource, ownerId: string): JourneyFork {
    // Deep clone stops and transform to UserStop with clean state
    const userStops: UserStop[] = source.stops.map((stopTemplate: StopTemplate) => ({
        // Copy all template properties
        id: stopTemplate.id,
        name: stopTemplate.name,
        coordinates: stopTemplate.coordinates,
        imageUrl: stopTemplate.imageUrl,
        images: stopTemplate.images ? [...stopTemplate.images] : undefined,
        description: stopTemplate.description,
        gallery: stopTemplate.gallery ? [...stopTemplate.gallery] : undefined,
        activities: stopTemplate.activities ? [...stopTemplate.activities] : undefined,
        author: stopTemplate.author ? { ...stopTemplate.author } : undefined,

        // Initialize user state
        visited: false,
        note: undefined, // No personal notes initially
    }));

    // Create the fork with clean user state
    const fork: JourneyFork = {
        // Generate unique ID for this fork
        id: `fork-${Date.now()}-${ownerId}`,

        // Reference to source journey
        sourceJourneyId: source.id,

        // Copy journey metadata (user can customize later)
        title: source.title,
        location: source.location,
        duration: source.duration,
        imageUrl: source.imageUrl,

        // User stops with initialized state
        stops: userStops,

        // User's personal moments (empty initially)
        moments: [],

        // Journey lifecycle state
        status: "PLANNED",
        clonedAt: Date.now(),
        // NOTE:
        // Completion is represented exclusively by JourneyFork.status === 'COMPLETED'.
        // No boolean completion flags are permitted.
        completedAt: undefined,
        isCustom: false,
    };

    return fork;
}

/**
 * Type guard to check if a journey is a fork
 * 
 * @param journey - Journey to check
 * @returns True if the journey is a JourneyFork
 */
export function isJourneyFork(journey: JourneySource | JourneyFork): journey is JourneyFork {
    return 'sourceJourneyId' in journey && 'clonedAt' in journey;
}

/**
 * Type guard to check if a journey is a source
 * 
 * @param journey - Journey to check
 * @returns True if the journey is a JourneySource
 */
export function isJourneySource(journey: JourneySource | JourneyFork): journey is JourneySource {
    return !isJourneyFork(journey);
}
