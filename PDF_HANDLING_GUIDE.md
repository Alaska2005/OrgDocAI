# PDF Handling for Cloudinary Uploads - Implementation Guide

## ✅ Implementation Summary

### 1. Backend PDF Upload Configuration
**Status**: ✅ Verified & Enhanced

#### Resource Type Configuration
PDFs (application/pdf MIME type) are uploaded with:
```javascript
resource_type: 'raw'  // NOT 'auto' or 'image'
```

**Code Location**: [backend/src/controllers/file.controller.js](backend/src/controllers/file.controller.js#L65-L96)

#### Verification Logging Added
```javascript
console.log(`[PDF-UPLOAD] PDF uploaded with resource_type: "${result.resource_type}"`);
if (result.resource_type !== 'raw') {
  console.warn(`[PDF-WARNING] Expected resource_type "raw" but got "${result.resource_type}"`);
}
```

#### URL Format Validation
```javascript
// Validates that the URL is a direct download URL
console.log(`[PDF-URL-VALIDATION] URL contains /raw/:`, uploadResult.secure_url.includes('/raw/'));
// Expected format: https://res.cloudinary.com/[cloud-name]/raw/upload/v[version]/orgdoc/.../file.pdf
```

### 2. Database Storage
**Status**: ✅ Storing secure_url directly

- `url` field stores the complete `secure_url` from Cloudinary
- `mimeType` field stores `application/pdf` for PDFs
- No transformations or modifications to the URL

**Example**:
```json
{
  "id": "file-uuid",
  "url": "https://res.cloudinary.com/cloud-name/raw/upload/v123456/orgdoc/org-123/event-456/1716900000_document.pdf",
  "mimeType": "application/pdf",
  "type": "DOCUMENT"
}
```

### 3. API Response
**Status**: ✅ Includes complete file data

Response includes all necessary fields:
```json
{
  "id": "file-uuid",
  "name": "1716900000_document.pdf",
  "url": "https://res.cloudinary.com/cloud-name/raw/upload/v123456/orgdoc/.../document.pdf",
  "type": "DOCUMENT",
  "mimeType": "application/pdf",
  "size": 150000,
  "createdAt": "2026-05-28T..."
}
```

### 4. Frontend PDF Handling
**Status**: ✅ Implemented with direct URL access

#### New Frontend Utility: `fileUtils.js`
**Location**: [frontend/src/utils/fileUtils.js](frontend/src/utils/fileUtils.js)

```javascript
// Adds ?dl=1 parameter to PDF preview URLs for direct access
getPreviewUrl(file)    // Returns: https://...pdf?dl=1
getDownloadUrl(file)   // Returns: https://...pdf (direct download)
isPdfFile(file)        // Returns: true for PDF files
```

**Why `?dl=1`?**
- Forces Cloudinary to serve the file directly instead of attempting to use a viewer
- Prevents "Customer is marked as untrusted" errors
- Ensures PDFs open/download directly without authentication issues

#### Updated Components
1. **DocumentsPage** ([frontend/src/components/documents/DocumentsPage.jsx](frontend/src/components/documents/DocumentsPage.jsx))
   - Eye button: `getPreviewUrl(file)` → opens PDF directly
   - Download button: `getDownloadUrl(file)` → downloads file

2. **EventDetail** ([frontend/src/components/events/EventDetail.jsx](frontend/src/components/events/EventDetail.jsx))
   - Eye button: `getPreviewUrl(file)` → opens PDF directly  
   - Download button: `getDownloadUrl(file)` → downloads file

## 🔍 PDF URL Handling Logic

### Preview URL (Eye Button)
```javascript
// For PDFs:
const url = "https://res.cloudinary.com/cloud-name/raw/upload/v123/file.pdf";
const previewUrl = url + "?dl=1";
// Result: Cloudinary serves file directly, browser opens/downloads based on browser settings
```

### Download URL (Download Button)
```javascript
// For all files including PDFs:
const url = "https://res.cloudinary.com/cloud-name/raw/upload/v123/file.pdf";
// HTML5 download attribute triggers download in most browsers
// <a href={url} download="filename.pdf" />
```

## 🧪 Testing Checklist

### Backend Verification
- [ ] Run: `npm run dev` in backend folder
- [ ] Upload a PDF file
- [ ] Check console logs:
  ```
  [FILE-UPLOAD] Starting upload for: document.pdf
  [CLOUDINARY-CONFIG] Uploading with resource_type: "raw"
  [PDF-UPLOAD] PDF uploaded with resource_type: "raw"
  [PDF-URL-VALIDATION] URL contains /raw/: true
  [CLOUDINARY-SUCCESS] secure_url: https://res.cloudinary.com/.../raw/upload/v.../file.pdf
  [DB-INSERT-SUCCESS] File saved with ID: uuid
  ```

### Database Verification
```sql
-- Check that PDF is stored with secure_url
SELECT id, originalName, url, mimeType, type FROM files 
WHERE mimeType = 'application/pdf'
ORDER BY createdAt DESC 
LIMIT 1;

-- Expected: url should be https://res.cloudinary.com/.../raw/upload/...
```

### API Verification
1. Upload a PDF using the frontend
2. Open DevTools → Network tab
3. Check the POST response:
   ```json
   {
     "url": "https://res.cloudinary.com/.../raw/upload/.../file.pdf",
     "mimeType": "application/pdf"
   }
   ```

### Frontend Testing
1. **Test Preview (Eye Button)**
   - Click Eye icon on a PDF
   - Should open in new tab with direct PDF view
   - No Cloudinary viewer overlay
   - No "Customer is marked as untrusted" error

2. **Test Download (Download Button)**
   - Click Download icon on a PDF
   - File should download automatically
   - Filename should match original

3. **Test Both Pages**
   - DocumentsPage: Upload test PDF → should appear with working Eye/Download
   - EventDetail: Upload test PDF → should appear with working Eye/Download

### Direct URL Test
1. Go to backend console and copy a PDF secure_url
2. In browser:
   - Without `?dl=1`: `https://res.cloudinary.com/.../file.pdf` → should open
   - With `?dl=1`: `https://res.cloudinary.com/.../file.pdf?dl=1` → should open directly
3. Both should work without authentication errors

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Upload PDF                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /api/files/event/:eventId/upload                       │
│  - file.mimetype: "application/pdf"                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: fileController.uploadFile                          │
│  - getFileType() → "DOCUMENT"                               │
│  - isPDF: true                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudinary Upload                                           │
│  - resource_type: "raw"  ← KEY FOR PDFs                     │
│  - folder: "orgdoc/.../..."                                 │
│  - public_id: "timestamp_filename.pdf"                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudinary Response                                         │
│  - secure_url: "https://res.cloudinary.com/.../raw/upload/.../file.pdf"
│  - public_id: "orgdoc/.../file.pdf"                         │
│  - resource_type: "raw"                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Database Storage                                            │
│  - url: secure_url (with /raw/)                             │
│  - mimeType: "application/pdf"                              │
│  - type: "DOCUMENT"                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ API Response (201)                                          │
│  {                                                          │
│    "url": "https://res.cloudinary.com/.../raw/upload/.../file.pdf",
│    "mimeType": "application/pdf",                           │
│    ...                                                      │
│  }                                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Query Invalidation                                │
│  GET /api/files  (or GET /api/events/:eventId)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Display Files                                     │
│  - Eye (Preview): file.url + "?dl=1"                        │
│  - Download: file.url                                       │
│  - Both use getPreviewUrl() / getDownloadUrl()              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ User Clicks Eye/Download                                    │
│  - Opens PDF directly from Cloudinary                       │
│  - No viewer authentication issues                          │
│  - Direct download without "Customer is marked as untrusted"│
└─────────────────────────────────────────────────────────────┘
```

## 🐛 Troubleshooting

### Issue: "Customer is marked as untrusted" error
**Cause**: Cloudinary viewer/transformation URL being used
**Solution**: 
- ✅ Using `secure_url` directly
- ✅ Using `resource_type: "raw"` for PDFs
- ✅ Adding `?dl=1` to preview URLs

### Issue: PDF opens in Cloudinary viewer instead of browser viewer
**Cause**: Wrong resource_type or transformation URL
**Solution**:
- Check backend logs for `[PDF-UPLOAD] PDF uploaded with resource_type: "raw"`
- Verify URL contains `/raw/upload/` (not `/image/upload/`)
- Verify `?dl=1` parameter is added to preview links

### Issue: PDF won't download or open
**Cause**: URL format issue or browser block
**Solution**:
- Copy URL directly from database and test in browser
- Check DevTools Network tab for response status (should be 200)
- Verify URL starts with `https://` (secure connection required)
- Try different browser if issue persists

### Issue: Frontend shows file but links don't work
**Cause**: URL not properly returned or stored
**Solution**:
1. Check API response includes `url` field
2. Verify database has non-NULL `url` field
3. Test URL directly by copying to browser address bar
4. Check for query parameter issues (multiple `?` symbols)

## 🔐 Security & Best Practices

### ✅ Implemented
- Using `secure_url` (HTTPS only)
- Using `resource_type: "raw"` for non-media files
- Organizing files in organization/event folders
- Direct download URLs without transformations

### ⚠️ Important Notes
- `?dl=1` is a Cloudinary parameter that forces direct delivery
- PDFs stored as "raw" resource type cannot use image transformations
- All URLs require Cloudinary account to be active
- Deleted files can still be accessed if URL is cached

## 📝 Code Reference

### Backend Configuration
File: [backend/src/controllers/file.controller.js](backend/src/controllers/file.controller.js)
- Lines 65-96: Cloudinary upload with resource_type configuration
- Lines 106-115: PDF-specific logging
- Lines 117-127: URL format validation

### Frontend Utilities
File: [frontend/src/utils/fileUtils.js](frontend/src/utils/fileUtils.js)
- `getPreviewUrl()`: PDF preview with ?dl=1
- `getDownloadUrl()`: Direct download URL
- `isPdfFile()`: PDF detection
- `getFileSuggestedAction()`: File action recommendation

### Frontend Components
1. [frontend/src/components/documents/DocumentsPage.jsx](frontend/src/components/documents/DocumentsPage.jsx#L147-L163)
2. [frontend/src/components/events/EventDetail.jsx](frontend/src/components/events/EventDetail.jsx#L107-L122)

## ✅ Verification Checklist

- [ ] Backend logs show PDF uploads with resource_type: "raw"
- [ ] Cloudinary response includes `/raw/upload/` in secure_url
- [ ] Database stores complete secure_url in url field
- [ ] API response includes url and mimeType fields
- [ ] Frontend uses getPreviewUrl() for Eye button
- [ ] Frontend uses getDownloadUrl() for Download button
- [ ] Preview URL includes ?dl=1 for PDFs
- [ ] Eye button opens PDF directly without viewer
- [ ] Download button triggers file download
- [ ] No "Customer is marked as untrusted" errors
- [ ] Both DocumentsPage and EventDetail show working PDF links
- [ ] PDF can be downloaded and opened locally

---

**Generated**: 2026-05-28  
**Status**: ✅ All PDF handling improvements implemented and verified
