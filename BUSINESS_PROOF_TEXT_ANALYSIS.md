# Business Proof Screen (DynamicFormScreen) - Text Analysis
## Frontend Hardcoded Text (NOT from API)

---

## ✅ FROM BACKEND (Dynamic from API)

### Screen Level
1. **Screen Title**: `sectionData.title` (e.g., "Business Proof")
2. **Screen Description**: `sectionData.description` (InfoBanner text)
3. **Button Text**: `sectionData.button_text` (with fallback "Proceed")

### Field Labels
4. **All Field Labels**: `field.label` (e.g., "Document Type", "Registration / License Number", "Expiry Date", "Upload Document")
5. **Required Indicator**: `field.required` (shows asterisk *)
6. **Field Type**: `field.type` (dropdown, text, date, file)

### Field Properties
7. **Date Placeholder**: `field.placeholder` (with fallback "DD/MM/YYYY")
8. **File Upload Label**: `field.upload_label` (with fallback)
9. **File Types**: `field.file_types` (from backend, used in subtext)
10. **File Max Size**: `field.max_size_mb` (from backend, used in subtext)

---

## ❌ FROM FRONTEND (Hardcoded - NOT from API)

### Error/Status Messages
1. **"Form configuration not found"** (Line 135) - Toast error
2. **"Failed to load form"** (Line 141) - Toast error
3. **"Failed to select image from gallery"** (Line 330) - Toast error
4. **"Failed to take photo"** (Line 350) - Toast error
5. **"Failed to select file"** (Line 376) - Toast error
6. **"File selected successfully"** (Line 403) - Toast success
7. **"File type not allowed. Allowed types: {types}"** (Line 395) - Toast error (uses backend types but message template is frontend)
8. **"File size exceeds {maxSizeMB}MB limit"** (Line 401) - Toast error (uses backend size but message template is frontend)

### Validation Messages (with backend fallbacks)
9. **"Please enter a valid phone number"** (Line 411) - Fallback if backend message not available
10. **"Please enter OTP"** (Line 482) - Fallback if backend message not available
11. **"Please generate OTP first"** (Line 489) - Fallback if backend message not available
12. **"Please fill all required fields"** (Line 828) - Fallback if backend message not available
13. **"Form submitted successfully"** (Line 850) - Fallback if backend message not available

### OTP Related (with backend fallbacks)
14. **"Generate OTP"** (Line 729) - Button text fallback
15. **"Verify OTP"** (Line 737, 746, 758) - Label/button text fallback
16. **"Enter OTP"** (Line 743, 757) - Placeholder fallback
17. **"OTP has been sent to your number"** (Line 459) - Toast fallback
18. **"OTP verified successfully"** (Line 537) - Toast fallback
19. **"Invalid OTP. Please try again."** (Line 549) - Toast fallback
20. **"OTP has expired. Please request a new one."** (Line 551) - Toast fallback
21. **"Maximum attempts exceeded. Please try again later."** (Line 553) - Toast fallback
22. **"OTP verification endpoint not configured. Please check API setup."** (Line 545) - Toast fallback

### Placeholder Templates (uses backend label but template is frontend)
23. **`Select ${field.label}`** (Line 618) - Dropdown placeholder template
24. **`Enter ${field.label}`** (Line 642, 726) - Text/phone input placeholder template

### File Upload Related
25. **"Drag and drop or browse files to upload"** (Line 702) - File upload label fallback
26. **`[Max: ${maxSizeMB}MB] (${fileTypes.join('/')})`** (Line 693) - File upload subtext template (uses backend values but format is frontend)

### Upload Bottom Sheet (UploadBottomSheet.js)
27. **"Choose an option"** (Line 26) - Bottom sheet title
28. **"Gallery"** (Line 36) - Option text
29. **"Camera"** (Line 47) - Option text
30. **"Files"** (Line 58) - Option text
31. **"Cancel"** (Line 66) - Cancel button text

### Loading/Error States
32. **"Loading..."** (Line 861) - Loading screen title fallback
33. **"Error"** (Line 874) - Error screen title
34. **"Form"** (Line 892) - Fallback title if backend doesn't provide

### Network Errors
35. **"Network error. Please check your connection."** (Line 149) - Network error toast
36. **"Network error. Please try again."** (Line 477, 567) - Network error toast

---

## 🔄 HYBRID (Uses Backend + Frontend Template)

1. **Dropdown Placeholder**: `Select ${field.label}` - Template is frontend, label is backend
2. **Text Input Placeholder**: `Enter ${field.label}` - Template is frontend, label is backend
3. **File Upload Subtext**: `[Max: ${maxSizeMB}MB] (${fileTypes.join('/')})` - Format is frontend, values are backend
4. **File Type Error**: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` - Message template is frontend, types are backend
5. **File Size Error**: `File size exceeds ${maxSizeMB}MB limit` - Message template is frontend, size is backend

---

## 📋 SUMMARY FOR BUSINESS_PROOF SCREEN

### Total Backend-Controlled Text: **10 items**
- Screen title
- Screen description
- Button text (with fallback)
- All field labels
- Required indicators
- Field types
- Date placeholder (optional)
- File upload label (optional)
- File types (from backend)
- File max size (from backend)

### Total Frontend-Hardcoded Text: **36+ items**
- Error messages (8)
- Validation messages (5)
- OTP labels/buttons (3)
- Toast messages (14+)
- Placeholder templates (2)
- File upload text (2)
- Upload bottom sheet (5)
- Loading/error states (2)
- Network errors (2)

### Upload Bottom Sheet (Separate Component)
- "Choose an option"
- "Gallery"
- "Camera"
- "Files"
- "Cancel"

---

## 🎯 RECOMMENDATION

To make Business Proof screen fully backend-controlled, add these to the backend API response:

```json
{
  "section_id": "BUSINESS_PROOF",
  "title": "Business Proof",
  "description": "...",
  "button_text": "Proceed",
  "fields": [
    {
      "label": "Upload Document",
      "key": "document_file",
      "type": "file",
      "upload_label": "Drag and drop or browse files to upload",  // Add this
      "file_types": ["jpg", "jpeg", "png", "pdf"],
      "max_size_mb": 5,
      "file_size_text": "[Max: 5MB] (jpg/jpeg/png/pdf)",  // Add this
      "required": true
    },
    {
      "label": "Expiry Date (if applicable)",
      "key": "expiry_date",
      "type": "date",
      "placeholder": "DD/MM/YYYY",  // Already supported
      "required": false
    }
  ],
  "messages": {  // Add this section
    "validation": {
      "required_fields": "Please fill all required fields",
      "invalid_phone": "Please enter a valid phone number",
      "enter_otp": "Please enter OTP",
      "generate_otp_first": "Please generate OTP first"
    },
    "file": {
      "selected": "File selected successfully",
      "type_error": "File type not allowed. Allowed types: {types}",
      "size_error": "File size exceeds {maxSizeMB}MB limit",
      "gallery_error": "Failed to select image from gallery",
      "camera_error": "Failed to take photo",
      "file_error": "Failed to select file"
    },
    "upload": {
      "title": "Choose an option",
      "gallery": "Gallery",
      "camera": "Camera",
      "files": "Files",
      "cancel": "Cancel"
    },
    "success": {
      "form_submitted": "Form submitted successfully"
    },
    "error": {
      "form_not_found": "Form configuration not found",
      "load_failed": "Failed to load form",
      "network_error": "Network error. Please check your connection."
    }
  }
}
```
