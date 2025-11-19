# Poppins Font Setup

## Adding Font Files

1. Place your Poppins font files (`.ttf` or `.otf`) in this directory (`src/assets/fonts/`)

2. Name your font files following this convention:
   - `Poppins-Regular.ttf`
   - `Poppins-Bold.ttf`
   - `Poppins-SemiBold.ttf`
   - `Poppins-Medium.ttf`
   - `Poppins-Light.ttf`
   - `Poppins-ExtraBold.ttf`
   - `Poppins-Thin.ttf`
   - `Poppins-ExtraLight.ttf`
   - `Poppins-Black.ttf`

3. After adding font files, run:
   ```bash
   npx react-native-asset
   ```
   
   Or for iOS specifically:
   ```bash
   cd ios && pod install && cd ..
   ```

## Usage

Import Poppins in your components:

```javascript
import { Poppins } from '../assets';

// In your styles:
const styles = StyleSheet.create({
  text: {
    fontFamily: Poppins.regular,  // or Poppins.bold, Poppins.medium, etc.
    fontSize: 16,
  },
});
```

## Available Font Weights

- `Poppins.regular` - Regular weight
- `Poppins.light` - Light weight
- `Poppins.medium` - Medium weight
- `Poppins.semiBold` - SemiBold weight
- `Poppins.bold` - Bold weight
- `Poppins.extraBold` - ExtraBold weight
- `Poppins.thin` - Thin weight
- `Poppins.extraLight` - ExtraLight weight
- `Poppins.black` - Black weight
