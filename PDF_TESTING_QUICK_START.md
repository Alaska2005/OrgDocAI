# PDF Upload Testing - Quick Start

## 🚀 Quick Test (5 minutes)

### Step 1: Start Backend
```bash
cd backend
npm run dev
```

### Step 2: Upload a Test PDF
1. Frontend: Navigate to an Event
2. Drag & drop a PDF file
3. Watch backend console for these logs:

```
[FILE-UPLOAD] Starting upload for: document.pdf
[CLOUDINARY-CONFIG] Uploading with resource_type: "raw"
[PDF-UPLOAD] PDF uploaded with resource_type: "raw"
[PDF-URL-VALIDATION] URL contains /raw/: true
[CLOUDINARY-SUCCESS] secure_url: https://res.cloudinary.com/...
[DB-INSERT-SUCCESS] File saved
[API-RESPONSE-PAYLOAD] { ..., url: "https://...", mimeType: "application/pdf" }
```

### Step 3: Verify Frontend
1. Check that PDF appears in DocumentsPage
2. Click Eye icon → should open PDF in new tab
3. Click Download icon → should download the file
4. Both actions should work without "Customer is marked as untrusted" errors

### Step 4: Verify Database
```sql
SELECT originalName, url, mimeType 
FROM files 
WHERE mimeType = 'application/pdf'
ORDER BY createdAt DESC LIMIT 1;
```

Expected result:
- `originalName`: your_file.pdf
- `url`: https://res.cloudinary.com/.../raw/upload/v.../file.pdf (should contain `/raw/upload/`)
- `mimeType`: application/pdf

## 🧪 Comprehensive Test (15 minutes)

### Test 1: Single PDF Upload
- [ ] Upload PDF from EventDetail
- [ ] Check backend logs all stages
- [ ] Verify file appears in list
- [ ] Eye button opens PDF
- [ ] Download button downloads file

### Test 2: Bulk PDF Upload  
- [ ] Select multiple PDFs
- [ ] Drag & drop all at once
- [ ] Check all appear in list
- [ ] Test Eye/Download on each

### Test 3: DocumentsPage Display
- [ ] Navigate to Documents page
- [ ] Verify all PDFs appear
- [ ] Test search functionality
- [ ] Test type filter

### Test 4: Direct URL Test
- [ ] Copy URL from database
- [ ] Without `?dl=1`: Paste in browser → should open
- [ ] With `?dl=1`: Paste in browser → should open/download

### Test 5: Cross-Browser
- [ ] Chrome: Preview and download
- [ ] Firefox: Preview and download
- [ ] Edge: Preview and download

## 📊 Expected Logs

### Success Path
```
[FILE-UPLOAD] Starting upload for: report.pdf (250000 bytes)
[FILE-UPLOAD] File type: DOCUMENT, MIME: application/pdf, isPDF: true
[CLOUDINARY-CONFIG] Uploading with resource_type: "raw"
[PDF-URL-VALIDATION] URL starts with https: true
[PDF-URL-VALIDATION] URL contains /raw/: true
[PDF-URL-VALIDATION] URL format: https://res.cloudinary.com/...
[CLOUDINARY-SUCCESS] secure_url: https://res.cloudinary.com/.../raw/upload/.../report.pdf
[DB-INSERT-PAYLOAD] { name: "...", mimeType: "application/pdf", url: "https://...", ... }
[DB-INSERT-SUCCESS] File saved with ID: uuid-123
[API-RESPONSE-PAYLOAD] { url: "https://...", mimeType: "application/pdf", ... }
[FILE-UPLOAD-COMPLETE] File URL: https://res.cloudinary.com/.../raw/upload/.../report.pdf
```

### Error Path (What to look for)
```
[CLOUDINARY-ERROR] { error: ... }  → Cloudinary upload failed
[UPLOAD-VALIDATION] Missing secure_url  → No URL from Cloudinary
[PDF-WARNING] Expected resource_type "raw" but got "image"  → Wrong resource type
[PDF-URL-WARNING] URL may not be a raw file URL  → URL format issue
```

## 🎯 Key Improvements Made

1. **Backend Logging**
   - PDF-specific resource_type logging
   - URL format validation
   - Secure_url verification

2. **Frontend Utilities**
   - New fileUtils.js with PDF-specific handlers
   - getPreviewUrl() adds ?dl=1 for PDFs
   - getDownloadUrl() for direct downloads

3. **URL Handling**
   - PDFs use resource_type: "raw"
   - Direct secure_url stored in database
   - No transformation URLs used

4. **Error Prevention**
   - Validation that secure_url exists
   - URL format validation
   - Resource type verification

## ✅ Verification Points

- [ ] Backend uses `resource_type: "raw"` for PDFs
- [ ] Cloudinary response includes `/raw/upload/` in URL
- [ ] Database stores complete secure_url
- [ ] API response includes url field
- [ ] Frontend calls getPreviewUrl() for Eye button
- [ ] Preview URL includes `?dl=1` parameter
- [ ] Download button uses direct URL
- [ ] No authentication errors when opening PDFs
- [ ] Files can be downloaded successfully
- [ ] Both DocumentsPage and EventDetail work

## 🐛 Quick Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| PDF won't open | Backend logs | Look for [CLOUDINARY-ERROR] |
| 404 error on URL | Database | Check url field is not NULL |
| Authentication error | URL format | Verify `/raw/upload/` in URL |
| Wrong file downloads | Frontend | Check getPreviewUrl() is used |
| File list empty | API response | Check GET /api/files returns files |
| Browser blocks download | Browser settings | Try different browser |

## 📞 Support Info

**Backend Log Files**: Watch console output when running `npm run dev`

**Database Query**: Check files table for url field content

**API Testing**: Use browser DevTools Network tab to inspect responses

**Frontend Testing**: Check browser console for any errors

---

If everything passes the Quick Test in 5 minutes, PDF handling is working correctly!
