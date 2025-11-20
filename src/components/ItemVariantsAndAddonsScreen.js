import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Poppins, icons } from '../assets';
import CustomHeader from './CustomHeader';

const ItemVariantsAndAddonsScreen = ({ onBack, onNext, onNavigate, itemData = null, configData = null }) => {
  // Get variant config from API or use fallback
  const variantConfig = useMemo(() => {
    if (configData?.variant_config) {
      return configData.variant_config;
    }
    // Fallback values
    return {
      page_title: 'Variants of this item',
      page_description: 'You can create different variants (quality, size, base/crust, etc) and customers will select exactly one variant when ordering.',
      variant_types: [
        {
          id: 'QUANTITY',
          title: 'Quantity',
          description: 'Quantity variations like - Small, medium large, etc',
          icon: '🥤',
          bg_color: '#E3F2FD',
        },
        {
          id: 'PREPARATION_TYPE',
          title: 'Preparation type',
          description: 'Item preparation style, eg- Halal, non-Halal, etc',
          icon: '🍖',
          bg_color: '#E3F2FD',
        },
        {
          id: 'SIZE',
          title: 'Size',
          description: 'Different sizes of an item, eg-bread size pizza size, etc.',
          icon: '🍕',
          bg_color: '#F3E5F5',
        },
        {
          id: 'BASE',
          title: 'Base',
          description: 'Item Base type, eg-wheat bread, multi-grain etc.',
          icon: '🍞',
          bg_color: '#FFEBEE',
        },
        {
          id: 'RICE',
          title: 'Rice',
          description: "Choice of item's rice selection.",
          icon: '🍚',
          bg_color: '#FFF9C4',
        },
        {
          id: 'CUSTOM',
          title: 'Make your own',
          description: "Define own variation if you can't find a template above.",
          icon: '➕',
          bg_color: '#FFFFFF',
        },
      ],
    };
  }, [configData]);

  // Get addon config from API or use fallback
  const addonConfig = useMemo(() => {
    if (configData?.addon_config) {
      return configData.addon_config;
    }
    // Fallback values
    return {
      page_title: 'Add-on group for this item',
      page_description: 'You can offer customisation options like toppings, extras, and add-ons. Their selection can be optional or mandatory.',
      page_note: '',
      addon_types: [
        {
          id: 'ADD_ONS',
          title: 'Add-ons',
          description: 'Add-ons like curd, coke, Raita, etc',
          icon: '🥤',
          bg_color: '#E3F2FD',
        },
        {
          id: 'EXTRA',
          title: 'Extra',
          description: 'Extra Ingredients like cheese, tomato, Mashroom, etc.',
          icon: '🧀',
          bg_color: '#E8F5E9',
        },
        {
          id: 'TOPPINGS',
          title: 'Toppings',
          description: 'Sauce like Pesto, Mint Mayonnaise, Honey Mustard.',
          icon: '🍯',
          bg_color: '#FFEBEE',
        },
        {
          id: 'CUSTOM',
          title: 'Make your own',
          description: "Define own variation if you can't find a template above.",
          icon: '➕',
          bg_color: '#FFFFFF',
        },
      ],
    };
  }, [configData]);

  // Get footer button labels from API or use fallback
  const footerConfig = useMemo(() => {
    if (configData?.variant_addon_footer) {
      return configData.variant_addon_footer;
    }
    return {
      delete_button: 'Delete',
      next_button: 'Next',
    };
  }, [configData]);

  // Transform variant types to match our component format
  const variantOptions = useMemo(() => {
    return variantConfig.variant_types.map((variant) => ({
      id: variant.id,
      title: variant.title,
      description: variant.description,
      icon: variant.icon, // This will be an emoji string
      color: variant.bg_color,
      isCustom: variant.id === 'CUSTOM',
    }));
  }, [variantConfig]);

  // Transform addon types to match our component format
  const addonOptions = useMemo(() => {
    return addonConfig.addon_types.map((addon) => ({
      id: addon.id,
      title: addon.title,
      description: addon.description,
      icon: addon.icon, // This will be an emoji string
      color: addon.bg_color,
      isCustom: addon.id === 'CUSTOM',
    }));
  }, [addonConfig]);

  const handleVariantSelect = (variantId, variantTitle) => {
    console.log('🔵 [ItemVariantsAndAddonsScreen] Variant selected:', variantId, variantTitle);
    // Navigate to Add Quantity screen (or appropriate variant screen)
    if (onNavigate) {
      console.log('🔵 [ItemVariantsAndAddonsScreen] Calling onNavigate for variant');
      onNavigate('variant', {
        variantType: variantId,
        variantTitle: variantTitle,
      });
    } else {
      console.warn('⚠️ [ItemVariantsAndAddonsScreen] onNavigate prop is not provided');
    }
  };

  const handleAddonSelect = (addonId, addonTitle) => {
    console.log('🟢 [ItemVariantsAndAddonsScreen] Addon selected:', addonId, addonTitle);
    // Navigate to Add Add-ons screen
    if (onNavigate) {
      console.log('🟢 [ItemVariantsAndAddonsScreen] Calling onNavigate for addon');
      onNavigate('addon', {
        addonType: addonId,
        addonTitle: addonTitle,
      });
    } else {
      console.warn('⚠️ [ItemVariantsAndAddonsScreen] onNavigate prop is not provided');
    }
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    onBack();
  };

  const handleNext = () => {
    // TODO: Save selected variants and add-ons
    if (onNext) {
      onNext();
    }
    onBack();
  };

  const renderCard = (option, onPress, isAddon = false) => {
    const isCustom = option.isCustom;
    // Check if icon is an emoji (string) or an image (require/object)
    // If it's a string, it's an emoji; if it's an object/number, it's an image require
    const isEmoji = typeof option.icon === 'string';
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.card,
          isAddon && styles.addonCard,
          { backgroundColor: option.color },
          isCustom && styles.customCard,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {option.icon ? (
          isEmoji ? (
            <Text style={styles.emojiIcon}>{option.icon}</Text>
          ) : (
            <Image
              source={option.icon}
              style={styles.cardIcon}
              resizeMode="contain"
            />
          )
        ) : (
          <View style={styles.plusIconContainer}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        )}
        <Text style={styles.cardTitle}>{option.title}</Text>
        <Text style={styles.cardDescription}>{option.description}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerBackground}>
        <CustomHeader title={variantConfig.page_title} onBack={onBack} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Variants Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{variantConfig.page_title}</Text>
          <Text style={styles.sectionDescription}>
            {variantConfig.page_description}
          </Text>
          
          <View style={styles.variantCardGrid}>
            {variantOptions.map((option) =>
              renderCard(option, () => handleVariantSelect(option.id, option.title), false)
            )}
          </View>
        </View>

        {/* Add-on Group Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{addonConfig.page_title}</Text>
          <Text style={styles.sectionDescription}>
            {addonConfig.page_description}
          </Text>
          {addonConfig.page_note ? (
            <Text style={styles.sectionNote}>
              {addonConfig.page_note}
            </Text>
          ) : null}
          
          <View style={styles.addonCardGrid}>
            {addonOptions.map((option) =>
              renderCard(option, () => handleAddonSelect(option.id, option.title), true)
            )}
          </View>
        </View>

        {/* Delete and Next Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>{footerConfig.delete_button}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.nextButtonText}>{footerConfig.next_button}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBackground: {
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionNote: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#999999',
    marginTop: -10,
    marginBottom: 20,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  variantCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  addonCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '30%',
    minWidth: 100,
    minHeight: 140,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addonCard: {
    width: '48%',
  },
  customCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  cardIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  emojiIcon: {
    fontSize: 40,
    marginBottom: 8,
    textAlign: 'center',
  },
  plusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  plusIcon: {
    fontSize: 24,
    color: '#666666',
    fontFamily: Poppins.regular,
  },
  cardTitle: {
    fontFamily: Poppins.semiBold,
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: Poppins.regular,
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  deleteButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#FF6E1A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  nextButtonText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default ItemVariantsAndAddonsScreen;
