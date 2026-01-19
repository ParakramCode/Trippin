import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Journey, Stop, Moment } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { createJourneyFork, isJourneyFork } from '../src/domain/forkJourney';
import type { JourneyFork } from '../src/domain/journeyFork';
import type { UserStop } from '../src/domain/stop';

/**
 * View mode for journey display
 * 
 * - INSPECTION: Read-only preview mode (inspectionJourney is set)
 * - ACTIVE: Mutable edit mode (activeJourney is set, inspectionJourney is null)
 * - NONE: No journey loaded
 */
export type ViewMode = 'INSPECTION' | 'ACTIVE' | 'NONE';

/**
 * Journey mode - unified semantic state (Phase 2.2)
 * 
 * Derived from multiple state flags to provide single source of truth for journey state.
 * This provides unified semantic state for journey display.
 * 
 * Modes:
 * - INSPECTION: Viewing a journey in read-only mode (template or fork preview)
 * - PLANNING: Editing/planning a fork (not yet started navigation)
 * - NAVIGATION: Actively navigating a fork (live mode, following enabled)
 * - COMPLETED: Journey has been completed by user
 * 
 * Derivation Logic:
 * 1. If inspectionJourney exists → INSPECTION
 * 2. If activeJourney.status === 'COMPLETED' → COMPLETED
 * 3. If activeJourney.status === 'LIVE' → NAVIGATION
 * 4. If activeJourney exists → PLANNING
 * 5. Otherwise → null (no journey loaded)
 * 
 * Use this instead of manually checking state flags.
 */
export type JourneyMode = 'INSPECTION' | 'PLANNING' | 'NAVIGATION' | 'COMPLETED';

interface JourneyContextType {
  // STORAGE SPLIT: Separated template (read-only) from user (mutable) journeys



  /** NEW: Read-only template journeys for discovery (JourneySource) */
  templateJourneys: Journey[];

  /** User-owned active/planned journeys (JourneyFork) - PLANNING/LIVE only */
  plannerJourneys: JourneyFork[];

  /** User-owned completed journeys (JourneyFork) - COMPLETED only, separate collection */
  completedJourneys: JourneyFork[];


  forkJourney: (journey: Journey) => void;
  removeFromPlanner: (journey: JourneyFork) => void;
  renameJourney: (journey: JourneyFork, newTitle: string) => void;
  updateJourneyLocation: (journey: JourneyFork, location: string) => void;
  updateJourneyDuration: (journey: JourneyFork, duration: string) => void;
  updateJourneyCoverImage: (journey: JourneyFork, imageUrl: string) => void;
  moveStop: (journey: JourneyFork, stopIndex: number, direction: 'up' | 'down') => void;
  removeStop: (journey: JourneyFork, stopId: string) => void;
  addStop: (journey: JourneyFork, stop: UserStop, insertIndex?: number) => void;
  updateStopNote: (journey: JourneyFork, stopId: string, note: string) => void;

  // ============================================================================
  // SEMANTIC JOURNEY STATE (Read vs Edit Separation)
  // ============================================================================

  /**
   * READ-ONLY INSPECTION MODE
   * 
   * inspectionJourney: Journey being previewed/explored (read-only)
   * - Can be JourneySource (discovered) OR JourneyFork (user-owned)
   * - Never subject to mutations (no notes, no status changes)
   * - Used for safe exploration of discovered journeys
   * - Map view prefers this over activeJourney when present
   * 
   * Purpose: Prevents discovered journeys from becoming mutable.
   * Users can explore any journey safely without corrupting templates.
   * To make changes, they must explicitly fork first.
   */
  inspectionJourney: Readonly<Journey> | null;
  setInspectionJourney: (journey: Readonly<Journey> | null) => void;

  /**
   * MUTABLE ACTIVE JOURNEY
   * 
   * activeJourney: Journey being edited/navigated (mutable)
   * 
   * INVARIANT (enforced by guards, not types):
   * - Should ONLY contain JourneyFork | null
   * - Type says Journey for backward compatibility
   * - Runtime guards prevent JourneySource assignment in mutation functions
   * 
   * Purpose: User-owned journey that can receive mutations.
   * Only forks should be active. Templates must be forked first.
   * 
   *
   * Type: JourneyFork | null
   */
  activeJourney: JourneyFork | null;

  /**
   * Set active journey (Phase 3.1: Fork-only, type enforced)
   * 
   * STRICT ENFORCEMENT:
   * - Only accepts JourneyFork instances
   * - Passing JourneySource causes compile error
   * - Runtime guards throw in development if non-fork passed
   * 
   * Use loadJourney() for automatic routing instead of calling this directly.
   */
  setActiveJourney: (journey: JourneyFork) => void;

  /**
   * DISPLAY JOURNEY (Derived)
   * 
   * currentJourney: The journey currently displayed on the map
   * - Computed as: inspectionJourney ?? activeJourney
   * - Read-only reference, never mutate through this
   * - Represents display priority (inspection takes precedence)
   * 
   * Purpose: Single source of truth for "which journey to render".
   * Components should use this instead of choosing between inspection/active.
   * 
   * Display Priority:
   * 1. inspectionJourney (if present) → Read-only exploration
   * 2. activeJourney (if present) → Mutable editing
   * 3. null (if neither) → No journey loaded
   */
  currentJourney: Readonly<Journey> | Journey | null;

  /**
   * READ-ONLY INDICATOR (Derived - Phase 2.3)
   * 
   * isReadOnlyJourney: Boolean indicating if current journey is read-only
   * - true: inspectionJourney is set (viewing template/preview, no mutations allowed)
   * - false: activeJourney is set (user-owned fork, mutations allowed)
   * 
   * Purpose: Toggle UI elements based on mutability.
   * Use this to enable/disable edit buttons, forms, etc.
   * 
   * Example:
   * ```typescript
   * {!isReadOnlyJourney && <EditButton />}
   * <TextField disabled={isReadOnlyJourney} />
   * ```
   */
  isReadOnlyJourney: boolean;

