# ItemImageTimingScreen - Text Analysis
## Frontend vs Backend Content Breakdown

---

## ✅ FROM BACKEND API (Dynamic from API)
*These values come from `v1/onboarding/sections` with `section_id: 'ITEM_IMAGE_TIMING'`*

### Screen Level
1. **Screen Title**: `screenData.title` (e.g., "Item Image")
2. **Image Section Title**: `screenData.image_section.title` (e.g., "Item Image")
3. **Timing Section Title**: `screenData.timing_section.title` (e.g., "Item Timing")

### Image Configuration
4. **Formats**: `screenData.image_config.formats` (array, e.g., ['JPG', 'PNG'])
5. **Dimension**: `screenData.image_config.dimension` (e.g., "133 px x 133 px")
6. **Max Size**: `screenData.image_config.max_size_mb` (e.g., 20)
7. **Quality Note**: `screenData.image_config.quality_note` (e.g., "Quality should be same as you serve for dine-in customers.")
8. **Upload Button Text**: `screenData.image_section.upload_button_text` (e.g., "BROWSE FILES TO UPLOAD")

### Timing Section
9. **Timing Instruction**: `screenData.timing_section.instruction` (e.g., "Please specify the timing when this item will be available on kamai")
10. **Timing Warning**: `screenData.timing_section.warning` (e.g., "Each day can have only maximum of 3 timeslots.")
11. **Timing Options**: `screenData.timing_options` (array of 3 options)

### Buttons
12. **Delete Button**: `screenData.buttons.delete` (e.g., "Delete")
13. **Submit Button**: `screenData.buttons.submit` (e.g., "SUBMIT")

### Messages - Success
14. **Images Added**: `screenData.messages.success.images_added` (supports `{count}` placeholder)
15. **Image Removed**: `screenData.messages.success.image_removed`
16. **Item Deleted**: `screenData.messages.success.item_deleted`
17. **Images Uploaded**: `screenData.messages.success.images_uploaded`

### Messages - Error
18. **Image Selection Failed**: `screenData.messages.error.image_selection_failed`
19. **Upload Failed**: `screenData.messages.error.upload_failed`

### Messages - Validation
20. **File Size Exceeded**: `screenData.messages.validation.file_size_exceeded` (supports `{fileName}` and `{maxSize}` placeholders)
21. **Images Required**: `screenData.messages.validation.images_required`
22. **Item ID Required**: `screenData.messages.validation.item_id_required`

### Messages - Alerts
23. **Remove Image Title**: `screenData.messages.remove_image.title`
24. **Remove Image Message**: `screenData.messages.remove_image.message`
25. **Remove Image Cancel**: `screenData.messages.remove_image.cancel`
26. **Remove Image Confirm**: `screenData.messages.remove_image.confirm`
27. **Delete Item Title**: `screenData.messages.delete_item.title`
28. **Delete Item Message**: `screenData.messages.delete_item.message`
29. **Delete Item Cancel**: `screenData.messages.delete_item.cancel`
30. **Delete Item Confirm**: `screenData.messages.delete_item.confirm`

### Messages - Upload Progress
31. **Upload Progress Text**: `screenData.messages.uploading.progress` (supports `{current}` and `{total}` placeholders)

---

## ❌ FROM FRONTEND (Hardcoded Fallbacks)
*These are shown ONLY when API fails or data is missing*

### Loading State
1. **"Loading..."** (Line 381) - Loading screen text (hardcoded, no API fallback)

### Default Fallback Values (when API data is missing)
2. **"Item Image"** - Default screen title
3. **"Item Image"** - Default image section title
4. **['JPG', 'PNG']** - Default formats array
5. **"133 px x 133 px"** - Default dimension
6. **20** - Default max size in MB
7. **"Quality should be same as you serve for dine-in customers."** - Default quality note
8. **"BROWSE FILES TO UPLOAD"** - Default upload button text
9. **"Item Timing"** - Default timing section title
10. **"Please specify the timing when this item will be available on kamai"** - Default timing instruction
11. **"Each day can have only maximum of 3 timeslots."** - Default timing warning
12. **Default timing options array** (3 hardcoded options):
    - "Item is available at all times when kitchen / restaurant is open on kamai"
    - "Item is available at same time for all days of the week"
    - "Item is available at different times during different days of the weeks"
13. **"Delete"** - Default delete button text
14. **"SUBMIT"** - Default submit button text

