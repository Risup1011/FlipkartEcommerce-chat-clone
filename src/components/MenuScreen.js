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
  ActivityIndicator,
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

const MenuScreen = ({ partnerStatus, onNavigateToOrders, resetNavigationTrigger, configData: configDataProp }) => {
  console.log('🚀 [MenuScreen] Component rendered');
  console.log('🚀 [MenuScreen] Props:', { partnerStatus, hasOnNavigateToOrders: !!onNavigateToOrders, resetNavigationTrigger });
  
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
  
  console.log('📊 [MenuScreen] Redux state:', {
    categoriesCount: categories?.length || 0,
    currentPage,
    hasNext,
    isLoading,
    isLoadingMore,
    isRefreshing,
    lastFetchedPage,
  });
  
  // Log item states whenever categories change
  useEffect(() => {
    console.log('📊 [MenuScreen] Categories changed, logging item states:');
    categories.forEach(cat => {
      cat.items?.forEach(item => {
        console.log(`  - ${item.name} (${item.id}): is_active = ${item.is_active}`);
      });
    });
  }, [categories]);
  
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
  // Use ref to cache configData across navigation to prevent flicker
  const configDataCacheRef = useRef(null);
  
  const [configData, setConfigData] = useState(() => {
    // Initialize cache with prop if provided
    if (configDataProp && !configDataCacheRef.current) {
      configDataCacheRef.current = configDataProp;
    }
    // Initialize with prop if provided, otherwise use cache, otherwise null
    return configDataProp || configDataCacheRef.current || null;
  });
  const [isLoadingConfigData, setIsLoadingConfigData] = useState(() => {
    // Only show loading if we don't have prop, cache, or state
    const hasData = configDataProp || configDataCacheRef.current;
    return !hasData;
  });
  const [togglingItems, setTogglingItems] = useState(new Set()); // Track items being toggled
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState(null); // Track which category menu is open
  const [editingCategory, setEditingCategory] = useState(null); // Track category being edited
  const [openSubCategoryMenuId, setOpenSubCategoryMenuId] = useState(null); // Track which subcategory menu is open
  const [editingSubCategory, setEditingSubCategory] = useState(null); // Track subcategory being edited
  const [pageCounter, setPageCounter] = useState(1); // Counter for pagination - increments on each onEndReached
  const [searchResults, setSearchResults] = useState(null); // Store search results
  const [isSearching, setIsSearching] = useState(false); // Track search loading state
  const searchTimeoutRef = useRef(null); // Store timeout for debouncing
  const hasLoadedOnceRef = useRef(false); // Track if we've loaded data at least once
  const isFirstMountRef = useRef(true); // Track if this is the first mount
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    // Only show loading if we don't have categories yet (first time or no data)
    // If categories exist in Redux, we already have data, so don't show loader
    return categories.length === 0;
  }); // Track initial load
  
  // console.log('📱 [MenuScreen] Local state:', {
  //   activeTab,
  //   searchQuery,
  //   showCreateCategoryModal,
  //   showCreateSubCategoryModal,
  //   showAddPhotoModal,
  //   showItemDetails,
  //   showItemImageTiming,
  //   showItemVariantsAndAddons,
  //   showAddQuantity,
  //   showAddAddons,
  //   showAddOnsSelection,
  //   showCreateAddonModal,
  //   hasPendingItemData: !!pendingItemData,
  //   hasCurrentVariantConfig: !!currentVariantConfig,
  //   addonsRefreshTrigger,
  //   selectedCategoryId,
  //   selectedItemId,
  //   selectedItemName,
  //   hasEditingItem: !!editingItem,
  //   hasConfigData: !!configData,
  //   isLoadingConfigData,
  //   togglingItemsCount: togglingItems.size,
  //   openCategoryMenuId,
  //   hasEditingCategory: !!editingCategory,
  //   openSubCategoryMenuId,
  //   hasEditingSubCategory: !!editingSubCategory,
  //   pageCounter,
  //   hasSearchResults: !!searchResults,
  //   isSearching,
  // });

  // Reset navigation state when resetNavigationTrigger changes (when bottom tab is clicked)
  useEffect(() => {
  // console.log('🔄 [MenuScreen] resetNavigationTrigger effect triggered:', resetNavigationTrigger);
    if (resetNavigationTrigger) {
  // console.log('🔄 [MenuScreen] Resetting navigation state due to bottom tab click');
      // Reset all nested navigation states
  // console.log('🔄 [MenuScreen] Resetting all navigation states');
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
  // console.log('✅ [MenuScreen] All navigation states reset');
      // Clear search if needed
      // setSearchQuery(''); // Keep search query as user might want to keep it
      // setSearchResults(null); // Keep search results as user might want to keep them
    }
  }, [resetNavigationTrigger]);

  // Load cached data on mount
  useEffect(() => {
    console.log('💾 [MenuScreen] ========================================');
    console.log('💾 [MenuScreen] LOADING CACHED DATA EFFECT TRIGGERED');
    console.log('💾 [MenuScreen] ========================================');
    
    // Check if we already have categories in Redux (from previous navigation)
    // This check happens immediately to prevent showing loader if data exists
    if (categories.length > 0) {
      console.log('📋 [MenuScreen] Already have categories in Redux, skipping initial loading');
      setIsInitialLoading(false);
      hasLoadedOnceRef.current = true;
      isFirstMountRef.current = false;
      return;
    }
    
    // If we've loaded before (but data was cleared), don't show loader on subsequent mounts
    if (hasLoadedOnceRef.current && !isFirstMountRef.current) {
      console.log('📋 [MenuScreen] Already loaded before, skipping initial loading');
      setIsInitialLoading(false);
      return;
    }
    
    // Only show loader on first mount when we don't have data
    if (!isFirstMountRef.current) {
      setIsInitialLoading(false);
      return;
    }
    
    // Keep initial loading true for first mount - will be cleared after cache check or fetch
    const loadCachedData = async () => {
      console.log('💾 [MenuScreen] Starting to load cached data');
      const cached = await loadMenuDataFromStorage();
      console.log('💾 [MenuScreen] Cached data retrieved:', {
        hasCached: !!cached,
        categoriesCount: cached?.categories?.length || 0,
        lastPage: cached?.lastPage,
      });
      if (cached && cached.categories && cached.categories.length > 0) {
        console.log('📥 [MenuScreen] Loading cached data, last page:', cached.lastPage);
        console.log('📥 [MenuScreen] Item states from CACHE:');
        cached.categories.forEach(cat => {
          cat.items?.forEach(item => {
            console.log(`  - ${item.name} (${item.id}): is_active = ${item.is_active}`);
          });
        });
        dispatch(setCategories(cached.categories));
        dispatch(setLastFetchedPage(cached.lastPage));
        dispatch(setCurrentPage(cached.lastPage + 1));
        console.log('✅ [MenuScreen] Cached data loaded successfully into Redux');
        // Clear initial loading if we have cached data
        setIsInitialLoading(false);
        hasLoadedOnceRef.current = true;
        isFirstMountRef.current = false;
      } else {
        console.log('⚠️ [MenuScreen] No cached data found or empty');
        // Keep initial loading true if no cache - will be cleared after fetch
      }
    };
    
    loadCachedData();
    
    // Cleanup on unmount
    return () => {
      console.log('🔴 [MenuScreen] Component unmounting - cleaning up');
      isFirstMountRef.current = false;
    };
  }, [dispatch, categories.length]);

  // Fetch complete catalog from API (categories, subcategories, items, partner info, UI labels)
  const fetchCategories = useCallback(async (page = 1, append = false) => {
    console.log('📡 [MenuScreen] ========================================');
    console.log('📡 [MenuScreen] FETCH CATEGORIES CALLED');
    console.log('📡 [MenuScreen] ========================================');
    console.log('📡 [MenuScreen] Page:', page);
    console.log('📡 [MenuScreen] Append:', append);
    console.log('📡 [MenuScreen] lastFetchedPage:', lastFetchedPage);
    console.log('📡 [MenuScreen] Current categories count before fetch:', categories.length);
    
    // Log current item states before fetch
    if (categories.length > 0) {
      console.log('📡 [MenuScreen] Current item states BEFORE fetch:');
      categories.forEach(cat => {
        cat.items?.forEach(item => {
          console.log(`  - ${item.name} (${item.id}): is_active = ${item.is_active}`);
        });
      });
    }
    
    // Don't show main loading indicator when loading more pages
    if (page === 1 && !append) {
      console.log('📡 [MenuScreen] Setting main loading indicator');
      dispatch(setLoading(true));
    } else {
      console.log('📡 [MenuScreen] Setting loading more indicator');
      dispatch(setLoadingMore(true));
    }
    
    try {
      // Build URL with pagination parameters
      const url = `${API_BASE_URL}v1/catalog/orchestrator/complete-catalog?page=${page}&size=10`;
      console.log('📡 [MenuScreen] Fetching complete catalog from:', url);
      console.log('📡 [MenuScreen] Making API request...');
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });
      console.log('📡 [MenuScreen] API response received:', {
        status: response.status,
        ok: response.ok,
      });

      const data = await response.json();
      console.log('📥 [MenuScreen] Complete Catalog API Response received');
      console.log('📥 [MenuScreen] Response validation:', {
        ok: response.ok,
        code: data.code,
        status: data.status,
        hasData: !!data.data,
        categoriesCount: data.data?.categories?.length || 0,
      });

      if (response.ok && (data.code === 200 || data.code === 201) && data.status === 'success') {
        console.log('✅ [MenuScreen] API response is successful');
        const catalogData = data.data || {};
        const categoriesData = catalogData.categories || [];
        
        // Log item states from API response
        console.log('📥 [MenuScreen] Item states from API response:');
        categoriesData.forEach(catObj => {
          const cat = catObj.category || {};
          const items = catObj.menu_items || [];
          items.forEach(item => {
            console.log(`  - ${item.name} (${item.id}): is_active = ${item.is_active}`);
          });
        });
        
        // Check if there are more pages
        // Try multiple possible response formats for pagination info
        const hasMore = catalogData.has_next !== undefined ? catalogData.has_next : 
                       (catalogData.pagination?.has_next !== undefined ? catalogData.pagination.has_next : 
                       (data.has_next !== undefined ? data.has_next :
                       (data.pagination?.has_next !== undefined ? data.pagination.has_next :
                       (page === 1 && categoriesData.length >= 10)))); // Fallback: assume has more on first page if we got 10+ items
        
        dispatch(setHasNext(hasMore));
        dispatch(setLastFetchedPage(page));
  // console.log('📋 [MenuScreen] Has next page:', hasMore);

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
  // console.log('📋 [MenuScreen] Categories order from backend:');
        categoriesWithData.forEach((cat, index) => {
  // console.log(`  ${index + 1}. ${cat.name} - display_order: ${cat.display_order}, created_at: ${cat.created_at}`);
        });

        // Append or replace categories based on pagination
        let categoriesToSave;
        if (append && page > 1) {
          console.log('📡 [MenuScreen] Appending categories (page > 1)');
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
          console.log('📡 [MenuScreen] Replacing all categories (page 1 or refresh)');
          console.log('📡 [MenuScreen] Categories to set:', categoriesWithData.length);
          console.log('📡 [MenuScreen] Item states AFTER mapping (before Redux update):');
          categoriesWithData.forEach(cat => {
            cat.items?.forEach(item => {
              console.log(`  - ${item.name} (${item.id}): is_active = ${item.is_active}`);
            });
          });
          dispatch(setCategories(categoriesWithData));
          categoriesToSave = categoriesWithData;
          
        }
        
        // Save to AsyncStorage
        console.log('💾 [MenuScreen] Saving to AsyncStorage:', { categoriesCount: categoriesToSave.length, page });
        await saveMenuDataToStorage(categoriesToSave, page);
        console.log('✅ [MenuScreen] Data saved to AsyncStorage');
        
        // Log final state after Redux update
        console.log('📡 [MenuScreen] Categories updated in Redux');
        console.log('📡 [MenuScreen] ========================================');
        
  // console.log('📋 [MenuScreen] Categories loaded:', categoriesWithData.length, 'Total:', append ? 'appended' : categoriesWithData.length);
  // console.log('📋 [MenuScreen] All categories start open by default');

        // Log partner info and UI labels if available (for future use)
        if (catalogData.partner_info) {
  // console.log('📋 [MenuScreen] Partner Info:', catalogData.partner_info);
        }
        if (catalogData.ui_labels) {
  // console.log('📋 [MenuScreen] UI Labels:', catalogData.ui_labels);
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
  // console.log('❌ [MenuScreen] Showing error toast for page 1');
          showToast(data.message || 'Failed to fetch catalog', 'error');
        } else {
  // console.log('⚠️ [MenuScreen] Not showing toast for page > 1');
        }
      }
    } catch (error) {
      console.error('❌ [MenuScreen] Error fetching complete catalog:', error);
      console.error('❌ [MenuScreen] Error stack:', error.stack);
      if (page === 1) {
  // console.log('❌ [MenuScreen] Showing error toast for page 1');
        showToast('Failed to fetch catalog', 'error');
      } else {
  // console.log('⚠️ [MenuScreen] Not showing toast for page > 1');
      }
    } finally {
  // console.log('🏁 [MenuScreen] fetchCategories finally block - resetting loading states');
      dispatch(setLoading(false));
      dispatch(setLoadingMore(false));
      dispatch(setRefreshing(false));
  // console.log('✅ [MenuScreen] Loading states reset');
    }
  }, [showToast, dispatch, lastFetchedPage]);

  // Load next page - increments counter and fetches new page
  const loadNextPage = useCallback(async () => {
  // console.log('📄 [MenuScreen] loadNextPage called:', { hasNext, isLoadingMore, isLoading, pageCounter, lastFetchedPage });
    if (!hasNext || isLoadingMore || isLoading) {
  // console.log('📋 [MenuScreen] Skipping load next page - hasNext:', hasNext, 'isLoadingMore:', isLoadingMore, 'isLoading:', isLoading);
      return;
    }
    
  // console.log('📄 [MenuScreen] Proceeding to load next page');
    // Increment page counter
    const nextCounter = pageCounter + 1;
  // console.log('📄 [MenuScreen] Incrementing page counter:', pageCounter, '->', nextCounter);
    setPageCounter(nextCounter);
    
    // Calculate next page to fetch (start from lastFetchedPage + 1)
    const nextPage = lastFetchedPage + 1;
  // console.log('📋 [MenuScreen] Loading next page - Counter:', nextCounter, 'Page:', nextPage);
    dispatch(setCurrentPage(nextPage));
  // console.log('📋 [MenuScreen] Calling fetchCategories with page:', nextPage, 'append: true');
    await fetchCategories(nextPage, true);
  // console.log('✅ [MenuScreen] loadNextPage completed');
  }, [hasNext, isLoadingMore, isLoading, pageCounter, lastFetchedPage, fetchCategories, dispatch]);

  // Handle end reached for FlatList pagination - increments counter
  const handleEndReached = useCallback(() => {
  // console.log('📜 [MenuScreen] handleEndReached called:', { hasNext, isLoadingMore, isLoading });
    if (hasNext && !isLoadingMore && !isLoading) {
  // console.log('📋 [MenuScreen] End reached - incrementing counter and loading next page');
      loadNextPage();
    } else {
  // console.log('⚠️ [MenuScreen] End reached but conditions not met - skipping load');
    }
  }, [hasNext, isLoadingMore, isLoading, loadNextPage]);

  // Refresh categories (reset pagination)
  const refreshCategories = useCallback(async () => {
  // console.log('🔄 [MenuScreen] refreshCategories called');
    dispatch(setRefreshing(true));
    dispatch(resetPagination());
    setPageCounter(1);
  // console.log('🔄 [MenuScreen] Pagination reset, fetching page 1');
    await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] refreshCategories completed');
  }, [fetchCategories, dispatch]);

  // Fetch categories on mount - only fetch pages that weren't fetched before
  // This effect waits for cache to load before deciding whether to fetch
  useEffect(() => {
    console.log('🎯 [MenuScreen] ========================================');
    console.log('🎯 [MenuScreen] INITIAL FETCH EFFECT TRIGGERED');
    console.log('🎯 [MenuScreen] ========================================');
    console.log('🎯 [MenuScreen] lastFetchedPage:', lastFetchedPage);
    console.log('🎯 [MenuScreen] categories count:', categories.length);
    
    // Early return if we already have categories (from previous navigation)
    if (categories.length > 0) {
      console.log('📋 [MenuScreen] Already have categories, skipping initial fetch');
      setIsInitialLoading(false);
      hasLoadedOnceRef.current = true;
      isFirstMountRef.current = false;
      return;
    }
    
    const initialFetch = async () => {
      try {
        console.log('🎯 [MenuScreen] initialFetch function called');
        console.log('🎯 [MenuScreen] lastFetchedPage:', lastFetchedPage);
        console.log('🎯 [MenuScreen] categories.length:', categories.length);
        
        // If we've already loaded once, don't show initial loading
        if (hasLoadedOnceRef.current) {
          console.log('📋 [MenuScreen] Already loaded before, skipping initial loading');
          setIsInitialLoading(false);
          return;
        }
        
        // Wait a bit to ensure cache loading has completed
        // Cache loading happens in parallel, so we check if data exists
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Re-check after waiting (cache might have loaded)
        const currentLastPage = lastFetchedPage;
        const currentCategoriesCount = categories.length;
        
        console.log('🎯 [MenuScreen] After wait - lastFetchedPage:', currentLastPage);
        console.log('🎯 [MenuScreen] After wait - categories count:', currentCategoriesCount);
        
        // If we have cached data loaded, don't fetch again
        if (currentLastPage > 0 && currentCategoriesCount > 0) {
          console.log('📋 [MenuScreen] Resuming from cached data, last fetched page:', currentLastPage);
          console.log('📋 [MenuScreen] Skipping fetch - using cached data');
          console.log('📋 [MenuScreen] Current categories from cache:', currentCategoriesCount);
          // Log item states from cached categories
          categories.forEach(cat => {
            cat.items?.forEach(item => {
              console.log(`📋 [MenuScreen] Cached item: ${item.name} (${item.id}) - is_active: ${item.is_active}`);
            });
          });
          // Clear initial loading since we have cached data
          setIsInitialLoading(false);
          hasLoadedOnceRef.current = true;
          isFirstMountRef.current = false;
          // Don't fetch again if we already have data
          return;
        }
        
        // First time or no cache - fetch from page 1
        console.log('📋 [MenuScreen] First time load or no cache - fetching from page 1');
        dispatch(resetPagination());
        setPageCounter(1);
        console.log('📋 [MenuScreen] Calling fetchCategories for initial load');
        await fetchCategories(1, false);
        console.log('✅ [MenuScreen] Initial fetch completed');
        hasLoadedOnceRef.current = true;
        isFirstMountRef.current = false;
      } catch (error) {
        console.error('❌ [MenuScreen] Error in initial fetch:', error);
      } finally {
        // Clear initial loading after fetch completes (success or error)
        setIsInitialLoading(false);
        isFirstMountRef.current = false;
      }
    };
    
    initialFetch();
  }, [lastFetchedPage, categories.length, fetchCategories, dispatch]); // Re-run when cache loads

  // Update configData when prop changes
  useEffect(() => {
    if (configDataProp) {
      // Update cache and state
      configDataCacheRef.current = configDataProp;
      setConfigData(configDataProp);
      setIsLoadingConfigData(false);
    }
  }, [configDataProp]);

  // Fetch config data on component mount only if not provided as prop and not cached
  useEffect(() => {
    // If configData is provided as prop or cached, skip fetching
    if (configDataProp || configDataCacheRef.current) {
      return;
    }

    const fetchConfigData = async () => {
      setIsLoadingConfigData(true);
      try {
        const url = `${API_BASE_URL}v1/config`;
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData?.data) {
          // Cache the configData to prevent flicker on next navigation
          configDataCacheRef.current = responseData.data;
          setConfigData(responseData.data);
        } else {
          console.error('❌ [MenuScreen] Failed to load config data:', response.status);
          // Don't clear cache on error, keep using cached data if available
          if (!configDataCacheRef.current) {
            setConfigData(null);
          }
        }
      } catch (error) {
        console.error('❌ [MenuScreen] Error fetching config data:', error);
        // Don't clear cache on error, keep using cached data if available
        if (!configDataCacheRef.current) {
          setConfigData(null);
        }
      } finally {
        setIsLoadingConfigData(false);
      }
    };

    fetchConfigData();
  }, [configDataProp]);

  // Log header data source whenever configData changes
  useEffect(() => {
  // console.log('📋 [MenuScreen] ========================================');
  // console.log('📋 [MenuScreen] HEADER DATA SOURCE CHECK');
  // console.log('📋 [MenuScreen] ========================================');
  // console.log('📋 [MenuScreen] configData exists:', !!configData);
  // console.log('📋 [MenuScreen] partner_info exists:', !!configData?.partner_info);
    
    if (configData?.partner_info) {
  // console.log('✅ [MenuScreen] USING BACKEND DATA for header');
  // console.log('📋 [MenuScreen] Backend partner_info:', JSON.stringify(configData.partner_info, null, 2));
      
      const businessName = configData.partner_info.business_name;
      const onlineStatus = configData.partner_info.online_status;
      const closingInfo = configData.partner_info.closing_info;
      
  // console.log('📋 [MenuScreen] Business Name:', businessName ? `✅ "${businessName}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Restaurant Name"');
  // console.log('📋 [MenuScreen] Online Status:', onlineStatus ? `✅ "${onlineStatus}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Online"');
  // console.log('📋 [MenuScreen] Closing Info:', closingInfo ? `✅ "${closingInfo}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Closes at 12:00 am, Tomorrow"');
    } else {
  // console.log('⚠️  [MenuScreen] USING FRONTEND FALLBACK DATA for header');
  // console.log('📋 [MenuScreen] Business Name: "Restaurant Name" (FALLBACK)');
  // console.log('📋 [MenuScreen] Online Status: "Online" (FALLBACK)');
  // console.log('📋 [MenuScreen] Closing Info: "Closes at 12:00 am, Tomorrow" (FALLBACK)');
    }
  // console.log('📋 [MenuScreen] ========================================');
  }, [configData]);

  // Search API function
  const performSearch = useCallback(async (query) => {
  // console.log('🔍 [MenuScreen] performSearch called with query:', query);
    if (!query || query.trim().length === 0) {
  // console.log('🔍 [MenuScreen] Empty query - clearing search results');
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

  // console.log('🔍 [MenuScreen] Setting isSearching to true');
    setIsSearching(true);
    try {
      const url = `${API_BASE_URL}v1/catalog/orchestrator/search?query=${encodeURIComponent(query.trim())}`;
  // console.log('🔍 [MenuScreen] Searching:', url);
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });
  // console.log('🔍 [MenuScreen] Search API response:', { status: response.status, ok: response.ok });

      const data = await response.json();
  // console.log('🔍 [MenuScreen] Search API Response:', JSON.stringify(data, null, 2));
  // console.log('🔍 [MenuScreen] Response validation:', {
  //   ok: response.ok,
  //   code: data.code,
  //   status: data.status,
  //   hasData: !!data.data,
  // });

      if (response.ok && data.code === 200 && data.status === 'success') {
        const searchData = data.data || {};
        const results = {
          search_query: searchData.search_query || query,
          total_results: searchData.total_results || 0,
          menu_items: searchData.menu_items || [],
        };
  // console.log('✅ [MenuScreen] Search results:', searchData.total_results, 'items found');
  // console.log('✅ [MenuScreen] Setting search results:', results);
        setSearchResults(results);
      } else {
        const errorMessage = data.message || 'Failed to search items';
        console.error('❌ [MenuScreen] Search failed:', errorMessage);
        const emptyResults = {
          search_query: query,
          total_results: 0,
          menu_items: [],
        };
  // console.log('❌ [MenuScreen] Setting empty search results');
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
  // console.log('❌ [MenuScreen] Setting empty search results due to error');
      setSearchResults(emptyResults);
    } finally {
  // console.log('🏁 [MenuScreen] Search finally - setting isSearching to false');
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
  // console.log('🔍 [MenuScreen] Search query changed:', searchQuery);
  // console.log('🔍 [MenuScreen] Current timeout ref:', searchTimeoutRef.current);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
  // console.log('🔍 [MenuScreen] Clearing previous search timeout');
      clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty, clear results
    if (!searchQuery || searchQuery.trim().length === 0) {
  // console.log('🔍 [MenuScreen] Clearing search results - empty query');
      setSearchResults(null);
      setIsSearching(false);
      searchTimeoutRef.current = null;
      return;
    }

  // console.log('🔍 [MenuScreen] Setting up search timeout for:', searchQuery);
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
  // console.log('🔍 [MenuScreen] Executing search for:', searchQuery);
      performSearch(searchQuery);
      searchTimeoutRef.current = null;
  // console.log('✅ [MenuScreen] Search timeout executed and cleared');
    }, 500); // 500ms debounce delay
  // console.log('🔍 [MenuScreen] Search timeout set, ID:', searchTimeoutRef.current);

    // Cleanup function
    return () => {
  // console.log('🧹 [MenuScreen] Search effect cleanup - clearing timeout');
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
  // console.log('🧹 [MenuScreen] Search timeout cleared in cleanup');
      }
    };
  }, [searchQuery, performSearch]);

  // Render function for FlatList category item
  const renderCategoryItem = useCallback(({ item: category }) => {
  // console.log('🎨 [MenuScreen] renderCategoryItem called for category:', category.name);
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
                                    <Image
                                      source={item.isVeg ? icons.veg : icons.nonVeg}
                                      style={styles.vegIcon}
                                      resizeMode="contain"
                                    />
                                    <Text style={styles.itemName} numberOfLines={1}>
                                      {item.name}
                                    </Text>
                                  </View>
                                  <Switch
                                    value={item.is_active}
                                    onValueChange={() => {
                                      console.log('🔘 [MenuScreen] Switch toggled for item:', item.id, item.name);
                                      console.log('🔘 [MenuScreen] Current switch value:', item.is_active);
                                      toggleItemAvailability(category.id, item.id);
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
                      <Image
                        source={item.isVeg ? icons.veg : icons.nonVeg}
                        style={styles.vegIcon}
                        resizeMode="contain"
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
  // console.log('📄 [MenuScreen] renderListFooter called:', { isLoadingMore, hasNext, categoriesCount: categories.length });
    if (isLoadingMore) {
  // console.log('📄 [MenuScreen] Rendering loading more footer');
      return (
        <View style={styles.loadingMoreContainer}>
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }
    if (!hasNext && categories.length > 0) {
  // console.log('📄 [MenuScreen] Rendering end of list footer');
      return (
        <View style={styles.endOfListContainer}>
          <Text style={styles.endOfListText}>No more categories to load</Text>
        </View>
      );
    }
  // console.log('📄 [MenuScreen] No footer to render');
    return null;
  }, [isLoadingMore, hasNext, categories.length]);

  // Render search result item
  const renderSearchResultItem = useCallback((item) => {
  // console.log('🔍 [MenuScreen] renderSearchResultItem called for item:', item.name);
    // Use the last image in the array (most recently uploaded) if available
    const imageUrls = item.image_urls || [];
    const imageToUse = imageUrls.length > 0 
      ? (imageUrls.length > 1 ? imageUrls[imageUrls.length - 1] : imageUrls[0])
      : null;
  // console.log('🔍 [MenuScreen] Search result item image:', imageToUse);

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
              <Image
                source={item.item_type === 'VEG' ? icons.veg : icons.nonVeg}
                style={styles.vegIcon}
                resizeMode="contain"
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
    console.log('🔄 [MenuScreen] ========================================');
    console.log('🔄 [MenuScreen] TOGGLE ITEM AVAILABILITY CALLED');
    console.log('🔄 [MenuScreen] ========================================');
    console.log('🔄 [MenuScreen] Category ID:', categoryId);
    console.log('🔄 [MenuScreen] Item ID:', itemId);
    console.log('🔄 [MenuScreen] Toggling items set size:', togglingItems.size);
    console.log('🔄 [MenuScreen] Is item already toggling?', togglingItems.has(itemId));
    
    // Prevent multiple simultaneous toggles for the same item
    if (togglingItems.has(itemId)) {
      console.log('⚠️ [MenuScreen] Toggle already in progress for item:', itemId);
      return;
    }

    console.log('🔄 [MenuScreen] Getting current categories from Redux store');
    // Get current categories from Redux store to ensure we have latest data
    const currentCategories = categories;
    console.log('🔄 [MenuScreen] Current categories count:', currentCategories.length);
    
    // Find the item to get current status
    const category = currentCategories.find(c => c.id === categoryId);
    if (!category) {
      console.warn('⚠️ [MenuScreen] Category not found:', categoryId);
      return;
    }
    console.log('✅ [MenuScreen] Category found:', category.name);
    
    const item = category.items.find(i => i.id === itemId);
    if (!item) {
      console.warn('⚠️ [MenuScreen] Item not found:', itemId, 'in category:', categoryId);
      return;
    }
    console.log('✅ [MenuScreen] Item found:', item.name);
    console.log('🔄 [MenuScreen] Current item.is_active:', item.is_active);
    console.log('🔄 [MenuScreen] Current item object:', JSON.stringify({
      id: item.id,
      name: item.name,
      is_active: item.is_active,
      price: item.price
    }, null, 2));
    
    const newIsActive = !item.is_active;
    const previousIsActive = item.is_active;
    
    console.log('🔄 [MenuScreen] Toggling item:', itemId);
    console.log('🔄 [MenuScreen] Previous state:', previousIsActive);
    console.log('🔄 [MenuScreen] New state:', newIsActive);
    
    // Mark item as being toggled
    console.log('🔄 [MenuScreen] Adding item to togglingItems set');
    setTogglingItems(prev => new Set(prev).add(itemId));
    
    // Optimistically update UI using Redux
    console.log('🔄 [MenuScreen] Optimistically updating UI with Redux');
    console.log('🔄 [MenuScreen] Dispatching updateItem with:', {
      categoryId,
      itemId,
      updates: { is_active: newIsActive }
    });
    dispatch(updateItem({
      categoryId,
      itemId,
      updates: { is_active: newIsActive }
    }));
    console.log('✅ [MenuScreen] Optimistic update dispatched');

    // Update via API
    try {
      const url = `${API_BASE_URL}v1/catalog/items/${itemId}/status`;
      console.log('📡 [MenuScreen] Updating item status via API:', url);
      const requestBody = { isActive: newIsActive };
      console.log('📤 [MenuScreen] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      console.log('📡 [MenuScreen] API response:', { status: response.status, ok: response.ok });

      const data = await response.json();
      console.log('📥 [MenuScreen] Update Item Status API Response:', JSON.stringify(data, null, 2));
      console.log('📥 [MenuScreen] Response validation:', {
        ok: response.ok,
        code: data.code,
        status: data.status,
        hasData: !!data.data,
        dataIsActive: data.data?.is_active,
      });

      if (response.ok && data.code === 200 && data.status === 'success') {
        console.log('✅ [MenuScreen] Item status updated successfully in backend');
        // Success - update state with API response to ensure sync
        const finalIsActive = data.data?.is_active ?? newIsActive;
        console.log('✅ [MenuScreen] Final is_active value from API:', finalIsActive);
        console.log('✅ [MenuScreen] Dispatching final updateItem with:', {
          categoryId,
          itemId,
          updates: { is_active: finalIsActive }
        });
        dispatch(updateItem({
          categoryId,
          itemId,
          updates: { is_active: finalIsActive }
        }));
        console.log('✅ [MenuScreen] Final update dispatched');
        
        // Update cache immediately after successful toggle to prevent stale data on remount
        // Create updated categories array with the new is_active value
        const updatedCategories = categories.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              items: cat.items.map(item => 
                item.id === itemId 
                  ? { ...item, is_active: finalIsActive }
                  : item
              )
            };
          }
          return cat;
        });
        
        console.log('💾 [MenuScreen] ========================================');
        console.log('💾 [MenuScreen] UPDATING CACHE AFTER SUCCESSFUL TOGGLE');
        console.log('💾 [MenuScreen] ========================================');
        console.log('💾 [MenuScreen] Item ID:', itemId);
        console.log('💾 [MenuScreen] New is_active value:', finalIsActive);
        console.log('💾 [MenuScreen] Updated item in cache:', {
          itemId,
          itemName: updatedCategories.find(c => c.id === categoryId)?.items.find(i => i.id === itemId)?.name,
          is_active: finalIsActive
        });
        
        // Save updated categories to cache
        await saveMenuDataToStorage(updatedCategories, lastFetchedPage);
        console.log('✅ [MenuScreen] Cache updated successfully with new toggle state');
        console.log('💾 [MenuScreen] ========================================');
        
        // Toggle happens silently in the background - no toast notification
      } else {
        console.error('❌ [MenuScreen] API returned error, reverting optimistic update');
        // Revert optimistic update on error
        dispatch(updateItem({
          categoryId,
          itemId,
          updates: { is_active: previousIsActive }
        }));
  // console.log('✅ [MenuScreen] Optimistic update reverted');
        
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
  // console.log('✅ [MenuScreen] Optimistic update reverted due to exception');
      
      console.error('❌ [MenuScreen] Error updating item status:', error);
      console.error('❌ [MenuScreen] Error stack:', error.stack);
      showToast('Failed to update item status', 'error');
    } finally {
  // console.log('🏁 [MenuScreen] Toggle finally - removing item from togglingItems set');
      // Remove item from toggling set
      setTogglingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
  // console.log('🏁 [MenuScreen] Item removed from togglingItems, new size:', next.size);
        return next;
      });
  // console.log('✅ [MenuScreen] toggleItemAvailability completed');
    }
  }, [categories, togglingItems, dispatch, showToast]);

  const handleCreateCategory = () => {
  // console.log('➕ [MenuScreen] handleCreateCategory called');
    setShowCreateCategoryModal(true);
  // console.log('✅ [MenuScreen] Create category modal opened');
  };

  const handleSaveCategory = async (categoryData) => {
  // console.log('💾 [MenuScreen] handleSaveCategory called');
  // console.log('💾 [MenuScreen] Category data:', JSON.stringify(categoryData, null, 2));
  // console.log('💾 [MenuScreen] Editing category:', editingCategory);
    try {
      const isEditing = !!editingCategory;
  // console.log('💾 [MenuScreen] Is editing:', isEditing);
      const url = isEditing 
        ? `${API_BASE_URL}v1/catalog/categories/${editingCategory.id}`
        : `${API_BASE_URL}v1/catalog/categories`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
  // console.log(`📡 [MenuScreen] ${isEditing ? 'Updating' : 'Creating'} category:`, url);
  // console.log('📤 [MenuScreen] Category Data:', JSON.stringify(categoryData, null, 2));
  // console.log('📤 [MenuScreen] Editing Category ID:', isEditing ? editingCategory.id : 'N/A');
  // console.log('📤 [MenuScreen] Method:', method);

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

  // console.log('📤 [MenuScreen] Request Body (final):', JSON.stringify(requestBody, null, 2));

  // console.log('📡 [MenuScreen] Making API request...');
      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(requestBody),
      });

  // console.log(`📡 [MenuScreen] Response Status: ${response.status}`);
  // console.log(`📡 [MenuScreen] Response OK: ${response.ok}`);

      let data;
      try {
        const responseText = await response.text();
  // console.log(`📥 [MenuScreen] Raw Response Text:`, responseText);
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ [MenuScreen] Failed to parse response:', parseError);
        showToast('Invalid response from server', 'error');
        return;
      }
      
  // console.log(`📥 [MenuScreen] ${isEditing ? 'Update' : 'Create'} Category API Response:`, JSON.stringify(data, null, 2));

      const successCode = isEditing ? 200 : 201;
      // Check for success response format: { code: 200/201, status: 'success' }
      const isSuccess = response.ok && data.code === successCode && data.status === 'success';
  // console.log('💾 [MenuScreen] Success validation:', {
  //   isSuccess,
  //   responseOk: response.ok,
  //   dataCode: data.code,
  //   expectedCode: successCode,
  //   dataStatus: data.status,
  // });
      
      if (isSuccess) {
  // console.log(`✅ [MenuScreen] Category ${isEditing ? 'updated' : 'created'} successfully`);
        showToast(`Category ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        
        // Reset editing state
  // console.log('💾 [MenuScreen] Resetting editing category state');
        setEditingCategory(null);
        
        // Refresh categories list (reset pagination)
  // console.log('💾 [MenuScreen] Refreshing categories list');
        dispatch(resetPagination());
        setPageCounter(1);
        await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] Categories refreshed');
      } else {
  // console.log('❌ [MenuScreen] Category save failed');
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
  // console.log('➕ [MenuScreen] handleAddItem called with categoryId:', categoryId);
    setSelectedCategoryId(categoryId);
    setSelectedItemId(null);
    setEditingItem(null);
    setShowItemDetails(true);
  // console.log('✅ [MenuScreen] Item details screen opened for new item');
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
  // console.log('💾 [MenuScreen] handleSaveItem called');
  // console.log('💾 [MenuScreen] Item data:', JSON.stringify(itemData, null, 2));
  // console.log('💾 [MenuScreen] shouldNavigateToVariants:', shouldNavigateToVariants);
  // console.log('💾 [MenuScreen] Editing item:', editingItem);
    
    const isEditing = !!editingItem;
  // console.log('💾 [MenuScreen] Is editing:', isEditing);
    
    if (!selectedCategoryId && !isEditing) {
      console.error('❌ [MenuScreen] Category not selected');
      showToast('Category not selected', 'error');
      return;
    }
  // console.log('✅ [MenuScreen] Category validation passed');

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
  // console.log('📋 [MenuScreen] No changes detected, skipping API call');
  // console.log('📋 [MenuScreen] Original:', {
  //   name: editingItem.name,
  //   description: editingItem.description,
  //   item_type: editingItem.item_type,
  //   price: editingItem.price,
  //   packagingPrice: editingItem.packagingPrice,
  //   gst_rate: oldGstRate,
  //   sub_category_id: oldSubCategoryId,
  //   display_order: editingItem.display_order,
  // });
  // console.log('📋 [MenuScreen] New:', {
  //   name: itemData.name,
  //   description: itemData.description,
  //   item_type: itemData.item_type,
  //   price: itemData.price,
  //   packagingPrice: itemData.packagingPrice,
  //   gst_rate: newGstRate,
  //   sub_category_id: newSubCategoryId,
  //   display_order: itemData.display_order,
  // });
        
        // If navigating to variants, just proceed without API call
        if (shouldNavigateToVariants) {
  // console.log('📋 [MenuScreen] No changes but navigating to variants');
          setPendingItemData({ ...itemData, id: selectedItemId });
          setShowItemDetails(false);
          setShowItemVariantsAndAddons(true);
  // console.log('✅ [MenuScreen] Navigated to variants screen');
        } else {
  // console.log('📋 [MenuScreen] No changes, just going back');
          // Just go back without showing any message
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
  // console.log('✅ [MenuScreen] States reset, going back');
        }
        return;
      } else {
  // console.log('📋 [MenuScreen] Changes detected, proceeding with API call');
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
  // console.log('📡 [MenuScreen] Updating item:', url);
      } else {
        // Create new item
        url = `${API_BASE_URL}v1/catalog/categories/${selectedCategoryId}/items`;
        method = 'POST';
  // console.log('📡 [MenuScreen] Creating item:', url);
      }

  // console.log('📤 [MenuScreen] Item Data:', JSON.stringify(apiPayload, null, 2));

      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(apiPayload),
      });

  // console.log('📡 [MenuScreen] API response received:', { status: response.status, ok: response.ok });
      const data = await response.json();
  // console.log(`📥 [MenuScreen] ${isEditing ? 'Update' : 'Create'} Item API Response:`, JSON.stringify(data, null, 2));

      const successCode = isEditing ? 200 : 201;
      const isSuccess = response.ok && data.code === successCode && data.status === 'success';
  // console.log('💾 [MenuScreen] Success validation:', {
  //   isSuccess,
  //   responseOk: response.ok,
  //   dataCode: data.code,
  //   expectedCode: successCode,
  //   dataStatus: data.status,
  // });
      
      if (isSuccess) {
  // console.log(`✅ [MenuScreen] Item ${isEditing ? 'updated' : 'created'} successfully`);
        showToast(`Item ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        
        // If we got a new item ID from creation, store it
        const savedItemId = data.data?.id || selectedItemId;
  // console.log('💾 [MenuScreen] Saved item ID:', savedItemId);
        
        // Store item data for variants screen
        if (shouldNavigateToVariants) {
  // console.log('💾 [MenuScreen] Storing item data for variants screen');
          setPendingItemData({ ...itemData, id: savedItemId });
          setSelectedItemId(savedItemId);
        }
        
        // Reset editing state
  // console.log('💾 [MenuScreen] Resetting editing item state');
        setEditingItem(null);
        
        // Refresh categories list to get the updated/new item (reset pagination)
  // console.log('💾 [MenuScreen] Refreshing categories list');
        dispatch(resetPagination());
        setPageCounter(1);
        await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] Categories refreshed');
        
        // Navigate to variants screen if needed
        if (shouldNavigateToVariants) {
  // console.log('💾 [MenuScreen] Navigating to variants screen');
          setShowItemDetails(false);
          setShowItemVariantsAndAddons(true);
  // console.log('✅ [MenuScreen] Navigated to variants screen');
        }
      } else {
  // console.log('❌ [MenuScreen] Item save failed');
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
  // console.log('➡️ [MenuScreen] handleNavigateToVariants called');
  // console.log('➡️ [MenuScreen] Item data:', JSON.stringify(itemData, null, 2));
    // Save item first, then navigate to variants screen
    handleSaveItem(itemData, true);
  // console.log('✅ [MenuScreen] handleSaveItem called with shouldNavigateToVariants=true');
  };

  const handleAddSubCategory = (categoryId) => {
  // console.log('➕ [MenuScreen] handleAddSubCategory called with categoryId:', categoryId);
    setSelectedCategoryId(categoryId);
    setShowCreateSubCategoryModal(true);
  // console.log('✅ [MenuScreen] Create sub-category modal opened');
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
      
  // console.log(`📡 [MenuScreen] ${isEditing ? 'Updating' : 'Creating'} sub-category:`, url);
  // console.log('📤 [MenuScreen] Sub-Category Data:', JSON.stringify(subCategoryData, null, 2));

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

  // console.log('📤 [MenuScreen] Request Body (final):', JSON.stringify(requestBody, null, 2));

      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
  // console.log(`📥 [MenuScreen] ${isEditing ? 'Update' : 'Create'} Sub-Category API Response:`, JSON.stringify(data, null, 2));

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
  // console.log('📡 [MenuScreen] Deleting sub-category:', url);
                
                const response = await fetchWithAuth(url, {
                  method: 'DELETE',
                });

                const data = await response.json();
  // console.log('📥 [MenuScreen] Delete Sub-Category API Response:', JSON.stringify(data, null, 2));

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
  // console.log('📷 [MenuScreen] handlePhotoPress called:', { categoryId, itemId });
    // Find the item to get its name
    const category = categories.find(c => c.id === categoryId);
  // console.log('📷 [MenuScreen] Category found:', category?.name);
    const item = category?.items.find(i => i.id === itemId);
  // console.log('📷 [MenuScreen] Item found:', item?.name);
    
    setSelectedCategoryId(categoryId);
    setSelectedItemId(itemId);
    setSelectedItemName(item?.name || 'Item');
    setShowItemImageTiming(true);
  // console.log('✅ [MenuScreen] Item image timing screen opened');
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
  // console.log('✏️ [MenuScreen] handleEditItem called:', { categoryId, itemId, hasSearchResultItem: !!searchResultItem });
    let item = null;
    
    // If search result item is provided, use it directly
    if (searchResultItem) {
  // console.log('✏️ [MenuScreen] Using search result item');
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
  // console.log('✏️ [MenuScreen] Mapped search result item:', item.name);
    } else {
  // console.log('✏️ [MenuScreen] Finding item from categories');
      // Find the item from categories
      const category = categories.find(c => c.id === categoryId);
  // console.log('✏️ [MenuScreen] Category found:', category?.name);
      item = category?.items.find(i => i.id === itemId);
  // console.log('✏️ [MenuScreen] Item found:', item?.name);
    }
    
    if (item) {
  // console.log('📋 [MenuScreen] Editing item:', item.name);
  // console.log('📋 [MenuScreen] Item variants:', item.variants ? JSON.stringify(item.variants, null, 2) : 'none');
  // console.log('📋 [MenuScreen] Item add_ons:', item.add_ons ? JSON.stringify(item.add_ons, null, 2) : 'none');
      
      // Set up editing state - ensure variants are included
      const editingItemData = {
        ...item,
        categoryId: categoryId,
        variants: item.variants || [], // Explicitly include variants
      };
  // console.log('✏️ [MenuScreen] Setting editing item state');
      setEditingItem(editingItemData);
      setSelectedCategoryId(categoryId);
      setSelectedItemId(itemId);
      setShowItemDetails(true);
  // console.log('✅ [MenuScreen] Item details screen opened for editing');
    } else {
      console.error('❌ [MenuScreen] Item not found for editing');
    }
  };

  const handleCategoryMenu = (categoryId) => {
  // console.log('📋 [MenuScreen] handleCategoryMenu called:', { categoryId, currentOpenMenuId: openCategoryMenuId });
    // Toggle menu - if already open for this category, close it; otherwise open it
    const newMenuId = openCategoryMenuId === categoryId ? null : categoryId;
  // console.log('📋 [MenuScreen] Toggling category menu:', openCategoryMenuId, '->', newMenuId);
    setOpenCategoryMenuId(newMenuId);
  };

  const handleEditCategory = (categoryId) => {
  // console.log('✏️ [MenuScreen] handleEditCategory called:', categoryId);
    const category = categories.find(c => c.id === categoryId);
  // console.log('✏️ [MenuScreen] Category found:', category?.name);
    if (category) {
      setEditingCategory(category);
      setOpenCategoryMenuId(null);
      setShowCreateCategoryModal(true);
  // console.log('✅ [MenuScreen] Create category modal opened for editing');
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
  // console.log('📡 [MenuScreen] Deleting category:', url);
                
                const response = await fetchWithAuth(url, {
                  method: 'DELETE',
                });

                const data = await response.json();
  // console.log('📥 [MenuScreen] Delete Category API Response:', JSON.stringify(data, null, 2));

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
  // console.log('📡 [MenuScreen] Creating add-on:', url);
  // console.log('📤 [MenuScreen] Add-on Data:', JSON.stringify(addonData, null, 2));

      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(addonData),
      });

      const data = await response.json();
  // console.log('📥 [MenuScreen] Create Add-on API Response:', JSON.stringify(data, null, 2));

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
  // console.log('📷 [MenuScreen] handleSaveItemImageTiming called');
  // console.log('📷 [MenuScreen] Image timing data:', JSON.stringify(imageTimingData, null, 2));
  // console.log('📷 [MenuScreen] Selected item ID:', selectedItemId);
  // console.log('📷 [MenuScreen] Selected category ID:', selectedCategoryId);
    
    if (!selectedItemId) {
      console.error('❌ [MenuScreen] Item ID is missing');
      showToast('Item ID is missing', 'error');
      return;
    }

    try {
  // console.log('📡 [MenuScreen] Item image and timing saved:', imageTimingData);
  // console.log('📡 [MenuScreen] Image URLs:', imageTimingData?.imageUrls);
  // console.log('📡 [MenuScreen] Item Data:', imageTimingData?.itemData);
      
      // Get the updated item data from the response
      const updatedItemData = imageTimingData?.itemData;
      // Try multiple possible locations for image URLs
      const imageUrls = imageTimingData?.imageUrls || 
                       updatedItemData?.image_urls || 
                       updatedItemData?.imageUrls || 
                       [];
      
  // console.log('📡 [MenuScreen] Extracted image URLs:', imageUrls);
  // console.log('📡 [MenuScreen] Updated item data:', updatedItemData);
      
      // Store item ID and category ID before closing screen
      const itemIdToUpdate = selectedItemId;
      const categoryIdToUpdate = selectedCategoryId;
      
      // Close the screen first
  // console.log('📷 [MenuScreen] Closing item image timing screen');
      setShowItemImageTiming(false);
      setSelectedCategoryId(null);
      setSelectedItemId(null);
      setSelectedItemName(null);
  // console.log('✅ [MenuScreen] Screen closed and states reset');
      
      // Optimistically update the local state with new images immediately using Redux
      if (imageUrls.length > 0 && categoryIdToUpdate && itemIdToUpdate) {
  // console.log('📷 [MenuScreen] Updating item image optimistically');
        // Use the last image URL (most recently uploaded) or first if only one
        const imageToShow = imageUrls.length > 1 ? imageUrls[imageUrls.length - 1] : imageUrls[0];
  // console.log('📷 [MenuScreen] Image to show:', imageToShow);
  // console.log('📷 [MenuScreen] All image URLs:', imageUrls);
        
        dispatch(updateItem({
          categoryId: categoryIdToUpdate,
          itemId: itemIdToUpdate,
          updates: {
            image: imageToShow,
            image_urls: imageUrls,
          }
        }));
  // console.log('✅ [MenuScreen] Optimistically updated item image in Redux state');
      } else {
        console.warn('⚠️ [MenuScreen] Could not update item image - missing data:', {
          imageUrls: imageUrls.length,
          categoryId: categoryIdToUpdate,
          itemId: itemIdToUpdate,
        });
      }
      
      // Show success message
  // console.log('📷 [MenuScreen] Showing success toast');
      showToast('Item images uploaded successfully', 'success');
      
      // Refresh categories in background to ensure sync with backend
      // Add a delay to ensure backend has processed the uploads and optimistic update is visible
  // console.log('📷 [MenuScreen] Scheduling category refresh in 2 seconds');
      setTimeout(async () => {
  // console.log('🔄 [MenuScreen] Refreshing categories to sync with backend');
        dispatch(resetPagination());
        setPageCounter(1);
        await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] Categories refreshed after image upload');
      }, 2000); // Increased delay to ensure optimistic update is visible first
  // console.log('✅ [MenuScreen] handleSaveItemImageTiming completed');
    } catch (error) {
      console.error('❌ [MenuScreen] Error saving item image and timing:', error);
      console.error('❌ [MenuScreen] Error stack:', error.stack);
      showToast('Failed to save item images and timing', 'error');
    }
  };

  // Memoize the onBack callback for ItemImageTimingScreen to prevent unnecessary re-renders
  const handleItemImageTimingBack = useCallback(async () => {
  // console.log('🔙 [MenuScreen] ItemImageTimingScreen onBack called');
    setShowItemImageTiming(false);
    setSelectedCategoryId(null);
    setSelectedItemId(null);
    setSelectedItemName(null);
    // Refresh categories to update images after deletion
    await refreshCategories();
  // console.log('✅ [MenuScreen] ItemImageTimingScreen closed and categories refreshed');
  }, [refreshCategories]);

  // Show ItemImageTimingScreen when adding/editing item images
  if (showItemImageTiming) {
  // console.log('📷 [MenuScreen] Rendering ItemImageTimingScreen');
    return (
      <ItemImageTimingScreen
        itemId={selectedItemId}
        itemName={selectedItemName}
        onBack={handleItemImageTimingBack}
        onSave={handleSaveItemImageTiming}
      />
    );
  }

  // Show AddQuantityScreen when configuring quantity variant
  if (showAddQuantity) {
  // console.log('📊 [MenuScreen] Rendering AddQuantityScreen');
  // console.log('📊 [MenuScreen] Selected item ID:', selectedItemId);
  // console.log('📊 [MenuScreen] Selected category ID:', selectedCategoryId);
  // console.log('📊 [MenuScreen] Has pendingItemData:', !!pendingItemData);
  // console.log('📊 [MenuScreen] Has editingItem:', !!editingItem);
    
    // Get the latest item data from categories to ensure we have updated variants
    let latestItemData = pendingItemData || editingItem;
  // console.log('📊 [MenuScreen] Initial latestItemData source:', pendingItemData ? 'pendingItemData' : editingItem ? 'editingItem' : 'none');
    
    if (selectedItemId && selectedCategoryId) {
  // console.log('📊 [MenuScreen] Looking for item in categories');
      const category = categories.find(c => c.id === selectedCategoryId);
  // console.log('📊 [MenuScreen] Category found:', category?.name);
      const latestItem = category?.items.find(i => i.id === selectedItemId);
  // console.log('📊 [MenuScreen] Latest item found:', latestItem?.name);
      
      if (latestItem) {
        // Always use the latest item from categories to ensure we have the most recent variants
        latestItemData = {
          ...latestItem,
          categoryId: selectedCategoryId,
          variants: latestItem.variants || [], // Explicitly include variants array
        };
  // console.log('📱 [MenuScreen] Using latest item data from categories for AddQuantityScreen');
  // console.log('📱 [MenuScreen] Latest item ID:', latestItemData.id);
  // console.log('📱 [MenuScreen] Latest item variants:', latestItemData.variants && latestItemData.variants.length > 0 ? JSON.stringify(latestItemData.variants, null, 2) : 'none');
  // console.log('📱 [MenuScreen] Latest item variants count:', latestItemData.variants ? latestItemData.variants.length : 0);
      } else {
        console.warn('⚠️ [MenuScreen] Latest item not found in categories for ID:', selectedItemId);
      }
    } else {
  // console.log('📱 [MenuScreen] Using pendingItemData or editingItem (no refresh from categories)');
  // console.log('📱 [MenuScreen] ItemData variants:', latestItemData?.variants ? JSON.stringify(latestItemData.variants, null, 2) : 'none');
    }
    
  // console.log('📊 [MenuScreen] Rendering AddQuantityScreen with props:', {
  //   variantType: currentVariantConfig?.variantType,
  //   variantTitle: currentVariantConfig?.variantTitle,
  //   hasItemData: !!latestItemData,
  //   hasConfigData: !!configData,
  // });
    
    return (
      <AddQuantityScreen
        onBack={() => {
  // console.log('🔙 [MenuScreen] AddQuantityScreen onBack called');
          setShowAddQuantity(false);
          setCurrentVariantConfig(null);
          // Go back to variants/addons screen
          setShowItemVariantsAndAddons(true);
  // console.log('✅ [MenuScreen] Navigated back to variants/addons screen');
        }}
        onSave={async (variantData) => {
  // console.log('💾 [MenuScreen] AddQuantityScreen onSave called');
  // console.log('💾 [MenuScreen] Variant data saved:', variantData);
          // Variant is already saved by AddQuantityScreen, just refresh categories
          // Refresh categories to get updated item with variants (reset pagination)
  // console.log('💾 [MenuScreen] Refreshing categories');
          dispatch(resetPagination());
          setPageCounter(1);
          await fetchCategories(1, false);
          setShowAddQuantity(false);
          setCurrentVariantConfig(null);
          setShowItemVariantsAndAddons(true);
  // console.log('✅ [MenuScreen] Categories refreshed, navigated to variants/addons screen');
        }}
        onDelete={async () => {
  // console.log('🗑️ [MenuScreen] AddQuantityScreen onDelete called');
          // Variant is already deleted by AddQuantityScreen, refresh categories
  // console.log('🗑️ [MenuScreen] Variant deleted, refreshing categories');
          // Refresh categories to get updated item without the deleted variant (reset pagination)
          setCurrentPage(1);
          setHasNext(true);
          await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] Categories refreshed after variant deletion');
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
  // console.log('🔗 [MenuScreen] Rendering AddOnsSelectionScreen');
  // console.log('🔗 [MenuScreen] Item data:', pendingItemData || editingItem);
  // console.log('🔗 [MenuScreen] Customization data:', currentVariantConfig?.customizationData);
    
    return (
      <AddOnsSelectionScreen
        onBack={() => {
  // console.log('🔙 [MenuScreen] AddOnsSelectionScreen onBack called');
          // Go back to AddAddonsScreen
          setShowAddOnsSelection(false);
          setShowAddAddons(true);
  // console.log('✅ [MenuScreen] Navigated back to AddAddonsScreen');
        }}
        onSave={async (updatedItemData) => {
  // console.log('💾 [MenuScreen] AddOnsSelectionScreen onSave called');
  // console.log('💾 [MenuScreen] Updated item data:', updatedItemData);
          // Add-ons linked successfully
          showToast('Add-ons linked successfully', 'success');
          // Update the item data so AddAddonsScreen can show the updated linked add-ons
          if (updatedItemData) {
  // console.log('📱 [MenuScreen] AddOnsSelectionScreen onSave - updating item data');
  // console.log('📱 [MenuScreen] Updated item add_ons:', updatedItemData.add_ons ? JSON.stringify(updatedItemData.add_ons, null, 2) : 'none');
            setEditingItem(updatedItemData);
            setPendingItemData(updatedItemData);
            // Refresh categories in background to keep them in sync
  // console.log('💾 [MenuScreen] Refreshing categories');
            setCurrentPage(1);
            setHasNext(true);
            await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] Categories refreshed');
          }
          // Go back to AddAddonsScreen instead of MenuScreen
          setShowAddOnsSelection(false);
          setShowAddAddons(true);
  // console.log('✅ [MenuScreen] Navigated to AddAddonsScreen');
        }}
        itemData={pendingItemData || editingItem}
        customizationData={currentVariantConfig?.customizationData}
      />
    );
  }

  // Show AddAddonsScreen when configuring add-ons
  if (showAddAddons) {
  // console.log('🔧 [MenuScreen] Rendering AddAddonsScreen');
  // console.log('🔧 [MenuScreen] Selected item ID:', selectedItemId);
  // console.log('🔧 [MenuScreen] Selected category ID:', selectedCategoryId);
  // console.log('🔧 [MenuScreen] Has pendingItemData:', !!pendingItemData);
  // console.log('🔧 [MenuScreen] Has editingItem:', !!editingItem);
    
    // Prioritize fresh data from API (pendingItemData/editingItem) over stale categories data
    let latestItemData = pendingItemData || editingItem;
  // console.log('🔧 [MenuScreen] Initial latestItemData source:', pendingItemData ? 'pendingItemData' : editingItem ? 'editingItem' : 'none');
    
    // Only use categories data if we don't have fresh data from API
    if (!latestItemData && selectedItemId && selectedCategoryId) {
  // console.log('🔧 [MenuScreen] Looking for item in categories');
      const category = categories.find(c => c.id === selectedCategoryId);
  // console.log('🔧 [MenuScreen] Category found:', category?.name);
      const latestItem = category?.items.find(i => i.id === selectedItemId);
  // console.log('🔧 [MenuScreen] Latest item found:', latestItem?.name);
      
      if (latestItem) {
        latestItemData = {
          ...latestItem,
          categoryId: selectedCategoryId,
          add_ons: latestItem.add_ons || [], // Explicitly include add_ons array
        };
  // console.log('📱 [MenuScreen] Using item data from categories for AddAddonsScreen (no fresh data available)');
  // console.log('📱 [MenuScreen] Latest item ID:', latestItemData.id);
  // console.log('📱 [MenuScreen] Latest item add_ons:', latestItemData.add_ons && latestItemData.add_ons.length > 0 ? JSON.stringify(latestItemData.add_ons, null, 2) : 'none');
  // console.log('📱 [MenuScreen] Latest item add_ons count:', latestItemData.add_ons ? latestItemData.add_ons.length : 0);
      } else {
        console.warn('⚠️ [MenuScreen] Latest item not found in categories for ID:', selectedItemId);
      }
    } else if (latestItemData) {
  // console.log('📱 [MenuScreen] Using fresh item data from API (pendingItemData/editingItem) for AddAddonsScreen');
  // console.log('📱 [MenuScreen] Item ID:', latestItemData.id);
  // console.log('📱 [MenuScreen] Item add_ons:', latestItemData.add_ons && latestItemData.add_ons.length > 0 ? JSON.stringify(latestItemData.add_ons, null, 2) : 'none');
  // console.log('📱 [MenuScreen] Item add_ons count:', latestItemData.add_ons ? latestItemData.add_ons.length : 0);
    } else {
  // console.log('📱 [MenuScreen] No item data available for AddAddonsScreen');
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
  // console.log('➡️ [MenuScreen] AddAddonsScreen onNavigate called:', type, config);
          if (type === 'addonsSelection') {
  // console.log('➡️ [MenuScreen] Navigating to AddOnsSelectionScreen');
            setCurrentVariantConfig({
              ...currentVariantConfig,
              customizationData: config.customizationData,
            });
            setShowAddAddons(false);
            setShowAddOnsSelection(true);
  // console.log('✅ [MenuScreen] Navigated to AddOnsSelectionScreen');
          } else {
  // console.log('⚠️ [MenuScreen] Unknown navigation type:', type);
          }
        }}
        onItemDataUpdate={async (updatedItemData) => {
  // console.log('🔄 [MenuScreen] AddAddonsScreen onItemDataUpdate called');
  // console.log('🔄 [MenuScreen] Updated item data:', updatedItemData);
          // Update item data when add-ons are linked
          if (updatedItemData) {
  // console.log('📱 [MenuScreen] onItemDataUpdate called with updated item data');
  // console.log('📱 [MenuScreen] Updated item add_ons:', updatedItemData.add_ons ? JSON.stringify(updatedItemData.add_ons, null, 2) : 'none');
            setEditingItem(updatedItemData);
            setPendingItemData(updatedItemData);
            // Refresh categories in background to keep them in sync
  // console.log('🔄 [MenuScreen] Refreshing categories');
            setCurrentPage(1);
            setHasNext(true);
            await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] Categories refreshed');
          } else {
            console.warn('⚠️ [MenuScreen] onItemDataUpdate called with no data');
          }
        }}
        onDelete={async () => {
  // console.log('🗑️ [MenuScreen] AddAddonsScreen onDelete called');
          // Add-on is already deleted by AddAddonsScreen, refresh categories
  // console.log('🗑️ [MenuScreen] Add-on deleted, refreshing categories');
          // Refresh categories to get updated item without the deleted add-on (reset pagination)
          setCurrentPage(1);
          setHasNext(true);
          await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] Categories refreshed after add-on deletion');
        }}
        onSave={async (addonData) => {
  // console.log('💾 [MenuScreen] AddAddonsScreen onSave called');
  // console.log('💾 [MenuScreen] Addon data saved:', addonData);
          // TODO: Save addon data to backend
          showToast('Add-on configuration saved successfully', 'success');
          // Refresh categories to get updated item with add-ons (reset pagination)
  // console.log('💾 [MenuScreen] Refreshing categories');
          setCurrentPage(1);
          setHasNext(true);
          await fetchCategories(1, false);
  // console.log('✅ [MenuScreen] Categories refreshed');
          
          // Reset all states
  // console.log('💾 [MenuScreen] Resetting all states');
          setShowAddAddons(false);
          setCurrentVariantConfig(null);
          setShowItemVariantsAndAddons(false);
          setShowItemDetails(false);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
          setPendingItemData(null);
  // console.log('✅ [MenuScreen] All states reset');
          
          // Navigate to OrdersScreen
          if (onNavigateToOrders) {
  // console.log('➡️ [MenuScreen] Navigating to OrdersScreen');
            onNavigateToOrders();
          } else {
  // console.log('⚠️ [MenuScreen] onNavigateToOrders not available');
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
  // console.log('⚙️ [MenuScreen] Rendering ItemVariantsAndAddonsScreen');
  // console.log('⚙️ [MenuScreen] Item data:', pendingItemData || editingItem);
  // console.log('⚙️ [MenuScreen] Has configData:', !!configData);
    
    return (
      <ItemVariantsAndAddonsScreen
        onBack={() => {
  // console.log('🔙 [MenuScreen] ItemVariantsAndAddonsScreen onBack called');
          // Navigate directly to MenuScreen - reset all states
          setShowItemVariantsAndAddons(false);
          setPendingItemData(null);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
          setShowItemDetails(false);
  // console.log('✅ [MenuScreen] Navigated back to MenuScreen, all states reset');
        }}
        onNext={() => {
  // console.log('➡️ [MenuScreen] ItemVariantsAndAddonsScreen onNext called');
          // TODO: Handle final save/navigation
          setShowItemVariantsAndAddons(false);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
          setPendingItemData(null);
  // console.log('✅ [MenuScreen] States reset after onNext');
        }}
        onNavigate={async (type, config) => {
  // console.log('➡️ [MenuScreen] ItemVariantsAndAddonsScreen onNavigate called:', type, config);
          // Navigate to appropriate screen based on type
          if (type === 'variant') {
  // console.log('📱 [MenuScreen] Navigating to AddQuantityScreen');
            
            // Refresh item data from categories to ensure we have latest variants
            // Note: We'll get the latest item data in the AddQuantityScreen render section
            setCurrentVariantConfig(config);
            setShowItemVariantsAndAddons(false);
            setShowAddQuantity(true);
  // console.log('✅ [MenuScreen] Navigated to AddQuantityScreen');
          } else if (type === 'addon') {
  // console.log('📱 [MenuScreen] Navigating to AddAddonsScreen');
            setCurrentVariantConfig(config);
            setShowItemVariantsAndAddons(false);
            setShowAddAddons(true);
  // console.log('✅ [MenuScreen] Navigated to AddAddonsScreen');
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
  // console.log('📝 [MenuScreen] Rendering ItemDetailsScreen');
  // console.log('📝 [MenuScreen] Category ID:', selectedCategoryId);
  // console.log('📝 [MenuScreen] Item ID:', selectedItemId);
  // console.log('📝 [MenuScreen] Editing item:', editingItem);
    const subCategories = categories.find(c => c.id === selectedCategoryId)?.subCategories || [];
  // console.log('📝 [MenuScreen] Sub-categories count:', subCategories.length);
    
    return (
      <ItemDetailsScreen
        onBack={() => {
  // console.log('🔙 [MenuScreen] ItemDetailsScreen onBack called');
          setShowItemDetails(false);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
  // console.log('✅ [MenuScreen] ItemDetailsScreen closed, states reset');
        }}
        categoryId={selectedCategoryId}
        onSave={handleSaveItem}
        onNext={handleNavigateToVariants}
        itemData={editingItem}
        subCategories={subCategories}
      />
    );
  }

  // console.log('🎨 [MenuScreen] Rendering main MenuScreen view');
  // console.log('🎨 [MenuScreen] Active tab:', activeTab);
  // console.log('🎨 [MenuScreen] Search query:', searchQuery);
  // console.log('🎨 [MenuScreen] Categories count:', categories.length);
  // console.log('🎨 [MenuScreen] Has search results:', !!searchResults);
  // console.log('🎨 [MenuScreen] Is searching:', isSearching);
  // console.log('🎨 [MenuScreen] Is loading:', isLoading);
  
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
              {(configData || configDataCacheRef.current)?.partner_info?.business_name || ''}
            </Text>
            {(configData || configDataCacheRef.current)?.partner_info && (
              <View style={styles.statusContainer}>
                <Text style={styles.onlineText}>
                  {(configData || configDataCacheRef.current).partner_info.online_status || ''}
                </Text>
                {(configData || configDataCacheRef.current).partner_info.online_status && 
                 (configData || configDataCacheRef.current).partner_info.closing_info && (
                  <>
                    <Text style={styles.statusDot}>•</Text>
                    <Text style={styles.closingText}>
                      {(configData || configDataCacheRef.current).partner_info.closing_info}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* <TouchableOpacity style={styles.searchButton} activeOpacity={0.7}>
            <Image
              source={icons.search}
              style={styles.searchIcon}
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
  // console.log('📑 [MenuScreen] Menu Items tab pressed');
              setActiveTab('menuItems');
  // console.log('✅ [MenuScreen] Active tab set to menuItems');
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
  // console.log('📑 [MenuScreen] Add-ons tab pressed');
              setActiveTab('addons');
  // console.log('✅ [MenuScreen] Active tab set to addons');
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
  // console.log('🔍 [MenuScreen] Search input changed:', text);
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

              {/* Show initial loading with proper loader */}
              {(isInitialLoading || (isLoading && categories.length === 0)) ? (
                <View style={styles.initialLoadingContainer}>
                  <ActivityIndicator size="large" color="#D4A574" />
                  <Text style={styles.loadingText}>Loading menu...</Text>
                </View>
              ) : searchQuery && searchQuery.trim().length > 0 ? (
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
  searchIcon: {
    width: 24,
    height: 24,
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
  vegIcon: {
    width: 16,
    height: 16,
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
    marginTop: 16,
  },
  initialLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
