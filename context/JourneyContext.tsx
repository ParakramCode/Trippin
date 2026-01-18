import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Journey, Stop, Moment } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

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

  /** @deprecated Can reference JourneySource (discovered), should only be JourneyFork. Use liveJourneyStore. */
  activeJourney: Journey | null;
  /** @deprecated Allows setting discovered journeys as active. Use liveJourneyStore.setLive(). */
  setActiveJourney: (journey: Journey) => void;
  /** @deprecated Mixes discovery and planner sources. Replace with preview/fork flow. */
  loadJourney: (journeyId: string) => void;
  userLocation: [number, number] | null;
  userHeading: number | null;
  /** @deprecated Should be derived from liveJourneyStore state, not separate flag */
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
  // Fork a journey (create personalized copy for user's planner)
  const forkJourney = useCallback((journey: Journey) => {
    const clone = JSON.parse(JSON.stringify(journey));
    clone.id = `journey-${Date.now()}`;
    clone.sourceJourneyId = journey.id;
    clone.clonedAt = Date.now();

    // Initialize visited state for all stops
    // Each fork gets fresh visited state, allowing users to complete
    // the same route multiple times with independent progress tracking
    if (clone.stops) {
      clone.stops = clone.stops.map((stop: Stop) => ({
        ...stop,
        visited: false  // Start fresh for this fork
      }));
    }

    setPlannerJourneys(prev => [...prev, clone]);
  }, [setPlannerJourneys]);

  const removeFromPlanner = useCallback((journeyId: string) => {
    setPlannerJourneys(prev => prev.filter(j => j.id !== journeyId));
  }, [setPlannerJourneys]);

  /**
   * loadJourney - NOW USES INSPECTION MODE FOR DISCOVERED JOURNEYS
   * 
   * Critical change: Discovered journeys now go to inspectionJourney (read-only)
   * instead of activeJourney (mutable).
   * 
   * Behavior:
   * - If journey is from defaultJourneys (discovered): → inspectionJourney
   * - If journey is from plannerJourneys (forked): → activeJourney
   * 
   * Why:
   * - Discovered journeys are JourneySource (immutable templates)
   * - They must be viewable but never mutable
   * - Only forked journeys (JourneyFork) should be active
   * 
   * Map will prefer inspectionJourney for display, preventing mutations.
   */
  const loadJourney = useCallback((journeyId: string) => {
    // STORAGE SPLIT: Check template journeys (read-only) vs user forks (mutable)

    // Check if this is a template journey (from templateJourneys)
    const templateJourney = templateJourneys.find(j => j.id === journeyId);
    if (templateJourney) {
      // Template journey: Use read-only inspection mode
      // This prevents the immutable template from becoming mutable
      setInspectionJourney(templateJourney);
      setActiveJourney(null); // Clear active to prevent confusion
      localStorage.setItem('inspectionJourneyId', journeyId);
      return;
    }

    // Check if this is a user fork (from plannerJourneys)
    const forkedJourney = plannerJourneys.find(j => j.id === journeyId);
    if (forkedJourney) {
      // Forked journey: Can be active (mutable)
      setInspectionJourney(null); // Clear inspection mode
      setActiveJourney(forkedJourney);
      localStorage.setItem('activeJourneyId', journeyId);
      return;
    }
  }, [journeys, plannerJourneys]);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(0);
  const [isFollowing, setIsFollowing] = useState(false);
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

  // Move a stop up or down in a journey
  const moveStop = useCallback((journeyId: string, stopIndex: number, direction: 'up' | 'down') => {
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
  }, [setPlannerJourneys, activeJourney]);

  // Remove a specific stop from a journey
  const removeStop = useCallback((journeyId: string, stopId: string) => {
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
  }, [setPlannerJourneys, activeJourney]);

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

    // READ-ONLY INSPECTION MODE
    inspectionJourney, setInspectionJourney,

    // LEGACY ACTIVE JOURNEY (being phased out)
    activeJourney, setActiveJourney, loadJourney,

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
