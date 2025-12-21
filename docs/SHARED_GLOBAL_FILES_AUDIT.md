# Shared and Global Files Audit - SouqJari Marketplace

**Audit Date:** December 2024
**App Version:** 1.0.0
**Platform:** React Native/Expo 54.0

---

## Complete File List

### Navigation/Layouts
| File | Path | Purpose |
|------|------|---------|
| `_layout.tsx` | `app/_layout.tsx` | Root layout with providers, auth routing, global loading overlay |
| `_layout.tsx` | `app/(tabs)/_layout.tsx` | Tab navigation with badge support for unread messages |
| `_layout.tsx` | `app/(auth)/_layout.tsx` | Auth group layout with themed background |
| `callback.tsx` | `app/auth/callback.tsx` | OAuth callback handler for Google/Facebook |

### Theme
| File | Path | Purpose |
|------|------|---------|
| `theme.ts` | `constants/theme.ts` | Colors, spacing, typography, shadows, design tokens |
| `theme_context.tsx` | `lib/theme_context.tsx` | Theme provider with preference persistence |
| `use-theme-color.ts` | `hooks/use-theme-color.ts` | Theme-aware color hook |
| `use-color-scheme.ts` | `hooks/use-color-scheme.ts` | System/user color scheme detection |
| `use-color-scheme.web.ts` | `hooks/use-color-scheme.web.ts` | Web platform color scheme hook |
| `themed-text.tsx` | `components/themed-text.tsx` | Theme-aware Text component |
| `themed-view.tsx` | `components/themed-view.tsx` | Theme-aware View component |

### Context Providers
| File | Path | Purpose |
|------|------|---------|
| `auth_context.tsx` | `lib/auth_context.tsx` | Authentication state, OAuth, password reset |
| `app_data_context.tsx` | `lib/app_data_context.tsx` | Conversations, listings, recently viewed |
| `favorites_context.tsx` | `lib/favorites_context.tsx` | Favorites management with caching |
| `theme_context.tsx` | `lib/theme_context.tsx` | Theme preferences (light/dark/system) |

### Utilities
| File | Path | Purpose |
|------|------|---------|
| `supabase.ts` | `lib/supabase.ts` | Supabase client configuration |
| `api.ts` | `lib/api.ts` | API layer for Supabase operations |
| `cache.ts` | `lib/cache.ts` | AsyncStorage caching with TTL |
| `formatters.ts` | `lib/formatters.ts` | Price, date, name, category formatting |
| `imageUtils.ts` | `lib/imageUtils.ts` | Thumbnail generation helpers |
| `imageUpload.ts` | `lib/imageUpload.ts` | Listing image upload with retry logic |
| `avatarUpload.ts` | `lib/avatarUpload.ts` | Avatar upload with cleanup |
| `errorHandler.ts` | `lib/errorHandler.ts` | Error handling, alerts, logging |
| `auth-utils.ts` | `lib/auth-utils.ts` | Auth token extraction, error handling |
| `location-utils.ts` | `lib/location-utils.ts` | Bounding box, distance calculations |
| `initialUrl.ts` | `lib/initialUrl.ts` | Deep link URL capture on cold start |
| `recentlyViewed.ts` | `lib/recentlyViewed.ts` | Recently viewed storage helpers |

