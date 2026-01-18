import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Journey, Stop, Moment } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { createJourneyFork, isJourneyFork } from '../src/domain/forkJourney';

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
 * This replaces manual checking of isFollowing, status, isCompleted, etc.
 * 
 * Modes:
 * - INSPECTION: Viewing a journey in read-only mode (template or fork preview)
 * - PLANNING: Editing/planning a fork (not yet started navigation)
 * - NAVIGATION: Actively navigating a fork (live mode, following enabled)
 * - COMPLETED: Journey has been completed by user
 * 
 * Derivation Logic:
 * 1. If inspectionJourney exists → INSPECTION
 * 2. If activeJourney.isCompleted → COMPLETED
 * 3. If activeJourney.status === 'LIVE' OR isFollowing → NAVIGATION
 * 4. If activeJourney exists → PLANNING
 * 5. Otherwise → null (no journey loaded)
 * 
 * Use this instead of manually checking state flags.
 */
export type JourneyMode = 'INSPECTION' | 'PLANNING' | 'NAVIGATION' | 'COMPLETED';

interface JourneyContextType {
  // STORAGE SPLIT: Separated template (read-only) from user (mutable) journeys

  /** @deprecated Mixes discovered (JourneySource) and forked (JourneyFork) journeys. Use templateJourneys. */
  journeys: Journey[];

  /** NEW: Read-only template journeys for discovery (JourneySource) */
  templateJourneys: Journey[];

  /** User-owned forked/planned journeys (JourneyFork) - stored separately */
  plannerJourneys: Journey[];

  /** @deprecated Creates mixed journey without proper domain separation */
  addJourney: () => void;
  persistJourney: (journey: Journey) => void;
  forkJourney: (journey: Journey) => void;
  removeFromPlanner: (journeyId: string) => void;
  renameJourney: (journeyId: string, newTitle: string) => void;
  moveStop: (journeyId: string, stopIndex: number, direction: 'up' | 'down') => void;
  removeStop: (journeyId: string, stopId: string) => void;
  updateStopNote: (journeyId: string, stopId: string, note: string) => void;

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
  inspectionJourney: Journey | null;
  setInspectionJourney: (journey: Journey | null) => void;

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
   * @deprecated Type is too permissive. Phase 3 will narrow to JourneyFork | null
   */
  activeJourney: Journey | null;

  /**
   * @deprecated Allows setting discovered journeys as active. Use liveJourneyStore.setLive().
   * 
   * WARNING: Calling this with a JourneySource will log a warning but not block.
   * Use loadJourney() instead for proper routing.
   */
  setActiveJourney: (journey: Journey) => void;

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
  currentJourney: Journey | null;

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
   * - INSPECTION: Read-only preview (inspectionJourney set)
   * - PLANNING: Editing a fork, not yet started (activeJourney, no navigation)
   * - NAVIGATION: Actively navigating (activeJourney with status=LIVE or isFollowing)
   * - COMPLETED: Journey finished (activeJourney.isCompleted)
   * - null: No journey loaded
   * 
   * Purpose: Single source of truth for journey state.
   * Replaces manual checking of isFollowing, status, isCompleted flags.
   * Preferred over individual flags for state determination.
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

  /** @deprecated Mixes discovery and planner sources. Replace with preview/fork flow. */
  loadJourney: (journeyId: string) => void;
  userLocation: [number, number] | null;
  userHeading: number | null;

  /**
   * @deprecated Legacy navigation flag. Use journeyMode === 'NAVIGATION' instead.
   * 
   * This flag is manually set/unset and can drift from actual navigation state.
   * journeyMode derives navigation state from multiple sources for accuracy.
   */
  isFollowing: boolean;
  setIsFollowing: (v: boolean) => void;
  /** @deprecated Global visited state without journey ownership. Move to JourneyFork.stops[].visited */
  visitedStopIds: string[];
  /** @deprecated Global mutation without journey context. Should be per-fork. */
  markStopAsVisited: (stopId: string) => void;
  /** @deprecated Global mutation without journey context. Should be per-fork. */
  toggleStopVisited: (stopId: string) => void;

  // NEW: Per-journey visited state management (use these instead of global functions)
  /** Toggle visited state for a specific stop within a journey */
  toggleStopVisitedInJourney: (journeyId: string, stopId: string) => void;
  /** Mark a stop as visited within a specific journey */
  markStopVisitedInJourney: (journeyId: string, stopId: string) => void;
  /** Get array of visited stop IDs for a specific journey */
  getVisitedStopsForJourney: (journeyId: string) => string[];

