
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Discover from './pages/Discover';
import HomeMap from './pages/HomeMap';
import MyTrips from './pages/MyTrips';
import Planner from './pages/Planner';
import Profile from './pages/Profile';

import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <div className="bg-brand-beige min-h-screen font-sans text-brand-dark">
      <main className="pb-24">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomeMap />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/my-trips" element={<MyTrips />} />
            <Route path="/planner/:id" element={<Planner />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <BottomNav />
    </div>
  );
};

export default App;
