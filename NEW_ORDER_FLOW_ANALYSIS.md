# 📋 New Order Flow - Complete Analysis

## 🔄 Complete Flow: From Receiving New Order to Acceptance

### **Step 1: Order Polling & Detection**
**Location:** `OrdersScreen.js` - Lines 665-692

1. **Polling Setup:**
   - Polls every **30 seconds** for new orders
   - Endpoint: `GET /v1/orders/by-status?status=NEW`
   - Uses `fetchOrdersByStatus('NEW')` function

2. **Initial Load:**
   - On component mount, fetches new orders immediately
   - Also fetches when tab changes or screen becomes active

---

### **Step 2: Fetching New Orders**
**Location:** `OrdersScreen.js` - Lines 494-590

**API Call:**
```javascript
GET ${API_BASE_URL}v1/orders/by-status?status=NEW
```

**Response Structure (from backend):**
```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "id": "691f90c0fcc4c726aa9a2a7d",
      "order_number": "#8483",
      "status": "NEW",
      "status_display": "New Order",
      "customer_name": "Rahul Sharma",
      "customer_phone": "+919876543210",
      "total_amount": 878.50,
      "items_preview": "Chicken Biryani x 1, Paneer Tikka x 1, Cold Coffee x 2",
      "item_count": 3,
      "delivery_address": "Flat 301, Tower A...",
      "payment_method": "ONLINE",
      "created_at": "2025-11-21T03:35:52.875",
      // ... more fields
    }
  ]
}
```

---

### **Step 3: Order Transformation**
**Location:** `OrdersScreen.js` - Lines 214-280

**Transformation Function:** `transformOrder(apiOrder)`

**Backend Fields → Frontend Fields:**
| Backend Field | Frontend Field | Notes |
|--------------|----------------|-------|
| `id` | `id` | ✅ Direct mapping |
| `order_number` | `orderNumber` | ✅ Direct mapping |
| `customer_name` | `customerName` | ✅ Direct (fallback: 'Customer') |
| `customer_phone` | `customerPhone` | ✅ Direct mapping |
| `total_amount` | `amount` | ✅ Direct (fallback: 0) |
| `created_at` | `createdAt`, `time`, `timeDisplay`, `dateDisplay` | ✅ Formatted from backend |
| `items_preview` | `itemsPreview`, `items`, `itemCount` | ✅ Parsed from backend |
| `delivery_address` | `deliveryAddress` | ✅ Direct (fallback: 'Address not available') |
| `preparation_time_minutes` | `estimatedTime` | ✅ Direct (can be null) |
| `estimated_ready_time` | `estimatedReadyTime` | ✅ Direct mapping |
| `status` | `status` | ✅ Direct mapping |
| `status_display` | `statusDisplay` | ✅ Direct mapping |
| `payment_method` | `paymentMethod` | ✅ Direct mapping |
| `is_assigned_to_rider` | `isAssignedToRider` | ✅ Direct (fallback: false) |
| `accepted_at` | `acceptedAt` | ✅ Direct mapping |
| `ready_at` | `readyAt` | ✅ Direct mapping |
| `picked_up_at` | `pickedUpAt` | ✅ Direct mapping |
| `rider_name` | `riderName` | ✅ Direct (can be null) |
| `rider_phone` | `riderPhone` | ✅ Direct (can be null) |
| `rider_image` | `riderImage` | ✅ Direct (can be null) |
| `packaging_charge` | `packagingCharge` | ✅ Direct (fallback: 0) |
| `gst` or `tax` | `gst` | ✅ Direct (fallback: 0) |
| `delivery_time` | `deliveryTime` | ✅ Direct (can be null) |
| `delivery_distance` | `deliveryDistance` | ✅ Direct (can be null) |
| `delivery_rating` or `rating` | `deliveryRating` | ✅ Direct (can be null) |
| `estimated_arrival_time` or `arrival_time` | `estimatedArrivalTime` | ✅ Direct (can be null) |

**⚠️ Hardcoded Fallbacks:**
- `customerName`: Falls back to `'Customer'` if not provided
- `amount`: Falls back to `0` if not provided
- `deliveryAddress`: Falls back to `'Address not available'` if not provided
- `isAssignedToRider`: Falls back to `false` if not provided
- `packagingCharge`: Falls back to `0` if not provided
- `gst`: Falls back to `0` if not provided

