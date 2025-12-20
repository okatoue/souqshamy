# Posting & Listings System Audit Report

**Date:** December 20, 2024
**Auditor:** Claude Code
**Application:** SouqShamy (React Native/Expo Marketplace)

---

## Complete File List

### Screens

| File | Path | Purpose |
|------|------|---------|
| post.tsx | app/(tabs)/post.tsx | Initial posting screen (title, category selection) |
| product-details.tsx | app/product-details.tsx | Full listing form (images, price, description, location, contact) |
| [id].tsx | app/listing/[id].tsx | Listing detail view with seller info, images, contact options |
| listings.tsx | app/(tabs)/listings.tsx | My Listings tab - user's own listings management |
| [id].tsx | app/category/[id].tsx | Category listings page with subcategory filtering |
| search.tsx | app/search.tsx | Search results page |

### Components - Product Details

| Component | Path | Purpose |
|-----------|------|---------|
| imageUploadSection.tsx | components/product-details/imageUploadSection.tsx | Image picker (camera/gallery) and preview carousel |
| titleSection.tsx | components/product-details/titleSection.tsx | Title input field |
| priceSection.tsx | components/product-details/priceSection.tsx | Price input with currency toggle (SYP/USD) |
| descriptionSection.tsx | components/product-details/descriptionSection.tsx | Description textarea |
| locationSection.tsx | components/product-details/locationSection.tsx | Location display and picker trigger |
| contactSection.tsx | components/product-details/contactSection.tsx | Phone/WhatsApp inputs with "same as phone" option |
| categoryInfo.tsx | components/product-details/categoryInfo.tsx | Selected category display with change button |
| submitButton.tsx | components/product-details/submitButton.tsx | Submit button with loading state |
| productHeader.tsx | components/product-details/productHeader.tsx | Header with back button |
| mapModal.tsx | components/product-details/mapModal.tsx | Legacy location picker modal (wrapper) |
| mapHtml.ts | components/product-details/mapHtml.ts | OpenStreetMap HTML template for WebView |
| LocationPreviewCard.tsx | components/product-details/LocationPreviewCard.tsx | Static map preview with location details |

### Components - Listing Display

| Component | Path | Purpose |
|-----------|------|---------|
| index.ts | components/listing/index.ts | Barrel export for listing components |
| ContactBar.tsx | components/listing/ContactBar.tsx | Bottom contact bar with chat button |
| ImageCarousel.tsx | components/listing/ImageCarousel.tsx | Paginated image gallery with fullscreen modal |
| ListingGridCard.tsx | components/listing/ListingGridCard.tsx | Grid view card component |
| SellerHeader.tsx | components/listing/SellerHeader.tsx | Seller info header with avatar and date |
| ListedBySection.tsx | components/listing/ListedBySection.tsx | Seller profile section |
| MoreFromSellerSection.tsx | components/listing/MoreFromSellerSection.tsx | Horizontal scroll of seller's other listings |

### Components - Listings Management

| Component | Path | Purpose |
|-----------|------|---------|
| listingCard.tsx | components/listings/listingCard.tsx | Card for search/category results |
| ListingItem.tsx | components/listings/ListingItem.tsx | User's own listing with status badge and actions |

### Components - Shared UI

| Component | Path | Purpose |
|-----------|------|---------|
| bottomSheet.tsx | components/ui/bottomSheet.tsx | Category selection bottom sheet |
| BaseListingCard.tsx | components/ui/BaseListingCard.tsx | Shared card foundation component |
| ListingImage.tsx | components/ui/ListingImage.tsx | Image with placeholder fallback |
| ListingMeta.tsx | components/ui/ListingMeta.tsx | Location and date metadata display |
| CategoryBadge.tsx | components/ui/CategoryBadge.tsx | Category/subcategory badge |
| SearchBar.tsx | components/ui/SearchBar.tsx | Search input component |
| LocationPickerModal.tsx | components/ui/locationPickerModal/LocationPickerModal.tsx | Full map-based location picker |

### Hooks