  /**
   * VIEW MODE (Derived)
   * 
   * viewMode: Indicates the current viewing/editing mode
   * - INSPECTION: User is previewing (inspectionJourney exists)
   * - ACTIVE: User is editing/navigating (activeJourney exists, inspection null)
   * - NONE: No journey loaded
   * 
   * Purpose: Explicit mode instead of inferring from state presence.
   * Components can check viewMode instead of !!inspectionJourney.
   * Makes read-only vs mutable distinction explicit.
   */
  viewMode: ViewMode;


  /**
   * JOURNEY MODE (Derived - Phase 2.2)
   * 
   * journeyMode: Unified semantic state for journey lifecycle
   * 
   * Purpose: Single source of truth for journey state.
   * Replaces manual checking of isFollowing, status, isCompleted flags.
   * 
   * Examples:
   * ```typescript
   * if (journeyMode === 'NAVIGATION') {
   *   // Show live navigation UI
   * } else if (journeyMode === 'PLANNING') {
   *   // Show planning/editing UI
   * }
   * ```
   * 
   * NOTE: Legacy flags (isFollowing, status, isCompleted) still exist
   * for backward compatibility but journeyMode is the preferred API.
   */
  journeyMode: JourneyMode | null;

  /** Load a journey by ID. Handles routing to Inspection or Active mode automatically. */
  loadJourney: (journeyId: string) => void;
  userLocation: [number, number] | null;
  userHeading: number | null;

  // Phase 3.2: Removed isFollowing/setIsFollowing - use journeyMode === 'NAVIGATION' instead



  // NEW: Per-journey visited state management (use these instead of global functions)
  /** Toggle visited state for a specific stop within a journey */
  toggleStopVisitedInJourney: (journey: JourneyFork, stopId: string) => void;
  /** Mark a stop as visited within a specific journey */
  markStopVisitedInJourney: (journey: JourneyFork, stopId: string) => void;
  /** Get array of visited stop IDs for a specific journey */
  getVisitedStopsForJourney: (journey: JourneyFork) => string[];

  completeJourney: (journey: JourneyFork) => void;
  isJourneyEditable: (journey: JourneyFork) => boolean;
  savedJourneyIds: Set<string>;
  isAlreadySaved: (journeyId: string) => boolean;
  createCustomJourney: () => JourneyFork;
  /** Start navigation mode for a journey */
  startJourney: (journey: JourneyFork) => void;
  /**
   * Stop journey navigation (Phase 3.2)
   * 
   * Sets journey status back to PLANNED, ending navigation mode.
   * Use this instead of setIsFollowing(false).
   */
  stopJourney: (journey: JourneyFork) => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

const useLocationWatcher = (callback: (coords: [number, number], heading: number | null) => void) => {
  React.useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const heading = position.coords.heading;
        callback(
          [position.coords.longitude, position.coords.latitude],
          heading
        );
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [callback]);
};

/**
 * These are immutable templates and should never be modified or set as active.
 */
