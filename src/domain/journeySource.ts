/**
 * Domain model for JourneySource entities
 * 
 * This file contains pure TypeScript types for journey sources.
 * A JourneySource represents a public, read-only, author-owned journey
 * that can be discovered and forked by users.
 */

import type { StopTemplate } from './stop';

/**
 * JourneySource: Public, read-only, author-owned journey
 * 
 * Represents an immutable journey template created by an author.
 * This is the canonical source that users discover in the Discover tab.
 * Users cannot modify these journeys directly - they must fork them first.
 * 
 * IMPORTANT: JourneySource can NEVER be LIVE.
 * Only JourneyFork instances (user-owned copies) can have LIVE status.
 * Discovered journeys are read-only templates for forking.
 */
export interface JourneySource {
    /** Unique identifier for this journey source */
    id: string;

    /** Journey title */
    title: string;

    /** Location/region description */
    location: string;

    /** Duration estimate (e.g., "3 days", "1 week") */
    duration: string;

    /** Cover image URL */
    imageUrl: string;

    /** Author information */
    author: {
        name: string;
        avatar: string;
        bio?: string;
    };

    /** Immutable stop templates that define this journey */
    stops: StopTemplate[];

    /** Pre-existing moments/memories shared by the author */
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

    // TODO: Consider adding tags/categories for discovery filtering
    // TODO: Consider adding difficulty level or other metadata
    // TODO: Consider adding creation/publication timestamp
}
