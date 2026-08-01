// دیتابیس محلی محصولات برای پیشنهاد خودکار (autocomplete)
// قیمت‌ها تقریبی و بر اساس بازار تیر ۱۴۰۵ هستند — با توجه به تورم بالا، این عددها فقط
// نقطه‌ی شروع‌اند. قیمت واقعی هر بار که ثبت می‌شود جایگزین بهتری برای برآوردهای بعدی می‌شود.
// می‌تونی هر زمان آیتم جدید به همین آرایه اضافه کنی یا از داخل اپ (که خودکار به کاتالوگ Supabase اضافه می‌شود).

const PRODUCTS_SEED = [
  // ---------- لبنیات ----------
  { name: "شیر کم‌چرب", brand: "پاک", size: "۹۰۰ میلی‌لیتر پاکتی", unit: "پاکت", category: "لبنیات", price: 36000 },
  { name: "شیر کم‌چرب", brand: "دامداران", size: "۱ لیتر", unit: "بطری", category: "لبنیات", price: 43000 },
  { name: "شیر پرچرب", brand: "کاله", size: "۹۰۰ میلی‌لیتر", unit: "پاکت", category: "لبنیات", price: 40000 },
  { name: "شیر پرچرب", brand: "پگاه", size: "۱ لیتر", unit: "بطری", category: "لبنیات", price: 46000 },
  { name: "شیر بدون لاکتوز", brand: "کاله", size: "۱ لیتر", unit: "بطری", category: "لبنیات", price: 78000 },
  { name: "ماست کم‌چرب", brand: "دامداران", size: "۹۰۰ گرمی", unit: "ظرف", category: "لبنیات", price: 41000 },
  { name: "ماست پرچرب پروبیوتیک", brand: "کاله", size: "۱.۵ کیلویی", unit: "ظرف", category: "لبنیات", price: 84000 },
  { name: "ماست موسیر", brand: "پگاه", size: "۹۰۰ گرمی", unit: "ظرف", category: "لبنیات", price: 52000 },
  { name: "ماست چکیده", brand: "کاله", size: "۵۰۰ گرمی", unit: "ظرف", category: "لبنیات", price: 58000 },
  { name: "پنیر UF", brand: "کاله", size: "۴۰۰ گرمی", unit: "بسته", category: "لبنیات", price: 88000 },
  { name: "پنیر UF", brand: "پگاه", size: "۴۰۰ گرمی", unit: "بسته", category: "لبنیات", price: 82000 },
  { name: "پنیر لیوانی UF", brand: "کاله", size: "۱۰۰ گرمی", unit: "لیوان", category: "لبنیات", price: 22000 },
  { name: "پنیر لیوانی UF", brand: "پگاه", size: "۸۰ گرمی", unit: "لیوان", category: "لبنیات", price: 18000 },
  { name: "پنیر خامه‌ای", brand: "کاله", size: "۱۸۰ گرمی", unit: "بسته", category: "لبنیات", price: 68000 },
  { name: "پنیر پیتزا", brand: "کاله", size: "۲۰۰ گرمی", unit: "بسته", category: "لبنیات", price: 95000 },
  { name: "پنیر ورقه‌ای", brand: "میهن", size: "۱۵۰ گرمی", unit: "بسته", category: "لبنیات", price: 72000 },
  { name: "کره حیوانی", brand: "میهن", size: "۱۰۰ گرمی", unit: "بسته", category: "لبنیات", price: 62000 },
  { name: "کره پاستوریزه", brand: "پگاه", size: "۵۰ گرمی", unit: "بسته", category: "لبنیات", price: 34000 },
  { name: "خامه صبحانه", brand: "کاله", size: "۲۰۰ گرمی", unit: "ظرف", category: "لبنیات", price: 45000 },
  { name: "دوغ گازدار", brand: "کاله", size: "۱.۵ لیتری", unit: "بطری", category: "لبنیات", price: 38000 },
  { name: "دوغ سنتی", brand: "دامداران", size: "۱ لیتری", unit: "بطری", category: "لبنیات", price: 32000 },
  { name: "کشک سنتی", brand: "سمیه", size: "۵۰۰ گرمی", unit: "بطری", category: "لبنیات", price: 55000 },

  // ---------- میوه و تره‌بار ----------
  { name: "سیب قرمز", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 110000 },
  { name: "موز", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 130000 },
  { name: "پرتقال", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 90000 },
  { name: "خیار", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 55000 },
  { name: "گوجه‌فرنگی", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 65000 },
  { name: "پیاز", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 45000 },
  { name: "سیب‌زمینی", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 40000 },
  { name: "هویج", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 50000 },
  { name: "لیمو ترش", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "میوه و تره‌بار", price: 95000 },
  { name: "سبزی خوردن", brand: "", size: "۱ بسته", unit: "بسته", category: "میوه و تره‌بار", price: 30000 },
  { name: "کاهو", brand: "", size: "۱ عدد", unit: "عدد", category: "میوه و تره‌بار", price: 35000 },

  // ---------- پروتئین ----------
  { name: "مرغ کامل", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "پروتئین", price: 300000 },
  { name: "سینه مرغ", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "پروتئین", price: 340000 },
  { name: "ران مرغ", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "پروتئین", price: 280000 },
  { name: "فیله مرغ", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "پروتئین", price: 360000 },
  { name: "گوشت چرخ‌کرده گوسفندی", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "پروتئین", price: 950000 },
  { name: "گوشت چرخ‌کرده گوساله", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "پروتئین", price: 850000 },
  { name: "تخم‌مرغ", brand: "", size: "شانه ۳۰ عددی", unit: "شانه", category: "پروتئین", price: 145000 },
  { name: "تخم‌مرغ", brand: "", size: "شانه ۶ عددی", unit: "شانه", category: "پروتئین", price: 30000 },
  { name: "ماهی قزل‌آلا", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "پروتئین", price: 430000 },
  { name: "سوسیس هات‌داگ", brand: "کاله", size: "۴۰۰ گرمی", unit: "بسته", category: "پروتئین", price: 95000 },
  { name: "کالباس گوشت", brand: "سولیکو", size: "۳۰۰ گرمی", unit: "بسته", category: "پروتئین", price: 78000 },

  // ---------- نان و غلات ----------
  { name: "نان سنگک", brand: "", size: "۱ عدد", unit: "عدد", category: "نان و غلات", price: 25000 },
  { name: "نان بربری", brand: "", size: "۱ عدد", unit: "عدد", category: "نان و غلات", price: 20000 },
  { name: "نان لواش", brand: "", size: "بسته ۱۰ عددی", unit: "بسته", category: "نان و غلات", price: 40000 },
  { name: "نان تافتون", brand: "", size: "۱ عدد", unit: "عدد", category: "نان و غلات", price: 15000 },
  { name: "برنج ایرانی طارم", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "نان و غلات", price: 500000 },
  { name: "برنج خارجی", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "نان و غلات", price: 240000 },
  { name: "ماکارونی", brand: "مانا", size: "۷۰۰ گرمی", unit: "بسته", category: "نان و غلات", price: 55000 },
  { name: "اسپاگتی", brand: "زر", size: "۵۰۰ گرمی", unit: "بسته", category: "نان و غلات", price: 42000 },
  { name: "آرد سفید", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "نان و غلات", price: 35000 },

  // ---------- خواربار ----------
  { name: "روغن مایع آفتابگردان", brand: "لادن", size: "۱.۸ لیتری", unit: "بطری", category: "خواربار", price: 210000 },
  { name: "روغن جامد", brand: "فامیلا", size: "۹۰۰ گرمی", unit: "بسته", category: "خواربار", price: 130000 },
  { name: "روغن زیتون", brand: "تربچه", size: "۵۰۰ میلی‌لیتری", unit: "بطری", category: "خواربار", price: 320000 },
  { name: "شکر سفید", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "خواربار", price: 55000 },
  { name: "قند شکسته", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "خواربار", price: 60000 },
  { name: "نمک یددار", brand: "", size: "۱ کیلوگرم", unit: "بسته", category: "خواربار", price: 12000 },
  { name: "رب گوجه‌فرنگی", brand: "یک‌ویک", size: "۸۰۰ گرمی", unit: "بطری", category: "خواربار", price: 85000 },
  { name: "کنسرو تن ماهی", brand: "شیلانه", size: "۱۸۰ گرمی", unit: "قوطی", category: "خواربار", price: 65000 },
  { name: "عدس", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "خواربار", price: 110000 },
  { name: "لوبیا چیتی", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "خواربار", price: 130000 },
  { name: "نخود", brand: "", size: "۱ کیلوگرم", unit: "کیلوگرم", category: "خواربار", price: 100000 },
  { name: "سویا بلوکی", brand: "", size: "۵۰۰ گرمی", unit: "بسته", category: "خواربار", price: 45000 },

  // ---------- نوشیدنی ----------
  { name: "چای", brand: "احمد", size: "۴۵۰ گرمی", unit: "بسته", category: "نوشیدنی", price: 175000 },
  { name: "چای", brand: "گلستان", size: "۵۰۰ گرمی", unit: "بسته", category: "نوشیدنی", price: 190000 },
  { name: "قهوه فوری", brand: "نسکافه", size: "۱۰۰ گرمی", unit: "قوطی", category: "نوشیدنی", price: 210000 },
  { name: "آب معدنی", brand: "دماوند", size: "۱.۵ لیتری", unit: "بطری", category: "نوشیدنی", price: 15000 },
  { name: "نوشابه", brand: "کوکاکولا", size: "۱.۵ لیتری", unit: "بطری", category: "نوشیدنی", price: 45000 },
  { name: "دلستر", brand: "هی‌دی", size: "۳۳۰ میلی‌لیتری", unit: "قوطی", category: "نوشیدنی", price: 22000 },

  // ---------- بهداشتی و شوینده ----------
  { name: "مایع ظرفشویی", brand: "گلرنگ", size: "۹۰۰ گرمی", unit: "بطری", category: "بهداشتی و شوینده", price: 65000 },
  { name: "پودر لباسشویی", brand: "پرسیل", size: "۱ کیلوگرم", unit: "بسته", category: "بهداشتی و شوینده", price: 120000 },
  { name: "مایع دستشویی", brand: "شون", size: "۵۰۰ میلی‌لیتری", unit: "بطری", category: "بهداشتی و شوینده", price: 55000 },
  { name: "دستمال کاغذی", brand: "نانو", size: "۲۱۰ برگی", unit: "بسته", category: "بهداشتی و شوینده", price: 45000 },
  { name: "شامپو", brand: "سان‌سیلک", size: "۴۰۰ میلی‌لیتری", unit: "بطری", category: "بهداشتی و شوینده", price: 95000 },
  { name: "خمیردندان", brand: "کرست", size: "۱۲۰ گرمی", unit: "تیوب", category: "بهداشتی و شوینده", price: 85000 },
  { name: "مایع سفیدکننده", brand: "وایتکس", size: "۹۵۰ میلی‌لیتری", unit: "بطری", category: "بهداشتی و شوینده", price: 40000 },

  // ---------- تنقلات ----------
  { name: "بیسکویت", brand: "گرجی", size: "۲۲۰ گرمی", unit: "بسته", category: "تنقلات", price: 45000 },
  { name: "چیپس", brand: "چی‌توز", size: "۶۰ گرمی", unit: "بسته", category: "تنقلات", price: 25000 },
  { name: "شکلات تلخ", brand: "شونیز", size: "۱۰۰ گرمی", unit: "بسته", category: "تنقلات", price: 60000 },
  { name: "کیک یزدی", brand: "", size: "بسته ۶ عددی", unit: "بسته", category: "تنقلات", price: 55000 },
  { name: "پفک", brand: "چی‌توز", size: "۱۰۰ گرمی", unit: "بسته", category: "تنقلات", price: 20000 },
];

// دسته‌بندی‌ها با رنگ Material You پاستلی مخصوص خودشون
const CATEGORIES = [
  { name: "لبنیات",             color: "green"  },
  { name: "میوه و تره‌بار",      color: "pink"   },
  { name: "پروتئین",            color: "blue"   },
  { name: "نان و غلات",          color: "peach"  },
  { name: "خواربار",             color: "purple" },
  { name: "نوشیدنی",             color: "blue"   },
  { name: "بهداشتی و شوینده",    color: "purple" },
  { name: "تنقلات",              color: "pink"   },
  { name: "سایر",                color: "green"  },
];
