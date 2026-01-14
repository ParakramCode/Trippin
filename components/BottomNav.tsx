
import React from 'react';
import { NavLink } from 'react-router-dom';
import { CompassIcon, BookOpenIcon, UserIcon } from './icons';

const BottomNav: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Discover', icon: CompassIcon },
    { path: '/my-trips', label: 'Journeys', icon: BookOpenIcon },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ];

  const activeLinkClass = 'text-brand-dark';
  const inactiveLinkClass = 'text-gray-400 hover:text-brand-dark';

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-white/60 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/5 rounded-[40px] z-50">
      <div className="h-full flex justify-around items-center px-6">
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
