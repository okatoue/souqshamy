// Translation keys type definition for type-safe translations

export interface TranslationKeys {
  common: CommonTranslations;
  auth: AuthTranslations;
  tabs: TabTranslations;
  home: HomeTranslations;
  categories: CategoriesTranslations;
  listings: ListingsTranslations;
  chat: ChatTranslations;
  favorites: FavoritesTranslations;
  post: PostTranslations;
  productDetails: ProductDetailsTranslations;
  profile: ProfileTranslations;
  settings: SettingsTranslations;
  search: SearchTranslations;
  location: LocationTranslations;
  alerts: AlertTranslations;
  errors: ErrorTranslations;
  time: TimeTranslations;
  validation: ValidationTranslations;
  notifications: NotificationsTranslations;
  help: HelpTranslations;
  legal: LegalTranslations;
  manageAccount: ManageAccountTranslations;
}

export interface CommonTranslations {
  loading: string;
  error: string;
  retry: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  search: string;
  noResults: string;
  confirm: string;
  yes: string;
  no: string;
  ok: string;
  done: string;
  next: string;
  back: string;
  close: string;
  share: string;
  refresh: string;
  seeAll: string;
  showMore: string;
  showLess: string;
  stay: string;
  discard: string;
  saveChanges: string;
  remove: string;
  comingSoon: string;
  comingSoonMessage: string;
  item: string;
  items: string;
  keep: string;
}

export interface AuthTranslations {
  loginOrSignup: string;
  emailPlaceholder: string;
  emailLabel: string;
  passwordPlaceholder: string;
  passwordLabel: string;
  namePlaceholder: string;
  nameLabel: string;
  continue: string;
  createAccount: string;
  welcomeBack: string;
  signIn: string;
  signOut: string;
  signOutConfirmTitle: string;
  signOutConfirmMessage: string;
  forgotPassword: string;
  orContinueWith: string;
  verifyEmail: string;
  verifyEmailSubtitle: string;
  enterCode: string;
  resendCode: string;
  codeSent: string;
  codeExpired: string;
  invalidCode: string;
  emailVerified: string;
  emailVerifiedSubtitle: string;
  getStarted: string;
  passwordReset: string;
  passwordResetSubtitle: string;
  newPassword: string;
  newPasswordPlaceholder: string;
  setNewPassword: string;
  passwordRequirements: {
    title: string;
    minLength: string;
    uppercase: string;
    lowercase: string;
    number: string;
  };
  oauthError: string;
  signInMethod: string;
  signInMethodMessage: string;
  noAccountSignUp: string;
  currentPassword: string;
  currentPasswordPlaceholder: string;
  newPasswordPlaceholder: string;
  confirmNewPassword: string;
  confirmNewPasswordPlaceholder: string;
  passwordMinLength: string;
  updatePassword: string;
  passwordUpdated: string;
  currentPasswordIncorrect: string;
  passwordsDoNotMatch: string;
  cannotChangePassword: string;
  cannotChangePasswordMessage: string;
}

export interface TabTranslations {
  home: string;
  chats: string;
  post: string;
  favorites: string;
  myListings: string;
}

export interface HomeTranslations {
  greeting: string;
  searchPlaceholder: string;
  categories: string;
  recentlyViewed: string;
  noRecentlyViewed: string;
  noRecentlyViewedSubtext: string;
  clearRecentlyViewed: string;
  browseListings: string;
}

export interface CategoriesTranslations {
  // Main categories
  buySell: string;
  cars: string;
  realEstate: string;
  jobs: string;
  services: string;
  pets: string;
  // Buy & Sell subcategories
  electronics: string;
  furniture: string;
  clothing: string;
  books: string;
  phones: string;
  computers: string;
  homeAppliances: string;
  toysGames: string;
  sportsEquipment: string;
  // Cars subcategories
  carsTrucks: string;
  motorcycles: string;
  vehicleParts: string;
  // Real Estate subcategories
  forRent: string;
  forSale: string;
  // Jobs subcategories
  accounting: string;
  customerService: string;
  healthcare: string;
  sales: string;
  itProgramming: string;
  // Services subcategories
  homeMaintenance: string;
  tutoring: string;
  cleaning: string;
  moving: string;
  // Pets subcategories
  cats: string;
  dogs: string;
  birds: string;
  // Common
  other: string;
}

