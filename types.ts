
export interface RawExpenseData {
  id: string;
  dateStr: string; // Should always be DD.MM.YYYY
  amountStr: string;
  currency: string;
  fullComment: string; // This will hold the "комментарий" or the descriptive part of bank statement
  predefinedMainCategoryName?: string;
  predefinedSubCategoryName?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  keywords: string[];
}

export interface Category {
  id: string;
  name: string; // Main category name
  order: number; // For reordering main categories
  subCategories: SubCategory[];
}

export interface ProcessedExpense {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  comment: string; 
  fullComment: string; // Original full comment
  categoryId?: string; // ID of the main category
  subCategoryId?: string; // ID of the subcategory
  isUnidentified: boolean;
}

export enum AppView {
  Management = "Управление",
  AllExpenses = "Все Расходы",
  // Specific categories that are part of core UI structure or defaults
  Everyday = "Повседневные",
  LargePurchases = "Крупные Покупки",
  Apartment = "Квартира",
}
// Note: Other category names will be strings, not enum members.
// The currentView in App.tsx will be of type string.
// Tabs will be generated from AppView.Management, AppView.AllExpenses, and category names.