### Shared Hooks
| File | Path | Purpose |
|------|------|---------|
| `use-theme-color.ts` | `hooks/use-theme-color.ts` | Get colors based on theme |
| `use-color-scheme.ts` | `hooks/use-color-scheme.ts` | Detect system/user theme |
| `useLocationFilter.ts` | `hooks/useLocationFilter.ts` | Location filter state management |
| `useAutoLocationDetection.ts` | `hooks/useAutoLocationDetection.ts` | GPS location on first launch |
| `useCurrentLocation.ts` | `hooks/useCurrentLocation.ts` | GPS position helper hook |
| `useFavorites.ts` | `hooks/useFavorites.ts` | Favorites operations |
| `useFavoriteToggle.ts` | `hooks/useFavoriteToggle.ts` | Favorite toggle animation/logic |
| `userProfile.ts` | `hooks/userProfile.ts` | Current user profile hook |
| `useSellerProfile.ts` | `hooks/useSellerProfile.ts` | Seller profile data hook |
| `useCategoryListings.ts` | `hooks/useCategoryListings.ts` | Category listings fetch |
| `useSearchListings.ts` | `hooks/useSearchListings.ts` | Search listings hook |
| `useRecentlyViewed.ts` | `hooks/useRecentlyViewed.ts` | Recently viewed listings |
| `useMessages.ts` | `hooks/useMessages.ts` | Chat messages hook |
| `useCreateListing.ts` | `hooks/useCreateListing.ts` | Listing creation logic |
| `useDraft.ts` | `hooks/useDraft.ts` | Draft listing persistence |

### Shared Components
| File | Path | Purpose |
|------|------|---------|
| `themed-text.tsx` | `components/themed-text.tsx` | ThemedText component |
| `themed-view.tsx` | `components/themed-view.tsx` | ThemedView component |
| `ScreenHeader.tsx` | `components/ui/ScreenHeader.tsx` | Reusable screen header |
| `userIcon.tsx` | `components/ui/userIcon.tsx` | User avatar with navigation |
| `BaseListingCard.tsx` | `components/ui/BaseListingCard.tsx` | Shared listing card layout |
| `bottomSheet.tsx` | `components/ui/bottomSheet.tsx` | Reusable bottom sheet |
| `SearchBar.tsx` | `components/ui/SearchBar.tsx` | Search input component |
| `EmptyState.tsx` | `components/ui/EmptyState.tsx` | Empty state display |
| `ListingImage.tsx` | `components/ui/ListingImage.tsx` | Listing image with fallback |
| `ListingMeta.tsx` | `components/ui/ListingMeta.tsx` | Location/date metadata |
| `CategoryBadge.tsx` | `components/ui/CategoryBadge.tsx` | Category display badge |
| `FavoriteButton.tsx` | `components/ui/FavoriteButton.tsx` | Favorite toggle button |
| `location.tsx` | `components/ui/location.tsx` | Location picker trigger |
| `HomeErrorBoundary.tsx` | `components/home/HomeErrorBoundary.tsx` | Error boundary for home |
| `LocationPickerModal/` | `components/ui/locationPickerModal/` | Location picker modal system |

### Types
| File | Path | Purpose |
|------|------|---------|
| `listing.ts` | `types/listing.ts` | Listing interfaces |
| `chat.ts` | `types/chat.ts` | Chat/Message interfaces |

### Configuration
| File | Path | Purpose |
|------|------|---------|
| `app.json` | `app.json` | Expo app configuration |
| `tsconfig.json` | `tsconfig.json` | TypeScript configuration |
| `package.json` | `package.json` | Dependencies and scripts |
| `.env.example` | `.env.example` | Environment variable template |
| `withDeepLinkHandler.js` | `plugins/withDeepLinkHandler.js` | Deep link Expo plugin |

---

## Provider Hierarchy

```
app/_layout.tsx (RootLayout)
└── GestureHandlerRootView
    └── ThemeProvider
        └── BottomSheetModalProvider
            └── AuthProvider
                └── FavoritesProvider
                    └── AppDataProvider
                        └── RootLayoutNav
                            └── Stack.Navigator
                                ├── (tabs) → Tab Navigator
                                ├── (auth) → Auth Stack
                                ├── auth/callback → OAuth Handler
                                ├── category/[id]
                                ├── listing/[id]
                                ├── listing/edit/[id]
                                ├── chat/[id]
                                ├── search
                                ├── product-details
                                ├── user
                                ├── personal-details
                                ├── profile/[sellerId]
                                ├── manage-account
                                └── modal
```

### Provider Dependencies