  completeJourney: (journeyId: string) => void;
  isJourneyEditable: (journeyId: string) => boolean;
  savedJourneyIds: Set<string>;
  isAlreadySaved: (journeyId: string) => boolean;
  createCustomJourney: () => Journey;
  /** @deprecated Manual status management. Use liveJourneyStore.setLive() instead. */
  startJourney: (journeyId: string) => void;
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
 * @deprecated This represents JourneySource data but uses the mixed Journey type.
 * Should be migrated to use JourneySource[] type from domain models.
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

  // Legacy: For backward compatibility, keep journeys referencing templates
  /** @deprecated Use templateJourneys instead */
  const journeys = templateJourneys;

  // User journeys: Mutable forks stored in localStorage with new key
  // NOTE: Changed key from 'trippin_planner_journeys' to 'trippin_user_forks'
  // to prevent mixing with old data structure
  const [plannerJourneys, setPlannerJourneys] = useLocalStorage<Journey[]>(
    'trippin_user_forks',  // ✅ New key: separate from templates
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
  const [inspectionJourney, setInspectionJourney] = useState<Journey | null>(null);

  // Initialize activeJourney from localStorage if available, otherwise default to first journey
  // TODO: CRITICAL UNSAFE MUTATION - Setting discovered journey as activeJourney
  // ISSUE: This initializes activeJourney with a discovered journey from defaultJourneys.
  // Any subsequent mutations (notes, visited state, reordering) will directly
  // mutate the discovered journey template, polluting it for all users.
  // DOMAIN MODEL: activeJourney should ONLY ever be a JourneyFork, never a JourneySource.
  // Discovered journeys should be read-only for viewing, not set as active.
  // Users must explicitly fork before a journey can be active.
  // MIGRATION: Use inspectionJourney for discovered journeys instead.
  const [activeJourney, setActiveJourney] = useState<Journey | null>(() => {
    const savedId = localStorage.getItem('activeJourneyId');
    if (savedId) {
      // Check default journeys (safely)
      const found = (defaultJourneys || []).find(j => j.id === savedId);
      if (found) return found;
    }
    return (defaultJourneys && defaultJourneys.length > 0) ? defaultJourneys[0] : null;
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
   * ACTIVE JOURNEY ENFORCEMENT (Phase 2.1)
   * 
   * setActiveJourney with strict fork validation
   * 
   * ENFORCEMENT RULES:
   * - BLOCKS if journey is a JourneySource (template)
   * - ALLOWS only if journey is a JourneyFork (user-owned)
   * - Semantic guard: activeJourney = mutable forks ONLY
   * 
   * Why this is NOT breaking:
   * - loadJourney() already routes templates to inspectionJourney
   * - Components should use loadJourney(), not setActiveJourney directly
   * - This prevents accidental misuse, not intentional workflows
   * 
   * If blocked:
   * - Journey is NOT set (prevents template corruption)
   * - Console warning explains why and how to fix
   * - Suggests using inspectionJourney or forking first
   * 
   * @param journey - Journey to set as active (must be a fork)
   */
  const setActiveJourneyWithValidation = useCallback((journey: Journey) => {
    // PHASE 2.1: STRICT FORK VALIDATION
    // Check if this is a JourneyFork (has fork metadata)
    // Type cast needed because Journey type is broader than domain types
    if (!isJourneyFork(journey as any)) {
      // This is a JourneySource (template) - BLOCK IT
      console.error(
        '╔════════════════════════════════════════════════════════════════╗',
        '\n║ [setActiveJourney] BLOCKED: Cannot set template as active     ║',
        '\n╚════════════════════════════════════════════════════════════════╝',
        '\n',
        '\n⚠️  activeJourney can ONLY contain JourneyFork (user-owned), not JourneySource (template).',
        '\n',
        '\n📋 Journey Details:',
        '\n   ID:', journey.id,
        '\n   Title:', journey.title,
        '\n   Type: JourneySource (template/discovered)',
        '\n',
        '\n❌ This operation was BLOCKED to prevent template corruption.',
        '\n',
        '\n✅ To fix, choose ONE of these options:',
        '\n',
        '\n   Option 1 (Recommended): Use loadJourney() instead',
        '\n   ────────────────────────────────────────────────',
        '\n   loadJourney(\'' + journey.id + '\')  // Automatically routes to inspectionJourney',
        '\n',
        '\n   Option 2: Fork first, then activate the fork',
        '\n   ─────────────────────────────────────────────',
        '\n   forkJourney(journey)  // Creates user-owned copy',
        '\n   // Then activate the fork from My Trips',
        '\n',
        '\n   Option 3: For read-only viewing',
        '\n   ─────────────────────────────────────',
        '\n   setInspectionJourney(journey)  // View without mutating',
        '\n',
        '\n📚 Learn more: See ACTIVE_JOURNEY_OWNERSHIP.md',
        '\n'
      );

      // DO NOT SET - this is the enforcement
      // Template journeys must never become activeJourney
      return;
    }

    // Passed validation - this is a JourneyFork, safe to set
    setActiveJourney(journey);
  }, []);



  /**
   * @deprecated Creates mixed journey type without proper fork metadata.
   * Use createJourneyFork() from domain utilities instead.
   * NOTE: This function is now a no-op since templateJourneys are immutable.
   * Use forkJourney() or createCustomJourney() instead.
   */
  const addJourney = useCallback(() => {
    console.warn('addJourney() is deprecated. Use forkJourney() or createCustomJourney() instead.');
    // No-op: templateJourneys are immutable, can't add to them
    // This function exists only for backward compatibility
  }, []);

  const persistJourney = useCallback((journey: Journey) => {
    const newJourney = {
      ...journey,
      clonedAt: Date.now()
    };
    setPlannerJourneys(prev => [newJourney, ...prev]);
  }, [setPlannerJourneys]);

  /**
   * Fork a journey (create personalized copy for user's planner)
   * 
   * Delegates to createJourneyFork() from domain utilities for consistent fork creation.
   * No more JSON.parse(JSON.stringify()) - single source of truth for fork semantics.
   * 
   * @param journey - Journey to fork (can be template or existing fork)
   */
  const forkJourney = useCallback((journey: Journey) => {
    // Delegate to domain utility for consistent fork creation
    // TODO: Pass actual user ID when authentication is implemented
    const fork = createJourneyFork(journey as any, '');  // Empty ownerId for now

    // Add to user's planner
    setPlannerJourneys(prev => [...prev, fork as any]);
  }, [setPlannerJourneys]);

  const removeFromPlanner = useCallback((journeyId: string) => {
    setPlannerJourneys(prev => prev.filter(j => j.id !== journeyId));
  }, [setPlannerJourneys]);

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
      // Template journey: Use read-only inspection mode
      // This prevents the immutable template from becoming mutable
      // PHASE 2.1: Templates can NEVER go to activeJourney (enforced by guard)
      setInspectionJourney(templateJourney);
      setActiveJourney(null); // Clear active to prevent confusion
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
  }, [templateJourneys, plannerJourneys]);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(0);
  const [isFollowing, setIsFollowing] = useState(false);

  /**
   * DERIVED JOURNEY MODE (Phase 2.2)
   * 
   * journeyMode: Unified semantic journey state
   * 
   * Derivation Priority (first match wins):
   * 1. inspectionJourney exists → INSPECTION (read-only preview)
   * 2. activeJourney.isCompleted === true → COMPLETED (finished)
   * 3. activeJourney.status === 'LIVE' → NAVIGATION (live mode)
   * 4. isFollowing === true → NAVIGATION (legacy flag support)
   * 5. activeJourney exists → PLANNING (editing/planning)
   * 6. Otherwise → null (no journey loaded)
   * 
   * This replaces manual flag checking with single semantic state.
   * Preferred over checking isFollowing, status, isCompleted individually.
   * 
   * Legacy flags (isFollowing, status, isCompleted) still exist for
   * backward compatibility but journeyMode is the preferred API.
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
    if (activeJourney.isCompleted === true) {
      return 'COMPLETED';
    }

    // Priority 3: Live navigation (status flag)
    if (activeJourney.status === 'LIVE') {
      return 'NAVIGATION';
    }

    // Priority 4: Live navigation (legacy isFollowing flag)
    // NOTE: isFollowing is a manual flag, can be out of sync
    // but we respect it for backward compatibility
    if (isFollowing) {
      return 'NAVIGATION';
    }

    // Priority 5: Default for activeJourney - planning/editing mode
    return 'PLANNING';
  }, [inspectionJourney, activeJourney, isFollowing]);

  // TODO: UNSAFE MUTATION - Global visited stops list
  // ISSUE: visitedStopIds is stored globally, but should be per-journey.
  // If a user discovers Journey A, marks stops visited, then forks it,
  // the visited state leaks across the source and all forks.
  // DOMAIN MODEL: visited state should live in JourneyFork.stops[].visited (UserStop)
  // NOT in a global list that affects all journey instances.
  /**
   * @deprecated Global visited state without journey ownership.
   * Causes cross-journey pollution where visiting Stop ID "1" in Journey A
   * marks it visited in ALL journeys containing that stop.
   * MIGRATE TO: JourneyFork.stops[].visited (per-fork state)
   */
  const [visitedStopIds, setVisitedStopIds] = useLocalStorage<string[]>('trippin_visited_stops', []);

  useLocationWatcher(useCallback((coords, heading) => {
    setUserLocation(coords);
    if (heading !== null && !isNaN(heading)) {
      setUserHeading(heading);
    }
  }, []));

  // TODO: UNSAFE MUTATION - Global stop visited tracking
  // ISSUE: Marks stops as visited globally, not per-journey.
  // If Stop ID "1" exists in multiple journeys, visiting it in one
  // journey marks it as visited in ALL journeys.
  // DOMAIN MODEL: This should mutate JourneyFork.stops[].visited,
  // NOT a global stopId list. Each fork maintains its own visit state.
  const markStopAsVisited = useCallback((stopId: string) => {
    setVisitedStopIds(prev => {
      if (prev.includes(stopId)) return prev;
      return [...prev, stopId];
    });
  }, [setVisitedStopIds]);

  // TODO: UNSAFE MUTATION - Global stop visited toggle
  // ISSUE: Same as markStopAsVisited - operates on a global visited list.
  // Should be scoped to the active JourneyFork instance.
  // DOMAIN MODEL: Should toggle JourneyFork.stops[].visited per journey.
  const toggleStopVisited = useCallback((stopId: string) => {
    setVisitedStopIds(prev => {
      if (prev.includes(stopId)) {
        return prev.filter(id => id !== stopId);
      } else {
        return [...prev, stopId];
      }
    });
  }, [setVisitedStopIds]);

  /**
   * NEW: Per-Journey Visited State Helpers
   * 
   * These functions manage visited state WITHIN the journey object (journey.stops[].visited)
   * instead of the global visitedStopIds array.
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
  const toggleStopVisitedInJourney = useCallback((journeyId: string, stopId: string) => {
    // OWNERSHIP GUARD 1: Require activeJourney
    // If activeJourney is null, we're either in inspection mode or no journey is loaded.
    // In either case, mutations should not be allowed.
    if (!activeJourney) {
      console.warn('[toggleStopVisitedInJourney] No activeJourney. Mutation blocked (likely inspection mode).');
      return;
    }

    // OWNERSHIP GUARD 2: Verify journey ownership
    // Only allow mutating the activeJourney, not arbitrary journeys.
    // This prevents components from accidentally mutating the wrong journey.
    if (activeJourney.id !== journeyId) {
      console.warn(`[toggleStopVisitedInJourney] journeyId mismatch. Active: ${activeJourney.id}, Requested: ${journeyId}. Mutation blocked.`);
      return;
    }

    // Guards passed - perform mutation
    setPlannerJourneys(prev => prev.map(journey => {
      if (journey.id !== journeyId || !journey.stops) return journey;
      return {
        ...journey,
        stops: journey.stops.map(stop =>
          stop.id === stopId ? { ...stop, visited: !stop.visited } : stop
        )
      };
    }));

    // Update active journey in sync
    if (activeJourney.stops) {
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
  const markStopVisitedInJourney = useCallback((journeyId: string, stopId: string) => {
    // OWNERSHIP GUARD 1: Require activeJourney
    if (!activeJourney) {
      console.warn('[markStopVisitedInJourney] No activeJourney. Mutation blocked (likely inspection mode).');
      return;
    }

    // OWNERSHIP GUARD 2: Verify journey ownership
    if (activeJourney.id !== journeyId) {
      console.warn(`[markStopVisitedInJourney] journeyId mismatch. Active: ${activeJourney.id}, Requested: ${journeyId}. Mutation blocked.`);
      return;
    }

    // Guards passed - perform mutation
    setPlannerJourneys(prev => prev.map(journey => {
      if (journey.id !== journeyId || !journey.stops) return journey;
      return {
        ...journey,
        stops: journey.stops.map(stop =>
          stop.id === stopId && !stop.visited ? { ...stop, visited: true } : stop
        )
      };
    }));

    // Update active journey in sync
    if (activeJourney.stops) {
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
  const getVisitedStopsForJourney = useCallback((journeyId: string): string[] => {
    const journey = plannerJourneys.find(j => j.id === journeyId);
    if (!journey || !journey.stops) return [];
    return journey.stops
      .filter(stop => stop.visited === true)
      .map(stop => stop.id);
  }, [plannerJourneys]);

  // Complete a journey with timestamp
  const completeJourney = useCallback((journeyId: string) => {
    const now = new Date().toISOString();
    setPlannerJourneys(prev => prev.map(j =>
      j.id === journeyId
        ? { ...j, isCompleted: true, completedAt: now }
        : j
    ));
    // Update active journey if it's the one being completed
    if (activeJourney?.id === journeyId) {
      setActiveJourney({ ...activeJourney, isCompleted: true, completedAt: now });
    }
  }, [setPlannerJourneys, activeJourney]);

  // Check if a journey is editable (must be in planner and not completed)
  const isJourneyEditable = useCallback((journeyId: string) => {
    const journey = plannerJourneys.find(j => j.id === journeyId);
    return journey ? !journey.isCompleted : false;
  }, [plannerJourneys]);

  // Rename a journey in the planner
  const renameJourney = useCallback((journeyId: string, newTitle: string) => {
    setPlannerJourneys(prev => prev.map(j =>
      j.id === journeyId ? { ...j, title: newTitle } : j
    ));
    // Update active journey if it's the one being renamed
    if (activeJourney?.id === journeyId) {
      setActiveJourney({ ...activeJourney, title: newTitle });
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
  const moveStop = useCallback((journeyId: string, stopIndex: number, direction: 'up' | 'down') => {
    // PHASE 2.4: Defensive fork validation
    const targetJourney = plannerJourneys.find(j => j.id === journeyId);

    if (!targetJourney) {
      console.warn(
        '[moveStop] Journey not found in plannerJourneys.',
        '\nJourney ID:', journeyId,
        '\nOperation blocked: Cannot move stops on non-existent journey.'
      );
      return;
    }

    if (!isJourneyFork(targetJourney as any)) {
      console.warn(
        '[moveStop] Journey is not a fork. Mutations only allowed on user-owned forks.',
        '\nJourney ID:', journeyId,
        '\nJourney Title:', targetJourney.title,
        '\nOperation blocked: Templates are immutable.',
        '\nAction: Fork this journey first to make changes.'
      );
      return;
    }

    // Guards passed - perform mutation
    setPlannerJourneys(prev => prev.map(journey => {
      if (journey.id !== journeyId || !journey.stops) return journey;

      const newStops = [...journey.stops];
      const newIndex = direction === 'up' ? stopIndex - 1 : stopIndex + 1;

      // Check bounds
      if (newIndex < 0 || newIndex >= newStops.length) return journey;

      // Swap stops
      [newStops[stopIndex], newStops[newIndex]] = [newStops[newIndex], newStops[stopIndex]];

      return { ...journey, stops: newStops };
    }));

    // Update active journey if it's the one being modified
    if (activeJourney?.id === journeyId && activeJourney.stops) {
      const newStops = [...activeJourney.stops];
      const newIndex = direction === 'up' ? stopIndex - 1 : stopIndex + 1;
      if (newIndex >= 0 && newIndex < newStops.length) {
        [newStops[stopIndex], newStops[newIndex]] = [newStops[newIndex], newStops[stopIndex]];
        setActiveJourney({ ...activeJourney, stops: newStops });
      }
    }
  }, [setPlannerJourneys, activeJourney, plannerJourneys]);

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
  const removeStop = useCallback((journeyId: string, stopId: string) => {
    // PHASE 2.4: Defensive fork validation
    const targetJourney = plannerJourneys.find(j => j.id === journeyId);

    if (!targetJourney) {
      console.warn(
        '[removeStop] Journey not found in plannerJourneys.',
        '\nJourney ID:', journeyId,
        '\nStop ID:', stopId,
        '\nOperation blocked: Cannot remove stop from non-existent journey.'
      );
      return;
    }

    if (!isJourneyFork(targetJourney as any)) {
      console.warn(
        '[removeStop] Journey is not a fork. Mutations only allowed on user-owned forks.',
        '\nJourney ID:', journeyId,
        '\nJourney Title:', targetJourney.title,
        '\nStop ID:', stopId,
        '\nOperation blocked: Templates are immutable.',
        '\nAction: Fork this journey first to make changes.'
      );
      return;
    }

    // Guards passed - perform mutation
    setPlannerJourneys(prev => prev.map(journey => {
      if (journey.id !== journeyId || !journey.stops) return journey;
      return { ...journey, stops: journey.stops.filter(s => s.id !== stopId) };
    }));

    // Update active journey if it's the one being modified
    if (activeJourney?.id === journeyId && activeJourney.stops) {
      setActiveJourney({
        ...activeJourney,
        stops: activeJourney.stops.filter(s => s.id !== stopId)
      });
    }
  }, [setPlannerJourneys, activeJourney, plannerJourneys]);

  // Update a note on a specific stop
  // TODO: PARTIAL SAFETY - Only updates planner journeys, but activeJourney sync is risky
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
  const updateStopNote = useCallback((journeyId: string, stopId: string, note: string) => {
    // OWNERSHIP GUARD 1: Require activeJourney
    if (!activeJourney) {
      console.warn('[updateStopNote] No activeJourney. Mutation blocked (likely inspection mode).');
      return;
    }

    // OWNERSHIP GUARD 2: Verify journey ownership
    if (activeJourney.id !== journeyId) {
      console.warn(`[updateStopNote] journeyId mismatch. Active: ${activeJourney.id}, Requested: ${journeyId}. Mutation blocked.`);
      return;
    }

    // Guards passed - perform mutation
    setPlannerJourneys(prev => prev.map(journey => {
      if (journey.id !== journeyId || !journey.stops) return journey;
      return {
        ...journey,
        stops: journey.stops.map(stop =>
          stop.id === stopId ? { ...stop, note } : stop
        )
      };
    }));

    // Update active journey if it's the one being modified
    if (activeJourney?.id === journeyId && activeJourney.stops) {
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
  const createCustomJourney = useCallback(() => {
    const newJourney: Journey = {
      id: `custom-${Date.now()}`,
      title: 'New Journey',
      location: 'Add Location',
      duration: '0 Days',
      imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80&auto=format&fit=crop',
      isCustom: true,
      stops: [],
      moments: []
    };

    setPlannerJourneys(prev => [...prev, newJourney]);
    return newJourney;
  }, [setPlannerJourneys]);

  // Start a journey (set as live, unset all others, enable navigation)
  // TODO: MIGRATE TO liveJourneyStore
  // ISSUE: This function should use liveJourneyStore.setLive() instead of manual status management.
  // The new architecture enforces:
  // - Only ONE journey can be LIVE at a time
  // - Only JourneyFork can be LIVE (never JourneySource)
  // - LIVE status is managed by liveJourneyStore, not local state
  // - Type guards prevent discovered journeys from becoming LIVE
  const startJourney = useCallback((journeyId: string) => {
    // Prevent starting completed journeys
    const journey = plannerJourneys.find(j => j.id === journeyId);
    if (journey?.isCompleted) return;

    setPlannerJourneys(prev => prev.map(j => ({
      ...j,
      status: j.id === journeyId ? "LIVE" : (j.sourceJourneyId || j.clonedAt ? "PLANNED" : "DISCOVERED")
    })));

    // Enable navigation mode when starting a journey
    setIsFollowing(true);

    // Update active journey if it's the one being toggled
    if (activeJourney) {
      setActiveJourney({
        ...activeJourney,
        status: activeJourney.id === journeyId ? "LIVE" : (activeJourney.sourceJourneyId || activeJourney.clonedAt ? "PLANNED" : "DISCOVERED")
      });
    }
  }, [setPlannerJourneys, setIsFollowing, activeJourney, plannerJourneys]);

  const value = {
    // STORAGE SPLIT
    templateJourneys,  // ✅ NEW: Read-only templates
    journeys,  // @deprecated - use templateJourneys
    plannerJourneys,  // ✅ User forks (new storage key)

    // Journey management
    addJourney, persistJourney, forkJourney, removeFromPlanner,
    renameJourney, moveStop, removeStop, updateStopNote,

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
    userLocation, userHeading, isFollowing, setIsFollowing,

    // DEPRECATED: Global visited state
    visitedStopIds, markStopAsVisited, toggleStopVisited,
    // NEW: Per-journey visited state (use these instead)
    toggleStopVisitedInJourney, markStopVisitedInJourney, getVisitedStopsForJourney,
    completeJourney, isJourneyEditable,
    savedJourneyIds, isAlreadySaved,
    createCustomJourney, startJourney
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
