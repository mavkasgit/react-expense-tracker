
import { RawExpenseData, Category, ProcessedExpense, SubCategory } from '../types';

export const initialProcessExpense = (
  rawExpense: RawExpenseData,
  categories: Category[]
): Omit<ProcessedExpense, 'id'> => {
  const { dateStr, amountStr, currency, fullComment, predefinedMainCategoryName, predefinedSubCategoryName } = rawExpense;

  const dateParts = dateStr.split('.');
  let expenseDate = new Date(); 

  if (dateParts.length === 3) {
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; 
    const year = parseInt(dateParts[2], 10);
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
        expenseDate = parsedDate;
    } else {
        console.warn(`Invalid date components: ${dateStr}. Using current date as fallback.`);
    }
  } else {
    console.warn(`Invalid date string format: ${dateStr}. Using current date as fallback.`);
  }
  
  const expenseAmount = parseFloat(amountStr);
  let matchedCategoryId: string | undefined = undefined;
  let matchedSubCategoryId: string | undefined = undefined;
  let isUnidentified = true;

  // Step 1: Attempt to categorize based on predefined category names
  if (predefinedMainCategoryName) {
    const mainCatMatch = categories.find(
      cat => cat.name.toLowerCase() === predefinedMainCategoryName.toLowerCase()
    );

    if (mainCatMatch) {
      matchedCategoryId = mainCatMatch.id;
      isUnidentified = false; // Found a main category

      if (predefinedSubCategoryName) {
        const subCatMatch = mainCatMatch.subCategories.find(
          sc => sc.name.toLowerCase() === predefinedSubCategoryName.toLowerCase()
        );
        if (subCatMatch) {
          matchedSubCategoryId = subCatMatch.id;
        } else {
          // Main category matched, but predefined subcategory not found.
          // The expense is categorized under the main category only.
          // User might need to create this subcategory later if desired.
          console.warn(`Predefined subcategory "${predefinedSubCategoryName}" not found in main category "${mainCatMatch.name}".`);
        }
      }
      // If predefined main category is matched, we skip keyword-based auto-categorization.
      return {
        date: expenseDate,
        amount: expenseAmount,
        currency,
        comment: fullComment, 
        fullComment: rawExpense.fullComment,
        categoryId: matchedCategoryId,
        subCategoryId: matchedSubCategoryId,
        isUnidentified,
      };
    } else {
      // Predefined main category name was provided, but no such category exists in the system.
      // The expense will remain unidentified. User can create this category later.
      console.warn(`Predefined main category "${predefinedMainCategoryName}" not found.`);
      isUnidentified = true; // Explicitly ensure it's unidentified.
    }
  }

  // Step 2: Attempt to auto-categorize based on keywords (only if not categorized by predefined names)
  if (isUnidentified) {
    for (const mainCategory of categories) {
      for (const subCategory of mainCategory.subCategories) {
        for (const keyword of subCategory.keywords) {
          if (fullComment.toLowerCase().includes(keyword.toLowerCase())) {
            matchedCategoryId = mainCategory.id;
            matchedSubCategoryId = subCategory.id;
            isUnidentified = false;
            break; // Found a keyword match in this subcategory
          }
        }
        if (!isUnidentified) break; // Found a match in this main category
      }
      if (!isUnidentified) break; // Found a match, no need to check other main categories
    }
  }

  return {
    date: expenseDate,
    amount: expenseAmount,
    currency,
    comment: fullComment, 
    fullComment: rawExpense.fullComment,
    categoryId: matchedCategoryId,
    subCategoryId: matchedSubCategoryId,
    isUnidentified,
  };
};

export const processRawExpenses = (
  rawExpenses: RawExpenseData[],
  categories: Category[]
): ProcessedExpense[] => {
  return rawExpenses.map(raw => {
    const processedData = initialProcessExpense(raw, categories);
    return {
      id: raw.id,
      ...processedData,
    };
  });
};
