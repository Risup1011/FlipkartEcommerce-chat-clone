import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * TornPaperEdge Component
 * Creates a torn/ripped paper effect at the bottom of a card
 * 
 * @param {number} width - Width of the card (default: full width)
 * @param {number} height - Height of the torn edge (default: 12)
 * @param {string} color - Background color of the card (default: '#FFFFFF')
 */
const TornPaperEdge = ({ width = 400, height = 12, color = '#FFFFFF' }) => {
  // Generate a random-looking torn edge path
  // This creates a jagged pattern that looks like torn paper
  const generateTornPath = () => {
    const numPeaks = Math.floor(width / 20); // Number of peaks/tears
    let path = `M 0 0`; // Start at top-left
    
    for (let i = 0; i <= numPeaks; i++) {
      const x = (width / numPeaks) * i;
      const y = Math.random() * height * 0.8 + height * 0.2; // Random height between 20% and 100%
      
      // Create irregular torn effect with bezier curves
      if (i === 0) {
        path += ` L ${x} ${y}`;
      } else {
        const prevX = (width / numPeaks) * (i - 1);
        const cp1x = prevX + (x - prevX) * 0.3;
        const cp1y = Math.random() * height;
        const cp2x = prevX + (x - prevX) * 0.7;
        const cp2y = Math.random() * height;
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
      }
    }
    
    path += ` L ${width} 0 Z`; // Close the path
    return path;
  };

  // Use a fixed seed-based pattern for consistency (optional)
  // Or generate random pattern each time for more organic look
  const tornPath = generateTornPath();

  return (
    <View style={{ 
      position: 'absolute', 
      bottom: -1, 
      left: 0, 
      right: 0,
      height: height,
      overflow: 'hidden'
    }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path
          d={tornPath}
          fill={color}
        />
      </Svg>
    </View>
  );
};

export default TornPaperEdge;