| Hook | Path | Purpose |
|------|------|---------|
| useCreateListing.ts | hooks/useCreateListing.ts | Listing creation with image upload |
| useUserListings.ts | hooks/useUserListings.ts | Fetch user's own listings |
| useCategoryListings.ts | hooks/useCategoryListings.ts | Fetch listings by category/subcategory |
| useSearchListings.ts | hooks/useSearchListings.ts | Text search for listings |
| useRecentlyViewed.ts | hooks/useRecentlyViewed.ts | Recently viewed listings management |
| useFavoriteToggle.ts | hooks/useFavoriteToggle.ts | Toggle favorite status |
| useCurrentLocation.ts | hooks/useCurrentLocation.ts | GPS location acquisition |

### Utilities

| Utility | Path | Purpose |
|---------|------|---------|
| imageUpload.ts | lib/imageUpload.ts | Image upload to Supabase Storage with retry logic |
| formatters.ts | lib/formatters.ts | Price, date, category formatting |
| imageUtils.ts | lib/imageUtils.ts | Thumbnail URL generation via Supabase transforms |
| recentlyViewed.ts | lib/recentlyViewed.ts | AsyncStorage-based recently viewed |
| api.ts | lib/api.ts | Listings CRUD API functions |
| supabase.ts | lib/supabase.ts | Supabase client configuration |
| app_data_context.tsx | lib/app_data_context.tsx | Global state for listings, conversations, recently viewed |

### Types

| Type | Path | Purpose |
|------|------|---------|
| listing.ts | types/listing.ts | Listing interface and CreateListingDTO |

### Assets

| Asset | Path | Purpose |
|-------|------|---------|
| categories.json | assets/categories.json | Category data with subcategories |
| categories.ts | assets/categories.ts | Category/Subcategory TypeScript interfaces |

---

## Data Flow

### Create Listing Flow

1. **Step 1 - Post Screen** (`app/(tabs)/post.tsx`)
   - User enters listing title
   - User opens CategoryBottomSheet and selects category → subcategory
   - Continue button validates title + category, navigates to product-details

2. **Step 2 - Product Details** (`app/product-details.tsx`)
   - Receives: title, categoryId, subcategoryId, categoryName, subcategoryName, categoryIcon
   - User adds images via ImageUploadSection (expo-image-picker)
   - User edits title, enters price with currency (SYP/USD)
   - User enters description (required)
   - User opens MapModal to select location (required)
   - User optionally enters phone/WhatsApp numbers
   - User can change category via CategoryBottomSheet

3. **Step 3 - Submission** (`handleSubmit` function)
   - Validates required fields: description, price, location
   - Warning dialogs for missing images and contact info (non-blocking)
   - If user is not authenticated → redirect to auth
   - Calls `useCreateListing.createListing()`

4. **Step 4 - Image Upload & DB Insert** (`useCreateListing.ts` + `imageUpload.ts`)
   - Tests storage connectivity
   - For each local image URI:
     - Reads file as base64
     - Determines MIME type from extension
     - Generates unique filename: `{userId}/{timestamp}_{random}.{ext}`
     - Uploads to `listing-images` bucket with retry logic (max 3 attempts)
     - Returns public URL
   - Inserts listing record with cloud image URLs

5. **Step 5 - Success**
   - Alert: "Success! Your listing has been created"
   - Redirects to `/(tabs)/listings` (My Listings)

### Edit Listing Flow

**Currently NOT implemented.** There is no dedicated edit screen or functionality. Users can only:
- Mark as sold/active
- Soft delete (set status to 'inactive')
- Permanently delete

### Delete Listing Flow

1. **Soft Delete** (via `handleSoftDelete` in app_data_context.tsx)
   - Confirmation alert
   - Updates listing status to 'inactive'
   - Listing remains in database but hidden from public

2. **Permanent Delete** (via `handlePermanentDelete` in app_data_context.tsx)
   - Confirmation alert with warning
   - Deletes listing record from database
   - Images remain in storage (not cleaned up)

### Image Upload Flow

