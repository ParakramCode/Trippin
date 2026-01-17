import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Journey, Stop, Moment } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

interface JourneyContextType {
  journeys: Journey[];
  plannerJourneys: Journey[];
  addJourney: () => void;
  persistJourney: (journey: Journey) => void;
  cloneToPlanner: (journey: Journey) => void;
  removeFromPlanner: (journeyId: string) => void;
  renameJourney: (journeyId: string, newTitle: string) => void;
  moveStop: (journeyId: string, stopIndex: number, direction: 'up' | 'down') => void;
  removeStop: (journeyId: string, stopId: string) => void;
  updateStopNote: (journeyId: string, stopId: string, note: string) => void;
  activeJourney: Journey | null;
  setActiveJourney: (journey: Journey) => void;
  loadJourney: (journeyId: string) => void;
  userLocation: [number, number] | null;
  userHeading: number | null;
  isFollowing: boolean;
  setIsFollowing: (v: boolean) => void;
  visitedStopIds: string[];
  markStopAsVisited: (stopId: string) => void;
  toggleStopVisited: (stopId: string) => void;
  completeJourney: (journeyId: string) => void;
  isJourneyEditable: (journeyId: string) => boolean;
  savedJourneyIds: Set<string>;
  isAlreadySaved: (journeyId: string) => boolean;
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
      { id: '7', name: 'Kaza', coordinates: [78.0710, 32.2276], imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop', description: 'Remote capital of Spiti situated on the banks of Spiti River.' },
      { id: '8', name: 'Key Monastery', coordinates: [78.0120, 32.2960], imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80&auto=format&fit=crop', description: 'Famous Tibetan Buddhist monastery perched on a hill.' },
      { id: '9', name: 'Chandratal Lake', coordinates: [77.6100, 32.4800], imageUrl: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80&auto=format&fit=crop', description: 'Crescent-shaped lake offering mesmerizing reflections.' }
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
      { id: '10', name: 'Hadimba Temple', coordinates: [77.1887, 32.2450], imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80&auto=format&fit=crop', description: 'Ancient cave temple dedicated to Hidimbi Devi.' },
      { id: '11', name: 'Jogini Falls', coordinates: [77.1950, 32.2600], imageUrl: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80&auto=format&fit=crop', description: 'Scenic path leading to a majestic waterfall.' },
      { id: '12', name: 'Beas River', coordinates: [77.1800, 32.2300], imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop', description: 'Riverside relaxation with stunning mountain backdrops.' }
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
  const [journeys, setJourneys] = useState<Journey[]>(defaultJourneys || []);
  const [plannerJourneys, setPlannerJourneys] = useLocalStorage<Journey[]>('trippin_planner_journeys', []);

  // Initialize activeJourney from localStorage if available, otherwise default to first journey
  const [activeJourney, setActiveJourney] = useState<Journey | null>(() => {
    const savedId = localStorage.getItem('activeJourneyId');
    if (savedId) {
      // Check default journeys (safely)
      const found = (defaultJourneys || []).find(j => j.id === savedId);
      if (found) return found;
    }
    return (defaultJourneys && defaultJourneys.length > 0) ? defaultJourneys[0] : null;
  });

  const addJourney = useCallback(() => {
    if (!defaultJourneys || defaultJourneys.length === 0) return;
    const newJourney: Journey = {
      ...defaultJourneys[0],
      id: Date.now().toString(),
      title: `Custom Trip to ${defaultJourneys[0].title} #${journeys.length + 1}`,
      imageUrl: `https://picsum.photos/seed/${Date.now()}/800/1200`
    };
    setJourneys(prevJourneys => [...prevJourneys, newJourney]);
  }, [journeys.length]);

  const persistJourney = useCallback((journey: Journey) => {
    const newJourney = {
      ...journey,
      clonedAt: Date.now()
    };
    setPlannerJourneys(prev => [newJourney, ...prev]);
  }, [setPlannerJourneys]);

  const cloneToPlanner = useCallback((journey: Journey) => {
    const clone: Journey = structuredClone(journey);
    clone.id = `planner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    clone.clonedFrom = journey.id;
    clone.clonedAt = Date.now();
    clone.title = `Copy of ${journey.title}`;
    setPlannerJourneys(prev => [clone, ...prev]);
  }, [setPlannerJourneys]);

  const removeFromPlanner = useCallback((journeyId: string) => {
    setPlannerJourneys(prev => prev.filter(j => j.id !== journeyId));
  }, [setPlannerJourneys]);

  const loadJourney = useCallback((journeyId: string) => {
    const allJourneys = [...journeys, ...plannerJourneys];
    const journey = allJourneys.find(j => j.id === journeyId);
    if (journey) {
      setActiveJourney(journey);
      localStorage.setItem('activeJourneyId', journey.id);
    }
  }, [journeys, plannerJourneys]);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [visitedStopIds, setVisitedStopIds] = useLocalStorage<string[]>('trippin_visited_stops', []);

  useLocationWatcher(useCallback((coords, heading) => {
    setUserLocation(coords);
    if (heading !== null && !isNaN(heading)) {
      setUserHeading(heading);
    }
  }, []));

  const markStopAsVisited = useCallback((stopId: string) => {
    setVisitedStopIds(prev => {
      if (prev.includes(stopId)) return prev;
      return [...prev, stopId];
    });
  }, [setVisitedStopIds]);

  const toggleStopVisited = useCallback((stopId: string) => {
    setVisitedStopIds(prev => {
      if (prev.includes(stopId)) {
        return prev.filter(id => id !== stopId);
      } else {
        return [...prev, stopId];
      }
    });
  }, [setVisitedStopIds]);

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
  const updateStopNote = useCallback((journeyId: string, stopId: string, note: string) => {
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
    return new Set(plannerJourneys.map(j => j.clonedFrom || j.id));
  }, [plannerJourneys]);

  // Memoized helper function for checking if a journey is already saved
  const isAlreadySaved = useCallback((journeyId: string) => {
    return savedJourneyIds.has(journeyId);
  }, [savedJourneyIds]);

  const value = {
    journeys, plannerJourneys, addJourney, persistJourney, cloneToPlanner, removeFromPlanner,
    renameJourney, moveStop, removeStop, updateStopNote,
    activeJourney, setActiveJourney, loadJourney,
    userLocation, userHeading, isFollowing, setIsFollowing,
    visitedStopIds, markStopAsVisited, toggleStopVisited,
    completeJourney, isJourneyEditable,
    savedJourneyIds, isAlreadySaved
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
