import React, { useState } from 'react';
import { Box } from '@airtable/blocks/ui';

const Tooltip = ({ 
  children, 
  content, 
  position = 'top', 
  width = '200px',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute',
      zIndex: 1000,
      backgroundColor: '#1f2937',
      color: '#f9fafb',
      textAlign: 'center',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '12px',
      lineHeight: '1.4',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #374151',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      transition: 'opacity 0.3s',
      width: width,
      opacity: isVisible ? 1 : 0,
      visibility: isVisible ? 'visible' : 'hidden'
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: '125%',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'right':
        return {
          ...baseStyles,
          top: '50%',
          left: '125%',
          transform: 'translateY(-50%)'
        };
      case 'bottom':
        return {
          ...baseStyles,
          top: '125%',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          ...baseStyles,
          top: '50%',
          right: '125%',
          transform: 'translateY(-50%)'
        };
      default:
        return {
          ...baseStyles,
          bottom: '125%',
          left: '50%',
          transform: 'translateX(-50%)'
        };
    }
  };

  const containerStyle = {
    position: 'relative',
    display: 'inline-block'
  };

  const tooltipStyle = getPositionStyles();

  return (
    <div 
      style={containerStyle} 
      className={className}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div 
        style={tooltipStyle}
        className="tooltip-element"
        data-position={position}
      >
        {content}
      </div>
    </div>
  );
};

export default Tooltip; 