1. User taps "Add photos" in ImageUploadSection
2. Alert presents options: "Take Photo" or "Choose from Library"
3. expo-image-picker requests permissions and opens picker
4. Selected images stored as local URIs in component state
5. On form submit, `uploadListingImages()` is called:
   - Tests connectivity to storage server
   - For each image (in parallel):
     - Reads file as base64 via expo-file-system
     - Decodes to ArrayBuffer
     - Uploads to Supabase Storage with timeout (60s) and retry (3 attempts)
     - Returns public URL
6. Database record created with cloud URLs

---

## Form Validation

### Required Fields

| Field | Validation Rule | Error Message |
|-------|-----------------|---------------|
| Title | Set in Step 1 | "Please enter a title for your listing" |
| Category | Selected in Step 1 | "Please select a category" |
| Description | Non-empty after trim | "Please add a description" |
| Price | Non-empty (can be "0") | "Please set a price (can be 0)" |
| Location | Must be selected | "Please select a location" |

### Optional Fields (with warnings)

| Field | Validation Rule | Warning |
|-------|-----------------|---------|
| Images | Length > 0 | "No Images Added - Images boost views. Post anyway?" |
| Contact (phone/whatsapp) | At least one | "No Contact Information - Buyers can use in-app chat. Continue?" |

---

## Component Hierarchy

```
app/(tabs)/post.tsx
├── ThemedText
├── TextInput (title)
├── TouchableOpacity (category button)
├── TouchableOpacity (continue button)
├── CategoryBottomSheet
│   └── Category/Subcategory lists
└── UserIcon

app/product-details.tsx
├── ProductHeader
│   └── Back button
├── ScrollView
│   ├── CategoryInfo
│   │   └── Change category button
│   ├── ImageUploadSection
│   │   ├── Empty state (add photos)
│   │   ├── Image cards with remove button
│   │   └── Cover badge (first image)
│   ├── TitleSection
│   ├── PriceSection
│   │   └── Currency toggle (SYP/USD)
│   ├── DescriptionSection
│   ├── LocationSection
│   │   └── LocationPreviewCard (if selected)
│   ├── ContactSection
│   │   ├── Phone input
│   │   ├── WhatsApp input
│   │   └── "Same as phone" checkbox
│   └── SubmitButton
├── MapModal (LocationPickerModal)
│   ├── WebView (OpenStreetMap)
│   ├── Search bar
│   ├── Current location button
│   └── Confirm button
└── CategoryBottomSheet

app/listing/[id].tsx
├── Header (back, favorite, share)
├── SellerHeader
├── ImageCarousel
│   ├── FlatList (horizontal, paging)
│   ├── Pagination dots
│   └── Fullscreen modal
├── Details container
│   ├── Title & Price
│   ├── Status badge (if sold/inactive)
│   ├── Description
│   ├── WhatsApp/Call buttons
│   ├── LocationPreviewCard
│   └── ListedBySection
├── MoreFromSellerSection
└── ContactBar (Chat button)

app/(tabs)/listings.tsx
├── ScreenHeader
└── FlatList
    └── ListingItem
        ├── BaseListingCard
        ├── StatusBadge (Active/Sold/Removed)
        └── ActionButtons (Mark Sold, Remove, Restore, Delete Forever)
```

---

## State Management

| State | Location | Purpose | Persistence |
|-------|----------|---------|-------------|
| userListings | AppDataContext | User's own listings | AsyncStorage cache |
| recentlyViewed | AppDataContext | Recently viewed listings | AsyncStorage (user-specific key) |
| conversations | AppDataContext | Chat conversations | AsyncStorage cache |
| favorites | useFavoriteToggle | Favorite listing IDs | Supabase (real-time) |
| Form state | product-details.tsx | Create listing form | None (lost on navigation) |
| Category selection | post.tsx | Selected category/subcategory | None (passed via params) |

---

## Database Schema

