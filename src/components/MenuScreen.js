import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  Alert,
} from 'react-native';
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

const MenuScreen = ({ partnerStatus, onNavigateToOrders }) => {
  const { showToast } = useToast();
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
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [configData, setConfigData] = useState(null);
  const [isLoadingConfigData, setIsLoadingConfigData] = useState(true);
  const [togglingItems, setTogglingItems] = useState(new Set()); // Track items being toggled
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState(null); // Track which category menu is open
  const [editingCategory, setEditingCategory] = useState(null); // Track category being edited
  const [openSubCategoryMenuId, setOpenSubCategoryMenuId] = useState(null); // Track which subcategory menu is open
  const [editingSubCategory, setEditingSubCategory] = useState(null); // Track subcategory being edited

  // Fetch complete catalog from API (categories, subcategories, items, partner info, UI labels)
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const url = `${API_BASE_URL}v1/catalog/orchestrator/complete-catalog`;
      console.log('📡 [MenuScreen] Fetching complete catalog from:', url);
      
      const response = await fetchWithAuth(url, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('📥 [MenuScreen] Complete Catalog API Response:', JSON.stringify(data, null, 2));

      if (response.ok && (data.code === 200 || data.code === 201) && data.status === 'success') {
        const catalogData = data.data || {};
        const categoriesData = catalogData.categories || [];

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

          const items = (categoryObj.menu_items || []).map((item) => ({
            id: item.id || item._id || Date.now().toString(),
            name: item.name || '',
            price: item.price || 0,
            isVeg: item.item_type === 'VEG',
            is_active: item.is_active !== false,
            image: item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : null,
            description: item.description || '',
            packagingPrice: item.packaging_price || 0,
            gst: item.gst_rate ? (item.gst_rate.replace('GST_', '') || '0') + '%' : '0%',
            item_type: item.item_type || 'VEG',
            sub_category_id: item.sub_category_id || null,
            display_order: item.display_order || 0,
          }));

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
        console.log('📋 [MenuScreen] Categories order from backend:');
        categoriesWithData.forEach((cat, index) => {
          console.log(`  ${index + 1}. ${cat.name} - display_order: ${cat.display_order}, created_at: ${cat.created_at}`);
        });

        setCategories(categoriesWithData);
        
        // Initialize expanded state - all categories open by default
        const initialExpanded = {};
        categoriesWithData.forEach((category) => {
          initialExpanded[category.id] = true;
        });
        console.log('📋 [MenuScreen] Categories loaded:', categoriesWithData.length);
        console.log('📋 [MenuScreen] All categories start open by default');
        setExpandedCategories(initialExpanded);

        // Log partner info and UI labels if available (for future use)
        if (catalogData.partner_info) {
          console.log('📋 [MenuScreen] Partner Info:', catalogData.partner_info);
        }
        if (catalogData.ui_labels) {
          console.log('📋 [MenuScreen] UI Labels:', catalogData.ui_labels);
        }
      } else {
        console.error('❌ [MenuScreen] Failed to fetch complete catalog:', data.message);
        showToast(data.message || 'Failed to fetch catalog', 'error');
      }
    } catch (error) {
      console.error('❌ [MenuScreen] Error fetching complete catalog:', error);
      showToast('Failed to fetch catalog', 'error');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [showToast]);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch config data on component mount
  useEffect(() => {
    const fetchConfigData = async () => {
      setIsLoadingConfigData(true);
      try {
        const url = `${API_BASE_URL}v1/config`;
        console.log('📡 [MenuScreen] Fetching config data from:', url);
        
        const response = await fetchWithAuth(url, {
          method: 'GET',
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData?.data) {
          console.log('✅ [MenuScreen] Config data loaded successfully');
          console.log('📋 [MenuScreen] Full config data:', JSON.stringify(responseData.data, null, 2));
          setConfigData(responseData.data);
        } else {
          console.error('❌ [MenuScreen] Failed to load config data:', response.status);
          setConfigData(null);
        }
      } catch (error) {
        console.error('❌ [MenuScreen] Error fetching config data:', error);
        setConfigData(null);
      } finally {
        setIsLoadingConfigData(false);
      }
    };

    fetchConfigData();
  }, []);

  // Log header data source whenever configData changes
  useEffect(() => {
    console.log('📋 [MenuScreen] ========================================');
    console.log('📋 [MenuScreen] HEADER DATA SOURCE CHECK');
    console.log('📋 [MenuScreen] ========================================');
    console.log('📋 [MenuScreen] configData exists:', !!configData);
    console.log('📋 [MenuScreen] partner_info exists:', !!configData?.partner_info);
    
    if (configData?.partner_info) {
      console.log('✅ [MenuScreen] USING BACKEND DATA for header');
      console.log('📋 [MenuScreen] Backend partner_info:', JSON.stringify(configData.partner_info, null, 2));
      
      const businessName = configData.partner_info.business_name;
      const onlineStatus = configData.partner_info.online_status;
      const closingInfo = configData.partner_info.closing_info;
      
      console.log('📋 [MenuScreen] Business Name:', businessName ? `✅ "${businessName}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Restaurant Name"');
      console.log('📋 [MenuScreen] Online Status:', onlineStatus ? `✅ "${onlineStatus}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Online"');
      console.log('📋 [MenuScreen] Closing Info:', closingInfo ? `✅ "${closingInfo}" - FROM BACKEND` : '⚠️  MISSING - Using fallback: "Closes at 12:00 am, Tomorrow"');
    } else {
      console.log('⚠️  [MenuScreen] USING FRONTEND FALLBACK DATA for header');
      console.log('📋 [MenuScreen] Business Name: "Restaurant Name" (FALLBACK)');
      console.log('📋 [MenuScreen] Online Status: "Online" (FALLBACK)');
      console.log('📋 [MenuScreen] Closing Info: "Closes at 12:00 am, Tomorrow" (FALLBACK)');
    }
    console.log('📋 [MenuScreen] ========================================');
  }, [configData]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const toggleItemAvailability = async (categoryId, itemId) => {
    // Prevent multiple simultaneous toggles for the same item
    if (togglingItems.has(itemId)) {
      console.log('⚠️ [MenuScreen] Toggle already in progress for item:', itemId);
      return;
    }

    // Find the item to get current status
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    const item = category.items.find(i => i.id === itemId);
    if (!item) return;
    
    const newIsActive = !item.is_active;
    const previousIsActive = item.is_active;
    
    // Mark item as being toggled
    setTogglingItems(prev => new Set(prev).add(itemId));
    
    // Optimistically update UI
    setCategories((prevCategories) =>
      prevCategories.map((category) => {
        if (category.id === categoryId) {
          return {
            ...category,
            items: category.items.map((item) =>
              item.id === itemId
                ? { ...item, is_active: newIsActive }
                : item
            ),
          };
        }
        return category;
      })
    );

    // Update via API
    try {
      const url = `${API_BASE_URL}v1/catalog/items/${itemId}/status`;
      console.log('📡 [MenuScreen] Updating item status:', url);
      console.log('📤 [MenuScreen] Request body:', JSON.stringify({ isActive: newIsActive }, null, 2));
      
      const response = await fetchWithAuth(url, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: newIsActive,
        }),
      });

      const data = await response.json();
      console.log('📥 [MenuScreen] Update Item Status API Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.code === 200 && data.status === 'success') {
        // Success - update state with API response to ensure sync
        setCategories((prevCategories) =>
          prevCategories.map((category) => {
            if (category.id === categoryId) {
              return {
                ...category,
                items: category.items.map((item) =>
                  item.id === itemId
                    ? { ...item, is_active: data.data?.is_active ?? newIsActive }
                    : item
                ),
              };
            }
            return category;
          })
        );
        showToast(`Item ${newIsActive ? 'activated' : 'deactivated'} successfully`, 'success');
      } else {
        // Revert optimistic update on error
        setCategories((prevCategories) =>
          prevCategories.map((category) => {
            if (category.id === categoryId) {
              return {
                ...category,
                items: category.items.map((item) =>
                  item.id === itemId
                    ? { ...item, is_active: previousIsActive }
                    : item
                ),
              };
            }
            return category;
          })
        );
        
        const errorMessage = data.message || 'Failed to update item status';
        console.error('❌ [MenuScreen] Failed to update item status:', errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      // Revert optimistic update on error
      setCategories((prevCategories) =>
        prevCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId
                  ? { ...item, is_active: previousIsActive }
                  : item
              ),
            };
          }
          return category;
        })
      );
      
      console.error('❌ [MenuScreen] Error updating item status:', error);
      showToast('Failed to update item status', 'error');
    } finally {
      // Remove item from toggling set
      setTogglingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

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
      
      console.log(`📡 [MenuScreen] ${isEditing ? 'Updating' : 'Creating'} category:`, url);
      console.log('📤 [MenuScreen] Category Data:', JSON.stringify(categoryData, null, 2));
      console.log('📤 [MenuScreen] Editing Category ID:', isEditing ? editingCategory.id : 'N/A');
      console.log('📤 [MenuScreen] Method:', method);

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

      console.log('📤 [MenuScreen] Request Body (final):', JSON.stringify(requestBody, null, 2));

      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(requestBody),
      });

      console.log(`📡 [MenuScreen] Response Status: ${response.status}`);
      console.log(`📡 [MenuScreen] Response OK: ${response.ok}`);

      let data;
      try {
        const responseText = await response.text();
        console.log(`📥 [MenuScreen] Raw Response Text:`, responseText);
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ [MenuScreen] Failed to parse response:', parseError);
        showToast('Invalid response from server', 'error');
        return;
      }
      
      console.log(`📥 [MenuScreen] ${isEditing ? 'Update' : 'Create'} Category API Response:`, JSON.stringify(data, null, 2));

      const successCode = isEditing ? 200 : 201;
      // Check for success response format: { code: 200/201, status: 'success' }
      const isSuccess = response.ok && data.code === successCode && data.status === 'success';
      
      if (isSuccess) {
        showToast(`Category ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        
        // Reset editing state
        setEditingCategory(null);
        
        // Refresh categories list
        await fetchCategories();
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

  const handleSaveItem = async (itemData, shouldNavigateToVariants = false) => {
    const isEditing = !!editingItem;
    
    if (!selectedCategoryId && !isEditing) {
      showToast('Category not selected', 'error');
      return;
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
        console.log('📡 [MenuScreen] Updating item:', url);
      } else {
        // Create new item
        url = `${API_BASE_URL}v1/catalog/categories/${selectedCategoryId}/items`;
        method = 'POST';
        console.log('📡 [MenuScreen] Creating item:', url);
      }

      console.log('📤 [MenuScreen] Item Data:', JSON.stringify(apiPayload, null, 2));

      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(apiPayload),
      });

      const data = await response.json();
      console.log(`📥 [MenuScreen] ${isEditing ? 'Update' : 'Create'} Item API Response:`, JSON.stringify(data, null, 2));

      const successCode = isEditing ? 200 : 201;
      if (response.ok && data.code === successCode && data.status === 'success') {
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
        
        // Refresh categories list to get the updated/new item
        await fetchCategories();
        
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
      
      console.log(`📡 [MenuScreen] ${isEditing ? 'Updating' : 'Creating'} sub-category:`, url);
      console.log('📤 [MenuScreen] Sub-Category Data:', JSON.stringify(subCategoryData, null, 2));

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

      console.log('📤 [MenuScreen] Request Body (final):', JSON.stringify(requestBody, null, 2));

      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log(`📥 [MenuScreen] ${isEditing ? 'Update' : 'Create'} Sub-Category API Response:`, JSON.stringify(data, null, 2));

      const successCode = isEditing ? 200 : 201;
      // Check for success response format: { code: 200/201, status: 'success' }
      const isSuccess = response.ok && data.code === successCode && data.status === 'success';
      
      if (isSuccess) {
        showToast(`Sub-category ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        
        // Reset editing state
        setEditingSubCategory(null);
        
        // Refresh categories list
        await fetchCategories();
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
                console.log('📡 [MenuScreen] Deleting sub-category:', url);
                
                const response = await fetchWithAuth(url, {
                  method: 'DELETE',
                });

                const data = await response.json();
                console.log('📥 [MenuScreen] Delete Sub-Category API Response:', JSON.stringify(data, null, 2));

                // Check for success response format: { code: 200, status: 'success' }
                const isSuccess = response.ok && data.code === 200 && data.status === 'success';
                
                if (isSuccess) {
                  showToast('Sub-category deleted successfully', 'success');
                  setOpenSubCategoryMenuId(null);
                  // Refresh categories list
                  await fetchCategories();
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
        
        // Update the item with the selected image
        setCategories((prevCategories) =>
          prevCategories.map((category) => {
            if (category.id === selectedCategoryId) {
              return {
                ...category,
                items: category.items.map((item) =>
                  item.id === selectedItemId
                    ? { ...item, image: imageUri }
                    : item
                ),
              };
            }
            return category;
          })
        );
        
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
        
        // Update the item with the captured image
        setCategories((prevCategories) =>
          prevCategories.map((category) => {
            if (category.id === selectedCategoryId) {
              return {
                ...category,
                items: category.items.map((item) =>
                  item.id === selectedItemId
                    ? { ...item, image: imageUri }
                    : item
                ),
              };
            }
            return category;
          })
        );
        
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

  const handleEditItem = (categoryId, itemId) => {
    // Find the item to get its data
    const category = categories.find(c => c.id === categoryId);
    const item = category?.items.find(i => i.id === itemId);
    
    if (item) {
      // Set up editing state
      setEditingItem({
        ...item,
        categoryId: categoryId,
      });
      setSelectedCategoryId(categoryId);
      setSelectedItemId(itemId);
      setShowItemDetails(true);
    }
  };

  const handleCategoryMenu = (categoryId) => {
    // Toggle menu - if already open for this category, close it; otherwise open it
    setOpenCategoryMenuId(openCategoryMenuId === categoryId ? null : categoryId);
  };

  const handleEditCategory = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditingCategory(category);
      setOpenCategoryMenuId(null);
      setShowCreateCategoryModal(true);
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
                console.log('📡 [MenuScreen] Deleting category:', url);
                
                const response = await fetchWithAuth(url, {
                  method: 'DELETE',
                });

                const data = await response.json();
                console.log('📥 [MenuScreen] Delete Category API Response:', JSON.stringify(data, null, 2));

                // Check for success response format: { code: 200, status: 'success' }
                const isSuccess = response.ok && data.code === 200 && data.status === 'success';
                
                if (isSuccess) {
                  showToast('Category deleted successfully', 'success');
                  setOpenCategoryMenuId(null);
                  // Refresh categories list
                  await fetchCategories();
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
      console.log('📡 [MenuScreen] Creating add-on:', url);
      console.log('📤 [MenuScreen] Add-on Data:', JSON.stringify(addonData, null, 2));

      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(addonData),
      });

      const data = await response.json();
      console.log('📥 [MenuScreen] Create Add-on API Response:', JSON.stringify(data, null, 2));

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
      showToast('Item ID is missing', 'error');
      return;
    }

    try {
      console.log('📡 [MenuScreen] Item image and timing saved:', imageTimingData);
      
      // Images are already uploaded in ItemImageTimingScreen
      // Just refresh categories to get updated item data with new images
      await fetchCategories();
      
      // Show success message
      showToast('Item images uploaded successfully', 'success');
      
      // Close the screen
      setShowItemImageTiming(false);
      setSelectedCategoryId(null);
      setSelectedItemId(null);
      setSelectedItemName(null);
    } catch (error) {
      console.error('❌ [MenuScreen] Error saving item image and timing:', error);
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
    return (
      <AddQuantityScreen
        onBack={() => {
          setShowAddQuantity(false);
          setCurrentVariantConfig(null);
          // Go back to variants/addons screen
          setShowItemVariantsAndAddons(true);
        }}
        onSave={(variantData) => {
          // TODO: Save variant data to backend
          console.log('Variant data saved:', variantData);
          showToast('Variant saved successfully', 'success');
          setShowAddQuantity(false);
          setCurrentVariantConfig(null);
          setShowItemVariantsAndAddons(true);
        }}
        variantType={currentVariantConfig?.variantType}
        variantTitle={currentVariantConfig?.variantTitle}
        itemData={pendingItemData || editingItem}
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
        onSave={(updatedItemData) => {
          // Add-ons linked successfully
          showToast('Add-ons linked successfully', 'success');
          // Go back to AddAddonsScreen instead of MenuScreen
          setShowAddOnsSelection(false);
          setShowAddAddons(true);
          // Update the item data so AddAddonsScreen can show the updated linked add-ons
          if (updatedItemData) {
            setEditingItem(updatedItemData);
            setPendingItemData(updatedItemData);
          }
        }}
        itemData={pendingItemData || editingItem}
        customizationData={currentVariantConfig?.customizationData}
      />
    );
  }

  // Show AddAddonsScreen when configuring add-ons
  if (showAddAddons) {
    return (
      <AddAddonsScreen
        onBack={() => {
          setShowAddAddons(false);
          setCurrentVariantConfig(null);
          // Go back to variants/addons screen
          setShowItemVariantsAndAddons(true);
        }}
        onNavigate={(type, config) => {
          console.log('📱 [MenuScreen] AddAddonsScreen onNavigate called:', type, config);
          if (type === 'addonsSelection') {
            console.log('📱 [MenuScreen] Navigating to AddOnsSelectionScreen');
            setCurrentVariantConfig({
              ...currentVariantConfig,
              customizationData: config.customizationData,
            });
            setShowAddAddons(false);
            setShowAddOnsSelection(true);
          }
        }}
        onItemDataUpdate={(updatedItemData) => {
          // Update item data when add-ons are linked
          if (updatedItemData) {
            setEditingItem(updatedItemData);
            setPendingItemData(updatedItemData);
          }
        }}
        onSave={(addonData) => {
          // TODO: Save addon data to backend
          console.log('Addon data saved:', addonData);
          showToast('Add-on configuration saved successfully', 'success');
          
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
          }
        }}
        addonType={currentVariantConfig?.addonType}
        addonTitle={currentVariantConfig?.addonTitle}
        itemData={pendingItemData || editingItem}
      />
    );
  }

  // Show ItemVariantsAndAddonsScreen when configuring variants/add-ons
  if (showItemVariantsAndAddons) {
    return (
      <ItemVariantsAndAddonsScreen
        onBack={() => {
          setShowItemVariantsAndAddons(false);
          setPendingItemData(null);
          // Optionally go back to item details or menu
          if (editingItem || selectedItemId) {
            setShowItemDetails(true);
          } else {
            setSelectedCategoryId(null);
            setSelectedItemId(null);
            setEditingItem(null);
          }
        }}
        onNext={() => {
          // TODO: Handle final save/navigation
          setShowItemVariantsAndAddons(false);
          setSelectedCategoryId(null);
          setSelectedItemId(null);
          setEditingItem(null);
          setPendingItemData(null);
        }}
        onNavigate={(type, config) => {
          console.log('📱 [MenuScreen] onNavigate called:', type, config);
          // Navigate to appropriate screen based on type
          if (type === 'variant') {
            console.log('📱 [MenuScreen] Navigating to AddQuantityScreen');
            setCurrentVariantConfig(config);
            setShowItemVariantsAndAddons(false);
            setShowAddQuantity(true);
          } else if (type === 'addon') {
            console.log('📱 [MenuScreen] Navigating to AddAddonsScreen');
            setCurrentVariantConfig(config);
            setShowItemVariantsAndAddons(false);
            setShowAddAddons(true);
          }
        }}
        itemData={pendingItemData || editingItem}
        configData={configData}
      />
    );
  }

  // Show ItemDetailsScreen when adding/editing an item
  if (showItemDetails) {
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
        subCategories={categories.find(c => c.id === selectedCategoryId)?.subCategories || []}
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
            onPress={() => setActiveTab('menuItems')}
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
            onPress={() => setActiveTab('addons')}
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
          <TouchableOpacity
            style={styles.createCategoryButton}
            onPress={activeTab === 'addons' ? handleCreateAddon : handleCreateCategory}
            activeOpacity={0.7}
          >
            <Text style={styles.createCategoryText}>
              {activeTab === 'addons' ? '+ Create New Addon' : '+ Create Category'}
            </Text>
          </TouchableOpacity>
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

            {/* Categories List */}
            <View style={styles.categoriesListContainer}>
              {isLoadingCategories ? (
                <View style={styles.emptyStateContainer}>
                  <Image
                    source={icons.pan}
                    style={styles.panImage}
                    resizeMode="contain"
                  />
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
                <ScrollView
                  style={styles.categoriesList}
                  contentContainerStyle={styles.categoriesListContent}
                  showsVerticalScrollIndicator={false}
                >
                {categories.map((category) => (
                  <View key={category.id} style={styles.categoryContainer}>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <TouchableOpacity
                  style={styles.categoryHeaderLeft}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Image
                    source={icons.downArrow}
                    style={[
                      styles.expandIcon,
                      expandedCategories[category.id] && styles.expandIconUp,
                    ]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
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
              {expandedCategories[category.id] && (
                <View style={styles.categoryContent}>
                  {/* Add Item Button */}
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => handleAddItem(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addItemIcon}>
                      <Text style={styles.addItemIconText}>+</Text>
                    </View>
                    <Text style={styles.addItemText}>Add an item</Text>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.divider} />

                  {/* Add Sub-Category Link */}
                  <TouchableOpacity
                    style={styles.addSubCategoryButton}
                    onPress={() => handleAddSubCategory(category.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addSubCategoryText}>
                      ADD NEW SUB-CATEGORY
                    </Text>
                  </TouchableOpacity>

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
              )}
            </View>
          ))}
        </ScrollView>
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
});

export default MenuScreen;