| Provider | Depends On | Provides |
|----------|------------|----------|
| `ThemeProvider` | AsyncStorage | `themePreference`, `resolvedTheme`, `setThemePreference` |
| `AuthProvider` | Supabase, AsyncStorage | `user`, `session`, `signIn`, `signUp`, `signOut`, OAuth methods |
| `FavoritesProvider` | AuthProvider, Supabase | `favorites`, `favoriteIds`, `addFavorite`, `removeFavorite` |
| `AppDataProvider` | AuthProvider, Supabase | `conversations`, `userListings`, `recentlyViewed`, CRUD methods |

---

## Navigation Structure

### Root Stack
| Screen | Path | Presentation |
|--------|------|--------------|
| `(tabs)` | `/` | Default |
| `(auth)` | `/(auth)` | Default |
| `auth/callback` | `/auth/callback` | Default |
| `(test)/test-supabase` | `/(test)/test-supabase` | Header shown |
| `category/[id]` | `/category/:id` | Default |
| `listing/[id]` | `/listing/:id` | Default |
| `listing/edit/[id]` | `/listing/edit/:id` | Default |
| `chat/[id]` | `/chat/:id` | Default |
| `search` | `/search` | Default |
| `product-details` | `/product-details` | Default |
| `user` | `/user` | Default |
| `personal-details` | `/personal-details` | Default |
| `profile/[sellerId]` | `/profile/:sellerId` | Default |
| `manage-account` | `/manage-account` | Default |
| `modal` | `/modal` | Modal |

### Tab Navigator
| Tab | Screen | Icon | Badge |
|-----|--------|------|-------|
| Home | `index` | `home` | None |
| Chats | `chats` | `chatbubbles` | Unread count (red badge) |
| Post | `post` | `add-circle` | None |
| Favorites | `favorites` | `heart` | None |
| My Listings | `listings` | `list` | None |

### Auth Group
| Screen | Path | Purpose |
|--------|------|---------|
| `index` | `/(auth)` | Login/Signup entry |
| `password` | `/(auth)/password` | Password input |
| `verify` | `/(auth)/verify` | Email verification |

---

## Theme Architecture

### Color Palette
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `text` | `#11181C` | `#ECEDEE` | Primary text |
| `textSecondary` | `#64748b` | `#a1a1aa` | Secondary text |
| `textMuted` | `#94a3b8` | `#71717a` | Muted/hint text |
| `background` | `#ffffff` | `#0a0a0a` | Main background |
| `backgroundSecondary` | `#f8fafc` | `#18181b` | Secondary background |
| `cardBackground` | `#ffffff` | `#18181b` | Card surfaces |
| `primary` | `#18AEF2` | `#18AEF2` | Brand/CTA color |
| `accent` | `#FF3B30` | `#FF3B30` | Favorites, alerts |
| `border` | `#e2e8f0` | `#27272a` | Borders |
| `chatBubbleMine` | `#007AFF` | `#0A84FF` | User's chat bubble |
| `chatBubbleOther` | `#e5e5ea` | `#3a3a3c` | Other's chat bubble |

### Semantic Colors (constants/theme.ts - COLORS)
| Token | Value | Usage |
|-------|-------|-------|
| `favorite` | `#FF3B30` | Heart icons, favorite buttons |
| `error` | `#FF3B30` | Error states |
| `warning` | `#FF9500` | Warning messages |
| `success` | `#4CD964` | Success states |
| `statusActive` | `#4CAF50` | Active listing badge |
| `statusSold` | `#FF9800` | Sold listing badge |
| `statusInactive` | `#D32F2F` | Inactive listing badge |
| `chatButton` | `#FF6B35` | Chat action button |
| `callButton` | `#007AFF` | Call action button |
| `whatsappButton` | `#25D366` | WhatsApp button |

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Extra small gaps |
| `sm` | 8px | Small gaps, padding |
| `md` | 12px | Medium gaps |
| `lg` | 16px | Standard padding |
| `xl` | 20px | Large padding |
| `xxl` | 24px | Section gaps |
| `xxxl` | 32px | Large sections |
| `section` | 40px | Major sections |

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Small elements |
| `sm` | 8px | Inputs, small cards |
| `md` | 10px | Standard cards |
| `lg` | 12px | Cards, buttons |
| `xl` | 15px | Large cards |
| `round` | 20px | Rounded buttons |
| `xxl` | 24px | Bottom sheets |
| `pill` | 30px | Pill badges |
| `full` | 9999px | Circles |

