# Account Page System Audit - SouqJari React Native/Expo Application

## Complete File List

### Screens
| File | Path | Purpose |
|------|------|---------|
| user.tsx | `app/user.tsx` | Main account/settings screen with user info, menu navigation, theme toggle, sign out |
| manage-account.tsx | `app/manage-account.tsx` | Password change, account deletion with OAuth detection |
| personal-details.tsx | `app/personal-details.tsx` | Edit profile (name, avatar, phone number), email read-only |
| [sellerId].tsx | `app/profile/[sellerId].tsx` | Public seller profile view with listings grid |
| password.tsx | `app/(auth)/password.tsx` | Password reset flow (auth group) |

### Components
| Component | Path | Purpose |
|-----------|------|---------|
| SellerProfileHeader | `components/profile/SellerProfileHeader.tsx` | Seller avatar, name, rating, time on platform |
| SellerProfileTabs | `components/profile/SellerProfileTabs.tsx` | Listings/Ratings tab switcher |
| SellerProfileSkeleton | `components/profile/SellerProfileSkeleton.tsx` | Loading skeleton for seller profile |
| SellerNotFound | `components/profile/SellerNotFound.tsx` | 404 state for missing profiles |
| SellerStatsCard | `components/profile/SellerStatsCard.tsx` | Stats display (commented out, future feature) |
| index.ts | `components/profile/index.ts` | Barrel export for profile components |
| UserIcon | `components/ui/userIcon.tsx` | User avatar in header, navigates to settings |
| ThemedText | `components/themed-text.tsx` | Theme-aware text component |
| ThemedView | `components/themed-view.tsx` | Theme-aware view component |
| BottomSheet | `components/ui/bottomSheet.tsx` | Reusable bottom sheet (used for theme picker) |

### Hooks
| Hook | Path | Purpose |
|------|------|---------|
| useProfile | `hooks/userProfile.ts` | Current user profile CRUD with AsyncStorage caching |
| useSellerProfile | `hooks/useSellerProfile.ts` | Fetch public seller profile and listings |
| useThemeColor | `hooks/use-theme-color.ts` | Get theme-aware colors |
| useColorScheme | `hooks/use-color-scheme.ts` | System color scheme detection |

### Context & State
| File | Path | Purpose |
|------|------|---------|
| auth_context.tsx | `lib/auth_context.tsx` | User auth state, signIn, signUp, signOut, OAuth (Google/Facebook) |
| theme_context.tsx | `lib/theme_context.tsx` | Theme preference (light/dark/system), AsyncStorage persistence |
| app_data_context.tsx | `lib/app_data_context.tsx` | Global data provider (conversations, listings, recently viewed) |
| favorites_context.tsx | `lib/favorites_context.tsx` | Favorites management |

### Utilities
| File | Path | Purpose |
|------|------|---------|
| avatarUpload.ts | `lib/avatarUpload.ts` | Avatar upload/delete with retry logic, 'avatars' bucket |
| auth-utils.ts | `lib/auth-utils.ts` | OAuth detection, token extraction, error handling |
| cache.ts | `lib/cache.ts` | Centralized caching with TTL, CACHE_KEYS |
| formatters.ts | `lib/formatters.ts` | getDisplayName, getTimeOnPlatform, formatDate |
| supabase.ts | `lib/supabase.ts` | Supabase client initialization |
| imageUtils.ts | `lib/imageUtils.ts` | Image utilities including getThumbnailUrl |

### Types
| Type | Path | Purpose |
|------|------|---------|
| Profile | `hooks/userProfile.ts:8-17` | Current user profile interface |
| SellerProfile | `hooks/useSellerProfile.ts:11-16` | Public seller profile interface |
| UserProfile | `lib/formatters.ts:148-155` | Generic user profile for display name |
| ThemePreference | `lib/theme_context.tsx:6` | 'light' \| 'dark' \| 'system' |
| ResolvedTheme | `lib/theme_context.tsx:7` | 'light' \| 'dark' |
| OAuthProvider | `lib/auth-utils.ts:13` | 'google' \| 'facebook' |