### listings table

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| id | SERIAL PRIMARY KEY | No | Unique listing identifier |
| user_id | UUID REFERENCES auth.users | No | Owner's user ID |
| title | TEXT | No | Listing title |
| category_id | INTEGER | No | Main category ID |
| subcategory_id | INTEGER | No | Subcategory ID |
| description | TEXT | No | Full description |
| price | NUMERIC(12,2) | No | Price (CHECK >= 0) |
| currency | TEXT | No | Currency code (default 'SYP') |
| phone_number | TEXT | Yes | Contact phone |
| whatsapp_number | TEXT | Yes | WhatsApp number |
| images | TEXT[] | Yes | Array of image URLs |
| status | TEXT | No | 'active', 'sold', 'inactive' (CHECK constraint) |
| location | TEXT | No | Location name/address |
| location_lat | DOUBLE PRECISION | Yes | Latitude coordinate |
| location_lon | DOUBLE PRECISION | Yes | Longitude coordinate |
| created_at | TIMESTAMPTZ | No | Creation timestamp |
| updated_at | TIMESTAMPTZ | No | Last update timestamp |

### Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| idx_listings_user_id | user_id | Fast lookup of user's listings |
| idx_listings_status | status | Filter by listing status |
| idx_listings_category | category_id | Filter by category |
| idx_listings_subcategory | subcategory_id | Filter by subcategory |
| idx_listings_created_at | created_at DESC | Sort by newest |
| idx_listings_location | GIST(point(lon,lat)) | Geo queries |
| idx_listings_search | GIN(to_tsvector(title+desc+location)) | Full-text search |

### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| listings_select_active | SELECT | `status = 'active' OR user_id = auth.uid()` |
| listings_insert_own | INSERT | `auth.uid() = user_id` |
| listings_update_own | UPDATE | `auth.uid() = user_id` |
| listings_delete_own | DELETE | `auth.uid() = user_id` |

---

## Storage Configuration

### listing-images bucket

| Setting | Value |
|---------|-------|
| Public | Yes |
| File size limit | 10 MB (10485760 bytes) |
| Allowed types | image/jpeg, image/png, image/webp, image/gif |
| Path structure | `{userId}/{timestamp}_{random}.{ext}` |

### Storage RLS Policies

| Policy | Rule |
|--------|------|
| listing_images_select_public | Anyone can view |
| listing_images_insert_auth | Authenticated users can upload |
| listing_images_update_own | Owner can update (folder name = user ID) |
| listing_images_delete_own | Owner can delete (folder name = user ID) |

---

## Dependencies Graph

```
app/(tabs)/post.tsx
├── components/ui/bottomSheet.tsx (CategoryBottomSheet)
├── components/ui/userIcon.tsx
├── hooks/use-theme-color.ts
└── assets/categories.ts (types)

app/product-details.tsx
├── components/product-details/* (all sections)
├── components/ui/bottomSheet.tsx
├── hooks/useCreateListing.ts
│   └── lib/imageUpload.ts
│       └── lib/supabase.ts
├── lib/auth_context.tsx
├── lib/formatters.ts
└── assets/categories.ts

app/listing/[id].tsx
├── components/listing/* (all display components)
├── components/product-details/LocationPreviewCard.tsx
├── hooks/useFavoriteToggle.ts
├── lib/app_data_context.tsx
│   └── lib/supabase.ts
├── lib/formatters.ts
├── lib/recentlyViewed.ts
└── types/listing.ts

lib/imageUpload.ts
├── expo-file-system
├── base64-arraybuffer
└── lib/supabase.ts

lib/imageUtils.ts
└── (no dependencies - pure utility)
```

---

## Navigation Map

| From | Action | To |
|------|--------|-----|
| post.tsx | Continue button | /product-details |
| product-details.tsx | Submit success | /(tabs)/listings |
| product-details.tsx | Back button | Previous screen |
| listings.tsx | Tap listing | /listing/[id] |
| listing/[id].tsx | Tap seller | /profile/{userId} |
| listing/[id].tsx | Tap chat | /chat/[id] |
| listing/[id].tsx | Tap related listing | /listing/[id] (new) |
| category/[id].tsx | Tap listing | /listing/[id] |
| search.tsx | Tap listing | /listing/[id] |

---

## Identified Issues

### Critical