### Typography (FONT_SIZES)
| Token | Size | Usage |
|-------|------|-------|
| `xs` | 11px | Tiny labels |
| `sm` | 12px | Small labels |
| `md` | 14px | Body small |
| `base` | 16px | Body text |
| `lg` | 18px | Emphasis |
| `xl` | 20px | Subheadings |
| `xxl` | 22px | Section titles |
| `title` | 24px | Page titles |
| `display` | 28px | Large titles |
| `hero` | 32px | Hero text |

### Shadow Presets
| Token | Usage |
|-------|-------|
| `none` | No shadow |
| `sm` | Subtle elevation |
| `card` | Card surfaces |
| `button` | Interactive buttons |
| `md` | Medium elevation |
| `lg` | High elevation |
| `bottomSheet` | Bottom sheet header |

---

## Caching Strategy

### Cache Keys (lib/cache.ts)
| Key | Data Type | TTL | User-Specific |
|-----|-----------|-----|---------------|
| `@favorites_cache` | `Listing[]` | 5 min | Yes |
| `@favorite_ids_cache` | `string[]` | 5 min | Yes |
| `@user_listings_cache` | `Listing[]` | None | Yes |
| `@conversations_cache_{userId}` | `ConversationWithDetails[]` | None | Yes |
| `@recently_viewed_cache_{userId}` | `Listing[]` | None | Yes |
| `@category_listings_{categoryId}` | `Listing[]` | 5 min | No |
| `@profile_cache_{userId}` | Profile | 15 min | No |
| `@app_theme_preference` | `'light'|'dark'|'system'` | None | No |
| `@3antar_location_filter` | LocationFilter | None | No |
| `@password_reset_in_progress` | timestamp | 30 min | No |

### Cache TTL Constants
| Constant | Duration | Usage |
|----------|----------|-------|
| `CACHE_TTL.SHORT` | 5 minutes | Category listings, favorites |
| `CACHE_TTL.MEDIUM` | 15 minutes | Profiles |
| `CACHE_TTL.LONG` | 1 hour | Rarely changing data |
| `CACHE_TTL.NONE` | No expiry | User preferences |

### Cache Operations (lib/cache.ts)
| Function | Purpose | Location |
|----------|---------|----------|
| `readCache<T>()` | Read with TTL validation | Global |
| `writeCache<T>()` | Write with timestamp | Global |
| `clearCache()` | Remove single key | Global |
| `clearAllCaches()` | Remove all @ keys | Global |
| `clearCacheByPrefix()` | Remove by prefix | Global |
| `readMultipleCache<T>()` | Batch read | Global |
| `cacheFirstStrategy<T>()` | Cache-first with background refresh | Global |

### Cache Versioning
- Recently viewed cache includes version field (`RECENTLY_VIEWED_CACHE_VERSION = 2`)
- Old cache format is detected and cleared on load
- Cache staleness detection based on image validity

---

## Utility Functions