### Database Migrations
| Migration | Path | Purpose |
|-----------|------|---------|
| 001 | `database/migrations/001_add_email_verified_column.sql` | email_verified column, sync trigger |
| 002 | `database/migrations/002_add_user_restored_trigger.sql` | Handle user restoration after soft delete |
| 003 | `database/migrations/003_fix_oauth_profile_metadata.sql` | Extract OAuth display name/avatar (full_name, picture) |
| 004 | `database/migrations/004_add_profiles_deleted_at.sql` | Soft delete support with deleted_at column |
| 005 | `database/migrations/005_auto_delete_expired_accounts.sql` | GDPR-compliant 30-day hard delete via pg_cron |
| 006 | `database/migrations/006_add_whatsapp_number.sql` | WhatsApp field for listings (not profiles) |
| 007 | `database/migrations/007_get_user_auth_providers.sql` | RPC function to detect OAuth-only users |

---

## Data Flow

### Fetch Current User Profile
1. `useProfile` hook initializes in component
2. Attempts to load from AsyncStorage cache (`@user_profile_cache`)
3. If cache hit and belongs to current user, displays immediately
4. Background fetch from `profiles` table via Supabase
5. Updates local state and cache on success
6. Fallback to creating default profile from auth.users metadata if profile doesn't exist

### Update Profile
1. User modifies form fields in `personal-details.tsx`
2. `hasChanges` computed by comparing with original profile
3. On save, calls `updateProfile(updates)` from `useProfile`
4. Supabase UPDATE to `profiles` table with `updated_at` timestamp
5. Optimistic update to local state
6. Cache updated via `saveCachedProfile`

### Upload Avatar
1. User taps avatar in `personal-details.tsx`
2. `ImagePicker.launchImageLibraryAsync` with 1:1 aspect ratio, 0.8 quality
3. `uploadAvatar` called from `lib/avatarUpload.ts`
4. Deletes old avatar if exists (via `deleteAvatar`)
5. Reads image as base64, determines MIME type
6. Uploads to 'avatars' bucket: `{userId}/avatar_{timestamp}.{ext}`
7. Returns public URL, updates profile via `updateProfile({ avatar_url })`

### Change Password
1. User opens modal in `manage-account.tsx`
2. OAuth users blocked with alert (detected via `isOAuthOnlyUser`)
3. Validates: current password required, new password >= 6 chars, confirm matches
4. Re-authenticates via `supabase.auth.signInWithPassword`
5. Updates password via `supabase.auth.updateUser({ password })`
6. Success alert, modal closes

### Delete Account
1. User taps "Delete Account" in `manage-account.tsx`
2. First confirmation alert with warning
3. Opens delete modal
4. OAuth users: type "DELETE" to confirm
5. Password users: enter password to verify
6. SOFT DELETE: sets `profiles.deleted_at` to current timestamp
7. Also sets all user's listings to `status: 'deleted'`
8. Signs out user, redirects to auth screen
9. pg_cron job (`delete-expired-accounts`) hard deletes after 30 days

### Fetch Seller Profile (Public)
1. `useSellerProfile(sellerId)` hook called with seller ID
2. Parallel fetch: profile from `profiles` + listings from `listings`
3. Only active listings returned
4. Profile data includes: id, display_name, email, avatar_url, created_at
5. Component displays via `SellerProfileHeader`

---

## Navigation Map

