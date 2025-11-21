import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { Poppins, icons } from '../assets';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import { useToast } from './ToastContext';

const AddOnsScreen = ({ onCreateAddon, onRefresh }) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [addons, setAddons] = useState([]);
  const [isLoadingAddons, setIsLoadingAddons] = useState(false);

  // Fetch add-ons from API
  const fetchAddons = useCallback(async () => {
    setIsLoadingAddons(true);
    try {
      const url = `${API_BASE_URL}v1/catalog/addons`;
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok && (data.code === 200 || data.code === 201) && data.status === 'success') {
        const mappedAddons = (data.data || []).map((addon) => ({
          id: addon.id,
          name: addon.name || '',
          price: addon.additional_price || 0,
          isVeg: addon.item_type === 'VEG',
          item_type: addon.item_type || 'VEG',
          gst_rate: addon.gst_rate || 'GST_0',
          is_active: addon.is_active !== false,
          created_at: addon.created_at || null,
          updated_at: addon.updated_at || null,
        }));
        
        // Sort by created_at (newest first), fallback to updated_at, then by ID descending
        const sortedAddons = mappedAddons.sort((a, b) => {
          // First try to sort by created_at (newest first)
          if (a.created_at && b.created_at) {
            return new Date(b.created_at) - new Date(a.created_at);
          }
          // Fallback to updated_at
          if (a.updated_at && b.updated_at) {
            return new Date(b.updated_at) - new Date(a.updated_at);
          }
          // Fallback to ID (assuming newer items have higher IDs)
          return (b.id || '').localeCompare(a.id || '');
        });
        
        setAddons(sortedAddons);
      } else {
        const errorMessage = data.message || data.error || 'Failed to fetch add-ons';
        console.error('❌ [AddOnsScreen] Failed to fetch add-ons:', errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [AddOnsScreen] Error fetching add-ons:', error);
      showToast('Failed to fetch add-ons', 'error');
    } finally {
      setIsLoadingAddons(false);
    }
  }, [showToast]);

  // Fetch add-ons on mount and when onRefresh trigger changes
  useEffect(() => {
    fetchAddons();
  }, [fetchAddons, onRefresh]);

  const filteredAddons = addons.filter((addon) =>
    addon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search add-on name"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.searchIconContainer} activeOpacity={0.7}>
          <Image
            source={icons.search}
            style={styles.searchIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Add-ons List */}
      {isLoadingAddons ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading add-ons...</Text>
        </View>
      ) : filteredAddons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No add-ons found</Text>
          <Text style={styles.emptySubText}>
            {searchQuery ? 'Try a different search term' : 'Create your first add-on to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.addonsList}
          contentContainerStyle={styles.addonsListContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredAddons.map((addon) => (
            <TouchableOpacity
              key={addon.id}
              style={styles.addonItem}
              activeOpacity={0.7}
            >
              <View style={styles.addonItemLeft}>
                <View
                  style={[
                    styles.vegIndicator,
                    addon.isVeg ? styles.vegIndicatorGreen : styles.vegIndicatorOrange,
                  ]}
                >
                  <View style={styles.vegDot} />
                </View>
                <Text style={styles.addonName}>{addon.name}</Text>
              </View>
              <Text style={styles.addonPrice}>₹{addon.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 20,
    height: 48,
    width: '100%',
  },
  searchInput: {
    flex: 1,
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    paddingVertical: 0,
    paddingRight: 8,
  },
  searchIconContainer: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: '#666666',
  },
  addonsList: {
    flex: 1,
  },
  addonsListContent: {
    paddingBottom: 20,
  },
  addonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  addonItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vegIndicator: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegIndicatorGreen: {
    backgroundColor: '#4CAF50',
  },
  vegIndicatorOrange: {
    backgroundColor: '#FF6E1A',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  addonName: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  addonPrice: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  emptySubText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

export default AddOnsScreen;
