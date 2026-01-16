
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Journey, Stop, Moment } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

interface JourneyContextType {
  journeys: Journey[];
  plannerJourneys: Journey[];
  addJourney: () => void;
  persistJourney: (journey: Journey) => void;
  cloneToPlanner: (journey: Journey) => void;
  removeFromPlanner: (journeyId: string) => void;
  activeJourney: Journey | null;
  setActiveJourney: (journey: Journey) => void;
  loadJourney: (journeyId: string) => void;
  userLocation: [number, number] | null;
  userHeading: number | null;
  isFollowing: boolean;
  setIsFollowing: (v: boolean) => void;
  visitedStopIds: string[];
  markStopAsVisited: (stopId: string) => void;
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
    imageUrl: 'https://images.unsplash.com/photo-1593181829283-a4c3f5966601?q=80&w=800&auto=format&fit=crop',
    stops: [
      { id: '7', name: 'Kaza', coordinates: [78.0710, 32.2276], imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=300', description: 'Remote capital of Spiti situated on the banks of Spiti River.' },
      { id: '8', name: 'Key Monastery', coordinates: [78.0120, 32.2960], imageUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=300', description: 'Famous Tibetan Buddhist monastery perched on a hill.' },
      { id: '9', name: 'Chandratal Lake', coordinates: [77.6100, 32.4800], imageUrl: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=300', description: 'Crescent-shaped lake offering mesmerizing reflections.' }
    ],
    moments: []
  },
  {
    id: '4',
    title: 'Old Manali Trail',
    location: 'Himachal Pradesh, India',
    duration: '3 Days',
    imageUrl: 'https://images.unsplash.com/photo-1589136777351-9432851982b6?q=80&w=800&auto=format&fit=crop',
    stops: [
      { id: '10', name: 'Hadimba Temple', coordinates: [77.1887, 32.2450], imageUrl: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=300', description: 'Ancient cave temple dedicated to Hidimbi Devi.' },
      { id: '11', name: 'Jogini Falls', coordinates: [77.1950, 32.2600], imageUrl: 'https://images.unsplash.com/photo-1589136777351-9432851982b6?w=300', description: 'Scenic path leading to a majestic waterfall.' },
      { id: '12', name: 'Beas River', coordinates: [77.1800, 32.2300], imageUrl: 'https://images.unsplash.com/photo-1593181829283-a4c3f5966601?w=300', description: 'Riverside relaxation with stunning mountain backdrops.' }
    ],
    moments: []
  },
  {
    id: '5',
    title: 'Shimla to Kufri',
    location: 'Himachal Pradesh, India',
    duration: '2 Days',
    imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=800&auto=format&fit=crop',
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
    stops: [
      { id: '16', name: 'Parvati River', coordinates: [77.3150, 32.0100], imageUrl: 'https://images.unsplash.com/photo-1504780521369-144d477b760a?w=300', description: 'Serene river flowing through the Parvati Valley.' },
      { id: '17', name: 'Manikaran', coordinates: [77.3500, 32.0200], imageUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=300', description: 'Religious center famous for hot springs.' },
      { id: '18', name: 'Tosh Village', coordinates: [77.4500, 32.0100], imageUrl: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=300', description: 'Scenic village at the far end of the valley.' }
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

  const value = {
    journeys, plannerJourneys, addJourney, persistJourney, cloneToPlanner, removeFromPlanner,
    activeJourney, setActiveJourney, loadJourney,
    userLocation, userHeading, isFollowing, setIsFollowing,
    visitedStopIds, markStopAsVisited
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