```
app/(tabs)/index.tsx (Home)
├── UserIcon (header) → app/user.tsx
└── Listing card → app/listing/[id] → SellerHeader → app/profile/[sellerId]

app/user.tsx (Settings)
├── User card tap → app/personal-details.tsx
├── Manage Account → app/manage-account.tsx
├── App Theme → BottomSheet (inline theme picker)
├── Notification Preferences → "Coming Soon" alert
├── Help → "Coming Soon" alert
├── Privacy Policy → "Coming Soon" alert
├── Terms of Use → "Coming Soon" alert
└── Log Out → Alert confirmation → signOut → /(auth)

app/personal-details.tsx
├── Back ← app/user.tsx (with unsaved changes warning)
├── Change Photo → ImagePicker
├── Remove Photo → Confirmation → deleteAvatar
└── Save → updateProfile → router.back()

app/manage-account.tsx
├── Back ← app/user.tsx
├── Change Password → Modal (OAuth users blocked)
└── Delete Account → Confirm → Modal → Soft delete → signOut

app/profile/[sellerId].tsx
├── Back ← Previous screen
├── Share → Native Share API
├── Listing tap → app/listing/[id]
└── Tabs: Listings | Ratings (coming soon)
```

---

## Component Hierarchy

```
app/_layout.tsx (RootLayout)
├── GestureHandlerRootView
│   └── ThemeProvider
│       └── BottomSheetModalProvider
│           └── AuthProvider
│               └── FavoritesProvider
│                   └── AppDataProvider
│                       └── RootLayoutNav
│                           └── Stack Navigator
│                               ├── (tabs)
│                               ├── (auth)
│                               ├── user ← app/user.tsx
│                               ├── personal-details ← app/personal-details.tsx
│                               ├── manage-account ← (not in Stack, modal behavior)
│                               └── profile/[sellerId] ← app/profile/[sellerId].tsx

app/user.tsx (UserScreen)
├── SafeAreaView
│   └── ScrollView
│       ├── ThemedView (Header: "Account")
│       ├── Pressable (User Card)
│       │   ├── Avatar (Image or Icon)
│       │   ├── UserInfo (name, email, member since)
│       │   └── Chevron
│       ├── Section "ACCOUNT SETTINGS"
│       │   └── MenuItem → Manage Account
│       ├── Section "APP SETTINGS"
│       │   ├── MenuItem → App Theme (opens BottomSheet)
│       │   └── MenuItem → Notification Preferences
│       ├── Section "SUPPORT & LEGAL"
│       │   ├── MenuItem → Help
│       │   ├── MenuItem → Privacy Policy
│       │   └── MenuItem → Terms of Use
│       ├── Section (no title)
│       │   └── MenuItem → Log Out (red)
│       └── Version ("Katoo v1.0.0")
└── BottomSheet (Theme Picker)
    └── ThemeOptions (light/dark/system)

app/personal-details.tsx
├── SafeAreaView
│   └── KeyboardAvoidingView
│       ├── Header (back, title, spacer)
│       ├── ScrollView
│       │   ├── Avatar Section
│       │   │   ├── Avatar Pressable (image/placeholder)
│       │   │   ├── Camera button overlay
│       │   │   ├── "Change Photo" button
│       │   │   └── "Remove Photo" button (if has avatar)
│       │   └── Form Container
│       │       ├── Display Name (TextInput)
│       │       ├── Email (TextInput, disabled, lock icon)
│       │       └── Phone Number (TextInput)
│       └── Footer
│           └── Save Button

app/manage-account.tsx
├── SafeAreaView
│   └── KeyboardAvoidingView
│       ├── Header
│       ├── ScrollView
│       │   ├── Section "SECURITY"
│       │   │   └── MenuItem → Change Password
│       │   └── Section "DANGER ZONE"
│       │       └── MenuItem → Delete Account (red)
│       ├── Modal (Change Password)
│       │   ├── Current Password input
│       │   ├── New Password input
│       │   ├── Confirm Password input
│       │   └── Update Button
│       └── Modal (Delete Account)
│           ├── Warning icon/text
│           ├── OAuth: "Type DELETE" input
│           ├── Password: Password input
│           └── Delete Button (red)

app/profile/[sellerId].tsx
├── SafeAreaView
│   ├── Header (back, "Profile", share button)
│   └── FlatList (2-column grid)
│       ├── ListHeaderComponent
│       │   ├── SellerProfileHeader
│       │   │   ├── Avatar
│       │   │   ├── Display Name
│       │   │   ├── Rating stars
│       │   │   └── Time on platform
│       │   └── SellerProfileTabs (Listings | Ratings)
│       ├── renderItem → ListingGridCard
│       └── ListEmptyComponent → Empty state
```

