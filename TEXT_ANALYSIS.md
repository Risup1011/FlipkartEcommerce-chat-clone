# RestaurantDetailsScreen - Text Analysis
## Backend vs Frontend Text Breakdown

---

## ✅ FROM BACKEND (Dynamic from API)

### Screen Level
1. **Screen Title**: `sectionData.title` (e.g., "Restaurant Details")
2. **Screen Description**: `sectionData.description` (InfoBanner text)

### Field Labels
3. **All Field Labels**: `field.label` (e.g., "State", "City", "Restaurant Name", "Owner Mobile Number", "Verify OTP", "WhatsApp Number", "Receive Kamai24 Updates on WhatsApp?")

### Field Properties
4. **Required Indicator**: `field.required` (shows asterisk *)
5. **Field Type**: `field.type` (dropdown, text, phone, otp, toggle)

### Placeholders (Partially Backend)
6. **Dropdown Placeholder**: `Select ${field.label}` (uses backend label)
7. **Text Input Placeholder**: `Enter ${field.label}` (uses backend label)
8. **OTP Placeholder**: `field.placeholder` (if provided, otherwise defaults to "Enter OTP")
9. **OTP Verify Button**: `field.verify_button_text` (if provided, otherwise defaults to "Verify OTP")

---

## ❌ FROM FRONTEND (Hardcoded)

### Loading States
1. **"Loading form..."** (Line 674) - Loading screen text
2. **"Loading options..."** (Line 492) - Dropdown loading indicator

### Error Messages
3. **"Failed to load form. Please try again."** (Line 689) - Error screen text
4. **"Form configuration not found"** (Line 116) - Toast error
5. **"Failed to load form"** (Line 122) - Toast error
6. **"Failed to load {fieldKey} options"** (Line 193) - Toast error

### Validation Messages
7. **"Please fill all required fields"** (Line 629) - Form validation
8. **"Please verify OTP for phone number"** (Line 640) - OTP validation

### OTP Related (Hardcoded)
9. **"Generate OTP"** (Line 535) - Button text for phone field
10. **"Verify OTP"** (Line 543, 552, 565) - Label and button text (hardcoded fallback)
11. **"Enter OTP"** (Line 549, 564) - Placeholder (hardcoded fallback)

### OTP Toast Messages
12. **"Please enter a valid phone number"** (Line 277) - Validation
13. **"OTP has been sent to your number"** (Line 324) - Success
14. **"Failed to send OTP"** (Line 329) - Error
15. **"Please enter OTP"** (Line 346) - Validation
16. **"Please generate OTP first"** (Line 352) - Validation
17. **"OTP verified successfully"** (Line 399) - Success
18. **"Invalid OTP. Please try again."** (Line 421) - Error
19. **"OTP has expired. Please request a new one."** (Line 423) - Error
20. **"Maximum attempts exceeded. Please try again later."** (Line 425) - Error
21. **"OTP verification endpoint not configured. Please check API setup."** (Line 419) - Error
22. **"Network error. Please try again."** (Line 436) - Network error

### Button Labels
23. **"Proceed"** (Line 727) - Submit button

### Success Messages
24. **"Restaurant details submitted successfully"** (Line 660) - Success toast

### Fallback Text
25. **"Restaurant Details"** (Line 668, 684, 703) - Fallback title if backend doesn't provide

---

## 🔄 HYBRID (Uses Backend + Frontend Template)

1. **Dropdown Placeholder**: `Select ${field.label}` - Template is frontend, label is backend
2. **Text Input Placeholder**: `Enter ${field.label}` - Template is frontend, label is backend
3. **Phone Input Placeholder**: `Enter ${field.label}` - Template is frontend, label is backend

---

## 📋 SUMMARY

### Total Backend-Controlled Text: **9 items**
- Screen title
- Screen description
- All field labels
- Required indicators
- Field types
- OTP placeholder (optional)
- OTP verify button text (optional)

### Total Frontend-Hardcoded Text: **25+ items**
- Loading states (2)
- Error messages (4)
- Validation messages (2)
- OTP labels/buttons (3)
- Toast messages (14+)
- Button labels (1)
- Fallback text (1)

### Recommendation
To make the screen fully backend-controlled, consider adding these fields to the backend API response:

```json
{
  "section_id": "RESTAURANT_DETAILS",
  "title": "Restaurant Details",
  "description": "...",
  "button_text": "Proceed",  // Add this
  "loading_text": "Loading form...",  // Add this
  "error_text": "Failed to load form. Please try again.",  // Add this
  "fields": [
    {
      "label": "Owner Mobile Number",
      "key": "owner_number",
      "type": "phone",
      "verify_otp": true,
      "generate_otp_button": "Generate OTP",  // Add this
      "otp_label": "Verify OTP",  // Add this
      "otp_placeholder": "Enter OTP",  // Add this
      "verify_button_text": "Verify OTP"  // Add this
    }
  ],
  "messages": {  // Add this section
    "validation": {
      "required_fields": "Please fill all required fields",
      "otp_not_verified": "Please verify OTP for phone number"
    },
    "otp": {
      "sent": "OTP has been sent to your number",
      "verified": "OTP verified successfully",
      "invalid": "Invalid OTP. Please try again.",
      "expired": "OTP has expired. Please request a new one.",
      "max_attempts": "Maximum attempts exceeded. Please try again later."
    },
    "success": {
      "form_submitted": "Restaurant details submitted successfully"
    }
  }
}
```
