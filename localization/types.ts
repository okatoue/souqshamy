// Type definitions for translations

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
  signIn: string;
  signUp: string;
  signInRequired: string;
  comingSoon: string;
  ok: string;
  yes: string;
  no: string;
  confirm: string;
  close: string;
  back: string;
  next: string;
  done: string;
  submit: string;
  continue: string;
  viewAll: string;
  seeAll: string;
  share: string;
  report: string;
  block: string;
  unblock: string;
  moreOptions: string;
  selectOption: string;
  required: string;
  optional: string;
  item: string;
  items: string;
}

export interface AuthTranslations {
  loginOrSignup: string;
  emailAddress: string;
  enterEmail: string;
  invalidEmail: string;
  password: string;
  enterPassword: string;
  createPassword: string;
  forgotPassword: string;
  forgotPasswordTitle: string;
  forgotPasswordSubtitle: string;
  sendCode: string;
  resetPassword: string;
  newPassword: string;
  newPasswordSubtitle: string;
  createAccount: string;
  welcomeBack: string;
  setUpAccount: string;
  enterPasswordToSignIn: string;
  yourName: string;
  enterFullName: string;
  termsFooter: string;
  termsOfService: string;
  privacyPolicy: string;
  and: string;
  verifyEmail: string;
  verificationCodeSent: string;
  enterCode: string;
  verifyCode: string;
  resendCode: string;
  didntReceiveCode: string;
  backToSignIn: string;
  emailVerified: string;
  emailVerifiedSubtitle: string;
  getStarted: string;
  passwordReset: string;
  passwordResetSubtitle: string;
  signInMethod: string;
  oauthOnlyMessage: string;
  accountNotFound: string;
  accountNotFoundMessage: string;
  invalidCode: string;
  invalidCodeMessage: string;
  codeSent: string;
  codeSentMessage: string;
  passwordMinLength: string;
  enterName: string;
  change: string;
}

export interface TabsTranslations {
  home: string;
  chats: string;
  post: string;
  favorites: string;
  myListings: string;
}

export interface HomeTranslations {
  searchPlaceholder: string;
  allCategories: string;
  recentlyViewed: string;
  clearAll: string;
  noRecentlyViewed: string;
}

export interface ListingTranslations {
  price: string;
  description: string;
  location: string;
  openInMaps: string;
  contactSeller: string;
  chat: string;
  call: string;
  whatsapp: string;
  sold: string;
  unavailable: string;
  listingNotFound: string;
  goBack: string;
  signInToChat: string;
  cantChatOwnListing: string;
  failedToStartConversation: string;
  failedToLoad: string;
  listedBy: string;
  activeListings: string;
  moreFromSeller: string;
  viewSellerProfile: string;
  shareListingMessage: string;
}

export interface CreateListingTranslations {
  createListing: string;
  editListing: string;
  title: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  pricePlaceholder: string;
  category: string;
  subcategory: string;
  selectCategory: string;
  selectSubcategory: string;
  addPhotos: string;
  addMorePhotos: string;
  photoLimit: string;
  setLocation: string;
  changeLocation: string;
  contactInfo: string;
  phoneNumber: string;
  whatsappNumber: string;
  sameAsPhone: string;
  publish: string;
  saveChanges: string;
  saveDraft: string;
  discardChanges: string;
  requiredField: string;
  listingCreated: string;
  listingUpdated: string;
  listingDeleted: string;
}

export interface MyListingsTranslations {
  noListingsYet: string;
  startSelling: string;
  createFirstListing: string;
  all: string;
  active: string;
  soldStatus: string;
  hidden: string;
  noActiveListings: string;
  noSoldItems: string;
  noHiddenListings: string;
  markAsSold: string;
  markAsActive: string;
  hide: string;
  unhide: string;
  deleteListing: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  restoreListing: string;
}

export interface FavoritesTranslations {
  noFavoritesYet: string;
  savedListingsAppear: string;
  browseListings: string;
  signInToViewFavorites: string;
}

export interface ChatsTranslations {
  messages: string;
  noConversationsYet: string;
  startChatting: string;
  browseListingsToChat: string;
  signInToViewMessages: string;
  deleteConversation: string;
  deleteConversationConfirm: string;
  deleteConversations: string;
  deleteConversationsConfirm: string;
  typeMessage: string;
  send: string;
  voiceMessage: string;
  startConversation: string;
  now: string;
  user: string;
  listing: string;
}