### lib/formatters.ts
| Function | Purpose | Used By |
|----------|---------|---------|
| `formatDate()` | Relative time (5m ago, 2h ago) | Listings, messages |
| `formatMessageTime()` | Time with day context | Chat messages |
| `formatPrice()` | Currency formatting (£, USD) | All price displays |
| `formatPriceInput()` | Thousand separators for input | Form inputs |
| `unformatPrice()` | Remove formatting for storage | Form submission |
| `getCategoryInfo()` | Category name/icon lookup | Listings |
| `getCategoryDisplayString()` | Full category path | Category badges |
| `getDisplayName()` | User display name fallback chain | Profiles, chats |
| `truncateText()` | Text truncation with ellipsis | Cards, previews |
| `formatRelativeTime()` | Human-readable time (yesterday, 2 weeks ago) | Profiles |
| `getYearsSince()` | Years since date | Profile stats |
| `getTimeOnPlatform()` | Platform tenure string | Seller profiles |
| `formatFileSize()` | Bytes to KB/MB | Upload info |
| `formatDuration()` | Seconds to mm:ss | Voice messages |

### lib/imageUtils.ts
| Function | Purpose | Used By |
|----------|---------|---------|
| `getThumbnailUrl()` | Convert to Supabase thumbnail URL | ListingImage, cards |
| `getFullResolutionUrl()` | Return original URL | Detail pages |

### lib/errorHandler.ts
| Function | Purpose | Used By |
|----------|---------|---------|
| `logError()` | Console + future analytics | Global |
| `createAppError()` | Standardize error format | Error handling |
| `handleError()` | Log + optional alert | API calls |
| `withErrorHandling()` | Wrap async with error catching | Utilities |
| `showAuthRequiredAlert()` | Sign-in required prompt | Protected actions |
| `showRetryAlert()` | Error with retry option | Network errors |
| `showConfirmationAlert()` | Destructive action confirm | Delete operations |

### lib/auth-utils.ts
| Function | Purpose | Used By |
|----------|---------|---------|
| `extractAuthTokensFromUrl()` | Parse OAuth callback URL | Auth callback, context |
| `isAuthCallbackUrl()` | Check if URL is auth callback | Deep link handling |
| `checkUserAuthStatus()` | Determine user state (new/verified/oauth) | Auth screens |
| `isOAuthOnlyUser()` | Check if user lacks password | Account management |
| `handleAuthError()` | Auth-specific error alerts | Auth operations |
| `getProviderDisplayName()` | "Google" / "Facebook" strings | UI display |
| `safeReloadApp()` | Reload app (prod) or fallback (dev) | OAuth completion |

### lib/location-utils.ts
| Function | Purpose | Used By |
|----------|---------|---------|
| `calculateBoundingBox()` | Bounding box from center/radius | Location filter |
| `isLocationFilterActive()` | Check if filtering enabled | Search, listings |
| `calculateDistance()` | Haversine distance | Proximity checks |

---

## Supabase Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| URL | `process.env.EXPO_PUBLIC_SUPABASE_URL` | API endpoint |
| Key | `process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon key |
| Storage | `SupabaseAsyncStorage` (mobile), `localStorage` (web) | Session persistence |
| `autoRefreshToken` | `true` | Auto-refresh JWT |
| `persistSession` | `true` | Remember login |
| `detectSessionInUrl` | `false` | Manual callback handling |
| Realtime `eventsPerSecond` | `10` | Rate limiting |

### Storage Buckets
| Bucket | Purpose |
|--------|---------|
| `listing-images` | Listing photos |
| `avatars` | User profile photos |

---

## Dependencies Graph

```
app/_layout.tsx
├── @gorhom/bottom-sheet (BottomSheetModalProvider)
├── react-native-gesture-handler (GestureHandlerRootView)
├── lib/theme_context.tsx
│   └── @react-native-async-storage/async-storage
├── lib/auth_context.tsx
│   ├── lib/supabase.ts
│   │   └── @supabase/supabase-js
│   ├── lib/auth-utils.ts
│   ├── expo-auth-session
│   ├── expo-web-browser
│   └── expo-linking
├── lib/favorites_context.tsx
│   ├── lib/auth_context.tsx
│   ├── lib/api.ts
│   ├── lib/cache.ts
│   └── lib/errorHandler.ts
└── lib/app_data_context.tsx
    ├── lib/auth_context.tsx
    ├── lib/supabase.ts
    ├── lib/formatters.ts
    ├── lib/imageUpload.ts
    └── @react-native-async-storage/async-storage
