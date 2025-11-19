import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Poppins, icons } from '../assets';

const CustomDropdown = ({
  value,
  onSelect,
  placeholder,
  options = [],
  error,
  showSearch = true,
  onOpen,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSelectedValue(value || null);
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (item) => {
    setSelectedValue(item);
    setIsOpen(false);
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      // Opening dropdown - check if onOpen callback exists and returns false
      if (onOpen && onOpen() === false) {
        // Validation failed, don't open
        return;
      }
    }
    setIsOpen(!isOpen);
  };

  const displayValue = selectedValue ? (typeof selectedValue === 'string' ? selectedValue : (selectedValue?.name || selectedValue?.label || selectedValue?.value || '')) : '';

  // Filter options based on search query (only if search is enabled)
  const filteredOptions = showSearch 
    ? options.filter((item) => {
        const itemValue = typeof item === 'string' ? item : (item?.name || item?.label || item?.value || '');
        return itemValue.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : options;

  return (
    <View style={styles.container} collapsable={false}>
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error ? styles.inputContainerError : styles.inputContainerNormal,
          isOpen && styles.inputContainerOpen
        ]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.textInput,
            !displayValue && styles.placeholderText
          ]}
        >
          {displayValue || placeholder}
        </Text>
        <Image
          source={icons.dropdownArrow}
          style={[
            styles.dropdownIcon,
            isOpen && styles.dropdownIconRotated
          ]}
          resizeMode="contain"
        />
      </TouchableOpacity>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      {isOpen && options.length > 0 && (
        <View style={styles.optionsContainer} collapsable={false}>
          {/* Search Box */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
            </View>
          )}
          <ScrollView 
            style={styles.optionsList}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((item, index) => {
              const itemValue = typeof item === 'string' ? item : (item?.name || item?.label || item?.value || '');
              
              // Normalize both selectedValue and item to their identifier for comparison
              const getItemId = (obj) => {
                if (typeof obj === 'string') return obj;
                if (typeof obj === 'object' && obj !== null) {
                  return obj.id || obj.value || obj.name || null;
                }
                return null;
              };
              
              const selectedId = getItemId(selectedValue);
              const itemId = getItemId(item);
              const isSelected = selectedId !== null && itemId !== null && selectedId === itemId;
              
              return (
                <TouchableOpacity
                  key={typeof item === 'string' ? item : (item?.id || item?.value || item?.label || index.toString())}
                  style={[
                    styles.optionItem,
                    isSelected && styles.optionItemSelected
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected
                  ]}>
                    {itemValue}
                  </Text>
                </TouchableOpacity>
              );
            })
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No results found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 9999,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 50,
  },
  inputContainerNormal: {
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: '#FF0000',
    backgroundColor: '#FFFFFF',
  },
  inputContainerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownIcon: {
    width: 16,
    height: 16,
    marginRight: 15,
    tintColor: '#666666',
  },
  dropdownIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  errorText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#FF0000',
    marginTop: 5,
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderTopWidth: 0,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    marginTop: -1,
    zIndex: 10000,
  },
  searchContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
    minHeight: 40,
  },
  optionsList: {
    maxHeight: 250,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#999',
  },
  optionItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionItemSelected: {
    // Background remains white, only text color changes
  },
  optionText: {
    fontFamily: Poppins.regular,
    fontSize: 16,
    color: '#000000',
  },
  optionTextSelected: {
    fontFamily: Poppins.medium,
    color: '#FF6E1A',
  },
});

export default CustomDropdown;