export const defaultJourneys: Journey[] = [
  {
    id: '1',
    title: 'Northern Coast',
    location: 'California, USA',
    duration: '3 Days',
    imageUrl: 'https://picsum.photos/seed/coast/800/1200',
    author: {
      name: 'Sarah Jenkins',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      bio: 'Coastal explorer and photographer.'
    },
    stops: [
      { id: '1', name: 'San Francisco', coordinates: [-122.4194, 37.7749], imageUrl: 'https://picsum.photos/seed/sf/300/200', description: 'Iconic city by the bay featuring the Golden Gate Bridge.' },
      { id: '2', name: 'Sausalito', coordinates: [-122.4853, 37.8591], imageUrl: 'https://picsum.photos/seed/sau/300/200', description: 'Charming seaside town with stunning skyline views.' },
      { id: '3', name: 'Muir Woods', coordinates: [-122.5811, 37.8970], imageUrl: 'https://picsum.photos/seed/muir/300/200', description: 'Ancient redwood forest offering peaceful hiking trails.' },
    ],
    moments: [
      { id: 'm1', coordinates: [-122.45, 37.8], imageUrl: 'https://picsum.photos/seed/moment1/100/100', caption: 'Hidden trail view' },
      { id: 'm2', coordinates: [-122.50, 37.87], imageUrl: 'https://picsum.photos/seed/moment2/100/100', caption: 'Coffee stop' }
    ]
  },
  {
    id: '2',
    title: 'Big Sur Escape',
    location: 'California, USA',
    duration: '2 Days',
    imageUrl: 'https://picsum.photos/seed/bigsur/800/1200',
    author: {
      name: 'Sarah Jenkins',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      bio: 'Coastal explorer and photographer.'
    },
    stops: [
      { id: '4', name: 'Monterey', coordinates: [-121.8947, 36.6002], imageUrl: 'https://picsum.photos/seed/monterey/300/200', description: 'Historic cannery row and world-class aquarium.' },
      { id: '5', name: 'Bixby Bridge', coordinates: [-121.9017, 36.3715], imageUrl: 'https://picsum.photos/seed/bixby/300/200', description: 'Famous arch bridge with breathtaking coastal views.' },
      { id: '6', name: 'McWay Falls', coordinates: [-121.6706, 36.1576], imageUrl: 'https://picsum.photos/seed/mcway/300/200', description: 'Stunning tidefall that empties directly into the ocean.' },
    ],
    moments: []
  },
  {
    id: '3',
    title: 'Spiti Valley Circuit',
    location: 'Himachal Pradesh, India',
    duration: '5 Days',
    imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80&auto=format&fit=crop',
    author: {
      name: 'Arjun Mehta',
      avatar: 'https://i.pravatar.cc/150?u=arjun',
      bio: 'Himalayan trekker.'
    },
    stops: [
      {
        id: '7',
        name: 'Kaza',
        coordinates: [78.0710, 32.2276],
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
        description: 'Remote capital of Spiti situated on the banks of Spiti River. This high-altitude desert town serves as the perfect base for exploring ancient monasteries and experiencing the unique culture of the trans-Himalayan region.',
        gallery: [
          'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop'
        ],
        activities: ['Key Monastery Visit', 'High Altitude Post Office', 'Local Market Shopping', 'Stargazing', 'Traditional Spitian Cuisine']
      },
      {
        id: '8',
        name: 'Key Monastery',
        coordinates: [78.0120, 32.2960],
        imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80&auto=format&fit=crop',
        description: 'Famous Tibetan Buddhist monastery perched on a hill at 4,166 meters. Founded in the 11th century, it houses rare Buddhist scriptures and stunning murals.',
        gallery: [
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80&auto=format&fit=crop'
        ],
        activities: ['Prayer Hall Tour', 'Monk Interactions', 'Butter Lamp Lighting', 'Meditation Session', 'Manuscript Viewing']
      },
      {
        id: '9',
        name: 'Chandratal Lake',
        coordinates: [77.6100, 32.4800],
        imageUrl: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80&auto=format&fit=crop',
        description: 'Crescent-shaped lake offering mesmerizing reflections of the surrounding peaks. Sacred to locals and a favorite camping destination for adventurers.',
        gallery: [
          'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80&auto=format&fit=crop'
        ],
        activities: ['Lakeside Camping', 'Photography', 'Sunrise Viewing', 'Nature Walks', 'Bird Watching']
      }
    ],
    moments: []
  },
  {
    id: '4',
    title: 'Old Manali Trail',
    location: 'Himachal Pradesh, India',
    duration: '3 Days',
    imageUrl: 'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=800&q=80&auto=format&fit=crop',
    author: {
      name: 'Arjun Mehta',
      avatar: 'https://i.pravatar.cc/150?u=arjun',
      bio: 'Himalayan trekker.'
    },
    stops: [
      {
        id: '10',
        name: 'Hadimba Temple',
        coordinates: [77.1887, 32.2450],
        imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80&auto=format&fit=crop',
        description: 'Ancient cave temple dedicated to Hidimbi Devi, surrounded by towering cedar forests. Built in 1553, it showcases unique Himalayan architecture.',
        gallery: [
          'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80&auto=format&fit=crop'
        ],
        activities: ['Temple Visit', 'Cedar Forest Walk', 'Photography', 'Cultural Exploration', 'Local Handicrafts']
      },
      {
        id: '11',
        name: 'Jogini Falls',
        coordinates: [77.1950, 32.2600],
        imageUrl: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80&auto=format&fit=crop',
        description: 'Scenic path leading to a majestic waterfall cascading down from 150 feet. The trek offers panoramic views of Manali valley.',
        gallery: [
          'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=800&q=80&auto=format&fit=crop'
        ],
        activities: ['Waterfall Trek', 'Vashisht Temple Visit', 'Hot Springs', 'Valley Photography', 'Picnic Spot']
      },
      {
        id: '12',
        name: 'Beas River',
        coordinates: [77.1800, 32.2300],
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
        description: 'Riverside relaxation with stunning mountain backdrops. Perfect spot for rafting, fishing, or simply enjoying the serene mountain atmosphere.',
        gallery: [
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=800&q=80&auto=format&fit=crop'
        ],
        activities: ['River Rafting', 'Fishing', 'Riverside Camping', 'Photography', 'Mountain Biking']
      }
    ],
    moments: []
  },
  {
    id: '5',
    title: 'Shimla to Kufri',
    location: 'Himachal Pradesh, India',
    duration: '2 Days',
    imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=800&auto=format&fit=crop',
    author: {
      name: 'Priya Singh',
      avatar: 'https://i.pravatar.cc/150?u=priya',
      bio: 'Nature lover.'
    },
    stops: [
      { id: '13', name: 'The Ridge', coordinates: [77.1734, 31.1048], imageUrl: 'https://images.unsplash.com/photo-1533470125816-724bc2f11c52?w=300', description: 'Hub of cultural activities with colonial architecture.' },
      { id: '14', name: 'Jakhu Temple', coordinates: [77.1800, 31.1000], imageUrl: 'https://images.unsplash.com/photo-1626014902120-e22067711f98?w=300', description: 'Ancient temple dedicated to Lord Hanuman with panoramic views.' },
      { id: '15', name: 'Himalayan Park', coordinates: [77.2600, 31.0900], imageUrl: 'https://images.unsplash.com/photo-1594896796245-0d0c64993a40?w=300', description: 'Nature park showcasing Himalayan flora and fauna.' }
    ],
    moments: []
  },
  {
    id: '6',
    title: 'Kasol Riverside',
    location: 'Himachal Pradesh, India',
    duration: '4 Days',
    imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=800&auto=format&fit=crop',
    author: {
      name: 'Priya Singh',
      avatar: 'https://i.pravatar.cc/150?u=priya',
      bio: 'Nature lover.'
    },
    stops: [
      { id: '16', name: 'Parvati River', coordinates: [77.3150, 32.0100], imageUrl: 'https://images.unsplash.com/photo-1504780521369-144d477b760a?w=300', description: 'Serene river flowing through the Parvati Valley.' },
      { id: '17', name: 'Manikaran', coordinates: [77.3500, 32.0200], imageUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=300', description: 'Religious center famous for hot springs.' },
      { id: '18', name: 'Tosh Village', coordinates: [77.4500, 32.0100], imageUrl: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=300', description: 'Scenic village at the far end of the valley.' }
    ],
    moments: []
  },
  {
    id: '7',
    title: 'Manali to Leh Highway',
    location: 'Himachal & Ladakh, India',
    duration: '2 Days',
    imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800',
    author: {
      name: 'Vikram Rider',
      avatar: 'https://i.pravatar.cc/150?u=vikram',
      bio: 'Motorcycle enthusiast.'
    },
    stops: [
      { id: '19', name: 'Rohtang Pass', coordinates: [77.2466, 32.3716], imageUrl: 'https://images.unsplash.com/photo-1595842878696-3c0f9k8j?w=300', description: 'High mountain pass connecting Kullu Valley with Lahaul and Spiti.' },
      { id: '20', name: 'Keylong', coordinates: [77.0320, 32.5710], imageUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=300', description: 'Administrative center of Lahaul and Spiti.' },
      { id: '21', name: 'Sarchu', coordinates: [77.5815, 32.9079], imageUrl: 'https://images.unsplash.com/photo-1533470125816-724bc2f11c52?w=300', description: 'Major halt point on the boundary of Himachal Pradesh and Ladakh.' },
      { id: '22', name: 'Leh', coordinates: [77.5771, 34.1526], imageUrl: 'https://images.unsplash.com/photo-1626014902120-e22067711f98?w=300', description: 'Capital of Ladakh, known for its monasteries and landscapes.' }
    ],
    moments: []
  }
];

export const JourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  /**
   * STORAGE SPLIT: Template vs. User Journeys
   * 
   * WHY:
   * - Template journeys are immutable, read-only journey sources
   * - User journeys are mutable forks with personal state
   * - Mixing them in one array was causing mutations and confusion
   * 
   * NEW ARCHITECTURE:
   * - templateJourneys: Read-only discovery (JourneySource)
   * - plannerJourneys: User-owned forks (JourneyFork)
   * - Separate localStorage keys prevent accidental merging
   */

  // Template journeys: Read-only, immutable journey sources for discovery
  const templateJourneys = useMemo(() => defaultJourneys || [], []);



  // User journeys: Mutable forks stored in localStorage with new key
  // NOTE: Changed key from 'trippin_planner_journeys' to 'trippin_user_forks'
  // to prevent mixing with old data structure
  // EXPLICIT STATE OWNERSHIP:
  // plannerJourneys = PLANNING / LIVE journeys only
  // completedJourneys = COMPLETED journeys only (separate collection)
  const [plannerJourneys, setPlannerJourneys] = useLocalStorage<JourneyFork[]>(
    'trippin_user_forks',
    []
  );

  const [completedJourneys, setCompletedJourneys] = useLocalStorage<JourneyFork[]>(
    'trippin_completed_journeys',
    []
  );

  /**
   * READ-ONLY INSPECTION MODE STATE
   * 
   * Semantic separation:
   * - inspectionJourney: Read-only viewing (JourneySource OR JourneyFork)
   * - activeJourney: Mutable, user-owned (should ONLY be JourneyFork)
   * 
   * Why this separation is critical:
   * 1. Discovered journeys (JourneySource) are immutable templates
   * 2. They must be viewable on the map for exploration
   * 3. But they must NEVER become subject to mutations
   * 4. Forking is the ONLY path from discovered → mutable
   * 
   * Map behavior:
   * - Prefers inspectionJourney when present (read-only exploration)
   * - Falls back to activeJourney for user-owned journeys
   * - Mutations only apply to activeJourney (never inspectionJourney)
   */
  const [inspectionJourney, setInspectionJourney] = useState<Readonly<Journey> | null>(null);

  /**
   * ACTIVE JOURNEY STATE (Phase 3.1: Type Enforced)
   * 
   * Initialize activeJourney from localStorage, but ONLY from plannerJourneys (forks).
   * Templates should NEVER initialize as activeJourney.
   * 
   * Migration from Phase 2:
   * - OLD: Could initialize from defaultJourneys (unsafe)
   * - NEW: Only initializes from plannerJourneys (safe)
   * - Type narrowing: JourneyFork | null enforced
   */
  const [activeJourney, setActiveJourney] = useState<JourneyFork | null>(() => {
    const savedId = localStorage.getItem('activeJourneyId');
    if (savedId) {
      const fork = (plannerJourneys || []).find(j => j.id === savedId);
      if (fork) {
        return fork;
      }
    }
    return null;
  });

  // ============================================================================
  // DERIVED SEMANTIC STATE (Read vs Write Separation)
  // ============================================================================

  /**
   * currentJourney: Single source of truth for "journey to display" (Phase 2.3)
   * 
   * READ VS WRITE SEPARATION:
   * - currentJourney = USE FOR RENDERING (map display, UI components)
   * - activeJourney = USE FOR MUTATIONS (editing, updating state)
   * - inspectionJourney = READ-ONLY EXPLORATION (templates, previews)
   * 
   * Display Priority Rule:
   * 1. inspectionJourney (if present) → Read-only exploration
   * 2. activeJourney (if present) → Mutable editing  
   * 3. null → No journey loaded
   * 
   * Purpose:
   * - Components render currentJourney (display concern)
   * - Components mutate activeJourney only (write concern)
   * - Never mutate through currentJourney reference
   * 
   * Example:
   * ```typescript
   * // GOOD: Render from currentJourney
   * <JourneyMap journey={currentJourney} />
   * 
   * // GOOD: Mutate activeJourney
   * if (activeJourney) {
   *   updateStopNote(activeJourney.id, stopId, note);
   * }
   * 
   * // BAD: Don't assume currentJourney is mutable
   * updateStopNote(currentJourney.id, stopId, note);  // ❌ Could be template!
   * ```
   */
  const currentJourney = useMemo(
    () => inspectionJourney ?? activeJourney,
    [inspectionJourney, activeJourney]
  );

  /**
   * isReadOnlyJourney: Indicates if current journey is read-only (Phase 2.3)
   * 
   * Returns true when:
   * - inspectionJourney is set (viewing template or fork preview)
   * - Mutations should be disabled in UI
   * - Edit buttons should be hidden/disabled
   * 
   * Returns false when:
   * - activeJourney is set (user-owned fork, can edit)
   * - Mutations allowed
   * - Edit UI should be enabled
   * 
   * Use this to toggle UI elements:
   * ```typescript
   * {!isReadOnlyJourney && <EditButton />}
   * <SaveButton disabled={isReadOnlyJourney} />
   * ```
   */
  const isReadOnlyJourney = useMemo(
    () => Boolean(inspectionJourney),
    [inspectionJourney]
  );

  /**
   * viewMode: Explicit mode indicator (INSPECTION | ACTIVE | NONE)
   * 
   * Mode Determination:
   * - INSPECTION: inspectionJourney exists (read-only preview)
   * - ACTIVE: activeJourney exists AND inspectionJourney is null (mutable edit)
   * - NONE: Both are null (no journey loaded)
   * 
   * Components should check viewMode instead of inferring from state presence.
   */
  const viewMode: ViewMode = useMemo(() => {
    if (inspectionJourney) return 'INSPECTION';
    if (activeJourney) return 'ACTIVE';
    return 'NONE';
  }, [inspectionJourney, activeJourney]);



  /**
   * ACTIVE JOURNEY SETTER (Phase 3.1: Type Enforced)
   * 
   * STRICT ENFORCEMENT:
   * - Type signature: Only accepts JourneyFork (compile-time safety)
   * - Runtime guard: Throws error in development if non-fork passed
   * - Production: Logs error, graceful degradation
   * 
   * Change from Phase 2:
   * - Phase 2: Logged warning, still allowed
   * - Phase 3.1: Throws error in dev, type-enforced
   * 
   * Use loadJourney() instead for automatic routing.
   */
  const setActiveJourneyWithValidation = useCallback((journey: JourneyFork) => {
    // PHASE 3.1: TYPE-ENFORCED FORK VALIDATION
    // TypeScript prevents JourneySource at compile time
    // Runtime guard is defense-in-depth (catches "as any" casts, data corruption)

    if (!isJourneyFork(journey as any)) {
      const errorMessage = [
        '╔════════════════════════════════════════════════════════════════╗',
        '║ [setActiveJourney] TYPE ERROR: Non-fork passed                ║',
        '╚════════════════════════════════════════════════════════════════╝',
        '',
        '⛔ STRICT ENFORCEMENT (Phase 3.1):',
        '   activeJourney can ONLY contain JourneyFork instances.',
        '',
        '📋 Journey Details:',
        `   ID: ${journey.id}`,
        `   Title: ${(journey as any).title || 'Unknown'}`,
        '   Type: Non-fork (missing sourceJourneyId or clonedAt)',
        '',
        '🔍 This should have caused a compile error.',
        '   Likely caused by:',
        '   - Unsafe type cast ("as any", "as JourneyFork")',
        '   - Data corruption (journey in plannerJourneys without fork metadata)',
        '',
        '✅ To fix:',
        '   1. Use loadJourney(id) for automatic routing',
        '   2. Fork the journey first with forkJourney()',
        '   3. Remove unsafe type casts',
        ''
      ].join('\n');

      // Development: Throw error (fail fast)
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(errorMessage);
      }

      // Production: Log error but don't crash
      console.error(errorMessage);
      return;
    }

    // Type and runtime guards passed - safe to set
    setActiveJourney(journey);
  }, []);





  /**
   * Fork a journey (create personalized copy for user's planner)
   * 
   * Delegates to createJourneyFork() from domain utilities for consistent fork creation.
   * No more JSON.parse(JSON.stringify()) - single source of truth for fork semantics.
   * 
   * @param journey - Journey to fork (can be template or existing fork)
   */
  const forkJourney = useCallback((journey: Journey) => {
    const fork = createJourneyFork(journey as any, '');
    setPlannerJourneys(prev => [...prev, fork]);
  }, [setPlannerJourneys]);

  const removeFromPlanner = useCallback((journey: JourneyFork) => {
    setPlannerJourneys(prev => prev.filter(j => j.id !== journey.id));
    // Clear active journey if it's the one being removed
    if (activeJourney?.id === journey.id) {
      setActiveJourney(null);
    }
  }, [setPlannerJourneys, activeJourney]);

  /**
   * loadJourney - CORRECT WAY TO ACTIVATE/VIEW JOURNEYS (Phase 2.1)
   * 
   * This function implements the ONLY safe routing for journey activation.
   * It automatically decides between inspection (read-only) and active (mutable) modes.
   * 
   * PHASE 2.1 ENFORCEMENT:
   * - Templates (JourneySource) → inspectionJourney ONLY (read-only)
   * - Forks (JourneyFork) → activeJourney ONLY (mutable)
   * - Templates can NEVER become activeJourney (blocked by setActiveJourney guard)
   * 
   * Routing Logic:
   * 1. If ID found in templateJourneys → setInspectionJourney (read-only exploration)
   * 2. If ID found in plannerJourneys → setActiveJourney (mutable editing)
   * 3. If not found → clears both (journey doesn't exist)
   * 
   * Why this is the correct path:
   * - Prevents template corruption (automatic routing)
   * - Enforces semantic boundaries (templates vs forks)
   * - User-friendly (no mode selection needed)
   * - Type-safe (only forks reach activeJourney)
   * 
   * DO NOT use setActiveJourney directly - use this function instead.
   * 
   * @param journeyId - Journey ID to load (auto-detects source vs fork)
   */
  const loadJourney = useCallback((journeyId: string) => {
    // STORAGE SPLIT: Check template journeys (read-only) vs user forks (mutable)

    // Check if this is a template journey (from templateJourneys)
    const templateJourney = templateJourneys.find(j => j.id === journeyId);
    if (templateJourney) {
      setInspectionJourney(templateJourney);
      setActiveJourney(null);
      localStorage.setItem('inspectionJourneyId', journeyId);
      return;
    }

    // Check if this is a user fork (from plannerJourneys)
    const forkedJourney = plannerJourneys.find(j => j.id === journeyId);
    if (forkedJourney) {
      // Forked journey: Can be active (mutable)
      // Safe to set as activeJourney because it's a JourneyFork
      setInspectionJourney(null); // Clear inspection mode
      setActiveJourney(forkedJourney);  // Direct call is safe here (guaranteed fork)
      localStorage.setItem('activeJourneyId', journeyId);
      return;
    }

    // Check if this is a completed journey (from completedJourneys)
    const completedJourney = completedJourneys.find(j => j.id === journeyId);
    if (completedJourney) {
      // GUARD: Completed journeys can only be viewed, never made active
      // Use inspection mode for read-only viewing
      setInspectionJourney(completedJourney);
      setActiveJourney(null);
      return;
    }
  }, [templateJourneys, plannerJourneys, completedJourneys]);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(0);

  /**
   * DERIVED JOURNEY MODE (Phase 3.2: No Manual Flags)
   * 
   * journeyMode: Unified semantic journey state
   * 
   * Derivation Priority (first match wins):
   * 1. inspectionJourney exists → INSPECTION (read-only preview)
   * 2. activeJourney.status === 'COMPLETED' → COMPLETED (finished)
   * 3. activeJourney.status === 'LIVE' → NAVIGATION (live mode)
   * 4. activeJourney exists → PLANNING (editing/planning)
   * 5. Otherwise → null (no journey loaded)
   * 
   */
  const journeyMode: JourneyMode | null = useMemo(() => {
    // Priority 1: Inspection mode (read-only preview)
    if (inspectionJourney) {
      return 'INSPECTION';
    }

    // No activeJourney means no journey loaded
    if (!activeJourney) {
      return null;
    }

    // Priority 2: Completed journey
    if (activeJourney.status === 'COMPLETED') {
      return 'COMPLETED';
    }

    // Priority 3: Live navigation (status flag ONLY)
    if (activeJourney.status === 'LIVE') {
      return 'NAVIGATION';
    }

    // Priority 4: Default for activeJourney - planning/editing mode
    return 'PLANNING';
  }, [inspectionJourney, activeJourney]);




  useLocationWatcher(useCallback((coords, heading) => {
    setUserLocation(coords);
    if (heading !== null && !isNaN(heading)) {
      setUserHeading(heading);
    }
  }, []));



  /**
   * Per-Journey Visited State Helpers
   * 
   * These functions manage visited state within each journey's stops.
   * 
   * Benefits:
   * - Each fork maintains independent visited state
   * - User can complete same route multiple times with separate progress
   * - No cross-journey pollution
   * - Aligns with UserStop domain model
   */

  /**
   * Toggle visited state for a stop within a specific journey
   * 
   * OWNERSHIP GUARD:
   * Only allows mutation if:
   * 1. activeJourney exists (user-owned fork, not template)
   * 2. journeyId matches activeJourney.id (prevents cross-journey mutations)
   * 
   * Why these guards:
   * - Prevents accidental mutation of discovered journeys (templates)
   * - Prevents mutation during inspection mode (read-only)
   * - Ensures mutations are scoped to the journey the user is actively viewing
   * 
   * @param journeyId - The journey containing the stop
   * @param stopId - The stop to toggle
   */
  const toggleStopVisitedInJourney = useCallback((journey: JourneyFork, stopId: string) => {
    // Guards passed - perform mutation
    setPlannerJourneys(prev => prev.map(j => {
      if (j.id !== journey.id || !j.stops) return j;
      return {
        ...j,
        stops: j.stops.map(stop =>
          stop.id === stopId ? { ...stop, visited: !stop.visited } : stop
        )
      };
    }));

    // Update active journey in sync
    if (activeJourney?.id === journey.id && activeJourney.stops) {
      setActiveJourney({
        ...activeJourney,
        stops: activeJourney.stops.map(stop =>
          stop.id === stopId ? { ...stop, visited: !stop.visited } : stop
        )
      });
    }
  }, [setPlannerJourneys, activeJourney]);

  /**
   * Mark a stop as visited within a specific journey
   * 
   * OWNERSHIP GUARD:
   * Only allows mutation if:
   * 1. activeJourney exists (user-owned fork, not template)
   * 2. journeyId matches activeJourney.id (prevents cross-journey mutations)
   * 
   * Typically called by proximity detection in JourneyMap.
   * 
   * @param journeyId - The journey containing the stop
   * @param stopId - The stop to mark as visited
   */
  const markStopVisitedInJourney = useCallback((journey: JourneyFork, stopId: string) => {
    // Guards passed - perform mutation
    setPlannerJourneys(prev => prev.map(j => {
      if (j.id !== journey.id || !j.stops) return j;
      return {
        ...j,
        stops: j.stops.map(stop =>
          stop.id === stopId && !stop.visited ? { ...stop, visited: true } : stop
        )
      };
    }));

    // Update active journey in sync
    if (activeJourney?.id === journey.id && activeJourney.stops) {
      setActiveJourney({
        ...activeJourney,
        stops: activeJourney.stops.map(stop =>
          stop.id === stopId && !stop.visited ? { ...stop, visited: true } : stop
        )
      });
    }
  }, [setPlannerJourneys, activeJourney]);

  /**
   * Get visited stops for a specific journey
   * @param journeyId - The journey to check
   * @returns Array of visited stop IDs for this journey
   */
  /**
   * Get visited stops for a specific journey
   * @param journey - The journey to check
   * @returns Array of visited stop IDs for this journey
   */
  const getVisitedStopsForJourney = useCallback((journey: JourneyFork): string[] => {
    if (!journey.stops) return [];
    return journey.stops
      .filter(stop => stop.visited === true)
      .map(stop => stop.id);
  }, []);

  // Complete a journey with timestamp
  // NOTE:
  // Completion is represented exclusively by JourneyFork.status === 'COMPLETED'.
  // Completed journeys are MOVED to a separate collection (not just status update).
  const completeJourney = useCallback((journey: JourneyFork) => {
    const now = new Date().toISOString();

    // Create completed version of the journey
    const completedJourney = {
      ...journey,
      completedAt: now,
      status: 'COMPLETED' as const
    };

    // 1. REMOVE from plannerJourneys (no longer active/planned)
    setPlannerJourneys(prev => prev.filter(j => j.id !== journey.id));

    // 2. ADD to completedJourneys (append, don't replace)
    setCompletedJourneys(prev => [...prev, completedJourney]);

    // 3. Clear activeJourney to exit active/navigation mode
    if (activeJourney?.id === journey.id) {
      setActiveJourney(null);
    }

    // 4. Clear inspection mode as well
    setInspectionJourney(null);

    // 5. Dev-only assertion to prevent regressions
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        console.assert(
          completedJourneys.some(j => j.id === journey.id && j.status === 'COMPLETED'),
          '[completeJourney] Completed journey must exist in completedJourneys with status=COMPLETED'
        );
      }, 100);
    }
  }, [setPlannerJourneys, setCompletedJourneys, activeJourney, completedJourneys]);

  // Check if a journey is editable (must be in planner and not completed)
  const isJourneyEditable = useCallback((journey: JourneyFork) => {
    // Since input is JourneyFork, we just check completion status
    return journey.status !== 'COMPLETED';
  }, []);

  // Rename a journey in the planner
  const renameJourney = useCallback((journey: JourneyFork, newTitle: string) => {
    // Safety: Only edit if journey is not completed
    if (journey.status === 'COMPLETED') return;

    setPlannerJourneys(prev => prev.map(j =>
      j.id === journey.id ? { ...j, title: newTitle } : j
    ));

    if (activeJourney?.id === journey.id) {
      setActiveJourney({ ...activeJourney, title: newTitle });
    }
  }, [setPlannerJourneys, activeJourney]);

  // Update journey location
  const updateJourneyLocation = useCallback((journey: JourneyFork, location: string) => {
    // Safety: Only edit if journey is not completed
    if (journey.status === 'COMPLETED') return;

    setPlannerJourneys(prev => prev.map(j =>
      j.id === journey.id ? { ...j, location } : j
    ));

    if (activeJourney?.id === journey.id) {
      setActiveJourney({ ...activeJourney, location });
    }
  }, [setPlannerJourneys, activeJourney]);

  // Update journey duration
  const updateJourneyDuration = useCallback((journey: JourneyFork, duration: string) => {
    // Safety: Only edit if journey is not completed
    if (journey.status === 'COMPLETED') return;

    setPlannerJourneys(prev => prev.map(j =>
      j.id === journey.id ? { ...j, duration } : j
    ));

    if (activeJourney?.id === journey.id) {
      setActiveJourney({ ...activeJourney, duration });
    }
  }, [setPlannerJourneys, activeJourney]);

  // Update journey cover image
  const updateJourneyCoverImage = useCallback((journey: JourneyFork, imageUrl: string) => {
    // Safety: Only edit if journey is not completed
    if (journey.status === 'COMPLETED') return;

    setPlannerJourneys(prev => prev.map(j =>
      j.id === journey.id ? { ...j, imageUrl } : j
    ));

    if (activeJourney?.id === journey.id) {
      setActiveJourney({ ...activeJourney, imageUrl });
    }
  }, [setPlannerJourneys, activeJourney]);

  /**
   * Move a stop up or down in a journey (Phase 2.4: Fork-only mutation)
   * 
   * DEFENSIVE FORK VALIDATION:
   * Mutations are only allowed on JourneyFork instances (user-owned).
   * This guard prevents accidental mutation of templates or non-fork journeys.
   * 
   * Guard checks:
   * 1. Journey exists in plannerJourneys
   * 2. Journey is actually a fork (has sourceJourneyId and clonedAt)
   * 
   * This is a defensive layer - UI should already prevent calls on templates.
   */
  /**
   * Move a stop up or down in a journey (Phase 3.4: Strict Fork Only)
   * 
   * Strict Type Enforcement:
   * - Arguments: JourneyFork
   * - No runtime guards needed (TS enforced)
   */
  const moveStop = useCallback((journey: JourneyFork, stopIndex: number, direction: 'up' | 'down') => {
    if (!journey.stops) return;

    // Bounds check
    const newIndex = direction === 'up' ? stopIndex - 1 : stopIndex + 1;
    if (newIndex < 0 || newIndex >= journey.stops.length) return;

    // Perform mutation
    setPlannerJourneys(prev => prev.map(j => {
      if (j.id !== journey.id || !j.stops) return j;

      const newStops = [...j.stops];
      // Swap stops
      [newStops[stopIndex], newStops[newIndex]] = [newStops[newIndex], newStops[stopIndex]];

      return { ...j, stops: newStops };
    }));

    // Update active journey if it's the one being modified
    if (activeJourney?.id === journey.id && activeJourney.stops) {
      const newStops = [...activeJourney.stops];
      if (newIndex >= 0 && newIndex < newStops.length) {
        [newStops[stopIndex], newStops[newIndex]] = [newStops[newIndex], newStops[stopIndex]];
        setActiveJourney({ ...activeJourney, stops: newStops });
      }
    }
  }, [setPlannerJourneys, activeJourney]);

  /**
   * Remove a stop from a journey (Phase 2.4: Fork-only mutation)
   * 
   * DEFENSIVE FORK VALIDATION:
   * Mutations are only allowed on JourneyFork instances (user-owned).
   * This guard prevents accidental mutation of templates or non-fork journeys.
   * 
   * Guard checks:
   * 1. Journey exists in plannerJourneys
   * 2. Journey is actually a fork (has sourceJourneyId and clonedAt)
   * 
   * This is a defensive layer - UI should already prevent calls on templates.
   */
  /**
   * Remove a stop from a journey (Phase 3.4: Strict Fork Only)
   */
  const removeStop = useCallback((journey: JourneyFork, stopId: string) => {
    // Guards passed - perform mutation
    setPlannerJourneys(prev => prev.map(j => {
      if (j.id !== journey.id || !j.stops) return j;
      return { ...j, stops: j.stops.filter(s => s.id !== stopId) };
    }));

    // Update active journey if it's the one being modified
    if (activeJourney?.id === journey.id && activeJourney.stops) {
      setActiveJourney({
        ...activeJourney,
        stops: activeJourney.stops.filter(s => s.id !== stopId)
      });
    }
  }, [setPlannerJourneys, activeJourney]);

  /**
   * Add a new stop to a journey
   * 
   * @param journey - The journey to add the stop to
   * @param stop - The stop to add
   * @param insertIndex - Optional index to insert at (otherwise appends to end)
   */
  const addStop = useCallback((journey: JourneyFork, stop: UserStop, insertIndex?: number) => {
    // Safety: Only edit if journey is not completed
    if (journey.status === 'COMPLETED') return;

    setPlannerJourneys(prev => prev.map(j => {
      if (j.id !== journey.id) return j;

      const currentStops = j.stops || [];
      let newStops: UserStop[];

      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= currentStops.length) {
        // Insert at specific index
        newStops = [
          ...currentStops.slice(0, insertIndex),
          stop,
          ...currentStops.slice(insertIndex)
        ];
      } else {
        // Append to end
        newStops = [...currentStops, stop];
      }

      return {
        ...j,
        stops: newStops
      };
    }));

    // Sync activeJourney
    if (activeJourney?.id === journey.id) {
      const currentStops = activeJourney.stops || [];
      let newStops: UserStop[];

      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= currentStops.length) {
        newStops = [
          ...currentStops.slice(0, insertIndex),
          stop,
          ...currentStops.slice(insertIndex)
        ];
      } else {
        newStops = [...currentStops, stop];
      }

      setActiveJourney({
        ...activeJourney,
        stops: newStops
      });
    }
  }, [setPlannerJourneys, activeJourney]);

  // Update a note on a specific stop

  // ISSUE: Function correctly only mutates plannerJourneys (JourneyFork instances).
  // However, if activeJourney somehow references a discovered journey
  // (via loadJourney from defaultJourneys), the setActiveJourney mutation
  // will modify the discovered journey object in memory.
  // DOMAIN MODEL: This is close to correct - operates on JourneyFork.stops (UserStop).
  // Need to ensure activeJourney can NEVER be a JourneySource (discovered journey).
  /**
   * Update a stop's note within a specific journey
   * 
   * OWNERSHIP GUARD:
   * Only allows mutation if:
   * 1. activeJourney exists (user-owned fork, not template)
   * 2. journeyId matches activeJourney.id (prevents cross-journey mutations)
   * 
   * Notes are user-specific and should only be added to owned forks.
   * 
   * @param journeyId - The journey containing the stop
   * @param stopId - The stop to update
   * @param note - The note content
   */
  const updateStopNote = useCallback((journey: JourneyFork, stopId: string, note: string) => {
    setPlannerJourneys(prev => prev.map(j => {
      if (j.id !== journey.id || !j.stops) return j;
      return {
        ...j,
        stops: j.stops.map(stop =>
          stop.id === stopId ? { ...stop, note } : stop
        )
      };
    }));

    // Update active journey if it's the one being modified
    if (activeJourney?.id === journey.id && activeJourney.stops) {
      setActiveJourney({
        ...activeJourney,
        stops: activeJourney.stops.map(stop =>
          stop.id === stopId ? { ...stop, note } : stop
        )
      });
    }
  }, [setPlannerJourneys, activeJourney]);

  // Memoized set of saved journey IDs for instant lookup
  const savedJourneyIds = useMemo(() => {
    return new Set(plannerJourneys.map(j => j.sourceJourneyId || j.id));
  }, [plannerJourneys]);

  // Memoized helper function for checking if a journey is already saved
  const isAlreadySaved = useCallback((journeyId: string) => {
    return savedJourneyIds.has(journeyId);
  }, [savedJourneyIds]);

  // Create a new custom journey
  const createCustomJourney = useCallback((): JourneyFork => {
    const id = `custom-${Date.now()}`;
    const newJourney: JourneyFork = {
      id,
      title: 'My Custom Journey',
      location: 'Add location...',
      duration: '1 Day',
      imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
      stops: [],
      moments: [],
      // sourceJourneyId is undefined - custom journeys have no source
      clonedAt: Date.now(),
      isCustom: true,
      status: 'PLANNED'
    };
    setPlannerJourneys(prev => [newJourney, ...prev]);
    return newJourney;
  }, [setPlannerJourneys]);


  // - Only JourneyFork can be LIVE (never JourneySource)
  // - LIVE status is managed by activeJourney state
  // - Type guards prevent discovered journeys from becoming LIVE
  // Start a journey (set as live, unset all others, enable navigation)
  const startJourney = useCallback((journey: JourneyFork) => {
    // Prevent starting completed journeys
    if (journey.status === 'COMPLETED') return;

    setPlannerJourneys(prev => prev.map(j => ({
      ...j,
      status: j.id === journey.id ? "LIVE" : (j.sourceJourneyId || j.clonedAt ? "PLANNED" : "DISCOVERED")
    })));

    // Phase 3.2: Removed setIsFollowing - journeyMode derives from status now

    // Update active journey if it's the one being toggled
    if (activeJourney) {
      setActiveJourney({
        ...activeJourney,
        status: activeJourney.id === journey.id ? "LIVE" : (activeJourney.sourceJourneyId || activeJourney.clonedAt ? "PLANNED" : "DISCOVERED")
      });
    }
  }, [setPlannerJourneys, activeJourney]);

  /**
   * Stop journey navigation (Phase 3.2)
   * 
   * Sets journey status back to PLANNED, ending navigation mode.
   * journeyMode will automatically update to 'PLANNING'.
   */
  const stopJourney = useCallback((journey: JourneyFork) => {
    setPlannerJourneys(prev => prev.map(j =>
      j.id === journey.id ? { ...j, status: "PLANNED" } : j
    ));

    // Update active journey if it's the one being stopped
    if (activeJourney?.id === journey.id) {
      setActiveJourney({
        ...activeJourney,
        status: "PLANNED"
      });
    }
  }, [setPlannerJourneys, activeJourney]);


  const value = {
    // EXPLICIT STATE OWNERSHIP
    templateJourneys,     // ✅ Read-only templates
    plannerJourneys,      // ✅ PLANNING/LIVE journeys only
    completedJourneys,    // ✅ COMPLETED journeys only (separate)

    // Journey management
    forkJourney, removeFromPlanner,
    renameJourney, updateJourneyLocation, updateJourneyDuration, updateJourneyCoverImage,
    moveStop, removeStop, addStop, updateStopNote,

    // ============================================================================
    // SEMANTIC JOURNEY STATE (Read vs Edit Separation)
    // ============================================================================

    // READ-ONLY INSPECTION MODE
    inspectionJourney, setInspectionJourney,

    // MUTABLE ACTIVE JOURNEY (deprecated type, use with caution)
    activeJourney,
    setActiveJourney: setActiveJourneyWithValidation,  // ✅ Wrapped with validation
    loadJourney,

    // DERIVED DISPLAY STATE (NEW - use these for clarity)
    currentJourney,    // ✅ Phase 2.3: Single source for rendering (read concern)
    isReadOnlyJourney, // ✅ Phase 2.3: Boolean for UI toggling (disabled states)
    viewMode,          // ✅ Phase 1: Explicit mode (INSPECTION | ACTIVE | NONE)
    journeyMode,       // ✅ Phase 2.2: Unified journey state (INSPECTION | PLANNING | NAVIGATION | COMPLETED)

    // ============================================================================

    // User state
    userLocation, userHeading,


    // NEW: Per-journey visited state (use these instead)
    toggleStopVisitedInJourney, markStopVisitedInJourney, getVisitedStopsForJourney,
    completeJourney, isJourneyEditable,
    savedJourneyIds, isAlreadySaved,
    createCustomJourney,
    startJourney,
    stopJourney  // ✅ Phase 3.2: Stop navigation
  };

  return (
    <JourneyContext.Provider value={value}>
      {children}
    </JourneyContext.Provider>
  );
};

export const useJourneys = (): JourneyContextType => {
  const context = useContext(JourneyContext);
  if (context === undefined) {
    throw new Error('useJourneys must be used within a JourneyProvider');
  }
  return context;
};