```

---

## Identified Issues

### Critical
1. **No global error boundary** - Only `HomeErrorBoundary` exists; unhandled errors elsewhere can crash the app
2. **Missing TypeScript strict nullability in some hooks** - `userProfile.ts`, `useSellerProfile.ts` use implicit any types

### High Priority
1. **Duplicate cache keys** - `@conversations_cache` used directly in `app_data_context.tsx` instead of `CACHE_KEYS.CONVERSATIONS`
2. **Inconsistent cache clearing on logout** - Not all caches explicitly cleared in `AuthProvider.signOut()`
3. **Real-time subscription lacks reconnection logic** - Only logs errors, no automatic retry
4. **`expo-updates` dynamic import** - `safeReloadApp()` uses try/catch around require(), potential build issues

### Medium Priority
1. **Hardcoded colors in some components**:
   - `app/auth/callback.tsx:195` - `color: '#666'`
   - `app/auth/callback.tsx:207` - `color: '#333'`, `color: '#666'`, `color: '#999'`
   - `components/home/HomeErrorBoundary.tsx:93` - `color: '#fff'`
2. **No request timeout on some Supabase queries** - Only `favoritesApi.getIds()` uses `withTimeout()`
3. **Direct AsyncStorage usage** - Some components bypass `lib/cache.ts` (`app_data_context.tsx` for conversations)
4. **No offline handling** - App doesn't detect offline state or queue operations
5. **API timeout constant** - `API_TIMEOUT_MS = 10000` defined in api.ts but not used everywhere

### Low Priority
1. **Unused exports** in some files (e.g., `use-color-scheme.web.ts`)
2. **Console.log statements** in production code (`supabase.ts:57`, realtime logger)
3. **Missing memoization** - Some context values not wrapped in `useMemo`
4. **No analytics/crash reporting integration** - TODO comments in `errorHandler.ts` and `HomeErrorBoundary.tsx`
5. **Kotlin support** - `withDeepLinkHandler.js` warns about unsupported Kotlin

---

## Performance Considerations

### Memory Usage
- Context providers create new objects on each render; most are properly memoized
- Real-time subscriptions properly cleaned up in `useEffect` return
- `FavoritesProvider` maintains `Set<string>` for O(1) lookups

### Re-render Patterns
- `ThemeContext` value is memoized (`useMemo`)
- `FavoritesContext` value is memoized
- `AppDataContext` value is NOT memoized (potential optimization)
- Tab badge updates from `AppDataProvider` may trigger unnecessary tab bar re-renders

### Bundle Size
- Large dependencies: `react-native-maps`, `@supabase/supabase-js`
- `@expo/vector-icons` tree-shaking works only if specific icons imported

### Subscription Cleanup
- Auth subscription: ✅ Cleaned up
- Conversations subscription: ✅ Cleaned up
- Messages subscription (in hooks): ✅ Cleaned up
- No orphaned listeners detected

---

## Security Considerations

### API Key Exposure
- Supabase anon key in environment variable (expected behavior)
- Google/Facebook client IDs in environment (expected behavior)
- No secret keys in client code ✅

### Data Persistence
- Session stored in AsyncStorage (encrypted on iOS, secure on Android)
- Password reset flag uses timestamp-based TTL (30 min expiry)
- No sensitive data cached beyond session

### Session Handling
- Auto-refresh enabled
- Session persisted across app restarts
- Password reset flow prevents auto-redirect
- OAuth callback validates tokens before setting session

### Row Level Security
- App relies on Supabase RLS policies
- User ID verification in API calls (`eq('user_id', userId)`)
- Favorites/listings operations scoped to authenticated user

---

## Recommended Refactoring Plan

### Phase 1: Critical Fixes
- Task 1.1: Add global error boundary wrapping the entire app
- Task 1.2: Unify cache key usage (use CACHE_KEYS constants everywhere)
- Task 1.3: Add comprehensive cache clearing on sign-out
- Task 1.4: Fix hardcoded colors in auth/callback and error components

### Phase 2: Performance Optimization
- Task 2.1: Memoize `AppDataContext` value object
- Task 2.2: Add request timeouts to all Supabase queries
- Task 2.3: Implement offline detection and queuing
- Task 2.4: Add real-time subscription reconnection logic

### Phase 3: Type Safety
- Task 3.1: Add proper TypeScript types to profile hooks
- Task 3.2: Remove remaining `any` types in shared utilities
- Task 3.3: Add strict null checks to API responses

### Phase 4: Developer Experience
- Task 4.1: Remove console.log statements or wrap in __DEV__ check
- Task 4.2: Add error tracking integration (Sentry/Crashlytics)
- Task 4.3: Document all exported functions with JSDoc
- Task 4.4: Add Kotlin support to deep link plugin

---

## Cross-Feature Analysis

### Loading States
- Consistent `isLoading` / `isRefreshing` pattern across contexts
- `ActivityIndicator` from react-native used everywhere
- Brand color (`BRAND_COLOR`) used for all spinners

### Empty States
- `EmptyState` component provides consistent empty state UI
- Used in Favorites, My Listings, Chats screens
- Supports icon, title, subtitle, and optional action button

### Pull-to-Refresh
- Implemented in: Favorites, My Listings, Chats, Home
- Uses `RefreshControl` with `BRAND_COLOR`
- Triggers context refresh methods

### Optimistic Updates
- Favorites: ✅ Immediate ID set update, rollback on failure
- User Listings: ✅ Status updates, delete operations
- Cache updates happen after successful API calls

### Form Patterns
- Auth forms use dedicated components (`AuthInput`, `AuthPasswordInput`, `OTPInput`)
- Listing form uses standard React Native inputs
- Validation in auth handled by `components/auth/validation.ts`

### Modal Patterns
- Bottom sheets via `@gorhom/bottom-sheet`
- Full-screen modals via Expo Router `presentation: 'modal'`
- Alert dialogs via React Native `Alert.alert()`

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase API endpoint |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Yes | Google OAuth (web) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Yes | Google OAuth (iOS) |
| `EXPO_PUBLIC_FACEBOOK_APP_ID` | Yes | Facebook OAuth |

---

## Database Migrations Reference

| Migration | Purpose |
|-----------|---------|
| `001_add_email_verified_column.sql` | Email verification flag |
| `002_add_user_restored_trigger.sql` | Account restoration |
| `003_fix_oauth_profile_metadata.sql` | OAuth profile sync |
| `004_add_profiles_deleted_at.sql` | Soft delete support |
| `005_auto_delete_expired_accounts.sql` | Account cleanup |
| `006_add_whatsapp_number.sql` | WhatsApp contact |
| `007_get_user_auth_providers.sql` | RPC for auth providers |

---

## App Configuration (app.json)

| Setting | Value |
|---------|-------|
| Scheme | `souqjari` |
| Bundle ID | `com.souqshamy.app` |
| New Arch | Enabled |
| Typed Routes | Enabled |
| React Compiler | Enabled |
| Splash | Dark mode support |
| Permissions | Location (foreground) |

---

## Summary

The SouqJari codebase has a well-organized shared/global file structure with:
- **Clear provider hierarchy** with proper dependency ordering
- **Comprehensive theme system** with light/dark support
- **Centralized caching** with TTL support (though not always consistently used)
- **Good error handling patterns** (with room for global error boundary)
- **Type-safe API layer** with consistent response format

Key improvements should focus on:
1. Adding global error boundary
2. Unifying cache key usage
3. Adding comprehensive logout cleanup
4. Fixing hardcoded colors
5. Adding offline support