export interface ListingsTranslations {
  myListings: string;
  noListings: string;
  noListingsSubtext: string;
  createFirst: string;
  createListing: string;
  active: string;
  sold: string;
  inactive: string;
  deleted: string;
  all: string;
  markAsSold: string;
  markAsActive: string;
  deactivate: string;
  restore: string;
  deletePermanently: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  permanentDeleteConfirmTitle: string;
  permanentDeleteConfirmMessage: string;
  statusUpdated: string;
  listingDeleted: string;
  listingRestored: string;
  viewListing: string;
  editListing: string;
  postedBy: string;
  memberSince: string;
  viewProfile: string;
  contactSeller: string;
  startChat: string;
  callSeller: string;
  whatsappSeller: string;
  price: string;
  free: string;
  negotiable: string;
  location: string;
  description: string;
  noDescription: string;
  category: string;
  posted: string;
  updated: string;
  views: string;
  favorites: string;
  shareError: string;
}

export interface ChatTranslations {
  messages: string;
  noConversations: string;
  noConversationsSubtext: string;
  startChatting: string;
  browseListings: string;
  typeMessage: string;
  send: string;
  sending: string;
  sent: string;
  delivered: string;
  read: string;
  voiceMessage: string;
  holdToRecord: string;
  releaseToSend: string;
  recording: string;
  tapToPlay: string;
  today: string;
  yesterday: string;
  online: string;
  offline: string;
  typing: string;
  selectConversations: string;
  deleteConversations: string;
  deleteConversationsConfirm: string;
  signInRequired: string;
  signInRequiredSubtext: string;
  listingDeleted: string;
  listingUnavailable: string;
}

export interface FavoritesTranslations {
  favorites: string;
  noFavorites: string;
  noFavoritesSubtext: string;
  browseNow: string;
  removeFavorite: string;
  addFavorite: string;
  signInRequired: string;
  signInRequiredSubtext: string;
  itemSold: string;
  itemUnavailable: string;
  removeUnavailableMessage: string;
}

export interface PostTranslations {
  postListing: string;
  titlePlaceholder: string;
  titleLabel: string;
  selectCategory: string;
  categorySelected: string;
  continue: string;
  missingTitle: string;
  missingCategory: string;
}

export interface ProductDetailsTranslations {
  listingDetails: string;
  description: string;
  descriptionPlaceholder: string;
  price: string;
  pricePlaceholder: string;
  currency: string;
  location: string;
  locationPlaceholder: string;
  selectLocation: string;
  photos: string;
  addPhotos: string;
  photoLimit: string;
  removePhoto: string;
  contactInfo: string;
  phoneNumber: string;
  phonePlaceholder: string;
  whatsappNumber: string;
  whatsappPlaceholder: string;
  sameAsPhone: string;
  postListing: string;
  posting: string;
  listingCreated: string;
  listingCreatedSubtext: string;
  noImages: string;
  noImagesMessage: string;
  addImages: string;
  postAnyway: string;
  noContact: string;
  noContactMessage: string;
  draft: string;
  draftFound: string;
  draftFoundMessage: string;
  restoreDraft: string;
  discardDraft: string;
  saveDraft: string;
  editListing: string;
  updateListing: string;
  updating: string;
  listingUpdated: string;
  noChanges: string;
  discardChanges: string;
  discardChangesMessage: string;
}

