import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * TornPaperEdge Component
 * Creates a torn/ripped paper effect at the bottom of a card
 * Mimics the irregular edge of a torn notebook paper or bill
 * 
 * @param {number} width - Width of the card (default: full width)
 * @param {number} height - Height of the torn edge (default: 15)
 * @param {string} color - Background color of the card (default: '#FFFFFF')
 * @param {string} seed - Optional seed for consistent pattern (default: random)
 */
const TornPaperEdge = ({ width = 400, height = 15, color = '#FFFFFF', seed = null }) => {
  // Generate a seeded random number (simple implementation)
  const seededRandom = (seed, index) => {
    if (!seed) return Math.random();
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };

  // Generate a realistic torn edge path
  // This creates an irregular, jagged pattern that looks like torn paper
  const tornPath = useMemo(() => {
    const numPeaks = Math.floor(width / 15); // More peaks for finer detail
    const seedValue = seed || Math.random() * 1000;
    let path = `M 0 0`; // Start at top-left
    
    for (let i = 0; i <= numPeaks; i++) {
      const x = (width / numPeaks) * i;
      
      // Create varying depths for more realistic torn effect
      const randomDepth = seededRandom(seedValue, i * 3);
      const y = randomDepth * height * 0.7 + height * 0.3; // Random height between 30% and 100%
      
      // Add some micro-variations for more organic look
      const microVariation = seededRandom(seedValue, i * 3 + 1) * 2 - 1; // -1 to 1
      const adjustedY = y + microVariation * 2;
      
      // Create irregular torn effect with bezier curves
      if (i === 0) {
        path += ` L ${x} ${adjustedY}`;
      } else {
        const prevX = (width / numPeaks) * (i - 1);
        
        // Control points for bezier curves
        const cp1x = prevX + (x - prevX) * (0.2 + seededRandom(seedValue, i * 3 + 2) * 0.2);
        const cp1y = seededRandom(seedValue, i * 3 + 3) * height;
        const cp2x = prevX + (x - prevX) * (0.6 + seededRandom(seedValue, i * 3 + 4) * 0.2);
        const cp2y = seededRandom(seedValue, i * 3 + 5) * height;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${adjustedY}`;
      }
    }
    
    path += ` L ${width} 0 Z`; // Close the path
    return path;
  }, [width, height, seed]);

  return (
    <View style={{ 
      position: 'absolute', 
      bottom: -height/2, 
      left: 0, 
      right: 0,
      height: height,
      overflow: 'visible',
    }}>
      <Svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
      >
        <Path
          d={tornPath}
          fill={color}
          stroke="#E0E0E0"
          strokeWidth="0.5"
        />
      </Svg>
    </View>
  );
};

export default TornPaperEdge;
