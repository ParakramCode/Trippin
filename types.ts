export interface Author {
  name: string;
  avatar: string;
  bio?: string;
}

export type JourneyStatus = "DISCOVERED" | "PLANNED" | "LIVE" | "COMPLETED";
// NOTE:
// Completion is represented exclusively by JourneyFork.status === 'COMPLETED'.
// No boolean completion flags are permitted.

export interface Journey {
  id: string;
  title: string;
  location: string;
  duration: string;
  imageUrl: string;
  author?: Author;
  stops?: Stop[];
  moments?: Moment[];
  clonedAt?: number;
  sourceJourneyId?: string;
  completedAt?: string; // ISO timestamp
  isCustom?: boolean; // User-created custom journey
  status?: JourneyStatus; // Derived from flags above
}

export interface Moment {
  id: string;
  coordinates: [number, number];
  imageUrl: string;
  caption: string;
  author?: Author;
}

export interface Stop {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  imageUrl: string;
  images?: string[]; // Array of images for the gallery/postcard view
  description?: string;
  author?: Author;
  note?: string; // User-added note for this stop
  gallery?: string[]; // Additional gallery images for destination overlay
  activities?: string[]; // List of activities available at this stop

  // NEW: Per-journey visited state
  // When present in a journey fork, tracks if user has visited this stop
  // Allows independent progress tracking for each fork of the same route
  visited?: boolean;
}

// Helper function to derive journey status from existing flags
export function getJourneyStatus(journey: Journey): JourneyStatus {
  // If status is already set, return it
  if (journey.status) return journey.status;

  // Otherwise derive from flags
  // Priority order: COMPLETED > LIVE > PLANNED > DISCOVERED
  if (journey.sourceJourneyId || journey.clonedAt) return "PLANNED";
  return "DISCOVERED";
}