export interface ProfileTranslations {
  profile: string;
  editProfile: string;
  personalDetails: string;
  displayName: string;
  displayNamePlaceholder: string;
  email: string;
  emailReadOnly: string;
  phoneNumber: string;
  phonePlaceholder: string;
  avatar: string;
  changePhoto: string;
  removePhoto: string;
  removePhotoConfirm: string;
  saveChanges: string;
  unsavedChanges: string;
  unsavedChangesMessage: string;
  manageAccount: string;
  changePassword: string;
  deleteAccount: string;
  deleteAccountWarning: string;
  deleteAccountConfirm: string;
  typeDelete: string;
  enterPassword: string;
  accountDeleted: string;
  oauthPasswordNote: string;
  sellerProfile: string;
  noListings: string;
  sellerNoListings: string;
  listings: string;
  ratings: string;
  ratingsComingSoon: string;
  joinedDate: string;
  daysOnPlatform: string;
  daysOnPlatform_plural: string;
  monthsOnPlatform: string;
  monthsOnPlatform_plural: string;
  yearsOnPlatform: string;
  yearsOnPlatform_plural: string;
  enterName: string;
  enterPhone: string;
  noEmailSet: string;
  emailSecurityNote: string;
  profileUpdated: string;
  updateFailed: string;
  memberSince: string;
  permissionRequired: string;
  photoLibraryPermission: string;
  avatarUpdateFailed: string;
  avatarUploadFailed: string;
  uploadFailed: string;
  removePhotoFailed: string;
}

export interface SettingsTranslations {
  settings: string;
  account: string;
  preferences: string;
  appTheme: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  themeLightSubtitle: string;
  themeDarkSubtitle: string;
  themeSystemSubtitle: string;
  language: string;
  languageArabic: string;
  languageEnglish: string;
  notifications: string;
  notificationPreferences: string;
  comingSoon: string;
  help: string;
  helpCenter: string;
  privacyPolicy: string;
  termsOfUse: string;
  version: string;
  accountSettings: string;
  appSettings: string;
  manageAccount: string;
  manageAccountSubtitle: string;
  security: string;
  changePassword: string;
  changePasswordSubtitle: string;
  notAvailableSocial: string;
  dangerZone: string;
  deleteAccount: string;
  deleteAccountSubtitle: string;
  supportLegal: string;
  helpSubtitle: string;
  notificationsSubtitle: string;
  logOut: string;
  logOutConfirm: string;
  logOutFailed: string;
  signInPrompt: string;
}

export interface SearchTranslations {
  search: string;
  searchPlaceholder: string;
  recentSearches: string;
  clearRecent: string;
  noResults: string;
  noResultsFor: string;
  tryDifferent: string;
  filters: string;
  sortBy: string;
  sortNewest: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  priceRange: string;
  minPrice: string;
  maxPrice: string;
  applyFilters: string;
  clearFilters: string;
  resultsCount: string;
}

export interface LocationTranslations {
  selectLocation: string;
  currentLocation: string;
  detectingLocation: string;
  locationDetected: string;
  locationError: string;
  searchLocation: string;
  nearYou: string;
  allSyria: string;
  radius: string;
  km: string;
  confirmLocation: string;
  changeLocation: string;
}

export interface AlertTranslations {
  error: string;
  success: string;
  warning: string;
  info: string;
  networkError: string;
  networkErrorMessage: string;
  sessionExpired: string;
  sessionExpiredMessage: string;
  permissionDenied: string;
  cameraPermission: string;
  locationPermission: string;
  microphonePermission: string;
  storagePermission: string;
}

export interface ErrorTranslations {
  somethingWentWrong: string;
  tryAgain: string;
  pageNotFound: string;
  goHome: string;
  noInternet: string;
  serverError: string;
  timeout: string;
  unauthorized: string;
  forbidden: string;
  unexpected: string;
}

export interface TimeTranslations {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  weeksAgo: string;
  monthsAgo: string;
  yearsAgo: string;
  today: string;
  yesterday: string;
  yesterdayAt: string;
  overAMonthAgo: string;
  overAYearAgo: string;
  // Short format for chat list
  now: string;
  minutesShort: string;
  hoursShort: string;
  daysShort: string;
}

export interface ValidationTranslations {
  required: string;
  invalidEmail: string;
  invalidPhone: string;
  passwordTooShort: string;
  passwordsDontMatch: string;
  priceMustBeNumber: string;
  titleTooShort: string;
  titleTooLong: string;
  descriptionTooLong: string;
}

