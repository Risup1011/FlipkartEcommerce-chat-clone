// Poppins Font Configuration
// Place your Poppins font files (.ttf or .otf) in this directory:
// - Poppins-Regular.ttf
// - Poppins-Bold.ttf
// - Poppins-SemiBold.ttf
// - Poppins-Medium.ttf
// - Poppins-Light.ttf
// etc.

export const Poppins = {
  // Font weights
  regular: 'Poppins-Regular',
  light: 'Poppins-Light',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  extraBold: 'Poppins-ExtraBold',
  thin: 'Poppins-Thin',
  extraLight: 'Poppins-ExtraLight',
  black: 'Poppins-Black',
};

// Helper function to get font family with weight
export const getPoppinsFont = (weight = 'regular') => {
  return Poppins[weight] || Poppins.regular;
};

export default Poppins;
