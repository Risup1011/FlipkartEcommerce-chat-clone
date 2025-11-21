import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Poppins, icons } from '../assets';
import CreateCategoryBottomSheet from './CreateCategoryBottomSheet';
import CreateSubCategoryBottomSheet from './CreateSubCategoryBottomSheet';
import AddPhotoBottomSheet from './AddPhotoBottomSheet';
import ItemDetailsScreen from './ItemDetailsScreen';
import ItemImageTimingScreen from './ItemImageTimingScreen';
import ItemVariantsAndAddonsScreen from './ItemVariantsAndAddonsScreen';
import AddQuantityScreen from './AddQuantityScreen';
import AddAddonsScreen from './AddAddonsScreen';
import AddOnsScreen from './AddOnsScreen';
import AddOnsSelectionScreen from './AddOnsSelectionScreen';
import CreateAddonBottomSheet from './CreateAddonBottomSheet';
import { useToast } from './ToastContext';
import { fetchWithAuth } from '../utils/apiHelpers';
import { API_BASE_URL } from '../config';
import {
  setCategories,
  appendCategories,
  setCurrentPage,
  incrementPage,
  setHasNext,
  setLoading,
  setLoadingMore,
  setRefreshing,
  setLastFetchedPage,
  saveMenuDataToStorage,
  loadMenuDataFromStorage,
  resetPagination,
  updateItem,
} from '../store/menuSlice';