export interface NotificationsTranslations {
  title: string;
  pushNotifications: string;
  enablePush: string;
  enablePushSubtitle: string;
  notificationTypes: string;
  messages: string;
  messagesSubtitle: string;
  listingActivity: string;
  listingActivitySubtitle: string;
  priceDrops: string;
  priceDropsSubtitle: string;
  promoUpdates: string;
  promoUpdatesSubtitle: string;
  permissionNotice: string;
}

export interface HelpTranslations {
  title: string;
  contactSupport: string;
  emailSupport: string;
  emailSupportSubtitle: string;
  whatsappSupport: string;
  whatsappSupportSubtitle: string;
  whatsappComingSoon: string;
  faq: string;
  responseTime: string;
  faqPostListing: string;
  faqPostListingAnswer: string;
  faqEditListing: string;
  faqEditListingAnswer: string;
  faqContactSeller: string;
  faqContactSellerAnswer: string;
  faqDeleteAccount: string;
  faqDeleteAccountAnswer: string;
  faqDataSafety: string;
  faqDataSafetyAnswer: string;
  faqReportListing: string;
  faqReportListingAnswer: string;
}

export interface LegalTranslations {
  lastUpdated: string;
  // Privacy Policy
  privacyPolicy: string;
  privacyIntroTitle: string;
  privacyIntroContent: string;
  privacyInfoCollectTitle: string;
  privacyInfoCollectContent: string;
  privacyHowUseTitle: string;
  privacyHowUseContent: string;
  privacyDataSharingTitle: string;
  privacyDataSharingContent: string;
  privacyDataRetentionTitle: string;
  privacyDataRetentionContent: string;
  privacyYourRightsTitle: string;
  privacyYourRightsContent: string;
  privacySecurityTitle: string;
  privacySecurityContent: string;
  privacyContactTitle: string;
  privacyContactContent: string;
  // Terms of Use
  termsOfUse: string;
  termsAcceptanceTitle: string;
  termsAcceptanceContent: string;
  termsAccountsTitle: string;
  termsAccountsContent: string;
  termsListingRulesTitle: string;
  termsListingRulesContent: string;
  termsProhibitedTitle: string;
  termsProhibitedContent: string;
  termsUserConductTitle: string;
  termsUserConductContent: string;
  termsIPTitle: string;
  termsIPContent: string;
  termsDisclaimersTitle: string;
  termsDisclaimersContent: string;
  termsLiabilityTitle: string;
  termsLiabilityContent: string;
  termsTerminationTitle: string;
  termsTerminationContent: string;
  termsChangesTitle: string;
  termsChangesContent: string;
  termsContactTitle: string;
  termsContactContent: string;
}

export interface ManageAccountTranslations {
  title: string;
  deleteAccountTitle: string;
  deleteAccountWarning: string;
  deleteAccountPermanent: string;
  deleteAccountPermanentMessage: string;
  typeDeleteToConfirm: string;
  typeDeleteExact: string;
  enterPasswordToConfirm: string;
  enterPassword: string;
  deleteMyAccount: string;
  oauthDeleteMessage: string;
  passwordIncorrect: string;
  deleteError: string;
}

// Type for accessing nested translation keys with dot notation
export type TranslationKeyPath =
  | `common.${keyof CommonTranslations}`
  | `auth.${keyof Omit<AuthTranslations, 'passwordRequirements'>}`
  | `auth.passwordRequirements.${keyof AuthTranslations['passwordRequirements']}`
  | `tabs.${keyof TabTranslations}`
  | `home.${keyof HomeTranslations}`
  | `categories.${keyof CategoriesTranslations}`
  | `listings.${keyof ListingsTranslations}`
  | `chat.${keyof ChatTranslations}`
  | `favorites.${keyof FavoritesTranslations}`
  | `post.${keyof PostTranslations}`
  | `productDetails.${keyof ProductDetailsTranslations}`
  | `profile.${keyof ProfileTranslations}`
  | `settings.${keyof SettingsTranslations}`
  | `search.${keyof SearchTranslations}`
  | `location.${keyof LocationTranslations}`
  | `alerts.${keyof AlertTranslations}`
  | `errors.${keyof ErrorTranslations}`
  | `time.${keyof TimeTranslations}`
  | `validation.${keyof ValidationTranslations}`;