1. **No Edit Listing Functionality**
   - Location: N/A (feature missing)
   - Impact: Users cannot modify listings after creation
   - Recommendation: Implement edit screen reusing product-details components

2. **Orphaned Images on Permanent Delete**
   - Location: `lib/app_data_context.tsx:465-499`
   - Impact: Storage costs increase as deleted listing images remain
   - Recommendation: Add cleanup function to delete images when listing is permanently deleted

### High Priority

3. **No Draft Saving**
   - Location: `app/product-details.tsx`
   - Impact: Form data lost on navigation away or app crash
   - Recommendation: Implement draft persistence with AsyncStorage or database

4. **Form State Not Preserved on Back Navigation**
   - Location: `app/(tabs)/post.tsx` → `app/product-details.tsx`
   - Impact: If user goes back from product-details, all entered data is lost
   - Recommendation: Consider a single-screen wizard or state persistence

5. **Image Upload Fails Silently for Individual Images**
   - Location: `lib/imageUpload.ts:190-206`
   - Impact: If one image fails, entire Promise.all fails - no partial success
   - Recommendation: Use Promise.allSettled and show which images failed

### Medium Priority

6. **No Image Reordering**
   - Location: `components/product-details/imageUploadSection.tsx`
   - Impact: Users cannot reorder images to change cover photo
   - Recommendation: Add drag-to-reorder functionality

7. **No Image Cropping**
   - Location: `components/product-details/imageUploadSection.tsx`
   - Impact: Users cannot crop or adjust images before upload
   - Recommendation: Integrate expo-image-manipulator for cropping

8. **Missing whatsapp_number Column in DB**
   - Location: `types/listing.ts:11` vs DB schema
   - Impact: WhatsApp number stored in database but schema doc doesn't show it
   - Recommendation: Verify column exists in DB, add to schema docs

9. **No Upload Progress Indicator**
   - Location: `hooks/useCreateListing.ts`
   - Impact: Users see only a loading spinner, not actual upload progress
   - Recommendation: Track and display upload progress per image

### Low Priority

10. **Location Picker Uses WebView (Heavy)**
    - Location: `components/ui/locationPickerModal/LocationPickerModal.tsx`
    - Impact: Performance overhead, not native feel
    - Recommendation: Consider react-native-maps for native experience

11. **Category Change Doesn't Clear Category-Specific Fields**
    - Location: `app/product-details.tsx:100-106`
    - Impact: N/A currently (no category-specific fields implemented)
    - Recommendation: If adding category-specific fields, implement clearing logic

12. **Recently Viewed Tracked Even for Own Listings (Edge Case)**
    - Location: `app/listing/[id].tsx:92-98`
    - Impact: Minor - own listings excluded from tracking correctly
    - Recommendation: N/A - already handled

---

## Discovery Questions - Answered

### Image Upload

| Question | Answer |
|----------|--------|
| What library is used for image picking? | expo-image-picker |
| Is there image cropping? | No |
| How is base64 conversion handled? | expo-file-system/legacy readAsStringAsync with Base64 encoding |
| Are images uploaded sequentially or in parallel? | Parallel (Promise.all) |
| What happens if one image fails in a batch? | Entire upload fails |
| Maximum images? | 10 |
| Image quality? | 0.8 (80%) |

### Form State

| Question | Answer |
|----------|--------|
| Is form state managed locally or with a library? | Locally (useState) |
| Is there any form state persistence (draft)? | No |
| How are validation errors displayed? | Alert dialogs |
| Is there real-time validation or only on submit? | Only on submit |

### Listing Status

| Question | Answer |
|----------|--------|
| What statuses exist? | active, sold, inactive |
| How do status changes work? | Direct database update via app_data_context |
| Are there automated status changes? | No |

### Edit Functionality

| Question | Answer |
|----------|--------|
| Can listings be edited after creation? | No (missing feature) |
| What fields can be edited? | N/A |
| Is there an edit screen or inline editing? | Neither |
| How are image changes handled during edit? | N/A |

### Price Handling

