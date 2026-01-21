import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

/**
 * Reusable Glassmorphic Card Component (v3 Design System)
 * 
 * Specifications:
 * - Background: rgba(255, 255, 255, 0.15)
 * - Backdrop-filter: blur(16px)
 * - Border: 1px solid rgba(255, 255, 255, 0.2)
 * - Typography: All text must be Slate Grey (#334155)
 */
const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`${className}`}
            style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
        >
            {children}
        </div>
    );
};

export default GlassCard;
