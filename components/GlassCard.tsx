import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

/**
 * Reusable glassmorphic card component
 * 
 * Features:
 * - backdrop-filter: blur(12px) for frosted glass effect
 * - Increased opacity: rgba(255, 255, 255, 0.5) for better text readability
 * - Subtle 1px white border
 * - Smooth shadows for depth
 * 
 * Updated: Increased background opacity from 0.1 to 0.5 for better 
 * contrast with slate gray text over busy map areas.
 */
const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`
        bg-white/50 backdrop-blur-[12px]
        border border-white/20
        shadow-lg shadow-black/10
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
};

export default GlassCard;