| Question | Answer |
|----------|--------|
| What currencies are supported? | SYP (Syrian Pound), USD |
| How is price formatting done? | lib/formatters.ts - formatPrice/formatPriceInput |
| Is there a "negotiable" or "free" option? | No (price can be 0) |
| How are price ranges handled? | Not supported |

### Contact Information

| Question | Answer |
|----------|--------|
| What contact fields exist? | phone_number, whatsapp_number |
| Is phone number validated? | No format validation |
| Is WhatsApp number separate or same as phone? | Separate, with "same as phone" checkbox |
| Are contact details required? | No (warning only) |

### Error Handling

| Question | Answer |
|----------|--------|
| How are network errors during posting handled? | Alert dialog with error message |
| Is there retry logic for failed uploads? | Yes, 3 attempts with exponential backoff |
| What happens if the app crashes mid-post? | All data lost |
| Are there proper loading indicators? | Yes, isSubmitting state disables button |

### Success Flow

| Question | Answer |
|----------|--------|
| What happens after successful post? | Alert with "OK" button |
| Where is the user redirected? | /(tabs)/listings (My Listings) |
| Is there a success animation/message? | Alert only |
| Can they immediately view their listing? | Yes, appears in My Listings |

---

## Performance Considerations

1. **Image Uploads in Parallel**: Good for speed but if one fails, all fail
2. **Thumbnail Generation**: Uses Supabase image transforms (server-side) - efficient
3. **Listing Data Caching**: AsyncStorage cache prevents unnecessary refetches
4. **Lazy Seller Data Loading**: Seller info fetched after listing loads
5. **Pre-loaded Listing Navigation**: `navigateToListing()` passes full listing data to avoid fetch

## Security Considerations

1. **RLS Properly Configured**: Users can only modify their own listings
2. **Storage Policies**: Users can only delete/update images in their own folder
3. **Input Validation**: Minimal client-side validation, relies on DB constraints
4. **No Sensitive Data Exposure**: Phone numbers only visible on listing detail
5. **User ID in Image Path**: Enables ownership verification for storage policies

## UX Considerations

1. **Two-Step Wizard**: Title/category first, then full form - reduces cognitive load
2. **Non-Blocking Warnings**: Images and contact are optional with confirmation dialogs
3. **Category Change Available**: Users can change category on second screen
4. **Map-Based Location**: Visual location selection improves accuracy
5. **Cover Photo Badge**: First image marked as cover
6. **Missing Edit Feature**: Major UX gap - users expect to edit listings

---

## Recommended Refactoring Plan

### Phase 1: Critical Features

**Task 1.1: Implement Edit Listing**
- Create app/listing/edit/[id].tsx screen
- Reuse product-details components with edit mode
- Pre-populate form with existing listing data
- Handle image additions/removals

**Task 1.2: Image Cleanup on Delete**
- Add deleteListingImages() function to imageUpload.ts
- Call before permanent delete in app_data_context
- List files in folder, delete all

### Phase 2: Data Integrity

**Task 2.1: Draft Saving**
- Create useDraft hook with AsyncStorage
- Auto-save form state every 30s
- Restore draft on form mount
- Clear draft on successful submit

**Task 2.2: Improve Image Upload Resilience**
- Use Promise.allSettled instead of Promise.all
- Show success count and retry failed images
- Consider sequential upload with progress

### Phase 3: UX Improvements

**Task 3.1: Image Reordering**
- Add drag handles to image cards
- Implement drag-to-reorder with react-native-reanimated
- First image becomes cover

**Task 3.2: Upload Progress**
- Track upload progress per image
- Show progress bar on each image card
- Display overall progress in submit button

**Task 3.3: Form Validation Improvements**
- Add inline validation indicators
- Real-time validation for phone format
- Character counters for title/description

### Phase 4: Performance

**Task 4.1: Image Optimization**
- Add expo-image-manipulator for resize/compress
- Limit images to 1080p before upload
- Consider WebP conversion

**Task 4.2: Native Map Integration**
- Consider react-native-maps for native feel
- Keep WebView as fallback for web platform

---

*Document Version: 1.0*
*Generated: December 20, 2024*