### Default Error/Success Messages (when API messages are missing)
15. **"Image exceeds {maxSize}MB limit"** - Default file size error
16. **"{count} image(s) added"** - Default images added success
17. **"Failed to select images"** - Default selection error
18. **"Remove Image"** - Default remove alert title
19. **"Are you sure you want to remove this image?"** - Default remove alert message
20. **"Cancel"** - Default cancel button text
21. **"Remove"** - Default remove confirm text
22. **"Image removed"** - Default remove success
23. **"Delete Item"** - Default delete alert title
24. **"Are you sure you want to delete this item?"** - Default delete alert message
25. **"Delete"** - Default delete confirm text
26. **"Item deleted"** - Default delete success
27. **"Item ID is missing"** - Default validation error
28. **"Failed to upload image"** - Default upload error
29. **"Please upload at least one image"** - Default validation error
30. **"Failed to upload images. Please try again."** - Default upload error
31. **"Images uploaded successfully"** - Default upload success
32. **"UPLOADING... ({current}/{total})"** - Default upload progress text

### UI Elements (Always Hardcoded)
33. **Cloud Icon (☁️)** - Upload area icon (emoji, hardcoded)
34. **Checkmark (✓)** - Image uploaded indicator (hardcoded)
35. **Remove Button (×)** - Remove image button (hardcoded)
36. **Warning Icon (⚠️)** - Timing warning icon (emoji, hardcoded)
37. **Radio Button UI** - Visual radio button component (hardcoded styling)

---

## 📋 Summary

### Total Dynamic Fields: **31**
- Screen titles, labels, instructions: **11 fields**
- Messages (success, error, validation, alerts): **20 fields**

### Total Hardcoded Fallbacks: **37**
- Loading text: **1 field**
- Default values: **14 fields**
- Default messages: **18 fields**
- UI elements: **4 fields**

### Key Points:
- ✅ **All user-facing text can be controlled by backend API**
- ✅ **Screen works even if API fails (uses fallbacks)**
- ✅ **Supports placeholder replacement** (`{count}`, `{fileName}`, `{maxSize}`, `{current}`, `{total}`)
- ⚠️ **Loading text is hardcoded** (minor - could be made dynamic)
- ⚠️ **UI icons are hardcoded** (emojis - could be made dynamic via icon URLs)

---

## 🔄 API Response Structure Expected

```json
{
  "code": 200,
  "status": "success",
  "data": {
    "sections": [
      {
        "section_id": "ITEM_IMAGE_TIMING",
        "title": "Item Image",
        "image_section": {
          "title": "Item Image",
          "upload_button_text": "BROWSE FILES TO UPLOAD"
        },
        "image_config": {
          "formats": ["JPG", "PNG"],
          "dimension": "133 px x 133 px",
          "max_size_mb": 20,
          "quality_note": "Quality should be same as you serve for dine-in customers."
        },
        "timing_section": {
          "title": "Item Timing",
          "instruction": "Please specify the timing when this item will be available on kamai",
          "warning": "Each day can have only maximum of 3 timeslots."
        },
        "timing_options": [
          "Item is available at all times when kitchen / restaurant is open on kamai",
          "Item is available at same time for all days of the week",
          "Item is available at different times during different days of the weeks"
        ],
        "buttons": {
          "delete": "Delete",
          "submit": "SUBMIT"
        },
        "messages": {
          "success": {
            "images_added": "{count} image(s) added",
            "image_removed": "Image removed",
            "item_deleted": "Item deleted",
            "images_uploaded": "Images uploaded successfully"
          },
          "error": {
            "image_selection_failed": "Failed to select images",
            "upload_failed": "Failed to upload images"
          },
          "validation": {
            "file_size_exceeded": "Image {fileName} exceeds {maxSize}MB limit",
            "images_required": "Please upload at least one image",
            "item_id_required": "Item ID is missing"
          },
          "remove_image": {
            "title": "Remove Image",
            "message": "Are you sure you want to remove this image?",
            "cancel": "Cancel",
            "confirm": "Remove"
          },
          "delete_item": {
            "title": "Delete Item",
            "message": "Are you sure you want to delete this item?",
            "cancel": "Cancel",
            "confirm": "Delete"
          },
          "uploading": {
            "progress": "UPLOADING... ({current}/{total})"
          }
        }
      }
    ]
  }
}
```