---

## State Management

### AuthContext (`lib/auth_context.tsx`)
| State | Type | Purpose |
|-------|------|---------|
| user | User \| null | Supabase User object |
| session | Session \| null | Supabase Session |
| loading | boolean | Auth initialization in progress |
| isPasswordResetInProgress | boolean | Prevents redirect during password reset |

### ThemeContext (`lib/theme_context.tsx`)
| State | Type | Purpose |
|-------|------|---------|
| themePreference | 'light' \| 'dark' \| 'system' | User's theme choice |
| resolvedTheme | 'light' \| 'dark' | Computed from preference + system |
| isLoading | boolean | Theme loading from storage |

### useProfile Hook (`hooks/userProfile.ts`)
| State | Type | Purpose |
|-------|------|---------|
| profile | Profile \| null | Current user's profile data |
| isLoading | boolean | Initial profile fetch |
| isRefreshing | boolean | Background refresh |

### Profile Data Flow
| Source | Caching | Refresh Trigger |
|--------|---------|-----------------|
| Supabase `profiles` table | AsyncStorage `@user_profile_cache` | Screen focus (useFocusEffect), manual |
| Cache validated by userId | TTL: None (user-specific) | On auth state change |

---

## Database Schema

### profiles Table
| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| id | UUID | NO | Primary key, matches auth.users.id |
| email | TEXT | YES | User's email address |
| phone_number | TEXT | YES | Phone number |
| display_name | TEXT | YES | Display name (from OAuth or manual) |
| avatar_url | TEXT | YES | Public URL to avatar in storage |
| email_verified | BOOLEAN | NO (default: false) | Email verification status |
| created_at | TIMESTAMPTZ | YES | Account creation time |
| updated_at | TIMESTAMPTZ | YES | Last profile update |
| deleted_at | TIMESTAMPTZ | YES | Soft delete timestamp |

### Indexes
- `idx_profiles_email_verified` on `(email, email_verified)`
- `idx_profiles_deleted_at` on `(deleted_at)`

### Database Triggers
| Trigger | Event | Function | Purpose |
|---------|-------|----------|---------|
| on_auth_user_created | INSERT on auth.users | handle_new_user() | Create profile on signup |
| trigger_sync_email_verified | UPDATE on auth.users | sync_email_verified() | Sync email_verified on confirmation |
| trigger_handle_user_restored | UPDATE on auth.users | handle_user_restored() | Create profile for restored users |

### RPC Functions
| Function | Purpose |
|----------|---------|
| get_user_auth_providers(user_email TEXT) | Returns list of auth providers for OAuth detection |
| delete_expired_accounts() | Hard deletes accounts soft-deleted 30+ days ago |

### Storage (Avatars)
| Bucket | Public | Path Pattern |
|--------|--------|--------------|
| avatars | Yes | `{userId}/avatar_{timestamp}.{ext}` |

---

## Dependencies Graph

