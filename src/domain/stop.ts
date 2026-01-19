/**
 * Domain model for Stop entities
 * 
 * This file contains pure TypeScript types for the stop domain.
 * It defines the separation between immutable stop templates (author-owned)
 * and user-specific stop state (user-owned).
 */

/**
 * StopTemplate: Immutable stop definition
 * 
 * Represents the read-only, author-provided definition of a stop.
 * This is the canonical data that comes from journey authors and never changes
 * based on user interaction.
 */
export interface StopTemplate {
    /** Unique identifier for this stop template */
    id: string;

    /** Display name of the stop */
    name: string;

    /** Geographic coordinates [longitude, latitude] */
    coordinates: [number, number];

    /** Primary image URL for the stop */
    imageUrl: string;

    /** Additional images for gallery/postcard view */
    images?: string[];

    /** Description of the stop */
    description?: string;

    /** Additional gallery images for destination overlay */
    gallery?: string[];

    /** List of activities available at this stop */
    activities?: string[];

    /** Author information */
    author?: {
        name: string;
        avatar: string;
        bio?: string;
    };
}

/**
 * UserStop: StopTemplate + user state
 * 
 * Extends the immutable stop template with user-specific mutable state.
 * This represents a stop as it appears in a user's journey fork,
 * combining the template data with personal notes and visit status.
 */
export interface UserStop extends StopTemplate {
    /** User-added personal note for this stop */
    note?: string;

    /** Whether the user has visited this stop */
    visited?: boolean;


}
