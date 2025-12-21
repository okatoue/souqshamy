/**
 * Database Seeding Script for SouqJari
 *
 * Populates the Supabase database with realistic fake data for testing and development.
 *
 * Usage:
 *   npx ts-node scripts/seed-database.ts [options]
 *   OR
 *   node scripts/seed-database.js [options]
 *
 * Options:
 *   --clean     Truncate all tables before seeding (default: false)
 *   --users N   Number of users to create (default: 30)
 *   --listings N Number of listings to create (default: 150)
 *   --help      Show this help message
 *
 * Environment Variables Required:
 *   SUPABASE_URL          - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY  - Service role key (bypasses RLS)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface Config {
  clean: boolean;
  userCount: number;
  listingCount: number;
  favoriteCount: number;
  conversationCount: number;
  messagesPerConversation: { min: number; max: number };
}

const DEFAULT_CONFIG: Config = {
  clean: false,
  userCount: 30,
  listingCount: 150,
  favoriteCount: 75,
  conversationCount: 40,
  messagesPerConversation: { min: 2, max: 10 },
};

// ============================================================================
// SYRIAN DATA CONSTANTS
// ============================================================================

// Common Syrian/Arabic first names
const ARABIC_FIRST_NAMES_MALE = [
  'محمد', 'أحمد', 'علي', 'عمر', 'يوسف', 'خالد', 'حسن', 'إبراهيم', 'مصطفى', 'سامر',
  'فادي', 'رامي', 'وليد', 'طارق', 'نبيل', 'كريم', 'ماهر', 'باسل', 'غسان', 'عماد',
  'هيثم', 'زياد', 'جمال', 'سمير', 'راشد', 'منصور', 'سعيد', 'فيصل', 'ناصر', 'عادل'
];

const ARABIC_FIRST_NAMES_FEMALE = [
  'فاطمة', 'نور', 'سارة', 'ريم', 'لينا', 'مريم', 'هبة', 'رنا', 'دانا', 'سلمى',
  'ياسمين', 'لمى', 'غادة', 'هالة', 'سحر', 'منى', 'أمل', 'ندى', 'ربى', 'رشا',
  'سوسن', 'نهى', 'وفاء', 'إيمان', 'حنان', 'عبير', 'نسرين', 'ديمة', 'ميس', 'آلاء'
];

const ARABIC_LAST_NAMES = [
  'الأحمد', 'العلي', 'المحمد', 'الحسن', 'الخالد', 'الإبراهيم', 'الحسين', 'العمر',
  'السالم', 'الناصر', 'الرشيد', 'المصطفى', 'الكريم', 'العبد', 'الشيخ', 'الحاج',
  'القاسم', 'البكري', 'الشامي', 'الحلبي', 'الدمشقي', 'اللاذقاني', 'الحموي', 'الحمصي',
  'الطرطوسي', 'الديري', 'النجار', 'الخياط', 'البستاني', 'الصباغ'
];

// Syrian cities with coordinates
const SYRIAN_CITIES = [
  { name: 'دمشق', nameEn: 'Damascus', lat: 33.5138, lon: 36.2765 },
];

// Category and subcategory mapping with listing templates
const CATEGORY_TEMPLATES: Record<number, CategoryTemplate> = {
  // Buy & Sell - Electronics (subcategory 1)
  1: {
    categoryId: 1,
    titles: [
      'تلفزيون سامسونج 55 بوصة سمارت',
      'شاشة LED جديدة للبيع',
      'جهاز بلايستيشن 5 مع ألعاب',
      'نظام صوت سوني للمنزل',
      'كاميرا كانون احترافية',
      'مكيف سبليت جديد بالكرتون',
    ],
    descriptions: [
      'جهاز بحالة ممتازة، استعمال خفيف، مع جميع الملحقات الأصلية.',
      'للبيع بسبب السفر، الجهاز جديد وغير مستعمل.',
      'حالة ممتازة، يوجد ضمان لمدة سنة، التوصيل متاح.',
      'نظيف جداً، بدون أي خدش، مع الفاتورة الأصلية.',
    ],
    priceRange: { min: 500000, max: 10000000 },
  },
  // Buy & Sell - Furniture (subcategory 2)
  2: {
    categoryId: 1,
    titles: [
      'طقم كنب صالون فاخر',
      'غرفة نوم كاملة للبيع',
      'طاولة طعام مع 6 كراسي',
      'خزانة ملابس خشب طبيعي',
      'سرير مزدوج مع فراش طبي',
    ],
    descriptions: [
      'أثاث بحالة ممتازة، تصميم حديث وأنيق.',
      'خشب زان طبيعي، صناعة محلية عالية الجودة.',
      'مستعمل قليل جداً، بحالة الجديد.',
      'للبيع بسعر مغري بسبب السفر.',
    ],
    priceRange: { min: 1000000, max: 15000000 },
  },
  // Buy & Sell - Clothing (subcategory 3)
  3: {
    categoryId: 1,
    titles: [
      'فستان سهرة فاخر',
      'بدلة رجالية إيطالية',
      'مجموعة ملابس أطفال جديدة',
      'جاكيت جلد أصلي',
      'أحذية رياضية ماركة',
    ],
    descriptions: [
      'جديد بالتغليفة، ماركة أصلية.',
      'لبسة واحدة فقط، بحالة ممتازة.',
      'قياسات متنوعة، جودة عالية.',
      'مستورد من أوروبا، خامة فاخرة.',
    ],
    priceRange: { min: 100000, max: 2000000 },
  },
  // Buy & Sell - Books (subcategory 4)
  4: {
    categoryId: 1,
    titles: [
      'مجموعة كتب أدبية للبيع',
      'موسوعة علمية كاملة',
      'كتب جامعية هندسة',
      'روايات عربية وأجنبية',
      'كتب أطفال تعليمية',
    ],
    descriptions: [
      'كتب بحالة ممتازة، أكثر من 50 كتاب.',
      'مناسبة للطلاب والباحثين.',
      'مجموعة نادرة ومميزة.',
      'أسعار رمزية للبيع السريع.',
    ],
    priceRange: { min: 10000, max: 500000 },
  },
  // Buy & Sell - Phones (subcategory 5)
  5: {
    categoryId: 1,
    titles: [
      'آيفون 15 برو ماكس جديد',
      'سامسونج جالكسي S24 الترا',
      'هواوي ميت 60 برو',
      'شاومي 14 الترا',
      'موبايل أوبو فايند X7',
    ],
    descriptions: [
      'جهاز جديد بالكرتونة، ضمان سنة كاملة.',
      'نظيف جداً، بطارية 100%، مع جميع الملحقات.',
      'استعمال شهر واحد، بحالة الوكالة.',
      'لون مميز، ذاكرة 256 جيجا.',
    ],
    priceRange: { min: 2000000, max: 25000000 },
  },
  // Buy & Sell - Computers (subcategory 6)
  6: {
    categoryId: 1,
    titles: [
      'لابتوب ماك بوك برو M3',
      'كمبيوتر مكتبي للألعاب',
      'لابتوب ديل للأعمال',
      'آيباد برو مع لوحة مفاتيح',
      'كمبيوتر مكتبي للمونتاج',
    ],
    descriptions: [
      'مواصفات عالية، مناسب للمصممين والمبرمجين.',
      'كرت شاشة RTX 4080، رام 32 جيجا.',
      'بحالة ممتازة، بطارية تدوم 8 ساعات.',
      'مع جميع الملحقات والحقيبة الأصلية.',
    ],
    priceRange: { min: 5000000, max: 50000000 },
  },
  // Buy & Sell - Home Appliances (subcategory 7)
  7: {
    categoryId: 1,
    titles: [
      'غسالة أوتوماتيك سامسونج',
      'ثلاجة LG انفرتر كبيرة',
      'مايكرويف باناسونيك',
      'مكنسة كهربائية دايسون',
      'فرن غاز مع فرن كهربائي',
    ],
    descriptions: [
      'حالة ممتازة، استعمال سنة واحدة.',
      'موفرة للطاقة، سعة كبيرة.',
      'جديدة بالكرتون، ضمان المصنع.',
      'قوة شفط عالية، هادئة جداً.',
    ],
    priceRange: { min: 500000, max: 8000000 },
  },
  // Buy & Sell - Toys & Games (subcategory 8)
  8: {
    categoryId: 1,
    titles: [
      'دراجة أطفال مع عجلات مساعدة',
      'ألعاب تعليمية للأطفال',
      'طاولة بلياردو صغيرة',
      'سكوتر كهربائي للأطفال',
      'مجموعة ليغو كاملة',
    ],
    descriptions: [
      'مناسبة للأعمار من 3-6 سنوات.',
      'ألعاب آمنة ومعتمدة عالمياً.',
      'بحالة ممتازة، استعمال خفيف.',
      'هدية مثالية للأطفال.',
    ],
    priceRange: { min: 50000, max: 1500000 },
  },
  // Buy & Sell - Sports Equipment (subcategory 9)
  9: {
    categoryId: 1,
    titles: [
      'جهاز مشي كهربائي',
      'دراجة هوائية رياضية',
      'أثقال وأجهزة رياضة منزلية',
      'طاولة تنس الطاولة',
      'معدات رياضة كاملة للجيم',
    ],
    descriptions: [
      'جهاز احترافي، مستعمل قليل.',
      'ماركة عالمية، حالة ممتازة.',
      'مناسب للتمارين المنزلية.',
      'شبه جديد، سعر مغري.',
    ],
    priceRange: { min: 200000, max: 5000000 },
  },
  // Buy & Sell - Other (subcategory 10)
  10: {
    categoryId: 1,
    titles: [
      'أدوات منزلية متنوعة',
      'معدات تصوير للبيع',
      'آلة موسيقية جيتار',
      'مستلزمات حرف يدوية',
      'أغراض متنوعة للبيع',
    ],
    descriptions: [
      'جودة عالية، أسعار مناسبة.',
      'للبيع بسبب السفر أو عدم الاستخدام.',
      'حالة ممتازة، سعر قابل للتفاوض.',
      'فرصة لا تعوض.',
    ],
    priceRange: { min: 50000, max: 3000000 },
  },
  // Cars - Cars & Trucks (subcategory 11)
  11: {
    categoryId: 2,
    titles: [
      'سيارة هيونداي اكسنت 2022',
      'كيا سيراتو موديل 2021',
      'تويوتا كامري 2020 فل كامل',
      'مرسيدس C200 موديل 2019',
      'بيك أب ميتسوبيشي L200',
      'سوزوكي سويفت اقتصادية',
    ],
    descriptions: [
      'سيارة نظيفة جداً، صيانة وكالة، كتلوج وفاتورة.',
      'ممشى قليل، حوادث لا يوجد، فحص كامل متاح.',
      'فل أوبشن، جلد، فتحة سقف، كاميرا خلفية.',
      'موديل حديث، ناقل أوتوماتيك، توفير بنزين.',
    ],
    priceRange: { min: 50000000, max: 500000000 },
  },
  // Cars - Motorcycles (subcategory 12)
  12: {
    categoryId: 2,
    titles: [
      'دراجة نارية هوندا 150',
      'سوزوكي هايابوسا سبورت',
      'ياماها R1 موديل 2022',
      'دراجة سكوتر فيسبا',
      'BMW دراجة نارية',
    ],
    descriptions: [
      'دراجة نظيفة، محرك ممتاز، جاهزة للسير.',
      'استعمال خفيف، بحالة الوكالة.',
      'مع جميع الملحقات والخوذة.',
      'موفرة للوقود، مناسبة للمدينة.',
    ],
    priceRange: { min: 5000000, max: 100000000 },
  },
  // Cars - Vehicle Parts (subcategory 13)
  13: {
    categoryId: 2,
    titles: [
      'محرك تويوتا مستعمل بحالة ممتازة',
      'جنوط ألمنيوم 17 بوصة',
      'فرامل سيراميك جديدة',
      'قطع غيار هيونداي أصلية',
      'بطارية سيارة فارتا',
    ],
    descriptions: [
      'قطع أصلية، ضمان شهر.',
      'استعمال خفيف، بحالة ممتازة.',
      'مناسبة لعدة موديلات.',
      'جديدة بالكرتون، سعر مناسب.',
    ],
    priceRange: { min: 100000, max: 10000000 },
  },
  // Cars - Other (subcategory 14)
  14: {
    categoryId: 2,
    titles: [
      'عربة سحب للسيارات',
      'جهاز فحص السيارات OBD',
      'كراسي سيارة جلد',
      'نظام صوت للسيارة',
      'ملحقات سيارات متنوعة',
    ],
    descriptions: [
      'جودة عالية، مستوردة.',
      'سهل الاستخدام، متوافق مع جميع السيارات.',
      'بحالة ممتازة، نظيفة جداً.',
      'أسعار منافسة.',
    ],
    priceRange: { min: 50000, max: 5000000 },
  },
  // Real Estate - For Rent (subcategory 15)
  15: {
    categoryId: 3,
    titles: [
      'شقة للإيجار في دمشق - المزة',
      'منزل مستقل للإيجار',
      'مكتب تجاري للإيجار',
      'شقة مفروشة للإيجار الشهري',
      'استديو للإيجار قرب الجامعة',
      'فيلا للإيجار مع حديقة',
    ],
    descriptions: [
      'شقة 3 غرف وصالة، طابق ثاني، مصعد، موقف سيارة.',
      'موقع مميز، قريب من الخدمات، إطلالة رائعة.',
      'مناسبة للعائلات، هادئة، أمان 24 ساعة.',
      'مفروشة بالكامل، جاهزة للسكن فوراً.',
    ],
    priceRange: { min: 1000000, max: 20000000 },
  },
  // Real Estate - For Sale (subcategory 16)
  16: {
    categoryId: 3,
    titles: [
      'شقة للبيع في حلب الجديدة',
      'أرض للبيع - موقع استثماري',
      'فيلا فاخرة للبيع',
      'محل تجاري للبيع',
      'بناء كامل للبيع',
      'شقة طابق أرضي مع حديقة',
    ],
    descriptions: [
      'شقة جديدة لم تسكن، تشطيب سوبر ديلوكس.',
      'صك أخضر، موقع على شارع رئيسي.',
      'فرصة استثمارية ذهبية، السعر قابل للتفاوض.',
      'مساحة كبيرة، مناسب لجميع الأنشطة التجارية.',
    ],
    priceRange: { min: 100000000, max: 2000000000 },
  },
  // Jobs - Accounting (subcategory 17)
  17: {
    categoryId: 4,
    titles: [
      'مطلوب محاسب خبرة',
      'وظيفة محاسب مبتدئ',
      'مطلوب مدير مالي',
      'فرصة عمل - قسم المحاسبة',
    ],
    descriptions: [
      'خبرة 3 سنوات على الأقل، إجادة برامج المحاسبة.',
      'رواتب مجزية، تأمين صحي، إجازات سنوية.',
      'فرصة للتطور الوظيفي، بيئة عمل ممتازة.',
      'دوام كامل، راتب يحدد بعد المقابلة.',
    ],
    priceRange: { min: 500000, max: 3000000 },
  },
  // Jobs - Customer Service (subcategory 18)
  18: {
    categoryId: 4,
    titles: [
      'مطلوب موظف خدمة عملاء',
      'وظيفة كول سنتر',
      'مطلوب مسؤول دعم فني',
      'فرصة عمل - خدمة العملاء',
    ],
    descriptions: [
      'إجادة التعامل مع العملاء، لباقة في الحديث.',
      'دوام مسائي أو صباحي متاح.',
      'راتب ثابت + عمولات، تدريب متاح.',
      'لا يشترط خبرة، التدريب على حسابنا.',
    ],
    priceRange: { min: 400000, max: 1500000 },
  },
  // Jobs - Healthcare (subcategory 19)
  19: {
    categoryId: 4,
    titles: [
      'مطلوب ممرض/ممرضة',
      'وظيفة طبيب عام',
      'مطلوب صيدلي',
      'فرصة عمل - مختبرات طبية',
    ],
    descriptions: [
      'مستشفى خاص يطلب كوادر طبية.',
      'خبرة مطلوبة، رواتب ممتازة.',
      'دوام كامل أو جزئي متاح.',
      'بيئة عمل احترافية، تأمين صحي شامل.',
    ],
    priceRange: { min: 800000, max: 5000000 },
  },
  // Jobs - Sales (subcategory 20)
  20: {
    categoryId: 4,
    titles: [
      'مطلوب مندوب مبيعات',
      'وظيفة مدير مبيعات',
      'مطلوب موظف تسويق',
      'فرصة عمل - قسم المبيعات',
    ],
    descriptions: [
      'راتب + عمولات مجزية، سيارة مؤمنة.',
      'خبرة في المبيعات مطلوبة.',
      'إمكانية العمل عن بعد جزئياً.',
      'فرص ترقي سريعة، حوافز شهرية.',
    ],
    priceRange: { min: 500000, max: 3000000 },
  },
  // Jobs - IT & Programming (subcategory 21)
  21: {
    categoryId: 4,
    titles: [
      'مطلوب مبرمج ويب',
      'وظيفة مطور تطبيقات موبايل',
      'مطلوب مهندس شبكات',
      'فرصة عمل - تقنية المعلومات',
      'مطلوب مصمم جرافيك',
    ],
    descriptions: [
      'خبرة React/Vue مطلوبة، عمل عن بعد متاح.',
      'راتب تنافسي بالدولار، مشاريع عالمية.',
      'فريق شاب وديناميكي، بيئة عمل مرنة.',
      'إمكانية التدريب والتطوير المستمر.',
    ],
    priceRange: { min: 1000000, max: 5000000 },
  },
  // Jobs - Other (subcategory 22)
  22: {
    categoryId: 4,
    titles: [
      'مطلوب سائق',
      'وظيفة عامل مستودع',
      'مطلوب حارس أمن',
      'فرصة عمل - وظائف متنوعة',
    ],
    descriptions: [
      'دوام كامل، راتب شهري.',
      'تأمينات اجتماعية، إجازات رسمية.',
      'لا يشترط خبرة سابقة.',
      'بيئة عمل جيدة.',
    ],
    priceRange: { min: 300000, max: 1500000 },
  },
  // Services - Home Maintenance (subcategory 23)
  23: {
    categoryId: 5,
    titles: [
      'خدمات صيانة منزلية',
      'كهربائي منازل محترف',
      'سباك لجميع الأعمال',
      'صيانة مكيفات وتبريد',
      'دهان وديكورات',
    ],
    descriptions: [
      'خبرة طويلة، أسعار منافسة، ضمان على العمل.',
      'خدمة سريعة على مدار الساعة.',
      'فريق متخصص، أدوات حديثة.',
      'استشارة مجانية، تقدير تكلفة مسبق.',
    ],
    priceRange: { min: 50000, max: 1000000 },
  },
  // Services - Tutoring (subcategory 24)
  24: {
    categoryId: 5,
    titles: [
      'مدرس رياضيات خصوصي',
      'دروس لغة إنجليزية',
      'تدريس مناهج البكالوريا',
      'دورات كمبيوتر وبرمجة',
      'تعليم موسيقى وعزف',
    ],
    descriptions: [
      'مدرس متخصص، خبرة 10 سنوات.',
      'دروس منزلية أو أونلاين.',
      'أسعار مناسبة، نتائج مضمونة.',
      'متابعة مستمرة، تقارير دورية.',
    ],
    priceRange: { min: 30000, max: 300000 },
  },
  // Services - Cleaning (subcategory 25)
  25: {
    categoryId: 5,
    titles: [
      'خدمات تنظيف منازل',
      'تنظيف سجاد وموكيت',
      'غسيل سيارات متنقل',
      'تنظيف مكاتب وشركات',
      'تنظيف بعد البناء',
    ],
    descriptions: [
      'فريق محترف، مواد تنظيف عالية الجودة.',
      'خدمة منزلية، أسعار تنافسية.',
      'تعقيم وتطهير شامل.',
      'عقود شهرية وسنوية متاحة.',
    ],
    priceRange: { min: 50000, max: 500000 },
  },
  // Services - Moving (subcategory 26)
  26: {
    categoryId: 5,
    titles: [
      'خدمات نقل أثاث',
      'نقل عفش مع فك وتركيب',
      'شاحنات نقل لجميع الأحجام',
      'نقل دولي وتخليص جمركي',
      'تغليف وتخزين أثاث',
    ],
    descriptions: [
      'فريق مدرب، عناية بالأثاث.',
      'تغليف مجاني، تأمين على المنقولات.',
      'أسعار تبدأ من... اتصل للتفاصيل.',
      'خدمة سريعة، متاح 24 ساعة.',
    ],
    priceRange: { min: 100000, max: 2000000 },
  },
  // Services - Other (subcategory 27)
  27: {
    categoryId: 5,
    titles: [
      'خدمات ترجمة محلفة',
      'تصوير فوتوغرافي احترافي',
      'خدمات طباعة ونسخ',
      'استشارات قانونية',
      'خدمات متنوعة',
    ],
    descriptions: [
      'خبرة وجودة عالية.',
      'أسعار منافسة، سرعة في الإنجاز.',
      'خدمة عملاء ممتازة.',
      'اتصل الآن للاستفسار.',
    ],
    priceRange: { min: 30000, max: 1000000 },
  },
  // Pets - Cats (subcategory 28)
  28: {
    categoryId: 6,
    titles: [
      'قطط شيرازي للبيع',
      'قط سكوتش فولد صغير',
      'قطة هيمالايا مع أوراق',
      'قطط بريطانية قصيرة الشعر',
      'قط سيامي أصيل',
    ],
    descriptions: [
      'محصنة ومعالجة، جاهزة للانتقال.',
      'مع جميع الأوراق والتطعيمات.',
      'من سلالة نقية، الوالدين موجودين.',
      'مدربة على الليتر بوكس.',
    ],
    priceRange: { min: 100000, max: 2000000 },
  },
  // Pets - Dogs (subcategory 29)
  29: {
    categoryId: 6,
    titles: [
      'جرو جيرمن شيبرد للبيع',
      'كلب هاسكي سيبيري',
      'جرو جولدن ريتريفر',
      'كلب روت وايلر أصيل',
      'كلب يوركشاير تيرير',
    ],
    descriptions: [
      'مع شهادة نسب، تطعيمات كاملة.',
      'مدرب على الطاعة الأساسية.',
      'صحة ممتازة، نشيط وحيوي.',
      'مناسب للعائلات، ودود مع الأطفال.',
    ],
    priceRange: { min: 200000, max: 5000000 },
  },
  // Pets - Birds (subcategory 30)
  30: {
    categoryId: 6,
    titles: [
      'ببغاء كوكاتيل للبيع',
      'زوج كناري مع قفص',
      'ببغاء أفريقي رمادي',
      'طيور حب متنوعة',
      'ببغاء مكاو ملون',
    ],
    descriptions: [
      'يتكلم بعض الكلمات، مدرب.',
      'صحة ممتازة، ريش جميل.',
      'مع القفص وجميع المستلزمات.',
      'أليف جداً، يأكل من اليد.',
    ],
    priceRange: { min: 50000, max: 3000000 },
  },
  // Pets - Other (subcategory 31)
  31: {
    categoryId: 6,
    titles: [
      'أرانب للبيع',
      'سلحفاة منزلية',
      'حوض سمك كامل',
      'هامستر مع القفص',
      'حيوانات أليفة متنوعة',
    ],
    descriptions: [
      'حيوانات أليفة مميزة، صحة ممتازة.',
      'مع جميع المستلزمات اللازمة.',
      'مناسبة للأطفال، سهلة العناية.',
      'أسعار مناسبة.',
    ],
    priceRange: { min: 30000, max: 1000000 },
  },
};

// Arabic conversation starters and messages
const ARABIC_MESSAGES = {
  buyerFirst: [
    'مرحباً، هل الإعلان لا يزال متاحاً؟',
    'السلام عليكم، مهتم بالإعلان، هل يمكننا التفاوض على السعر؟',
    'أهلاً، هل يمكنني رؤية المنتج قبل الشراء؟',
    'مرحباً، ما هو أقل سعر ممكن؟',
    'السلام عليكم، أريد الاستفسار عن بعض التفاصيل.',
  ],
  sellerResponses: [
    'أهلاً وسهلاً، نعم الإعلان متاح.',
    'مرحباً، السعر قابل للتفاوض البسيط.',
    'أهلاً، يمكنك المعاينة في أي وقت يناسبك.',
    'مرحباً، يمكننا الاتفاق على سعر مناسب.',
    'السلام عليكم، أي استفسار أنا موجود.',
  ],
  followUps: [
    'متى يمكنني المعاينة؟',
    'هل التوصيل متاح؟',
    'ما هي طريقة الدفع المفضلة؟',
    'هل يوجد ضمان؟',
    'كم مدة الاستخدام؟',
    'هل السعر نهائي؟',
    'أين الموقع بالضبط؟',
    'هل يمكن الحجز لغد؟',
    'شكراً على الرد السريع.',
    'سأتواصل معك قريباً إن شاء الله.',
  ],
  sellerFollowUps: [
    'يمكنك الحضور في أي وقت.',
    'نعم، التوصيل متاح.',
    'الدفع نقداً أو عبر التحويل.',
    'نعم، يوجد ضمان شهر.',
    'استعمال بسيط جداً.',
    'السعر قابل للتفاوض البسيط.',
    'سأرسل لك الموقع على الخاص.',
    'تمام، محجوز لك.',
    'العفو، أهلاً وسهلاً.',
    'بانتظارك، تحياتي.',
  ],
};

// ============================================================================
// INTERFACES
// ============================================================================

interface CategoryTemplate {
  categoryId: number;
  titles: string[];
  descriptions: string[];
  priceRange: { min: number; max: number };
}

interface GeneratedUser {
  id: string;
  email: string | null;
  phone_number: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface GeneratedListing {
  user_id: string;
  title: string;
  category_id: number;
  subcategory_id: number;
  description: string;
  price: number;
  currency: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  images: string[] | null;
  status: 'active' | 'sold' | 'inactive';
  location: string;
  location_lat: number | null;
  location_lon: number | null;
  created_at: string;
  updated_at: string;
}

interface GeneratedConversation {
  listing_id: number;
  buyer_id: string;
  seller_id: string;
  last_message: string;
  last_message_at: string;
  buyer_unread_count: number;
  seller_unread_count: number;
  created_at: string;
  updated_at: string;
}

interface GeneratedMessage {
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  audio_url: string | null;
  audio_duration: number | null;
  message_type: 'text' | 'voice';
}

interface GeneratedFavorite {
  user_id: string;
  listing_id: number;
  created_at: string;
}

interface CreatedListing extends GeneratedListing {
  id: number;
}

interface CreatedConversation extends GeneratedConversation {
  id: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateSyrianPhoneNumber(): string {
  const prefixes = ['93', '94', '95', '96', '99'];
  const prefix = randomElement(prefixes);
  const number = randomInt(1000000, 9999999);
  return `+963 ${prefix}${number.toString().slice(0, 3)} ${number.toString().slice(3, 6)} ${number.toString().slice(6)}`;
}

function generatePastDate(maxDaysAgo: number, minDaysAgo: number = 0): string {
  const now = new Date();
  const daysAgo = randomInt(minDaysAgo, maxDaysAgo);
  const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  // Add random hours/minutes for more realistic timestamps
  pastDate.setHours(randomInt(6, 23), randomInt(0, 59), randomInt(0, 59));
  return pastDate.toISOString();
}

function generateSequentialDate(baseDate: string, minutesAfter: number): string {
  const base = new Date(baseDate);
  const newDate = new Date(base.getTime() + minutesAfter * 60 * 1000);
  return newDate.toISOString();
}

function generateArabicFullName(): string {
  const isMale = Math.random() > 0.4; // 60% male
  const firstName = isMale
    ? randomElement(ARABIC_FIRST_NAMES_MALE)
    : randomElement(ARABIC_FIRST_NAMES_FEMALE);
  const lastName = randomElement(ARABIC_LAST_NAMES);
  return `${firstName} ${lastName}`;
}

function generateAvatarUrl(seed: string): string | null {
  // 70% chance of having an avatar
  if (Math.random() > 0.7) return null;
  // Use placeholder avatar services
  const services = [
    `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`,
    `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=random`,
  ];
  return randomElement(services);
}

function generatePlaceholderImages(count: number): string[] {
  const images: string[] = [];
  for (let i = 0; i < count; i++) {
    const width = randomElement([400, 600, 800]);
    const height = randomElement([400, 600, 800]);
    images.push(`https://picsum.photos/${width}/${height}?random=${Date.now()}-${i}`);
  }
  return images;
}

function generateBio(): string | null {
  // 30% chance of having a bio
  if (Math.random() > 0.3) return null;
  const bios = [
    'بائع موثوق، تعامل سريع وأمين.',
    'للتواصل واتساب فقط.',
    'جميع المنتجات أصلية ومضمونة.',
    'متجر إلكتروني معتمد.',
    'خبرة طويلة في السوق.',
    'أسعار منافسة وجودة عالية.',
    'التوصيل متاح لجميع المناطق.',
    'مستخدم نشط، رد سريع.',
  ];
  return randomElement(bios);
}

// ============================================================================
// DATA GENERATORS
// ============================================================================

function generateUsers(count: number): GeneratedUser[] {
  const users: GeneratedUser[] = [];

  for (let i = 0; i < count; i++) {
    const id = generateUUID();
    const displayName = generateArabicFullName();
    const hasEmail = Math.random() > 0.3; // 70% have email
    const hasPhone = Math.random() > 0.2; // 80% have phone
    const createdAt = generatePastDate(180, 1); // Within last 6 months

    const email = hasEmail
      ? `user${i + 1}@example.com`
      : null;

    const phoneNumber = hasPhone ? generateSyrianPhoneNumber() : null;

    // Ensure at least one contact method
    const finalEmail = !email && !phoneNumber ? `user${i + 1}@example.com` : email;

    users.push({
      id,
      email: finalEmail,
      phone_number: phoneNumber,
      display_name: displayName,
      avatar_url: generateAvatarUrl(displayName),
      bio: generateBio(),
      email_verified: hasEmail ? Math.random() > 0.3 : false, // 70% verified if has email
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  return users;
}

function generateListings(users: GeneratedUser[], count: number): GeneratedListing[] {
  const listings: GeneratedListing[] = [];
  const subcategoryIds = Object.keys(CATEGORY_TEMPLATES).map(Number);

  for (let i = 0; i < count; i++) {
    const user = randomElement(users);
    const subcategoryId = randomElement(subcategoryIds);
    const template = CATEGORY_TEMPLATES[subcategoryId];
    const city = randomElement(SYRIAN_CITIES);
    const createdAt = generatePastDate(90, 1); // Within last 3 months

    // Status distribution: 80% active, 15% sold, 5% inactive
    const statusRoll = Math.random();
    const status: 'active' | 'sold' | 'inactive' =
      statusRoll < 0.8 ? 'active' : statusRoll < 0.95 ? 'sold' : 'inactive';

    // Images: 0-5 images, 60% have at least one
    const imageCount = Math.random() > 0.4 ? randomInt(1, 5) : 0;
    const images = imageCount > 0 ? generatePlaceholderImages(imageCount) : null;

    // Price within category range with some variation
    const basePrice = randomInt(template.priceRange.min, template.priceRange.max);
    const price = Math.round(basePrice / 10000) * 10000; // Round to nearest 10,000

    listings.push({
      user_id: user.id,
      title: randomElement(template.titles),
      category_id: template.categoryId,
      subcategory_id: subcategoryId,
      description: randomElement(template.descriptions),
      price,
      currency: 'SYP',
      phone_number: user.phone_number,
      whatsapp_number: Math.random() > 0.5 ? user.phone_number : null,
      images,
      status,
      location: city.name,
      location_lat: city.lat + (Math.random() - 0.5) * 0.1, // Small variation
      location_lon: city.lon + (Math.random() - 0.5) * 0.1,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  return listings;
}

function generateFavorites(
  users: GeneratedUser[],
  listings: CreatedListing[],
  count: number
): GeneratedFavorite[] {
  const favorites: GeneratedFavorite[] = [];
  const usedPairs = new Set<string>();

  let attempts = 0;
  while (favorites.length < count && attempts < count * 3) {
    attempts++;
    const user = randomElement(users);
    const listing = randomElement(listings);

    // Don't favorite own listings
    if (listing.user_id === user.id) continue;

    // Ensure unique user-listing pairs
    const pairKey = `${user.id}-${listing.id}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    favorites.push({
      user_id: user.id,
      listing_id: listing.id,
      created_at: generatePastDate(60, 1),
    });
  }

  return favorites;
}

function generateConversations(
  users: GeneratedUser[],
  listings: CreatedListing[],
  count: number
): GeneratedConversation[] {
  const conversations: GeneratedConversation[] = [];
  const usedPairs = new Set<string>();

  // Filter to only active listings for conversations
  const activeListings = listings.filter((l) => l.status === 'active');

  let attempts = 0;
  while (conversations.length < count && attempts < count * 3) {
    attempts++;
    const listing = randomElement(activeListings);
    const seller = users.find((u) => u.id === listing.user_id);
    if (!seller) continue;

    // Pick a random buyer (not the seller)
    const potentialBuyers = users.filter((u) => u.id !== seller.id);
    if (potentialBuyers.length === 0) continue;
    const buyer = randomElement(potentialBuyers);

    // Ensure unique buyer-listing pairs
    const pairKey = `${buyer.id}-${listing.id}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    const createdAt = generatePastDate(30, 1);
    const lastMessage = randomElement([
      ...ARABIC_MESSAGES.sellerResponses,
      ...ARABIC_MESSAGES.followUps,
    ]);

    conversations.push({
      listing_id: listing.id,
      buyer_id: buyer.id,
      seller_id: seller.id,
      last_message: lastMessage,
      last_message_at: generateSequentialDate(createdAt, randomInt(60, 1440)),
      buyer_unread_count: randomInt(0, 3),
      seller_unread_count: randomInt(0, 3),
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  return conversations;
}

function generateMessages(
  conversations: CreatedConversation[],
  minPerConversation: number,
  maxPerConversation: number
): GeneratedMessage[] {
  const messages: GeneratedMessage[] = [];

  for (const conversation of conversations) {
    const messageCount = randomInt(minPerConversation, maxPerConversation);
    let currentTime = conversation.created_at;

    for (let i = 0; i < messageCount; i++) {
      // Alternate between buyer and seller, starting with buyer
      const isBuyerTurn = i % 2 === 0;
      const senderId = isBuyerTurn ? conversation.buyer_id : conversation.seller_id;

      // Pick appropriate message based on turn
      let content: string;
      if (i === 0) {
        content = randomElement(ARABIC_MESSAGES.buyerFirst);
      } else if (i === 1) {
        content = randomElement(ARABIC_MESSAGES.sellerResponses);
      } else {
        content = isBuyerTurn
          ? randomElement(ARABIC_MESSAGES.followUps)
          : randomElement(ARABIC_MESSAGES.sellerFollowUps);
      }

      // 5% chance of voice message
      const isVoice = Math.random() < 0.05;

      // Messages towards the end are more likely to be unread
      const isRead = i < messageCount - 2 || Math.random() > 0.5;

      currentTime = generateSequentialDate(currentTime, randomInt(5, 120));

      messages.push({
        conversation_id: conversation.id,
        sender_id: senderId,
        content: isVoice ? 'رسالة صوتية' : content,
        is_read: isRead,
        created_at: currentTime,
        audio_url: isVoice
          ? `https://example.com/audio/${generateUUID()}.m4a`
          : null,
        audio_duration: isVoice ? randomInt(5, 30) : null,
        message_type: isVoice ? 'voice' : 'text',
      });
    }
  }

  return messages;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function cleanTables(supabase: SupabaseClient): Promise<void> {
  console.log('\n🧹 Cleaning existing data...');

  // Delete in order to respect foreign key constraints
  const tables = ['messages', 'conversations', 'favorites', 'listings', 'profiles'];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && !error.message.includes('does not exist')) {
      console.log(`  ⚠️  Warning cleaning ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ Cleaned ${table}`);
    }
  }

  // Note: We don't delete auth.users as that requires admin API
  console.log('  ⚠️  Note: auth.users cannot be cleaned via SQL. Use Supabase dashboard if needed.');
}

async function seedProfiles(
  supabase: SupabaseClient,
  users: GeneratedUser[]
): Promise<GeneratedUser[]> {
  console.log(`\n👤 Seeding ${users.length} profiles...`);

  const { data, error } = await supabase.from('profiles').insert(users).select();

  if (error) {
    console.error('  ❌ Error seeding profiles:', error.message);
    throw error;
  }

  console.log(`  ✓ Created ${data?.length || 0} profiles`);
  return users;
}

async function seedListings(
  supabase: SupabaseClient,
  listings: GeneratedListing[]
): Promise<CreatedListing[]> {
  console.log(`\n📦 Seeding ${listings.length} listings...`);

  // Insert in batches to avoid timeout
  const batchSize = 50;
  const allCreatedListings: CreatedListing[] = [];

  for (let i = 0; i < listings.length; i += batchSize) {
    const batch = listings.slice(i, i + batchSize);
    const { data, error } = await supabase.from('listings').insert(batch).select();

    if (error) {
      console.error(`  ❌ Error seeding listings batch ${i / batchSize + 1}:`, error.message);
      throw error;
    }

    if (data) {
      allCreatedListings.push(...(data as CreatedListing[]));
    }
    console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(listings.length / batchSize)}`);
  }

  console.log(`  ✓ Created ${allCreatedListings.length} listings`);
  return allCreatedListings;
}

async function seedFavorites(
  supabase: SupabaseClient,
  favorites: GeneratedFavorite[]
): Promise<void> {
  console.log(`\n⭐ Seeding ${favorites.length} favorites...`);

  const { data, error } = await supabase.from('favorites').insert(favorites).select();

  if (error) {
    console.error('  ❌ Error seeding favorites:', error.message);
    throw error;
  }

  console.log(`  ✓ Created ${data?.length || 0} favorites`);
}

async function seedConversations(
  supabase: SupabaseClient,
  conversations: GeneratedConversation[]
): Promise<CreatedConversation[]> {
  console.log(`\n💬 Seeding ${conversations.length} conversations...`);

  const { data, error } = await supabase.from('conversations').insert(conversations).select();

  if (error) {
    console.error('  ❌ Error seeding conversations:', error.message);
    throw error;
  }

  console.log(`  ✓ Created ${data?.length || 0} conversations`);
  return (data as CreatedConversation[]) || [];
}

async function seedMessages(
  supabase: SupabaseClient,
  messages: GeneratedMessage[]
): Promise<void> {
  console.log(`\n✉️  Seeding ${messages.length} messages...`);

  // Insert in batches
  const batchSize = 100;
  let totalCreated = 0;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const { data, error } = await supabase.from('messages').insert(batch).select();

    if (error) {
      console.error(`  ❌ Error seeding messages batch ${i / batchSize + 1}:`, error.message);
      throw error;
    }

    totalCreated += data?.length || 0;
    console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(messages.length / batchSize)}`);
  }

  console.log(`  ✓ Created ${totalCreated} messages`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      console.log(`
Database Seeding Script for SouqJari

Usage:
  npx ts-node scripts/seed-database.ts [options]

Options:
  --clean        Truncate all tables before seeding (default: false)
  --users N      Number of users to create (default: 30)
  --listings N   Number of listings to create (default: 150)
  --help, -h     Show this help message

Environment Variables:
  SUPABASE_URL          Your Supabase project URL (required)
  SUPABASE_SERVICE_KEY  Service role key for bypassing RLS (required)

Example:
  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx npx ts-node scripts/seed-database.ts --clean --users 50 --listings 200
      `);
      process.exit(0);
    }

    if (arg === '--clean') {
      config.clean = true;
    }

    if (arg === '--users' && args[i + 1]) {
      config.userCount = parseInt(args[i + 1], 10);
      i++;
    }

    if (arg === '--listings' && args[i + 1]) {
      config.listingCount = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // Adjust related counts based on main counts
  config.favoriteCount = Math.floor(config.listingCount * 0.5);
  config.conversationCount = Math.floor(config.listingCount * 0.25);

  return config;
}

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          SouqJari Database Seeding Script                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Parse configuration
  const config = parseArgs();

  console.log('\n📋 Configuration:');
  console.log(`  • Clean before seeding: ${config.clean}`);
  console.log(`  • Users to create: ${config.userCount}`);
  console.log(`  • Listings to create: ${config.listingCount}`);
  console.log(`  • Favorites to create: ${config.favoriteCount}`);
  console.log(`  • Conversations to create: ${config.conversationCount}`);
  console.log(`  • Messages per conversation: ${config.messagesPerConversation.min}-${config.messagesPerConversation.max}`);

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    console.error('\n❌ Error: SUPABASE_URL environment variable is required');
    console.error('   Set it with: export SUPABASE_URL=https://your-project.supabase.co');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('\n❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
    console.error('   This is the service role key from your Supabase project settings.');
    console.error('   It bypasses Row Level Security for seeding.');
    process.exit(1);
  }

  console.log(`\n🔗 Connecting to Supabase: ${supabaseUrl}`);

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Clean tables if requested
    if (config.clean) {
      await cleanTables(supabase);
    }

    // Generate data
    console.log('\n🎲 Generating fake data...');

    const users = generateUsers(config.userCount);
    console.log(`  ✓ Generated ${users.length} users`);

    const listings = generateListings(users, config.listingCount);
    console.log(`  ✓ Generated ${listings.length} listings`);

    // Seed data in order (respecting foreign keys)
    const seededUsers = await seedProfiles(supabase, users);
    const seededListings = await seedListings(supabase, listings);

    // Generate and seed favorites
    const favorites = generateFavorites(seededUsers, seededListings, config.favoriteCount);
    console.log(`  ✓ Generated ${favorites.length} favorites`);
    await seedFavorites(supabase, favorites);

    // Generate and seed conversations
    const conversations = generateConversations(
      seededUsers,
      seededListings,
      config.conversationCount
    );
    console.log(`  ✓ Generated ${conversations.length} conversations`);
    const seededConversations = await seedConversations(supabase, conversations);

    // Generate and seed messages
    const messages = generateMessages(
      seededConversations,
      config.messagesPerConversation.min,
      config.messagesPerConversation.max
    );
    console.log(`  ✓ Generated ${messages.length} messages`);
    await seedMessages(supabase, messages);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SEEDING COMPLETE                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n📊 Summary:');
    console.log(`  • Profiles created: ${seededUsers.length}`);
    console.log(`  • Listings created: ${seededListings.length}`);
    console.log(`  • Favorites created: ${favorites.length}`);
    console.log(`  • Conversations created: ${seededConversations.length}`);
    console.log(`  • Messages created: ${messages.length}`);
    console.log(`\n⏱️  Total time: ${duration} seconds`);
    console.log('\n✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