```
app/user.tsx
├── @/components/themed-text
├── @/components/themed-view
├── @/components/ui/bottomSheet
├── @/constants/theme
├── @/hooks/use-theme-color
├── @/hooks/userProfile (useProfile)
├── @/lib/auth_context (useAuth)
└── @/lib/theme_context (useThemeContext)

app/manage-account.tsx
├── @/components/themed-text
├── @/constants/theme
├── @/hooks/use-theme-color
├── @/lib/auth_context (useAuth)
├── @/lib/auth-utils (isOAuthOnlyUser, getProviderDisplayName)
└── @/lib/supabase

app/personal-details.tsx
├── @/components/themed-text
├── @/components/themed-view
├── @/constants/theme
├── @/hooks/use-theme-color
├── @/hooks/userProfile (useProfile)
├── @/lib/auth_context (useAuth)
├── @/lib/avatarUpload (uploadAvatar, deleteAvatar)
└── expo-image-picker

app/profile/[sellerId].tsx
├── @/components/listing/ListingGridCard
├── @/components/profile/* (SellerProfileHeader, Tabs, Skeleton, NotFound)
├── @/constants/theme
├── @/hooks/use-theme-color
├── @/hooks/useSellerProfile
├── @/lib/formatters (getDisplayName)
└── @/types/listing

hooks/userProfile.ts
├── @/lib/auth_context (useAuth)
├── @/lib/supabase
└── @react-native-async-storage/async-storage

hooks/useSellerProfile.ts
├── @/lib/supabase
└── @/types/listing

lib/auth_context.tsx
├── @/lib/auth-utils
├── @/lib/supabase
├── @react-native-async-storage/async-storage
└── expo-web-browser

lib/theme_context.tsx
└── @react-native-async-storage/async-storage

lib/avatarUpload.ts
├── @/lib/supabase
├── expo-file-system/legacy
└── base64-arraybuffer
```

---

## Identified Issues

### Critical
1. **No issues found** - The account system is well-architected with proper soft delete, OAuth detection, and GDPR compliance.

### High Priority
1. **Hardcoded app version** (`app/user.tsx:310-311`) - Shows "Katoo v1.0.0" hardcoded. Should read from `app.json` or environment.

### Medium Priority
1. **Placeholder ratings** (`components/profile/SellerProfileHeader.tsx:14-15`) - Rating system shows hardcoded 5.0 rating with 2 reviews. Ratings feature not implemented.
2. **Coming Soon features** (`app/user.tsx:165-167`) - Notification Preferences, Help, Privacy Policy, Terms of Use all show "Coming Soon" alerts.
3. **SellerStatsCard commented out** (`components/profile/SellerStatsCard.tsx`) - Stats feature (reply rate, avg reply time) is commented out pending backend support.
4. **Duplicate MenuItem component** - `MenuItem` is defined identically in both `app/user.tsx` and `app/manage-account.tsx`. Should be extracted to shared component.
5. **Duplicate Section component** - Same issue as MenuItem.

### Low Priority
1. **No bio field** - Profile doesn't include a bio/description field despite being mentioned in requirements.
2. **No data export** - No functionality for users to export their data.
3. **Profile cache key inconsistency** - `CACHE_KEYS.PROFILE` in `lib/cache.ts` uses different format than `PROFILE_CACHE_KEY` in `hooks/userProfile.ts`.

---

## Security Considerations

### Profile Data Visibility
- Public seller profiles show: display_name (with fallbacks), avatar_url, created_at
- Email is displayed but could be considered sensitive
- Phone numbers stored but not shown on public profiles

### Avatar Access
- 'avatars' bucket is public (intentional for profile display)
- Files organized by userId preventing enumeration
- Old avatars deleted on replacement (cleanup)

### Password Change Requirements
- Current password verification required (re-authentication via signInWithPassword)
- Minimum 6 characters for new password
- OAuth-only users blocked from password change

### Account Deletion Safety
- Two-step confirmation (alert + modal)
- OAuth users: must type "DELETE" exactly
- Password users: must enter password
- SOFT DELETE first (30-day recovery window)
- Hard delete via scheduled job (GDPR compliant)
- Related data (listings) also marked deleted

### OAuth Detection
- Uses RPC function `get_user_auth_providers` for reliable detection
- Queries `auth.identities` table via SECURITY DEFINER function
- Prevents password operations for OAuth-only accounts

---

## UX Considerations

### Settings Organization
- Clear section groupings (Account Settings, App Settings, Support & Legal)
- Consistent menu item styling with icons, titles, subtitles
- Danger actions (Delete Account, Log Out) visually distinguished with red

### Form Feedback
- Unsaved changes warning on back navigation (`personal-details.tsx`)
- Loading states for save/upload operations
- Success/error alerts with actionable messaging
- Disabled state for email field with lock icon and helper text

