import React from 'react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  iconSize = 56, 
  showText = false,
  textSize = "text-3xl"
}) => {
  // Calculate container size based on iconSize to maintain proportions
  const containerSize = iconSize * 1.5;

  return (
    <div className={`flex items-center group ${className}`}>
      <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105" style={{ height: containerSize }}>
        <img 
          src="/logo.png" 
          alt="Vico Logo" 
          className="h-full w-auto object-contain"
        />
      </div>
      {showText && (
        <span className={`ml-4 ${textSize} font-bold tracking-tighter text-[var(--text-main)]`}>
          Vico
        </span>
      )}
    </div>
  );
};