---

### **Step 4: State Update & Banner Display**
**Location:** `OrdersScreen.js` - Lines 529-574

1. **Update Orders State:**
   ```javascript
   setOrdersByStatus(prev => ({
     ...prev,
     NEW: newOrders,
   }))
   ```

2. **Update Banner Count:**
   ```javascript
   setOrderCount(newOrders.length)
   ```

3. **Auto-Open Modal Logic:**
   - If new orders arrive (count increased): Auto-open modal
   - If first load with orders: Auto-open modal
   - Shows green banner at top with count

---

### **Step 5: New Orders Modal Display**
**Location:** `NewOrdersScreen.js` - Lines 27-398

**Features:**
- ✅ **Notification Sound/Vibration** (when modal opens)
- ✅ **Order Cards Display** (shows all NEW orders)
- ✅ **Click to View Details** (opens OrderDetailsScreen)

**Order Card Displays:**
- Order Number (from backend: `order_number`)
- Customer Name (from backend: `customer_name`)
- Amount (from backend: `total_amount`)
- Items Preview (from backend: `items_preview`)
- Time (formatted from backend: `created_at`)
- Payment Method (from backend: `payment_method`)

**All data is dynamic from backend! ✅**

---

### **Step 6: View Order Details**
**Location:** `OrderDetailsScreen.js` - Lines 20-635

**Two Ways to Load Details:**

**Option A: Using Order Object (from list)**
- Uses `order` prop directly
- No additional API call

**Option B: Fetching by Order ID**
- API: `GET /v1/orders/{orderId}`
- Fetches full order details with all items, pricing, etc.

**Full Order Details API Response:**
```json
{
  "code": 200,
  "status": "success",
  "data": {
    "id": "691f90c0fcc4c726aa9a2a7d",
    "order_number": "#8483",
    "status": "NEW",
    "items": [
      {
        "menu_item_id": "029639ea-16d1-4d75-9220-24ce5402a4e9",
        "item_name": "Chicken Biryani",
        "item_type": "NON_VEG",
        "quantity": 1,
        "base_price": 220.00,
        "selected_variant": {
          "variant_id": "9bb2b5a6-f3f9-47c2-8483-ac6905bb88e2",
          "variant_name": "Portion Size",
          "option_name": "Full",
          "additional_price": 140.00
        },
        "selected_addons": [
          {
            "addon_id": "0006ab79-64b9-4558-8b62-443b33c91f66",
            "addon_name": "Raita",
            "price": 30.00
          }
        ],
        "item_total": 390.00,
        "special_instructions": "Less spicy please"
      }
    ],
    "pricing": {
      "item_total": 770.00,
      "packaging_charge": 30.00,
      "delivery_charge": 40.00,
      "gst_amount": 38.50,
      "discount_amount": 0.00,
      "total_amount": 878.50
    },
    "customer_details": {
      "name": "Rahul Sharma",
      "phone": "+919876543210",
      "email": "rahul.sharma@example.com"
    },
    "delivery_address": {
      "address_line1": "Flat 301, Tower A, Green Valley",
      "address_line2": "Sector 18",
      "landmark": "Near Metro Station",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301",
      "latitude": 28.5355,
      "longitude": 77.391
    },
    "payment_method": "ONLINE",
    "payment_status": "PAID",
    "special_instructions": "Please ring doorbell twice",
    "status_timeline": [
      {
        "status": "NEW",
        "timestamp": "2025-11-21T03:35:52.869",
        "remarks": "Order placed by customer"
      }
    ],
    "created_at": "2025-11-21T03:35:52.875",
    "accepted_at": null,
    "ready_at": null,
    "picked_up_at": null,
    "delivered_at": null
  }
}
```

**All fields displayed are from backend! ✅**

---

### **Step 7: Accept Order**
**Location:** `OrderDetailsScreen.js` - Lines 247-304

**API Call:**
```javascript
PUT ${API_BASE_URL}v1/orders/${orderData.id}/accept
```

**Request Body:**
```json
{
  "preparation_time_minutes": 30,
  "remarks": "Order accepted. Will be ready in 30 minutes"
}
```

**⚠️ User Input:**
- `preparation_time_minutes`: User selects from time picker (default: 15 minutes)
- `remarks`: Auto-generated from selected time

