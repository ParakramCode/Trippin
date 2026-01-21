
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Discover from './pages/Discover';
import HomeMap from './pages/HomeMap';
import MyTrips from './pages/MyTrips';
import Planner from './pages/Planner';
import Profile from './pages/Profile';

import ErrorBoundary from './components/ErrorBoundary';
import { useJourneys } from './context/JourneyContext';

const App: React.FC = () => {
  const { journeyMode } = useJourneys();

  // Derive live navigation state from journeyMode (single source of truth)
  // BottomNav is hidden ONLY when user is in active live navigation
  const isLiveNavigation = journeyMode === 'NAVIGATION';

  return (
    <div className="bg-brand-beige min-h-screen font-sans text-brand-dark">
      <main className="pb-24">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Discover />} />
            <Route path="/map" element={<HomeMap />} />
            <Route path="/my-trips" element={<MyTrips />} />
            <Route path="/planner/:id" element={<Planner />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!isLiveNavigation && <BottomNav />}
    </div>
  );
};

export default App;
