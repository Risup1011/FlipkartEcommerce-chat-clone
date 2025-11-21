import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MENU_STORAGE_KEY = '@Kamai24:menuData';
const MENU_PAGE_KEY = '@Kamai24:menuLastPage';

const initialState = {
  categories: [],
  currentPage: 1,
  hasNext: true,
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  lastFetchedPage: 0, // Track the last page we fetched
  cachedData: null, // Store cached data from AsyncStorage
};

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
    appendCategories: (state, action) => {
      // Merge new categories with existing ones
      const newCategories = action.payload;
      const existingCategoryMap = new Map(state.categories.map(cat => [cat.id, cat]));
      
      newCategories.forEach((newCategory) => {
        const existingCategory = existingCategoryMap.get(newCategory.id);
        if (existingCategory) {
          // Merge items and subcategories
          const mergedItems = [...existingCategory.items, ...newCategory.items];
          const mergedSubCategories = [...existingCategory.subCategories, ...newCategory.subCategories];
          
          // Remove duplicates based on id
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
      
      state.categories = Array.from(existingCategoryMap.values());
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    incrementPage: (state) => {
      state.currentPage += 1;
    },
    setHasNext: (state, action) => {
      state.hasNext = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setLoadingMore: (state, action) => {
      state.isLoadingMore = action.payload;
    },
    setRefreshing: (state, action) => {
      state.isRefreshing = action.payload;
    },
    setLastFetchedPage: (state, action) => {
      state.lastFetchedPage = action.payload;
    },
    setCachedData: (state, action) => {
      state.cachedData = action.payload;
    },
    updateCategory: (state, action) => {
      const { categoryId, updates } = action.payload;
      const categoryIndex = state.categories.findIndex(cat => cat.id === categoryId);
      if (categoryIndex !== -1) {
        state.categories[categoryIndex] = { ...state.categories[categoryIndex], ...updates };
      }
    },
    updateItem: (state, action) => {
      const { categoryId, itemId, updates } = action.payload;
      const category = state.categories.find(cat => cat.id === categoryId);
      if (category) {
        const itemIndex = category.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
          category.items[itemIndex] = { ...category.items[itemIndex], ...updates };
        }
      }
    },
    addCategory: (state, action) => {
      state.categories.push(action.payload);
    },
    removeCategory: (state, action) => {
      state.categories = state.categories.filter(cat => cat.id !== action.payload);
    },
    clearMenuData: (state) => {
      state.categories = [];
      state.currentPage = 1;
      state.hasNext = true;
      state.lastFetchedPage = 0;
      state.cachedData = null;
    },
    resetPagination: (state) => {
      state.currentPage = 1;
      state.hasNext = true;
      state.lastFetchedPage = 0;
    },
  },
});

export const {
  setCategories,
  appendCategories,
  setCurrentPage,
  incrementPage,
  setHasNext,
  setLoading,
  setLoadingMore,
  setRefreshing,
  setLastFetchedPage,
  setCachedData,
  updateCategory,
  updateItem,
  addCategory,
  removeCategory,
  clearMenuData,
  resetPagination,
} = menuSlice.actions;

// Async thunks for caching
export const saveMenuDataToStorage = async (categories, lastPage) => {
  try {
    await AsyncStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(categories));
    await AsyncStorage.setItem(MENU_PAGE_KEY, JSON.stringify(lastPage));
  } catch (error) {
    console.error('❌ [MenuSlice] Error saving menu data to storage:', error);
  }
};

export const loadMenuDataFromStorage = async () => {
  try {
    const [cachedData, lastPageStr] = await Promise.all([
      AsyncStorage.getItem(MENU_STORAGE_KEY),
      AsyncStorage.getItem(MENU_PAGE_KEY),
    ]);
    
    if (cachedData) {
      const categories = JSON.parse(cachedData);
      const lastPage = lastPageStr ? JSON.parse(lastPageStr) : 0;
      return { categories, lastPage };
    }
    return null;
  } catch (error) {
    console.error('❌ [MenuSlice] Error loading menu data from storage:', error);
    return null;
  }
};

export const clearMenuDataFromStorage = async () => {
  try {
    await AsyncStorage.removeItem(MENU_STORAGE_KEY);
    await AsyncStorage.removeItem(MENU_PAGE_KEY);
  } catch (error) {
    console.error('❌ [MenuSlice] Error clearing menu data from storage:', error);
  }
};

export default menuSlice.reducer;
