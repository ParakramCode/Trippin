
import React from 'react';
import { NavLink } from 'react-router-dom';
import { CompassIcon, BookOpenIcon, UserIcon, HomeIcon } from './icons';

const BottomNav: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/discover', label: 'Discover', icon: CompassIcon },
    { path: '/my-trips', label: 'Journeys', icon: BookOpenIcon },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ];

  const activeLinkClass = 'text-brand-dark';
  const inactiveLinkClass = 'text-gray-400 hover:text-brand-dark';

  return (
    <nav
      className="fixed bottom-4 left-4 right-4 h-14 bg-white/80 backdrop-blur-xl border border-white/20 rounded-full shadow-xl shadow-black/5 z-50 flex items-center justify-center"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ touchAction: 'none' }}
    >
      <div className="w-full max-w-md flex justify-around items-center px-6 h-full">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-all duration-200 ${isActive ? 'text-brand-dark scale-110' : 'text-gray-400 hover:text-brand-dark'}`
            }
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