const MenuScreen = ({ partnerStatus, onNavigateToOrders, resetNavigationTrigger }) => {
  
  const { showToast } = useToast();
  const dispatch = useDispatch();
  
  // Get data from Redux store
  const {
    categories,
    currentPage,
    hasNext,
    isLoading,
    isLoadingMore,
    isRefreshing,
    lastFetchedPage,
  } = useSelector((state) => state.menu);
  
    categoriesCount: categories?.length || 0,
    currentPage,
    hasNext,
    isLoading,
    isLoadingMore,
    isRefreshing,
    lastFetchedPage,
  });
  
  const [activeTab, setActiveTab] = useState('menuItems'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showCreateSubCategoryModal, setShowCreateSubCategoryModal] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [showItemImageTiming, setShowItemImageTiming] = useState(false);
  const [showItemVariantsAndAddons, setShowItemVariantsAndAddons] = useState(false);
  const [showAddQuantity, setShowAddQuantity] = useState(false);
  const [showAddAddons, setShowAddAddons] = useState(false);
  const [showAddOnsSelection, setShowAddOnsSelection] = useState(false);
  const [showCreateAddonModal, setShowCreateAddonModal] = useState(false);
  const [pendingItemData, setPendingItemData] = useState(null); // Store item data before navigating to variants screen
  const [currentVariantConfig, setCurrentVariantConfig] = useState(null); // Store current variant/addon config
  const [addonsRefreshTrigger, setAddonsRefreshTrigger] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // Track item being edited
  const [configData, setConfigData] = useState(null);
  const [isLoadingConfigData, setIsLoadingConfigData] = useState(true);
  const [togglingItems, setTogglingItems] = useState(new Set()); // Track items being toggled
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState(null); // Track which category menu is open
  const [editingCategory, setEditingCategory] = useState(null); // Track category being edited
  const [openSubCategoryMenuId, setOpenSubCategoryMenuId] = useState(null); // Track which subcategory menu is open
  const [editingSubCategory, setEditingSubCategory] = useState(null); // Track subcategory being edited
  const [pageCounter, setPageCounter] = useState(1); // Counter for pagination - increments on each onEndReached
  const [searchResults, setSearchResults] = useState(null); // Store search results
  const [isSearching, setIsSearching] = useState(false); // Track search loading state
  const searchTimeoutRef = useRef(null); // Store timeout for debouncing
  
    activeTab,
    searchQuery,
    showCreateCategoryModal,
    showCreateSubCategoryModal,
    showAddPhotoModal,
    showItemDetails,
    showItemImageTiming,
    showItemVariantsAndAddons,
    showAddQuantity,
    showAddAddons,
    showAddOnsSelection,
    showCreateAddonModal,
    hasPendingItemData: !!pendingItemData,
    hasCurrentVariantConfig: !!currentVariantConfig,
    addonsRefreshTrigger,
    selectedCategoryId,
    selectedItemId,
    selectedItemName,
    hasEditingItem: !!editingItem,
    hasConfigData: !!configData,
    isLoadingConfigData,
    togglingItemsCount: togglingItems.size,
    openCategoryMenuId,
    hasEditingCategory: !!editingCategory,
    openSubCategoryMenuId,
    hasEditingSubCategory: !!editingSubCategory,
    pageCounter,
    hasSearchResults: !!searchResults,
    isSearching,
  });

  // Reset navigation state when resetNavigationTrigger changes (when bottom tab is clicked)
  useEffect(() => {
    if (resetNavigationTrigger) {
      // Reset all nested navigation states
      setShowItemDetails(false);
      setShowItemImageTiming(false);
      setShowItemVariantsAndAddons(false);
      setShowAddQuantity(false);
      setShowAddAddons(false);
      setShowAddOnsSelection(false);
      setShowCreateCategoryModal(false);
      setShowCreateSubCategoryModal(false);
      setShowAddPhotoModal(false);
      setShowCreateAddonModal(false);
      setPendingItemData(null);
      setCurrentVariantConfig(null);
      setSelectedCategoryId(null);
      setSelectedItemId(null);
      setSelectedItemName(null);
      setEditingItem(null);
      setEditingCategory(null);
      setEditingSubCategory(null);
      setOpenCategoryMenuId(null);
      setOpenSubCategoryMenuId(null);
      // Clear search if needed
      // setSearchQuery(''); // Keep search query as user might want to keep it
      // setSearchResults(null); // Keep search results as user might want to keep them
    }
  }, [resetNavigationTrigger]);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      const cached = await loadMenuDataFromStorage();
        hasCached: !!cached,
        categoriesCount: cached?.categories?.length || 0,
        lastPage: cached?.lastPage,
      });
      if (cached && cached.categories && cached.categories.length > 0) {
        dispatch(setCategories(cached.categories));
        dispatch(setLastFetchedPage(cached.lastPage));
        dispatch(setCurrentPage(cached.lastPage + 1));
      } else {
      }
    };
    
    loadCachedData();
  }, [dispatch]);

  // Fetch complete catalog from API (categories, subcategories, items, partner info, UI labels)
  const fetchCategories = useCallback(async (page = 1, append = false) => {
    // Don't show main loading indicator when loading more pages
    if (page === 1 && !append) {
      dispatch(setLoading(true));
    } else {
      dispatch(setLoadingMore(true));
    }
    
    try {
      // Build URL with pagination parameters
      const url = `${API_BASE_URL}v1/catalog/orchestrator/complete-catalog?page=${page}&size=10`;
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });
        status: response.status,
        ok: response.ok,
      });

      const data = await response.json();
        ok: response.ok,
        code: data.code,
        status: data.status,
        hasData: !!data.data,
        categoriesCount: data.data?.categories?.length || 0,
      });

      if (response.ok && (data.code === 200 || data.code === 201) && data.status === 'success') {
        const catalogData = data.data || {};
        const categoriesData = catalogData.categories || [];
        
        // Check if there are more pages
        // Try multiple possible response formats for pagination info
        const hasMore = catalogData.has_next !== undefined ? catalogData.has_next : 
                       (catalogData.pagination?.has_next !== undefined ? catalogData.pagination.has_next : 
                       (data.has_next !== undefined ? data.has_next :
                       (data.pagination?.has_next !== undefined ? data.pagination.has_next :
                       (page === 1 && categoriesData.length >= 10)))); // Fallback: assume has more on first page if we got 10+ items
        
        dispatch(setHasNext(hasMore));
        dispatch(setLastFetchedPage(page));

        // Map the complete catalog response to our UI format
        const categoriesWithData = categoriesData.map((categoryObj) => {
          const category = categoryObj.category || {};
          const subCategories = (categoryObj.sub_categories || []).map((sub) => ({
            id: sub.id,
            name: sub.name,
            description: sub.description || '',
            display_order: sub.display_order || 0,
            is_active: sub.is_active !== undefined ? sub.is_active : true, // Include is_active for PUT requests
          }));

          const items = (categoryObj.menu_items || []).map((item) => {
            // Use the last image in the array (most recently uploaded) if available
            // Otherwise use the first image
            const imageUrls = item.image_urls || [];
            const imageToUse = imageUrls.length > 0 
              ? (imageUrls.length > 1 ? imageUrls[imageUrls.length - 1] : imageUrls[0])
              : null;
            
            return {
              id: item.id || item._id || Date.now().toString(),
              name: item.name || '',
              price: item.price || 0,
              isVeg: item.item_type === 'VEG',
              is_active: item.is_active !== false,
              image: imageToUse,
              description: item.description || '',
              packagingPrice: item.packaging_price || 0,
              gst: item.gst_rate ? (item.gst_rate.replace('GST_', '') || '0') + '%' : '0%',
              item_type: item.item_type || 'VEG',
              sub_category_id: item.sub_category_id || null,
              display_order: item.display_order || 0,
              variants: item.variants || [], // Include variants from API
              add_ons: item.add_ons || [], // Include add_ons from API
              image_urls: imageUrls, // Store all image URLs
            };
          });

          return {
            id: category.id,
            name: category.name,
            description: category.description || '',
            display_order: category.display_order || 0,
            is_active: category.is_active !== false,
            items: items,
            subCategories: subCategories,
            created_at: category.created_at,
            updated_at: category.updated_at,
          };
        });

        // Log the order received from backend for verification
        categoriesWithData.forEach((cat, index) => {
        });

        // Append or replace categories based on pagination
        let categoriesToSave;
        if (append && page > 1) {
          dispatch(appendCategories(categoriesWithData));
          // Calculate merged categories for saving (same logic as reducer)
          const existingCategoryMap = new Map(categories.map(cat => [cat.id, cat]));
          categoriesWithData.forEach((newCategory) => {
            const existingCategory = existingCategoryMap.get(newCategory.id);
            if (existingCategory) {
              const mergedItems = [...existingCategory.items, ...newCategory.items];
              const mergedSubCategories = [...existingCategory.subCategories, ...newCategory.subCategories];
              const uniqueItems = mergedItems.filter((item, index, self) => 
                index === self.findIndex(i => i.id === item.id)
              );
              const uniqueSubCategories = mergedSubCategories.filter((sub, index, self) => 
                index === self.findIndex(s => s.id === sub.id)
              );
              existingCategoryMap.set(newCategory.id, {
                ...existingCategory,
                items: uniqueItems,
                subCategories: uniqueSubCategories,
              });
            } else {
              existingCategoryMap.set(newCategory.id, newCategory);
            }
          });
          categoriesToSave = Array.from(existingCategoryMap.values());
        } else {
          // First page or refresh - replace all categories
          dispatch(setCategories(categoriesWithData));
          categoriesToSave = categoriesWithData;
          
        }
        
        // Save to AsyncStorage
        await saveMenuDataToStorage(categoriesToSave, page);
        

        // Log partner info and UI labels if available (for future use)
        if (catalogData.partner_info) {
        }
        if (catalogData.ui_labels) {
        }
      } else {
        console.error('❌ [MenuScreen] Failed to fetch complete catalog:', data.message);
        console.error('❌ [MenuScreen] Error details:', {
          responseStatus: response.status,
          responseOk: response.ok,
          dataCode: data.code,
          dataStatus: data.status,
          dataMessage: data.message,
        });
        if (page === 1) {
          showToast(data.message || 'Failed to fetch catalog', 'error');
        } else {
        }
      }
    } catch (error) {
      console.error('❌ [MenuScreen] Error fetching complete catalog:', error);
      console.error('❌ [MenuScreen] Error stack:', error.stack);
      if (page === 1) {
        showToast('Failed to fetch catalog', 'error');
      } else {
      }
    } finally {
      dispatch(setLoading(false));
      dispatch(setLoadingMore(false));
      dispatch(setRefreshing(false));
    }
  }, [showToast, dispatch, lastFetchedPage]);

  // Load next page - increments counter and fetches new page
  const loadNextPage = useCallback(async () => {
    if (!hasNext || isLoadingMore || isLoading) {
      return;
    }
    
    // Increment page counter
    const nextCounter = pageCounter + 1;
    setPageCounter(nextCounter);
    
    // Calculate next page to fetch (start from lastFetchedPage + 1)
    const nextPage = lastFetchedPage + 1;
    dispatch(setCurrentPage(nextPage));
    await fetchCategories(nextPage, true);
  }, [hasNext, isLoadingMore, isLoading, pageCounter, lastFetchedPage, fetchCategories, dispatch]);

  // Handle end reached for FlatList pagination - increments counter
  const handleEndReached = useCallback(() => {
    if (hasNext && !isLoadingMore && !isLoading) {
      loadNextPage();
    } else {
    }
  }, [hasNext, isLoadingMore, isLoading, loadNextPage]);

  // Refresh categories (reset pagination)
  const refreshCategories = useCallback(async () => {
    dispatch(setRefreshing(true));
    dispatch(resetPagination());
    setPageCounter(1);
    await fetchCategories(1, false);
  }, [fetchCategories, dispatch]);

  // Fetch categories on mount - only fetch pages that weren't fetched before
  useEffect(() => {
    const initialFetch = async () => {
      // If we have cached data, only fetch pages after the last fetched page
      if (lastFetchedPage > 0) {
        // Don't fetch again if we already have data
        return;
      }
      
      // First time - fetch from page 1
      dispatch(resetPagination());
      setPageCounter(1);
      await fetchCategories(1, false);
    };
    
    initialFetch();
  }, []); // Only run on mount

  // Fetch config data on component mount
  useEffect(() => {
    const fetchConfigData = async () => {
      setIsLoadingConfigData(true);
      try {
        const url = `${API_BASE_URL}v1/config`;
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData?.data) {
          setConfigData(responseData.data);
        } else {
          console.error('❌ [MenuScreen] Failed to load config data:', response.status);
          console.error('❌ [MenuScreen] Response data:', responseData);
          setConfigData(null);
        }
      } catch (error) {
        console.error('❌ [MenuScreen] Error fetching config data:', error);
        console.error('❌ [MenuScreen] Error stack:', error.stack);
        setConfigData(null);
      } finally {
        setIsLoadingConfigData(false);
      }
    };

    fetchConfigData();
  }, []);

  // Log header data source whenever configData changes
  useEffect(() => {
    
    if (configData?.partner_info) {
      
      const businessName = configData.partner_info.business_name;
      const onlineStatus = configData.partner_info.online_status;
      const closingInfo = configData.partner_info.closing_info;
      
    } else {
    }
  }, [configData]);

  // Search API function
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const url = `${API_BASE_URL}v1/catalog/orchestrator/search?query=${encodeURIComponent(query.trim())}`;
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();
        ok: response.ok,
        code: data.code,
        status: data.status,
        hasData: !!data.data,
      });

      if (response.ok && data.code === 200 && data.status === 'success') {
        const searchData = data.data || {};
        const results = {
          search_query: searchData.search_query || query,
          total_results: searchData.total_results || 0,
          menu_items: searchData.menu_items || [],
        };
        setSearchResults(results);
      } else {
        const errorMessage = data.message || 'Failed to search items';
        console.error('❌ [MenuScreen] Search failed:', errorMessage);
        const emptyResults = {
          search_query: query,
          total_results: 0,
          menu_items: [],
        };
        setSearchResults(emptyResults);
      }
    } catch (error) {
      console.error('❌ [MenuScreen] Error searching:', error);
      console.error('❌ [MenuScreen] Error stack:', error.stack);
      const emptyResults = {
        search_query: query,
        total_results: 0,
        menu_items: [],
      };
      setSearchResults(emptyResults);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty, clear results
    if (!searchQuery || searchQuery.trim().length === 0) {
      setSearchResults(null);
      setIsSearching(false);
      searchTimeoutRef.current = null;
      return;
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
      searchTimeoutRef.current = null;
    }, 500); // 500ms debounce delay

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery, performSearch]);

  // Render function for FlatList category item
  const renderCategoryItem = useCallback(({ item: category }) => {
    return (
      <View style={styles.categoryContainer}>
        {/* Category Header */}
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Text style={styles.categoryName}>{category.name}</Text>
          </View>
          <View style={styles.menuButtonContainer}>
            <TouchableOpacity
              style={styles.categoryMenuButton}
              onPress={() => handleCategoryMenu(category.id)}
              activeOpacity={0.7}
            >
              <View style={styles.threeDots}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </TouchableOpacity>
            
            {/* Category Menu Box */}
            {openCategoryMenuId === category.id && (
              <View style={styles.categoryMenuBox}>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => handleEditCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuOptionText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => handleDeleteCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuOptionTextDelete}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Category Content */}
        <View style={styles.categoryContent}>
            {/* Add Item Button */}
            <View style={styles.addItemButton}>
              <View style={styles.addItemIcon}>
                <Text style={styles.addItemIconText}>+</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleAddItem(category.id)}
                activeOpacity={0.7}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={styles.addItemText}>Add an item</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Add Sub-Category Link */}
            <View style={styles.addSubCategoryButton}>
              <TouchableOpacity
                onPress={() => handleAddSubCategory(category.id)}
                activeOpacity={0.7}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={styles.addSubCategoryText}>
                  ADD NEW SUB-CATEGORY
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sub-Categories List */}
            {category.subCategories && category.subCategories.length > 0 && (
              <View style={styles.subCategoriesContainer}>
                {category.subCategories.map((subCategory) => {
                  // Get items for this sub-category
                  const subCategoryItems = category.items.filter(
                    (item) => item.sub_category_id === subCategory.id
                  );
                  
                  return (
                    <View key={subCategory.id} style={styles.subCategoryItem}>
                      <View style={styles.subCategoryHeader}>
                        <View style={styles.subCategoryHeaderLeft}>
                          <Text style={styles.subCategoryName}>{subCategory.name}</Text>
                          {subCategory.description && (
                            <Text style={styles.subCategoryDescription}>
                              {subCategory.description}
                            </Text>
                          )}
                        </View>
                        <View style={styles.menuButtonContainer}>
                          <TouchableOpacity
                            style={styles.categoryMenuButton}
                            onPress={() => handleSubCategoryMenu(subCategory.id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.threeDots}>
                              <View style={styles.dot} />
                              <View style={styles.dot} />
                              <View style={styles.dot} />
                            </View>
                          </TouchableOpacity>
                          
                          {/* Sub-Category Menu Box */}
                          {openSubCategoryMenuId === subCategory.id && (
                            <View style={styles.categoryMenuBox}>
                              <TouchableOpacity
                                style={styles.menuOption}
                                onPress={() => handleEditSubCategory(category.id, subCategory.id)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.menuOptionText}>Edit</Text>
                              </TouchableOpacity>
                              <View style={styles.menuDivider} />
                              <TouchableOpacity
                                style={styles.menuOption}
                                onPress={() => handleDeleteSubCategory(category.id, subCategory.id)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.menuOptionTextDelete}>Delete</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                      {subCategoryItems.length > 0 && (
                        <View style={styles.subCategoryItemsContainer}>
                          {subCategoryItems.map((item) => (
                            <View key={item.id} style={styles.menuItem}>
                              {/* Photo Placeholder */}
                              <TouchableOpacity
                                style={styles.photoPlaceholder}
                                activeOpacity={0.7}
                                onPress={() => handlePhotoPress(category.id, item.id)}
                              >
                                {item.image ? (
                                  <Image
                                    key={item.image} // Force re-render when image changes
                                    source={{ uri: item.image }}
                                    style={styles.photoImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <>
                                    <Text style={styles.photoPlaceholderText}>
                                      ADD PHOTO
                                    </Text>
                                    <View style={styles.photoAddIcon}>
                                      <Text style={styles.photoAddIconText}>+</Text>
                                    </View>
                                  </>
                                )}
                              </TouchableOpacity>

                              {/* Item Details */}
                              <View style={styles.itemDetails}>
                                <View style={styles.itemHeader}>
                                  <View style={styles.itemNameContainer}>
                                    <View
                                      style={[
                                        styles.vegIndicator,
                                        item.isVeg
                                          ? styles.vegIndicatorGreen
                                          : styles.vegIndicatorOrange,
                                      ]}
                                    />
                                    <Text style={styles.itemName} numberOfLines={1}>
                                      {item.name}
                                    </Text>
                                  </View>
                                  <Switch
                                    value={item.is_active}
                                    onValueChange={() =>
                                      toggleItemAvailability(category.id, item.id)
                                    }
                                    disabled={togglingItems.has(item.id)}
                                    trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#E0E0E0"
                                  />
                                </View>
                                <View style={styles.itemPriceRow}>
                                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                                  <TouchableOpacity
                                    onPress={() => handleEditItem(category.id, item.id)}
                                    activeOpacity={0.7}
                                    style={{ alignSelf: 'flex-start' }}
                                  >
                                    <Text style={styles.editInfoText}>Edit Info</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Divider between sub-categories and items without sub-category */}
            {category.subCategories && category.subCategories.length > 0 && 
             category.items.some(item => !item.sub_category_id) && (
              <View style={styles.divider} />
            )}

            {/* Menu Items without sub-category */}
            {category.items && category.items.filter(item => !item.sub_category_id).length > 0 ? (
              category.items.filter(item => !item.sub_category_id).map((item) => (
              <View key={item.id} style={styles.menuItem}>
                {/* Photo Placeholder */}
                <TouchableOpacity
                  style={styles.photoPlaceholder}
                  activeOpacity={0.7}
                  onPress={() => handlePhotoPress(category.id, item.id)}
                >
                  {item.image ? (
                    <Image
                      key={item.image} // Force re-render when image changes
                      source={{ uri: item.image }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <>
                      <Text style={styles.photoPlaceholderText}>
                        ADD PHOTO
                      </Text>
                      <View style={styles.photoAddIcon}>
                        <Text style={styles.photoAddIconText}>+</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>

                {/* Item Details */}
                <View style={styles.itemDetails}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemNameContainer}>
                      <View
                        style={[
                          styles.vegIndicator,
                          item.isVeg
                            ? styles.vegIndicatorGreen
                            : styles.vegIndicatorOrange,
                        ]}
                      />
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <Switch
                      value={item.is_active}
                      onValueChange={() =>
                        toggleItemAvailability(category.id, item.id)
                      }
                      disabled={togglingItems.has(item.id)}
                      trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor="#E0E0E0"
                    />
                  </View>
                  <View style={styles.itemPriceRow}>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                    <TouchableOpacity
                      onPress={() => handleEditItem(category.id, item.id)}
                      activeOpacity={0.7}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      <Text style={styles.editInfoText}>Edit Info</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              ))
            ) : (
              category.subCategories && category.subCategories.length > 0 ? null : (
                <View style={styles.noItemsContainer}>
                  <Text style={styles.noItemsText}>No items in this category</Text>
                </View>
              )
            )}
          </View>
      </View>
    );
  }, [categories, openCategoryMenuId, openSubCategoryMenuId, togglingItems, handleCategoryMenu, handleEditCategory, handleDeleteCategory, handleAddItem, handleAddSubCategory, handleSubCategoryMenu, handleEditSubCategory, handleDeleteSubCategory, handlePhotoPress, toggleItemAvailability, handleEditItem]);

  // Footer component for FlatList
  const renderListFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }
    if (!hasNext && categories.length > 0) {
      return (
        <View style={styles.endOfListContainer}>
          <Text style={styles.endOfListText}>No more categories to load</Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, hasNext, categories.length]);

  // Render search result item
  const renderSearchResultItem = useCallback((item) => {
    // Use the last image in the array (most recently uploaded) if available
    const imageUrls = item.image_urls || [];
    const imageToUse = imageUrls.length > 0 
      ? (imageUrls.length > 1 ? imageUrls[imageUrls.length - 1] : imageUrls[0])
      : null;

    return (
      <View key={item.id} style={styles.menuItem}>
        {/* Photo Placeholder */}
        <TouchableOpacity
          style={styles.photoPlaceholder}
          activeOpacity={0.7}
          onPress={() => {
            // Find category ID from item
            handlePhotoPress(item.category_id, item.id);
          }}
        >
          {imageToUse ? (
            <Image
              key={imageToUse}
              source={{ uri: imageToUse }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          ) : (
            <>
              <Text style={styles.photoPlaceholderText}>
                ADD PHOTO
              </Text>
              <View style={styles.photoAddIcon}>
                <Text style={styles.photoAddIconText}>+</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Item Details */}
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <View style={styles.itemNameContainer}>
              <View
                style={[
                  styles.vegIndicator,
                  item.item_type === 'VEG'
                    ? styles.vegIndicatorGreen
                    : styles.vegIndicatorOrange,
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.category_name && (
                  <Text style={styles.searchResultCategory}>
                    {item.category_name}
                    {item.sub_category_name && ` • ${item.sub_category_name}`}
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={item.is_active}
              onValueChange={() => {
                toggleItemAvailability(item.category_id, item.id);
              }}
              disabled={togglingItems.has(item.id)}
              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E0E0E0"
            />
          </View>
          <View style={styles.itemPriceRow}>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
            <TouchableOpacity
              onPress={() => {
                handleEditItem(item.category_id, item.id, item);
              }}
              activeOpacity={0.7}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text style={styles.editInfoText}>Edit Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [togglingItems]);

  const toggleItemAvailability = useCallback(async (categoryId, itemId) => {
    // Prevent multiple simultaneous toggles for the same item
    if (togglingItems.has(itemId)) {
      return;
    }

    // Get current categories from Redux store to ensure we have latest data
    const currentCategories = categories;
    
    // Find the item to get current status
    const category = currentCategories.find(c => c.id === categoryId);
    if (!category) {
      console.warn('⚠️ [MenuScreen] Category not found:', categoryId);
      return;
    }
    
    const item = category.items.find(i => i.id === itemId);
    if (!item) {
      console.warn('⚠️ [MenuScreen] Item not found:', itemId, 'in category:', categoryId);
      return;
    }
    
    const newIsActive = !item.is_active;
    const previousIsActive = item.is_active;
    
    
    // Mark item as being toggled
    setTogglingItems(prev => new Set(prev).add(itemId));
    
    // Optimistically update UI using Redux
    dispatch(updateItem({
      categoryId,
      itemId,
      updates: { is_active: newIsActive }
    }));

    // Update via API
    try {
      const url = `${API_BASE_URL}v1/catalog/items/${itemId}/status`;
      const requestBody = { isActive: newIsActive };
      
      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
        ok: response.ok,
        code: data.code,
        status: data.status,
      });

      if (response.ok && data.code === 200 && data.status === 'success') {
        // Success - update state with API response to ensure sync
        const finalIsActive = data.data?.is_active ?? newIsActive;
        dispatch(updateItem({
          categoryId,
          itemId,
          updates: { is_active: finalIsActive }
        }));
        showToast(`Item ${newIsActive ? 'activated' : 'deactivated'} successfully`, 'success');
      } else {
        console.error('❌ [MenuScreen] API returned error, reverting optimistic update');
        // Revert optimistic update on error
        dispatch(updateItem({
          categoryId,
          itemId,
          updates: { is_active: previousIsActive }
        }));
        
        const errorMessage = data.message || 'Failed to update item status';
        console.error('❌ [MenuScreen] Failed to update item status:', errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [MenuScreen] Exception caught, reverting optimistic update');
      // Revert optimistic update on error
      dispatch(updateItem({
        categoryId,
        itemId,
        updates: { is_active: previousIsActive }
      }));
      
      console.error('❌ [MenuScreen] Error updating item status:', error);
      console.error('❌ [MenuScreen] Error stack:', error.stack);
      showToast('Failed to update item status', 'error');
    } finally {
      // Remove item from toggling set
      setTogglingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [categories, togglingItems, dispatch, showToast]);

  const handleCreateCategory = () => {
    setShowCreateCategoryModal(true);
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      const isEditing = !!editingCategory;
      const url = isEditing 
        ? `${API_BASE_URL}v1/catalog/categories/${editingCategory.id}`
        : `${API_BASE_URL}v1/catalog/categories`;
      
      const method = isEditing ? 'PUT' : 'POST';
      

      // For PUT requests, send all required fields
      // For POST (new category), omit display_order to let backend assign it at the top
      const requestBody = {
        name: categoryData.name?.trim() || '',
        description: categoryData.description?.trim() || '',
      };
      
      // Only include display_order for PUT requests (editing) or if explicitly provided
      if (isEditing || (categoryData.display_order !== undefined && categoryData.display_order !== null)) {
        requestBody.display_order = categoryData.display_order !== undefined && categoryData.display_order !== null 
          ? parseInt(categoryData.display_order) 
          : 0;
      }


      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(requestBody),
      });


      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ [MenuScreen] Failed to parse response:', parseError);
        showToast('Invalid response from server', 'error');
        return;
      }
      

      const successCode = isEditing ? 200 : 201;
      // Check for success response format: { code: 200/201, status: 'success' }
      const isSuccess = response.ok && data.code === successCode && data.status === 'success';
        isSuccess,
        responseOk: response.ok,
        dataCode: data.code,
        expectedCode: successCode,
        dataStatus: data.status,
      });
      
      if (isSuccess) {
        showToast(`Category ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        
        // Reset editing state
        setEditingCategory(null);
        
        // Refresh categories list (reset pagination)
        dispatch(resetPagination());
        setPageCounter(1);
        await fetchCategories(1, false);
      } else {
        // Handle different error response formats
        // Format 1: { code: 400, status: 'error', message: '...' }
        // Format 2: { status: 500, error: '...', message: '...' } (Spring Boot error format)
        // Format 3: { message: '...', error: '...' }
        const errorMessage = data.message || data.error || `Failed to ${isEditing ? 'update' : 'create'} category`;
        const errorStatus = data.status || response.status;
        console.error(`❌ [MenuScreen] Failed to ${isEditing ? 'update' : 'create'} category:`, errorMessage);
        console.error(`❌ [MenuScreen] Response Status: ${response.status}, Error Status: ${errorStatus}`);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error(`❌ [MenuScreen] Error ${editingCategory ? 'updating' : 'creating'} category:`, error);
      showToast(`Failed to ${editingCategory ? 'update' : 'create'} category`, 'error');
    }
  };

  const handleAddItem = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedItemId(null);
    setEditingItem(null);
    setShowItemDetails(true);
  };

  // Helper function to convert GST percentage to API format
  const getGstRateFromPercent = (gstPercent) => {
    if (!gstPercent) return 'GST_0';
    if (typeof gstPercent === 'string' && gstPercent.startsWith('GST_')) {
      return gstPercent;
    }
    const percent = parseFloat(gstPercent.toString().replace('%', '')) || 0;
    return `GST_${percent}`;
  };

  const handleSaveItem = async (itemData, shouldNavigateToVariants = false) => {
    
    const isEditing = !!editingItem;
    
    if (!selectedCategoryId && !isEditing) {
      console.error('❌ [MenuScreen] Category not selected');
      showToast('Category not selected', 'error');
      return;
    }

    // If editing, check if there are any changes
    if (isEditing && editingItem) {
      // Handle sub_category_id comparison - normalize both values
      let newSubCategoryId = null;
      if (itemData.sub_category_id) {
        if (typeof itemData.sub_category_id === 'object') {
          newSubCategoryId = itemData.sub_category_id.value || null;
        } else if (typeof itemData.sub_category_id === 'string' && itemData.sub_category_id.trim() !== '') {
          newSubCategoryId = itemData.sub_category_id;
        }
      }
      
      const oldSubCategoryId = editingItem.sub_category_id || null;
      
      // Normalize GST rate for comparison
      // editingItem might have 'gst' as "5%" or 'gst_rate' as "GST_5"
      // itemData has 'gst_rate' as "GST_5"
      const newGstRate = itemData.gst_rate || 'GST_0';
      let oldGstRate = editingItem.gst_rate;
      if (!oldGstRate && editingItem.gst) {
        // Convert "5%" format to "GST_5" format
        oldGstRate = getGstRateFromPercent(editingItem.gst);
      }
      oldGstRate = oldGstRate || 'GST_0';
      
      // Compare all fields
      const hasChanges = 
        (editingItem.name || '').trim() !== (itemData.name || '').trim() ||
        (editingItem.description || '').trim() !== (itemData.description || '').trim() ||
        (editingItem.item_type || 'VEG') !== (itemData.item_type || 'VEG') ||
        Math.abs((parseFloat(editingItem.price) || 0) - (parseFloat(itemData.price) || 0)) > 0.01 || // Use small epsilon for float comparison
        Math.abs((parseFloat(editingItem.packagingPrice) || 0) - (parseFloat(itemData.packagingPrice) || 0)) > 0.01 ||
        oldGstRate !== newGstRate ||
        String(oldSubCategoryId || '') !== String(newSubCategoryId || '') ||
        (parseInt(editingItem.display_order) || 0) !== (parseInt(itemData.display_order) || 0);
      
      if (!hasChanges) {
          name: editingItem.name,
          description: editingItem.description,
          item_type: editingItem.item_type,
          price: editingItem.price,
          packagingPrice: editingItem.packagingPrice,
          gst_rate: oldGstRate,
          sub_category_id: oldSubCategoryId,
          display_order: editingItem.display_order,
        });
          name: itemData.name,
          description: itemData.description,
          item_type: itemData.item_type,
          price: itemData.price,
          packagingPrice: itemData.packagingPrice,
          gst_rate: newGstRate,
          sub_category_id: newSubCategoryId,
          display_order: itemData.display_order,
        });
        
        // If navigating to variants, just proceed without API call
        if (shouldNavigateToVariants) {
          setPendingItemData({ ...itemData, id: selectedItemId });
          setShowItemDetails(false);
          setShowItemVariantsAndAddons(true);
        } else {
          // Just go back without showing any message
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
        }
        return;
      } else {
      }
    }

    try {
      // Prepare API payload
      // Handle sub_category_id - convert object to null if empty or invalid
      let subCategoryId = null;
      if (itemData.sub_category_id) {
        if (typeof itemData.sub_category_id === 'object') {
          // If it's an object from dropdown, extract the value
          subCategoryId = itemData.sub_category_id.value || null;
        } else if (typeof itemData.sub_category_id === 'string' && itemData.sub_category_id.trim() !== '') {
          subCategoryId = itemData.sub_category_id;
        }
      }

      const apiPayload = {
        name: itemData.name,
        description: itemData.description,
        item_type: itemData.item_type || 'VEG',
        price: itemData.price,
        packaging_price: itemData.packagingPrice,
        gst_rate: itemData.gst_rate || 'GST_0',
        sub_category_id: subCategoryId,
        display_order: itemData.display_order || 0,
        is_active: editingItem?.is_active !== undefined ? editingItem.is_active : true,
      };

      let url;
      let method;
      
      if (isEditing && selectedItemId) {
        // Update existing item
        url = `${API_BASE_URL}v1/catalog/items/${selectedItemId}`;
        method = 'PUT';
      } else {
        // Create new item
        url = `${API_BASE_URL}v1/catalog/categories/${selectedCategoryId}/items`;
        method = 'POST';
      }


      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(apiPayload),
      });

      const data = await response.json();

      const successCode = isEditing ? 200 : 201;
      const isSuccess = response.ok && data.code === successCode && data.status === 'success';
        isSuccess,
        responseOk: response.ok,
        dataCode: data.code,
        expectedCode: successCode,
        dataStatus: data.status,
      });
      
      if (isSuccess) {
        showToast(`Item ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        
        // If we got a new item ID from creation, store it
        const savedItemId = data.data?.id || selectedItemId;
        
        // Store item data for variants screen
        if (shouldNavigateToVariants) {
          setPendingItemData({ ...itemData, id: savedItemId });
          setSelectedItemId(savedItemId);
        }
        
        // Reset editing state
        setEditingItem(null);
        
        // Refresh categories list to get the updated/new item (reset pagination)
        dispatch(resetPagination());
        setPageCounter(1);
        await fetchCategories(1, false);
        
        // Navigate to variants screen if needed
        if (shouldNavigateToVariants) {
          setShowItemDetails(false);
          setShowItemVariantsAndAddons(true);
        }
      } else {
        // Handle error responses (409, 400, etc.)
        const errorMessage = data.message || data.error || `Failed to ${isEditing ? 'update' : 'create'} item`;
        console.error(`❌ [MenuScreen] Failed to ${isEditing ? 'update' : 'create'} item:`, errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error(`❌ [MenuScreen] Error ${editingItem ? 'updating' : 'creating'} item:`, error);
      showToast(`Failed to ${editingItem ? 'update' : 'create'} item`, 'error');
    } finally {
      if (!shouldNavigateToVariants) {
        setSelectedCategoryId(null);
        setSelectedItemId(null);
      }
    }
  };

  const handleNavigateToVariants = (itemData) => {
    // Save item first, then navigate to variants screen
    handleSaveItem(itemData, true);
  };

  const handleAddSubCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setShowCreateSubCategoryModal(true);
  };

  const handleSaveSubCategory = async (subCategoryData) => {
    if (!selectedCategoryId) {
      showToast('Category not selected', 'error');
      return;
    }

    try {
      const isEditing = !!editingSubCategory;
      const url = isEditing
        ? `${API_BASE_URL}v1/catalog/categories/${selectedCategoryId}/subcategories/${editingSubCategory.id}`
        : `${API_BASE_URL}v1/catalog/categories/${selectedCategoryId}/subcategories`;
      
      const method = isEditing ? 'PUT' : 'POST';
      

      // For PUT requests, include is_active field (required for updates)
      const requestBody = isEditing
        ? {
            name: subCategoryData.name?.trim() || '',
            description: subCategoryData.description?.trim() || '',
            display_order: subCategoryData.display_order !== undefined && subCategoryData.display_order !== null 
              ? parseInt(subCategoryData.display_order) 
              : 0,
            is_active: editingSubCategory.is_active !== undefined ? editingSubCategory.is_active : true, // Preserve existing is_active or default to true
          }
        : subCategoryData;


      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      const successCode = isEditing ? 200 : 201;
      // Check for success response format: { code: 200/201, status: 'success' }
      const isSuccess = response.ok && data.code === successCode && data.status === 'success';
      
      if (isSuccess) {
        showToast(`Sub-category ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        
        // Reset editing state
        setEditingSubCategory(null);
        
        // Refresh categories list (reset pagination)
        dispatch(resetPagination());
        setPageCounter(1);
        await fetchCategories(1, false);
      } else {
        // Handle different error response formats
        // Format 1: { code: 400, status: 'error', message: '...' }
        // Format 2: { status: 500, error: '...', message: '...' } (Spring Boot error format)
        // Format 3: { message: '...', error: '...' }
        const errorMessage = data.message || data.error || `Failed to ${isEditing ? 'update' : 'create'} sub-category`;
        const errorStatus = data.status || response.status;
        console.error(`❌ [MenuScreen] Failed to ${isEditing ? 'update' : 'create'} sub-category:`, errorMessage);
        console.error(`❌ [MenuScreen] Response Status: ${response.status}, Error Status: ${errorStatus}`);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error(`❌ [MenuScreen] Error ${editingSubCategory ? 'updating' : 'creating'} sub-category:`, error);
      showToast(`Failed to ${editingSubCategory ? 'update' : 'create'} sub-category`, 'error');
    } finally {
      setSelectedCategoryId(null);
    }
  };

  const handleSubCategoryMenu = (subCategoryId) => {
    // Toggle menu - if already open for this subcategory, close it; otherwise open it
    setOpenSubCategoryMenuId(openSubCategoryMenuId === subCategoryId ? null : subCategoryId);
  };

  const handleEditSubCategory = (categoryId, subCategoryId) => {
    const category = categories.find(c => c.id === categoryId);
    const subCategory = category?.subCategories.find(sc => sc.id === subCategoryId);
    if (subCategory) {
      setEditingSubCategory({ ...subCategory, categoryId });
      setSelectedCategoryId(categoryId);
      setOpenSubCategoryMenuId(null);
      setShowCreateSubCategoryModal(true);
    }
  };

  const handleDeleteSubCategory = (categoryId, subCategoryId) => {
    const category = categories.find(c => c.id === categoryId);
    const subCategory = category?.subCategories.find(sc => sc.id === subCategoryId);
    if (subCategory) {
      Alert.alert(
        'Delete Sub-Category',
        `Are you sure you want to delete "${subCategory.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setOpenSubCategoryMenuId(null) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const url = `${API_BASE_URL}v1/catalog/categories/${categoryId}/subcategories/${subCategoryId}`;
                
                const response = await fetchWithAuth(url, {
                  method: 'DELETE',
                });

                const data = await response.json();

                // Check for success response format: { code: 200, status: 'success' }
                const isSuccess = response.ok && data.code === 200 && data.status === 'success';
                
                if (isSuccess) {
                  showToast('Sub-category deleted successfully', 'success');
                  setOpenSubCategoryMenuId(null);
                  // Refresh categories list (reset pagination)
                  setCurrentPage(1);
                  setHasNext(true);
                  await fetchCategories(1, false);
                } else {
                  // Handle different error response formats
                  const errorMessage = data.message || data.error || 'Failed to delete sub-category';
                  const errorStatus = data.status || response.status;
                  console.error('❌ [MenuScreen] Failed to delete sub-category:', errorMessage);
                  console.error(`❌ [MenuScreen] Response Status: ${response.status}, Error Status: ${errorStatus}`);
                  showToast(errorMessage, 'error');
                  setOpenSubCategoryMenuId(null);
                }
              } catch (error) {
                console.error('❌ [MenuScreen] Error deleting sub-category:', error);
                showToast('Failed to delete sub-category', 'error');
                setOpenSubCategoryMenuId(null);
              }
            },
          },
        ]
      );
    }
  };

  const handlePhotoPress = (categoryId, itemId) => {
    // Find the item to get its name
    const category = categories.find(c => c.id === categoryId);
    const item = category?.items.find(i => i.id === itemId);
    
    setSelectedCategoryId(categoryId);
    setSelectedItemId(itemId);
    setSelectedItemName(item?.name || 'Item');
    setShowItemImageTiming(true);
  };

  const handleSelectGallery = async () => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2000,
        maxHeight: 2000,
        selectionLimit: 1,
      };

      const result = await launchImageLibrary(options);
      
      if (result.didCancel) {
        // User cancelled - just reset state
        setSelectedCategoryId(null);
        setSelectedItemId(null);
        return;
      }
      
      if (result.errorMessage) {
        showToast(result.errorMessage, 'error');
        setSelectedCategoryId(null);
        setSelectedItemId(null);
        return;
      }

      if (result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Update the item with the selected image using Redux
        dispatch(updateItem({
          categoryId: selectedCategoryId,
          itemId: selectedItemId,
          updates: { image: imageUri }
        }));
        
        showToast('Photo selected from gallery', 'success');
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      showToast('Failed to select image from gallery', 'error');
    } finally {
      // Reset state
      setSelectedCategoryId(null);
      setSelectedItemId(null);
    }
  };

  const handleSelectCamera = async () => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2000,
        maxHeight: 2000,
        saveToPhotos: true,
      };

      const result = await launchCamera(options);
      
      if (result.didCancel) {
        // User cancelled - just reset state
        setSelectedCategoryId(null);
        setSelectedItemId(null);
        return;
      }
      
      if (result.errorMessage) {
        showToast(result.errorMessage, 'error');
        setSelectedCategoryId(null);
        setSelectedItemId(null);
        return;
      }

      if (result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Update the item with the captured image using Redux
        dispatch(updateItem({
          categoryId: selectedCategoryId,
          itemId: selectedItemId,
          updates: { image: imageUri }
        }));
        
        showToast('Photo captured successfully', 'success');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showToast('Failed to take photo', 'error');
    } finally {
      // Reset state
      setSelectedCategoryId(null);
      setSelectedItemId(null);
    }
  };

  const handleEditItem = (categoryId, itemId, searchResultItem = null) => {
    let item = null;
    
    // If search result item is provided, use it directly
    if (searchResultItem) {
      item = searchResultItem;
      // Map search result item to the format expected by ItemDetailsScreen
      item = {
        ...searchResultItem,
        isVeg: searchResultItem.item_type === 'VEG',
        packagingPrice: searchResultItem.packaging_price || 0,
        gst: searchResultItem.gst_rate ? (searchResultItem.gst_rate.replace('GST_', '') || '0') + '%' : '0%',
        image: searchResultItem.image_urls && searchResultItem.image_urls.length > 0
          ? (searchResultItem.image_urls.length > 1 
              ? searchResultItem.image_urls[searchResultItem.image_urls.length - 1] 
              : searchResultItem.image_urls[0])
          : null,
        image_urls: searchResultItem.image_urls || [],
        variants: searchResultItem.variants || [],
        add_ons: searchResultItem.add_ons || [],
        sub_category_id: searchResultItem.sub_category_id || null,
      };
    } else {
      // Find the item from categories
      const category = categories.find(c => c.id === categoryId);
      item = category?.items.find(i => i.id === itemId);
    }
    
    if (item) {
      
      // Set up editing state - ensure variants are included
      const editingItemData = {
        ...item,
        categoryId: categoryId,
        variants: item.variants || [], // Explicitly include variants
      };
      setEditingItem(editingItemData);
      setSelectedCategoryId(categoryId);
      setSelectedItemId(itemId);
      setShowItemDetails(true);
    } else {
      console.error('❌ [MenuScreen] Item not found for editing');
    }
  };

  const handleCategoryMenu = (categoryId) => {
    // Toggle menu - if already open for this category, close it; otherwise open it
    const newMenuId = openCategoryMenuId === categoryId ? null : categoryId;
    setOpenCategoryMenuId(newMenuId);
  };

  const handleEditCategory = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditingCategory(category);
      setOpenCategoryMenuId(null);
      setShowCreateCategoryModal(true);
    } else {
      console.error('❌ [MenuScreen] Category not found for editing');
    }
  };

  const handleDeleteCategory = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      Alert.alert(
        'Delete Category',
        `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setOpenCategoryMenuId(null) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const url = `${API_BASE_URL}v1/catalog/categories/${categoryId}`;
                
                const response = await fetchWithAuth(url, {
                  method: 'DELETE',
                });

                const data = await response.json();

                // Check for success response format: { code: 200, status: 'success' }
                const isSuccess = response.ok && data.code === 200 && data.status === 'success';
                
                if (isSuccess) {
                  showToast('Category deleted successfully', 'success');
                  setOpenCategoryMenuId(null);
                  // Refresh categories list (reset pagination)
                  setCurrentPage(1);
                  setHasNext(true);
                  await fetchCategories(1, false);
                } else {
                  // Handle different error response formats
                  const errorMessage = data.message || data.error || 'Failed to delete category';
                  const errorStatus = data.status || response.status;
                  console.error('❌ [MenuScreen] Failed to delete category:', errorMessage);
                  console.error(`❌ [MenuScreen] Response Status: ${response.status}, Error Status: ${errorStatus}`);
                  showToast(errorMessage, 'error');
                  setOpenCategoryMenuId(null);
                }
              } catch (error) {
                console.error('❌ [MenuScreen] Error deleting category:', error);
                showToast('Failed to delete category', 'error');
                setOpenCategoryMenuId(null);
              }
            },
          },
        ]
      );
    }
  };

  const handleCreateAddon = () => {
    setShowCreateAddonModal(true);
  };

  const handleSaveAddon = async (addonData) => {
    try {
      const url = `${API_BASE_URL}v1/catalog/addons`;

      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(addonData),
      });

      const data = await response.json();

      if (response.ok && data.code === 201 && data.status === 'success') {
        showToast('Add-on created successfully', 'success');
        
        // Trigger refresh of add-ons list
        setAddonsRefreshTrigger(prev => prev + 1);
      } else {
        // Handle error responses (409, 400, etc.)
        const errorMessage = data.message || data.error || 'Failed to create add-on';
        console.error('❌ [MenuScreen] Failed to create add-on:', errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ [MenuScreen] Error creating add-on:', error);
      showToast('Failed to create add-on', 'error');
    }
  };

  const handleSaveItemImageTiming = async (imageTimingData) => {
    
    if (!selectedItemId) {
      console.error('❌ [MenuScreen] Item ID is missing');
      showToast('Item ID is missing', 'error');
      return;
    }

    try {
      
      // Get the updated item data from the response
      const updatedItemData = imageTimingData?.itemData;
      // Try multiple possible locations for image URLs
      const imageUrls = imageTimingData?.imageUrls || 
                       updatedItemData?.image_urls || 
                       updatedItemData?.imageUrls || 
                       [];
      
      
      // Store item ID and category ID before closing screen
      const itemIdToUpdate = selectedItemId;
      const categoryIdToUpdate = selectedCategoryId;
      
      // Close the screen first
      setShowItemImageTiming(false);
      setSelectedCategoryId(null);
      setSelectedItemId(null);
      setSelectedItemName(null);
      
      // Optimistically update the local state with new images immediately using Redux
      if (imageUrls.length > 0 && categoryIdToUpdate && itemIdToUpdate) {
        // Use the last image URL (most recently uploaded) or first if only one
        const imageToShow = imageUrls.length > 1 ? imageUrls[imageUrls.length - 1] : imageUrls[0];
        
        dispatch(updateItem({
          categoryId: categoryIdToUpdate,
          itemId: itemIdToUpdate,
          updates: {
            image: imageToShow,
            image_urls: imageUrls,
          }
        }));
      } else {
        console.warn('⚠️ [MenuScreen] Could not update item image - missing data:', {
          imageUrls: imageUrls.length,
          categoryId: categoryIdToUpdate,
          itemId: itemIdToUpdate,
        });
      }
      
      // Show success message
      showToast('Item images uploaded successfully', 'success');
      
      // Refresh categories in background to ensure sync with backend
      // Add a delay to ensure backend has processed the uploads and optimistic update is visible
      setTimeout(async () => {
        dispatch(resetPagination());
        setPageCounter(1);
        await fetchCategories(1, false);
      }, 2000); // Increased delay to ensure optimistic update is visible first
    } catch (error) {
      console.error('❌ [MenuScreen] Error saving item image and timing:', error);
      console.error('❌ [MenuScreen] Error stack:', error.stack);
      showToast('Failed to save item images and timing', 'error');
    }
  };

  // Show ItemImageTimingScreen when adding/editing item images
  if (showItemImageTiming) {
    return (
      <ItemImageTimingScreen
        itemId={selectedItemId}
        itemName={selectedItemName}
        onBack={() => {
          setShowItemImageTiming(false);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setSelectedItemName(null);
        }}
        onSave={handleSaveItemImageTiming}
      />
    );
  }

  // Show AddQuantityScreen when configuring quantity variant
  if (showAddQuantity) {
    
    // Get the latest item data from categories to ensure we have updated variants
    let latestItemData = pendingItemData || editingItem;
    
    if (selectedItemId && selectedCategoryId) {
      const category = categories.find(c => c.id === selectedCategoryId);
      const latestItem = category?.items.find(i => i.id === selectedItemId);
      
      if (latestItem) {
        // Always use the latest item from categories to ensure we have the most recent variants
        latestItemData = {
          ...latestItem,
          categoryId: selectedCategoryId,
          variants: latestItem.variants || [], // Explicitly include variants array
        };
      } else {
        console.warn('⚠️ [MenuScreen] Latest item not found in categories for ID:', selectedItemId);
      }
    } else {
    }
    
      variantType: currentVariantConfig?.variantType,
      variantTitle: currentVariantConfig?.variantTitle,
      hasItemData: !!latestItemData,
      hasConfigData: !!configData,
    });
    
    return (
      <AddQuantityScreen
        onBack={() => {
          setShowAddQuantity(false);
          setCurrentVariantConfig(null);
          // Go back to variants/addons screen
          setShowItemVariantsAndAddons(true);
        }}
        onSave={async (variantData) => {
          // Variant is already saved by AddQuantityScreen, just refresh categories
          // Refresh categories to get updated item with variants (reset pagination)
          dispatch(resetPagination());
          setPageCounter(1);
          await fetchCategories(1, false);
          setShowAddQuantity(false);
          setCurrentVariantConfig(null);
          setShowItemVariantsAndAddons(true);
        }}
        onDelete={async () => {
          // Variant is already deleted by AddQuantityScreen, refresh categories
          // Refresh categories to get updated item without the deleted variant (reset pagination)
          setCurrentPage(1);
          setHasNext(true);
          await fetchCategories(1, false);
        }}
        variantType={currentVariantConfig?.variantType}
        variantTitle={currentVariantConfig?.variantTitle}
        itemData={latestItemData}
        configData={configData}
      />
    );
  }

  // Show AddOnsSelectionScreen when selecting add-ons to link
  if (showAddOnsSelection) {
    
    return (
      <AddOnsSelectionScreen
        onBack={() => {
          // Go back to AddAddonsScreen
          setShowAddOnsSelection(false);
          setShowAddAddons(true);
        }}
        onSave={async (updatedItemData) => {
          // Add-ons linked successfully
          showToast('Add-ons linked successfully', 'success');
          // Update the item data so AddAddonsScreen can show the updated linked add-ons
          if (updatedItemData) {
            setEditingItem(updatedItemData);
            setPendingItemData(updatedItemData);
            // Refresh categories in background to keep them in sync
            setCurrentPage(1);
            setHasNext(true);
            await fetchCategories(1, false);
          }
          // Go back to AddAddonsScreen instead of MenuScreen
          setShowAddOnsSelection(false);
          setShowAddAddons(true);
        }}
        itemData={pendingItemData || editingItem}
        customizationData={currentVariantConfig?.customizationData}
      />
    );
  }

  // Show AddAddonsScreen when configuring add-ons
  if (showAddAddons) {
    
    // Prioritize fresh data from API (pendingItemData/editingItem) over stale categories data
    let latestItemData = pendingItemData || editingItem;
    
    // Only use categories data if we don't have fresh data from API
    if (!latestItemData && selectedItemId && selectedCategoryId) {
      const category = categories.find(c => c.id === selectedCategoryId);
      const latestItem = category?.items.find(i => i.id === selectedItemId);
      
      if (latestItem) {
        latestItemData = {
          ...latestItem,
          categoryId: selectedCategoryId,
          add_ons: latestItem.add_ons || [], // Explicitly include add_ons array
        };
      } else {
        console.warn('⚠️ [MenuScreen] Latest item not found in categories for ID:', selectedItemId);
      }
    } else if (latestItemData) {
    } else {
    }
    
    return (
      <AddAddonsScreen
        configData={configData}
        onBack={() => {
          setShowAddAddons(false);
          setCurrentVariantConfig(null);
          // Go back to variants/addons screen
          setShowItemVariantsAndAddons(true);
        }}
        onNavigate={(type, config) => {
          if (type === 'addonsSelection') {
            setCurrentVariantConfig({
              ...currentVariantConfig,
              customizationData: config.customizationData,
            });
            setShowAddAddons(false);
            setShowAddOnsSelection(true);
          } else {
          }
        }}
        onItemDataUpdate={async (updatedItemData) => {
          // Update item data when add-ons are linked
          if (updatedItemData) {
            setEditingItem(updatedItemData);
            setPendingItemData(updatedItemData);
            // Refresh categories in background to keep them in sync
            setCurrentPage(1);
            setHasNext(true);
            await fetchCategories(1, false);
          } else {
            console.warn('⚠️ [MenuScreen] onItemDataUpdate called with no data');
          }
        }}
        onDelete={async () => {
          // Add-on is already deleted by AddAddonsScreen, refresh categories
          // Refresh categories to get updated item without the deleted add-on (reset pagination)
          setCurrentPage(1);
          setHasNext(true);
          await fetchCategories(1, false);
        }}
        onSave={async (addonData) => {
          // TODO: Save addon data to backend
          showToast('Add-on configuration saved successfully', 'success');
          // Refresh categories to get updated item with add-ons (reset pagination)
          setCurrentPage(1);
          setHasNext(true);
          await fetchCategories(1, false);
          
          // Reset all states
          setShowAddAddons(false);
          setCurrentVariantConfig(null);
          setShowItemVariantsAndAddons(false);
          setShowItemDetails(false);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
          setPendingItemData(null);
          
          // Navigate to OrdersScreen
          if (onNavigateToOrders) {
            onNavigateToOrders();
          } else {
          }
        }}
        addonType={currentVariantConfig?.addonType}
        addonTitle={currentVariantConfig?.addonTitle}
        itemData={latestItemData}
      />
    );
  }

  // Show ItemVariantsAndAddonsScreen when configuring variants/add-ons
  if (showItemVariantsAndAddons) {
    
    return (
      <ItemVariantsAndAddonsScreen
        onBack={() => {
          // Navigate directly to MenuScreen - reset all states
          setShowItemVariantsAndAddons(false);
          setPendingItemData(null);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
          setShowItemDetails(false);
        }}
        onNext={() => {
          // TODO: Handle final save/navigation
          setShowItemVariantsAndAddons(false);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
          setPendingItemData(null);
        }}
        onNavigate={async (type, config) => {
          // Navigate to appropriate screen based on type
          if (type === 'variant') {
            
            // Refresh item data from categories to ensure we have latest variants
            // Note: We'll get the latest item data in the AddQuantityScreen render section
            setCurrentVariantConfig(config);
            setShowItemVariantsAndAddons(false);
            setShowAddQuantity(true);
          } else if (type === 'addon') {
            setCurrentVariantConfig(config);
            setShowItemVariantsAndAddons(false);
            setShowAddAddons(true);
          } else {
            console.warn('⚠️ [MenuScreen] Unknown navigation type:', type);
          }
        }}
        itemData={pendingItemData || editingItem}
        configData={configData}
      />
    );
  }

  // Show ItemDetailsScreen when adding/editing an item
  if (showItemDetails) {
    const subCategories = categories.find(c => c.id === selectedCategoryId)?.subCategories || [];
    
    return (
      <ItemDetailsScreen
        onBack={() => {
          setShowItemDetails(false);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
        }}
        categoryId={selectedCategoryId}
        onSave={handleSaveItem}
        onNext={handleNavigateToVariants}
        itemData={editingItem}
        subCategories={subCategories}
      />
    );
  }

  
  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.paperPlaneIcon}>
            <Image
              source={icons.cooking}
              style={styles.cookingIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.restaurantName}>
              {configData?.partner_info?.business_name || (!isLoadingConfigData ? 'Restaurant Name' : '')}
            </Text>
            <View style={styles.statusContainer}>
              <Text style={styles.onlineText}>
                {configData?.partner_info?.online_status || (!isLoadingConfigData ? 'Online' : '')}
              </Text>
              {!isLoadingConfigData && (
                <>
                  <Text style={styles.statusDot}>•</Text>
                  <Text style={styles.closingText}>
                    {configData?.partner_info?.closing_info || 'Closes at 12:00 am, Tomorrow'}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* <TouchableOpacity style={styles.searchButton} activeOpacity={0.7}>
            <Image
              source={icons.search}
              style={styles.headerSearchIcon}
              resizeMode="contain"
            />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Main Content Card */}
      <View style={styles.contentCard}>
        {/* Menu Items / Add-ons Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'menuItems' ? styles.activeTab : styles.inactiveTab,
            ]}
            onPress={() => {
              setActiveTab('menuItems');
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                activeTab === 'menuItems' ? styles.activeTabText : styles.inactiveTabText,
              ]}
            >
              Menu Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'addons' ? styles.activeTab : styles.inactiveTab,
            ]}
            onPress={() => {
              setActiveTab('addons');
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                activeTab === 'addons' ? styles.activeTabText : styles.inactiveTabText,
              ]}
            >
              Add-ons
            </Text>
          </TouchableOpacity>
          <View style={styles.createCategoryButton}>
            <TouchableOpacity
              onPress={activeTab === 'addons' ? handleCreateAddon : handleCreateCategory}
              activeOpacity={0.7}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text style={styles.createCategoryText}>
                {activeTab === 'addons' ? '+ Create New Addon' : '+ Create Category'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Conditional Content Based on Active Tab */}
        {activeTab === 'addons' ? (
          <AddOnsScreen onCreateAddon={handleCreateAddon} onRefresh={addonsRefreshTrigger} />
        ) : (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search For Items"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
              />
              <TouchableOpacity style={styles.searchIconContainer} activeOpacity={0.7}>
                <Image
                  source={icons.search}
                  style={styles.searchIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Categories List / Search Results */}
            <View style={styles.categoriesListContainer}>
              {/* Show search results if searching */}
              {searchQuery && searchQuery.trim().length > 0 ? (
                isSearching ? (
                  <View style={styles.emptyStateContainer}>
                    <Image
                      source={icons.pan}
                      style={styles.panImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                ) : searchResults && searchResults.menu_items.length > 0 ? (
                  <View style={styles.searchResultsContainer}>
                    <View style={styles.searchResultsHeader}>
                      <Text style={styles.searchResultsTitle}>
                        {searchResults.total_results} result{searchResults.total_results !== 1 ? 's' : ''} for "{searchResults.search_query}"
                      </Text>
                    </View>
                    <FlatList
                      data={searchResults.menu_items}
                      renderItem={({ item }) => renderSearchResultItem(item)}
                      keyExtractor={(item) => item.id.toString()}
                      style={styles.categoriesList}
                      contentContainerStyle={styles.categoriesListContent}
                      showsVerticalScrollIndicator={false}
                      removeClippedSubviews={true}
                      maxToRenderPerBatch={10}
                      updateCellsBatchingPeriod={50}
                      initialNumToRender={10}
                      windowSize={10}
                    />
                  </View>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Image
                      source={icons.pan}
                      style={styles.panImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.noCategoriesText}>No results found</Text>
                    <Text style={styles.noItemsText}>Try searching with different keywords</Text>
                  </View>
                )
              ) : isLoading ? (
                <View style={styles.emptyStateContainer}>
                  <Image
                    source={icons.pan}
                    style={styles.panImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : categories.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Image
                    source={icons.pan}
                    style={styles.panImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.noCategoriesText}>No Categories!</Text>
                </View>
              ) : (
                <FlatList
                  data={categories}
                  renderItem={renderCategoryItem}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.categoriesList}
                  contentContainerStyle={styles.categoriesListContent}
                  showsVerticalScrollIndicator={false}
                  onEndReached={handleEndReached}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={renderListFooter}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={10}
                  windowSize={10}
                />
              )}
            </View>
          </>
        )}
      </View>

      {/* Create/Edit Category Modal */}
      <CreateCategoryBottomSheet
        visible={showCreateCategoryModal}
        onClose={() => {
          setShowCreateCategoryModal(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        categoryData={editingCategory}
      />

      {/* Create Sub-Category Modal */}
      <CreateSubCategoryBottomSheet
        visible={showCreateSubCategoryModal}
        onClose={() => {
          setShowCreateSubCategoryModal(false);
          setSelectedCategoryId(null);
          setEditingSubCategory(null);
        }}
        onSave={handleSaveSubCategory}
        categoryName={categories.find(c => c.id === selectedCategoryId)?.name || ''}
        subCategoryData={editingSubCategory}
      />

      {/* Add Photo Modal */}
      <AddPhotoBottomSheet
        visible={showAddPhotoModal}
        onClose={() => {
          setShowAddPhotoModal(false);
          // Don't reset state here - handlers will do it after image selection
        }}
        onSelectGallery={handleSelectGallery}
        onSelectCamera={handleSelectCamera}
      />

      {/* Create Add-on Modal */}
      <CreateAddonBottomSheet
        visible={showCreateAddonModal}
        onClose={() => setShowCreateAddonModal(false)}
        onSave={handleSaveAddon}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paperPlaneIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cookingIcon: {
    width: 24,
    height: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  restaurantName: {
    fontFamily: Poppins.semiBold,
    fontSize: 18,
    color: '#000000',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#4CAF50',
    marginRight: 4,
  },
  statusDot: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginHorizontal: 4,
  },
  closingText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSearchIcon: {
    width: 24,
    height: 24,
    tintColor: '#666666',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginRight: 8,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#D4A574', // Golden-brown color from image
  },
  inactiveTab: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inactiveTabText: {
    fontFamily: Poppins.medium,
    fontSize: 11,
    color: '#000000',
    textAlign: 'center',
  },
  activeTabText: {
    fontFamily: Poppins.medium,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  createCategoryButton: {
    marginLeft: 'auto',
    paddingVertical: 2,
  },
  createCategoryText: {
    fontFamily: Poppins.medium,
    fontSize: 11,
    color: '#FF6E1A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 8,
    marginBottom: 12,
    height: 40,
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
  categoriesListContainer: {
    flex: 1,
  },
  categoriesList: {
    flex: 1,
  },
  categoriesListContent: {
    paddingBottom: 0,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    fontFamily: Poppins.semiBold,
    fontSize: 16,
    color: '#000000',
    marginRight: 8,
  },
  expandIcon: {
    width: 16,
    height: 16,
    tintColor: '#000000',
  },
  expandIconUp: {
    transform: [{ rotate: '180deg' }],
  },
  categoryMenuButton: {
    padding: 8,
    marginLeft: 8,
  },
  threeDots: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 16,
    width: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
  },
  menuButtonContainer: {
    position: 'relative',
  },
  categoryMenuBox: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  menuOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuOptionText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  menuOptionTextDelete: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#FF4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 0,
  },
  categoryContent: {
    paddingLeft: 0,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addItemIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Poppins.semiBold,
    lineHeight: 20,
  },
  addItemText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 10,
  },
  addSubCategoryButton: {
    marginBottom: 12,
  },
  addSubCategoryText: {
    fontFamily: Poppins.medium,
    fontSize: 12,
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
    width: '100%',
  },
  photoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  photoPlaceholderText: {
    fontFamily: Poppins.regular,
    fontSize: 9,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  photoAddIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    // backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddIconText: {
      color: '#666666',
    fontSize: 12,
    fontFamily: Poppins.semiBold,
    lineHeight: 14,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 60,
    paddingRight: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    width: '100%',
  },
  itemNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    flexShrink: 1,
  },
  vegIndicator: {
    width: 14,
    height: 14,
    borderRadius: 2,
    marginRight: 8,
    flexShrink: 0,
  },
  vegIndicatorGreen: {
    backgroundColor: '#4CAF50',
  },
  vegIndicatorOrange: {
    backgroundColor: '#FF6E1A',
  },
  itemName: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
    flex: 1,
    flexShrink: 1,
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#000000',
  },
  editInfoText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#FF6E1A',
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  panImage: {
    width: 200,
    height: 200,
  },
  noCategoriesText: {
    fontFamily: Poppins.semiBold,
    fontSize: 20,
    color: '#000000',
  },
  noItemsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noItemsText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#999999',
  },
  subCategoriesContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  subCategoryItem: {
    marginBottom: 8,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  subCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  subCategoryHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  subCategoryName: {
    fontFamily: Poppins.semiBold,
    fontSize: 15,
    color: '#000000',
    marginBottom: 2,
  },
  subCategoryDescription: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  subCategoryItemsContainer: {
    marginTop: 4,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    fontFamily: Poppins.regular,
    fontSize: 14,
    color: '#666666',
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfListText: {
    fontFamily: Poppins.regular,
    fontSize: 12,
    color: '#999999',
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchResultsHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  searchResultsTitle: {
    fontFamily: Poppins.medium,
    fontSize: 14,
    color: '#666666',
  },
  searchResultCategory: {
    fontFamily: Poppins.regular,
    fontSize: 11,
    color: '#999999',
    marginTop: 2,
  },
});

export default MenuScreen;