export interface UserTranslations {
  account: string;
  signInToAccess: string;
  dontHaveAccount: string;
  memberSince: string;
  accountSettings: string;
  manageAccount: string;
  passwordDeleteAccount: string;
  appSettings: string;
  appTheme: string;
  notificationPreferences: string;
  pushNotificationsEmail: string;
  supportLegal: string;
  help: string;
  faqsSupport: string;
  logOut: string;
  logOutConfirm: string;
  failedToLogOut: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
}

export interface PersonalDetailsTranslations {
  personalDetails: string;
  profilePhoto: string;
  changePhoto: string;
  displayName: string;
  email: string;
  phone: string;
  saveProfile: string;
  profileUpdated: string;
  profileUpdateFailed: string;
}

export interface ManageAccountTranslations {
  changePassword: string;
  currentPassword: string;
  newPasswordField: string;
  confirmPassword: string;
  passwordsDontMatch: string;
  passwordChanged: string;
  deleteAccount: string;
  deleteAccountWarning: string;
  deleteAccountConfirm: string;
  typeDeleteToConfirm: string;
  accountDeleted: string;
}

export interface SearchTranslations {
  searchListings: string;
  recentSearches: string;
  clearRecentSearches: string;
  noResultsFor: string;
  tryDifferentKeywords: string;
  filterResults: string;
  sortBy: string;
  priceRange: string;
  minPrice: string;
  maxPrice: string;
  applyFilters: string;
  clearFilters: string;
  resultsFound: string;
}

export interface LocationTranslations {
  selectLocation: string;
  currentLocation: string;
  useCurrentLocation: string;
  searchLocation: string;
  locationPermission: string;
  locationPermissionMessage: string;
  enableLocation: string;
  radius: string;
  km: string;
  allLocations: string;
  syria: string;
  nearby: string;
}

export interface CategoryTranslations {
  buyAndSell: string;
  cars: string;
  realEstate: string;
  jobs: string;
  services: string;
  pets: string;
  electronics: string;
  furniture: string;
  clothing: string;
  books: string;
  phones: string;
  computers: string;
  homeAppliances: string;
  toysAndGames: string;
  sportsEquipment: string;
  other: string;
  carsAndTrucks: string;
  motorcycles: string;
  vehicleParts: string;
  forRent: string;
  forSale: string;
  accounting: string;
  customerService: string;
  healthcare: string;
  sales: string;
  itAndProgramming: string;
  homeMaintenance: string;
  tutoring: string;
  cleaning: string;
  moving: string;
  cats: string;
  dogs: string;
  birds: string;
}

export interface ErrorTranslations {
  somethingWentWrong: string;
  tryAgain: string;
  networkError: string;
  checkConnection: string;
  sessionExpired: string;
  pleaseSignInAgain: string;
  permissionDenied: string;
  invalidInput: string;
  unableToMakeCall: string;
  whatsappNotInstalled: string;
  failedToShare: string;
}

export interface TimeTranslations {
  justNow: string;
  minuteAgo: string;
  minutesAgo: string;
  hourAgo: string;
  hoursAgo: string;
  dayAgo: string;
  daysAgo: string;
  weekAgo: string;
  weeksAgo: string;
  monthAgo: string;
  monthsAgo: string;
  yearAgo: string;
  yearsAgo: string;
}

export interface TranslationResources {
  common: CommonTranslations;
  auth: AuthTranslations;
  tabs: TabsTranslations;
  home: HomeTranslations;
  listing: ListingTranslations;
  createListing: CreateListingTranslations;
  myListings: MyListingsTranslations;
  favorites: FavoritesTranslations;
  chats: ChatsTranslations;
  user: UserTranslations;
  personalDetails: PersonalDetailsTranslations;
  manageAccount: ManageAccountTranslations;
  search: SearchTranslations;
  location: LocationTranslations;
  categories: CategoryTranslations;
  errors: ErrorTranslations;
  time: TimeTranslations;
}

// Helper type for translation keys
export type TranslationKey = {
  [K in keyof TranslationResources]: `${K}.${keyof TranslationResources[K] & string}`;
}[keyof TranslationResources];