**Response (from your example):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Order accepted successfully",
  "data": {
    "id": "691f90c0fcc4c726aa9a2a7d",
    "status": "PREPARING",
    "preparation_time_minutes": 30,
    "estimated_ready_time": "2025-11-21T05:04:39.919723",
    "accepted_at": "2025-11-21T04:34:39.919749",
    // ... full order data with updated status
  }
}
```

**After Acceptance:**
1. ✅ Order status changes to `PREPARING`
2. ✅ `accepted_at` timestamp is set
3. ✅ `estimated_ready_time` is calculated
4. ✅ Order moves from NEW → PREPARING tab
5. ✅ Screen closes after 1.5 seconds
6. ✅ Orders list refreshes

---

## ✅ What's Dynamic from Backend

### **Order Data (100% Dynamic)**
- ✅ Order ID, Order Number
- ✅ Customer Name, Phone, Email
- ✅ Order Amount, Items, Pricing Breakdown
- ✅ Delivery Address (full details)
- ✅ Payment Method, Payment Status
- ✅ Order Status, Status Display
- ✅ Timestamps (created, accepted, ready, picked up, delivered)
- ✅ Preparation Time, Estimated Ready Time
- ✅ Rider Information (if assigned)
- ✅ Special Instructions
- ✅ Status Timeline
- ✅ Items with variants, addons, prices

### **UI Labels (Dynamic from Config API)**
**Location:** `OrdersScreen.js` - Lines 735-781

**Config API:** `GET /v1/partner/config`

**Dynamic Labels:**
- ✅ Tab labels (Preparing, Ready, Picked Up, Past Orders)
- ✅ Business name
- ✅ Online/Offline status
- ✅ Closing info

**Fallback Labels (if config fails):**
- ⚠️ "Preparing", "Ready", "Picked Up", "Past Orders" (hardcoded)

---

## ⚠️ What's Hardcoded (Not from Backend)

### **1. Time Formatting**
- Formatting logic is frontend (but uses backend timestamps)
- "Just now", "X mins ago" calculations

### **2. Default Preparation Time**
- Default: 15 minutes (user can change)
- Time picker options: 15, 30, 45, 60 minutes

### **3. Polling Interval**
- Hardcoded: 30 seconds
- Location: `OrdersScreen.js` - Line 676

### **4. Fallback Values**
- `customerName`: 'Customer' (if not provided)
- `amount`: 0 (if not provided)
- `deliveryAddress`: 'Address not available' (if not provided)

### **5. UI Messages**
- Toast messages (success, error)
- Loading states
- Error messages

### **6. Modal Auto-Open Logic**
- Logic to detect new orders and auto-open modal
- Sound/vibration triggers

---

## 🔍 Verification Checklist

### ✅ **Order Data - All Dynamic**
- [x] Order ID from backend
- [x] Order number from backend
- [x] Customer details from backend
- [x] Items from backend
- [x] Pricing from backend
- [x] Address from backend
- [x] Status from backend
- [x] Timestamps from backend
- [x] Payment info from backend

### ✅ **Order Acceptance - All Dynamic**
- [x] API endpoint uses order ID from backend
- [x] Request body uses user input (preparation time)
- [x] Response updates order status dynamically
- [x] Response provides new timestamps
- [x] Order moves to correct tab based on status

### ⚠️ **Minor Hardcoded Elements**
- [ ] Default preparation time (15 min) - user can change
- [ ] Polling interval (30 sec) - could be configurable
- [ ] Fallback text values - only used if backend doesn't provide
- [ ] Toast messages - UI feedback only

---

## 📊 Summary

### **Backend-Driven (95%+)**
- ✅ All order data
- ✅ All customer data
- ✅ All pricing data
- ✅ All status information
- ✅ All timestamps
- ✅ Tab labels (from config API)
- ✅ Business info (from config API)

### **Frontend Logic (5%)**
- ⚠️ Time formatting (uses backend timestamps)
- ⚠️ Polling mechanism (fetches from backend)
- ⚠️ UI state management
- ⚠️ Fallback values (only if backend missing)
- ⚠️ Toast messages (UI feedback)

**Conclusion:** The entire order flow is **highly dynamic** from the backend. All critical data comes from API responses. Only UI logic, formatting, and fallback values are frontend-controlled.