### Confirmation Patterns
- Log out: Alert with Cancel/Log Out options
- Delete account: 2-step (alert -> modal with password/phrase)
- Remove photo: Alert confirmation
- Theme change: Instant apply, no save needed

### Avatar Handling
- Square crop (1:1 aspect ratio)
- 0.8 quality compression
- Loading overlay during upload
- Camera icon indicator
- Remove option when avatar exists

---

## Recommended Refactoring Plan

### Phase 1: Code Organization
- Task 1.1: Extract `MenuItem` and `Section` to `components/settings/` directory
- Task 1.2: Create shared `SettingsMenuItem.tsx` component
- Task 1.3: Extract theme selection to `components/settings/ThemePicker.tsx`

### Phase 2: Profile Enhancements
- Task 2.1: Add `bio` field to profiles table and forms
- Task 2.2: Implement dynamic app version display
- Task 2.3: Unify cache key patterns between `lib/cache.ts` and `hooks/userProfile.ts`

### Phase 3: Complete Missing Features
- Task 3.1: Implement Help/FAQ screen
- Task 3.2: Create Privacy Policy screen
- Task 3.3: Create Terms of Use screen
- Task 3.4: Add notification preferences screen (even if basic)

### Phase 4: Ratings System
- Task 4.1: Design ratings schema (reviews table, rating aggregation)
- Task 4.2: Enable SellerStatsCard with real data
- Task 4.3: Implement Ratings tab on seller profile

### Phase 5: Data Export (GDPR)
- Task 5.1: Create data export endpoint/function
- Task 5.2: Add "Download My Data" option in Manage Account
- Task 5.3: Generate JSON/PDF export of user data

---

## Additional Discovery Answers

### Profile Data
- **Source**: `profiles` table (public schema), synced from `auth.users` via triggers
- **Fields**: id, email, phone_number, display_name, avatar_url, email_verified, created_at, updated_at, deleted_at
- **Creation**: Trigger `handle_new_user` fires on auth.users INSERT
- **Sync**: OAuth metadata (full_name, name, picture) extracted during signup/login

### Avatar Handling
- **Bucket**: 'avatars' (public)
- **Naming**: `{userId}/avatar_{timestamp}.{ext}`
- **Compression**: expo-image-picker quality 0.8, square crop
- **Cleanup**: `deleteAvatar` called before new upload
- **Default**: MaterialCommunityIcons "account-circle"

### OAuth Detection
- **Method**: RPC `get_user_auth_providers` queries auth.identities
- **Providers**: 'google', 'facebook'
- **Password setting**: Blocked for OAuth-only users (directed to "Forgot Password")
- **Linked accounts**: Not displayed (single provider detection only)

### Account Deletion
- **Type**: Soft delete (sets `deleted_at` timestamp)
- **Related data**: Listings set to `status: 'deleted'`
- **Confirmation email**: None (could be added)
- **Grace period**: 30 days before hard delete
- **Restoration**: User can re-signup, trigger creates new profile

### Theme Persistence
- **Storage key**: `@app_theme_preference`
- **System respect**: Yes, 'system' option uses device preference
- **Application speed**: Immediate on selection
- **Options**: 'light', 'dark', 'system'

### Form Validation
- **Name**: No explicit validation, trims whitespace
- **Password**: Minimum 6 characters, confirmation must match
- **Character limits**: None enforced in UI
- **Error display**: Alert dialogs

### Navigation
- **Entry point**: UserIcon component in home screen header
- **Back navigation**: All screens have back button
- **Unsaved warning**: Only on personal-details.tsx

### Seller Profile
- **Public info**: display_name (with fallback), avatar_url, created_at
- **Private info**: email (shown), phone_number (not shown)
- **Member since**: Calculated via `getTimeOnPlatform(created_at)`
- **Listing counts**: Fetched fresh (not cached)
- **Block/Report**: Not implemented
