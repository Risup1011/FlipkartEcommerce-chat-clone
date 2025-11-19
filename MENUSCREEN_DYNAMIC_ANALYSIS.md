# MenuScreen - Dynamic vs Hardcoded Analysis

## ✅ FROM BACKEND (100% Dynamic)

### 1. Header Data (from `configData.partner_info`)
- **Business Name**: `configData?.partner_info?.business_name` (with fallback: "Restaurant Name")
- **Online Status**: `configData?.partner_info?.online_status` (with fallback: "Online")
- **Closing Info**: `configData?.partner_info?.closing_info` (with fallback: "Closes at 12:00 am, Tomorrow")
- **Source**: `v1/config` API endpoint

### 2. Catalog Data (from `complete-catalog` API)
- **Categories**: All data from API
  - `id`, `name`, `description`, `display_order`, `is_active`, `created_at`, `updated_at`
- **Subcategories**: All data from API
  - `id`, `name`, `description`, `display_order`, `is_active`, `category_id`, `category_name`
- **Menu Items**: All data from API
  - `id`, `name`, `description`, `price`, `item_type`, `packaging_price`, `gst_rate`, `is_active`, `display_order`, `image_urls`, `sub_category_id`
- **Source**: `v1/catalog/orchestrator/complete-catalog` API endpoint

### 3. API Endpoints (All Dynamic)
- **Create Category**: `POST v1/catalog/categories`
- **Update Category**: `PUT v1/catalog/categories/{categoryId}`
- **Delete Category**: `DELETE v1/catalog/categories/{categoryId}`
- **Create Subcategory**: `POST v1/catalog/categories/{categoryId}/subcategories`
- **Update Subcategory**: `PUT v1/catalog/categories/{categoryId}/subcategories/{subCategoryId}`
- **Delete Subcategory**: `DELETE v1/catalog/categories/{categoryId}/subcategories/{subCategoryId}`
- **Create Item**: `POST v1/catalog/categories/{categoryId}/items`
- **Update Item**: `PUT v1/catalog/items/{itemId}`
- **Update Item Status**: `PATCH v1/catalog/items/{itemId}/status`
- **Upload Item Images**: `POST v1/catalog/items/{itemId}/images`

---

## ❌ FROM FRONTEND (Hardcoded - NOT from API)

### 1. UI Labels & Text
- **Tab Labels**:
  - "Menu Items" (Line 1028)
  - "Add-ons" (Line 1044)
- **Button Text**:
  - "+ Create Category" (Line 1053)
  - "+ Create New Addon" (Line 1053)
- **Search Placeholder**: "Search For Items" (Line 1067)
- **Action Text**:
  - "Add an item" (Line 1173)
  - "ADD NEW SUB-CATEGORY" (Line 1186)
  - "Edit Info" (Lines 1079, 1160)
  - "Edit" (Menu options)
  - "Delete" (Menu options)

### 2. Toast Messages (All Hardcoded)
- **Success Messages**:
  - "Category created successfully"
  - "Category updated successfully"
  - "Sub-category created successfully"
  - "Sub-category updated successfully"
  - "Item created successfully"
  - "Item updated successfully"
  - "Item activated successfully"
  - "Item deactivated successfully"
  - "Item images uploaded successfully"
  - "Add-on created successfully"
- **Error Messages**:
  - "Failed to fetch catalog"
  - "Failed to create category"
  - "Failed to update category"
  - "Failed to create sub-category"
  - "Failed to update sub-category"
  - "Failed to create item"
  - "Failed to update item"
  - "Failed to update item status"
  - "Category not selected"
  - "Item ID is missing"
  - "Invalid response from server"

### 3. Alert Messages (All Hardcoded)
- **Delete Category Alert**:
  - Title: "Delete Category"
  - Message: "Are you sure you want to delete "{category.name}"? This action cannot be undone."
  - Buttons: "Cancel", "Delete"
- **Delete Subcategory Alert**:
  - Title: "Delete Sub-Category"
  - Message: "Are you sure you want to delete "{subCategory.name}"? This action cannot be undone."
  - Buttons: "Cancel", "Delete"

### 4. Empty State Messages
- **No Categories**: "No Categories!" (Line 1098)
- **No Items**: "No items in this category" (Line 1326)

### 5. Loading States
- **Loading Indicator**: Uses ActivityIndicator (no text, but could be dynamic)

### 6. UI Labels Available but Not Used
- **`catalogData.ui_labels`**: Logged but not used (Line 139-140)
- **`catalogData.partner_info`**: Used for header only

---

## 📊 SUMMARY

### Dynamic (Backend-Controlled): ✅
- **All catalog data** (categories, subcategories, items) - 100% from API
- **Header information** (business name, status, closing info) - from config API
- **All API endpoints** - correctly implemented
- **Data structure** - follows API response format

### Hardcoded (Frontend): ❌
- **UI Labels**: 8+ hardcoded text strings
- **Toast Messages**: 20+ hardcoded messages
- **Alert Messages**: 2 alert dialogs with hardcoded text
- **Empty States**: 2 hardcoded messages

### Total Hardcoded Text: **~30+ items**

---

## 🔄 RECOMMENDATIONS

### To Make Fully Dynamic:

1. **Use `catalogData.ui_labels`** (already available in API response):
   ```javascript
   const uiLabels = catalogData.ui_labels || {};
   const menuItemsLabel = uiLabels.menu_items || 'Menu Items';
   const addonsLabel = uiLabels.addons || 'Add-ons';
   ```

2. **Add UI Labels to Config API**:
   ```json
   {
     "ui_labels": {
       "menu_items": "Menu Items",
       "addons": "Add-ons",
       "create_category": "+ Create Category",
       "create_addon": "+ Create New Addon",
       "search_placeholder": "Search For Items",
       "add_item": "Add an item",
       "add_subcategory": "ADD NEW SUB-CATEGORY",
       "edit_info": "Edit Info",
       "edit": "Edit",
       "delete": "Delete",
       "no_categories": "No Categories!",
       "no_items": "No items in this category"
     },
     "messages": {
       "category_created": "Category created successfully",
       "category_updated": "Category updated successfully",
       "category_deleted": "Category deleted successfully",
       // ... etc
     }
   }
   ```

3. **Use Dynamic Messages**:
   ```javascript
   const messages = configData?.messages || {};
   showToast(messages.category_created || 'Category created successfully', 'success');
   ```

---

## ✅ CURRENT STATUS

**Data Flow**: ✅ 100% Dynamic
- All categories, subcategories, and items come from backend API
- Header data comes from config API
- All CRUD operations use correct API endpoints

**UI Text**: ⚠️ Partially Hardcoded
- Data is dynamic, but UI labels and messages are hardcoded
- Backend provides `ui_labels` but they're not being used
- Toast and alert messages are all hardcoded

**Recommendation**: The screen works perfectly with dynamic data. UI labels can be made dynamic if needed by using the `ui_labels` from the API response.
