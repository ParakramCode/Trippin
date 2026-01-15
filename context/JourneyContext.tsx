
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
  isFollowing: boolean;
  setIsFollowing: (v: boolean) => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

const useLocationWatcher = (callback: (coords: [number, number]) => void) => {
  React.useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        callback([position.coords.longitude, position.coords.latitude]);
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [callback]);
};

// ... (existing mocks) ...

const mockStopsSF: Stop[] = [
  { id: '1', name: 'San Francisco', coordinates: [-122.4194, 37.7749], imageUrl: 'https://picsum.photos/seed/sf/300/200', description: 'Iconic city by the bay featuring the Golden Gate Bridge.' },
  { id: '2', name: 'Sausalito', coordinates: [-122.4853, 37.8591], imageUrl: 'https://picsum.photos/seed/sau/300/200', description: 'Charming seaside town with stunning skyline views.' },
  { id: '3', name: 'Muir Woods', coordinates: [-122.5811, 37.8970], imageUrl: 'https://picsum.photos/seed/muir/300/200', description: 'Ancient redwood forest offering peaceful hiking trails.' },
];

const mockStopsBigSur: Stop[] = [
  { id: '4', name: 'Monterey', coordinates: [-121.8947, 36.6002], imageUrl: 'https://picsum.photos/seed/monterey/300/200', description: 'Historic cannery row and world-class aquarium.' },
  { id: '5', name: 'Bixby Bridge', coordinates: [-121.9017, 36.3715], imageUrl: 'https://picsum.photos/seed/bixby/300/200', description: 'Famous arch bridge with breathtaking coastal views.' },
  { id: '6', name: 'McWay Falls', coordinates: [-121.6706, 36.1576], imageUrl: 'https://picsum.photos/seed/mcway/300/200', description: 'Stunning tidefall that empties directly into the ocean.' },
];

const mockMomentsSF: Moment[] = [
  { id: 'm1', coordinates: [-122.45, 37.8], imageUrl: 'https://picsum.photos/seed/moment1/100/100', caption: 'Hidden trail view' },
  { id: 'm2', coordinates: [-122.50, 37.87], imageUrl: 'https://picsum.photos/seed/moment2/100/100', caption: 'Coffee stop' }
];

export const defaultJourneys: Journey[] = [
  {
    id: '1',
    title: 'Northern Coast',
    location: 'California, USA',
    duration: '3 Days',
    imageUrl: 'https://picsum.photos/seed/coast/800/1200',
    stops: mockStopsSF,
    moments: mockMomentsSF
  },
  {
    id: '2',
    title: 'Big Sur Escape',
    location: 'California, USA',
    duration: '2 Days',
    imageUrl: 'https://picsum.photos/seed/bigsur/800/1200',
    stops: mockStopsBigSur,
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
      // Check planner journeys? Can't access plannerJourneys hook state here directly in initializer easily without double render or effect.
      // But we can check if we want full persistence. For now, rely on default.
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
  const [isFollowing, setIsFollowing] = useState(false);

  useLocationWatcher(useCallback((coords) => {
    setUserLocation(coords);
  }, []));

  const value = { journeys, plannerJourneys, addJourney, persistJourney, cloneToPlanner, removeFromPlanner, activeJourney, setActiveJourney, loadJourney, userLocation, isFollowing, setIsFollowing };

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
