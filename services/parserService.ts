/**
 * This service provides functions to parse various expense input formats.
 * It handles:
 * 1. Single expense entries (with or without dates, with or without quoted comments).
 * 2. Bulk bank statement inputs, typically tab-separated, extracting date, negative amounts,
 *    currency, and the most relevant part of the transaction description.
 *    Example: 14.05.2025 20:31:24 Оплата -8,63 BYN 959429 ... SHOP "KOPEECHKA"
 * 3. Bulk tab-separated inputs where expenses are already categorized.
 *    Example: 27.04.2025 10,75 Фикспрайс Продукты
 */
import { RawExpenseData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { CURRENCY_SYMBOL } from '../constants';

// Parses various single expense formats:
// 1. DD.MM.YYYY Amount "Comment with quotes"
// 2. Amount "Comment with quotes"
// 3. DD.MM.YYYY Amount Comment without quotes
// 4. Amount Comment without quotes
// If date is omitted, today's date is used.
export const parseSingleExpenseInput = (input: string): RawExpenseData | null => {
  const trimmedInput = input.trim();
  let match: RegExpMatchArray | null;

  // Common function to create expense data
  const createExpenseData = (dateStr: string, amountStrInput: string, fullComment: string): RawExpenseData => {
    // Ensure amount is positive and uses dot as decimal separator
    const amount = Math.abs(parseFloat(amountStrInput.replace(',', '.')));
    return {
      id: uuidv4(),
      dateStr,
      amountStr: isNaN(amount) ? "0" : amount.toString(),
      currency: CURRENCY_SYMBOL,
      fullComment: fullComment.trim(),
    };
  };

  const getTodayDateStr = (): string => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = today.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // 1. Try DD.MM.YYYY Amount "Comment with quotes"
  match = trimmedInput.match(/^(\d{2}\.\d{2}\.\d{4})\s+([\d,.-]+)\s+"([^"]+)"$/);
  if (match) {
    const [, dateStr, amountStr, comment] = match;
    return createExpenseData(dateStr, amountStr, comment);
  }

  // 2. Try Amount "Comment with quotes"
  match = trimmedInput.match(/^([\d,.-]+)\s+"([^"]+)"$/);
  if (match) {
    const [, amountStr, comment] = match;
    return createExpenseData(getTodayDateStr(), amountStr, comment);
  }

  // 3. Try DD.MM.YYYY Amount CommentWithoutQuotes (comment is everything after amount)
  match = trimmedInput.match(/^(\d{2}\.\d{2}\.\d{4})\s+([\d,.-]+)\s+(.+)$/);
  if (match) {
    const [, dateStr, amountStr, comment] = match;
    // Check if the comment part accidentally matched the quoted comment pattern
    if (comment.startsWith('"') && comment.endsWith('"')) return null; 
    return createExpenseData(dateStr, amountStr, comment);
  }

  // 4. Try Amount CommentWithoutQuotes (comment is everything after amount)
  match = trimmedInput.match(/^([\d,.-]+)\s+(.+)$/);
  if (match) {
    const [, amountStr, comment] = match;
     // Check if the comment part accidentally matched the quoted comment pattern
    if (comment.startsWith('"') && comment.endsWith('"')) return null;
    return createExpenseData(getTodayDateStr(), amountStr, comment);
  }
  
  return null; // If no format matches
};

// Parses bank statement lines
export const parseBankStatementInput = (input: string): RawExpenseData[] => {
  const lines = input.split('\n').filter(line => line.trim() !== '');
  const expenses: RawExpenseData[] = [];

  lines.forEach(line => {
    const parts = line.split('\t').map(p => p.trim());
    
    if (parts.length < 2) return; // Need at least date and something else

    const dateMatch = parts[0]?.match(/^(\d{2}\.\d{2}\.\d{4})/);
    if (!dateMatch) return; 
    const dateStr = dateMatch[1];

    let amountStr: string | undefined;
    let currency: string = CURRENCY_SYMBOL;
    let amountValue: number | undefined;
    let descriptionStartIndex = -1;

    for (let i = 1; i < parts.length; i++) {
      const amountRegex = /([-+]?\s?\d+([,.]\d+)?)\s*([A-Z]{3})?/;
      const currentPartAmountMatch = parts[i].match(amountRegex);

      if (currentPartAmountMatch) {
        const extractedAmountValue = parseFloat(currentPartAmountMatch[1].replace(',', '.').replace(/\s/g, ''));
        
        if (!isNaN(extractedAmountValue) && extractedAmountValue < 0) { 
          amountValue = extractedAmountValue;
          amountStr = Math.abs(amountValue).toString();
          currency = currentPartAmountMatch[3] || CURRENCY_SYMBOL;
          descriptionStartIndex = i + 1; 
          break; 
        } else if (!isNaN(extractedAmountValue) && extractedAmountValue >= 0) {
          return; // This is an income or zero value, ignore for expense tracking
        }
      }
    }

    if (amountValue === undefined || amountStr === undefined) {
      return; // No valid negative amount found in this line
    }
    
    let fullComment = "Комментарий не найден";
    if (descriptionStartIndex !== -1 && descriptionStartIndex < parts.length) {
        const potentialDescriptionParts = parts.slice(descriptionStartIndex).filter(p => p && p.trim() !== '');
        
        if (potentialDescriptionParts.length > 0) {
            let bestComment = potentialDescriptionParts[potentialDescriptionParts.length - 1]; 
            const merchantKeywords = /(POS|SHOP|EPOS|SUPERMARKET|INTERNET|АЗС|Кафе|Kafe|RESTORAN|WILDBERRIES|GASTROFEST|YANDEX GO)/i;
            
            let merchantKeywordFound = false;
            for (let j = potentialDescriptionParts.length - 1; j >= 0; j--) {
                if (merchantKeywords.test(potentialDescriptionParts[j])) {
                    bestComment = potentialDescriptionParts[j];
                    merchantKeywordFound = true;
                    break;
                }
            }
            
            // If no merchant keyword found, but multiple parts exist, join them for a more descriptive comment
            if (!merchantKeywordFound && potentialDescriptionParts.length > 1) {
                 bestComment = potentialDescriptionParts.join(', ');
            }


            fullComment = bestComment;
            // Clean up common prefixes like "CODE, POS," or "CODE, EPOS,"
            fullComment = fullComment.replace(/^[\w\d]+,\s*(POS|EPOS),\s*/i, '').trim();
            
            // If after cleaning, the comment is just a code and there were other parts, prefer the joined version
            if (/^[\w\d]+$/.test(fullComment) && potentialDescriptionParts.length > 1 && potentialDescriptionParts.join(', ').length > fullComment.length) {
                fullComment = potentialDescriptionParts.join(', ');
                fullComment = fullComment.replace(/^[\w\d]+,\s*(POS|EPOS),\s*/i, '').trim(); // Clean again
            }

            if (!fullComment.trim()) { // Ensure comment is not empty after trimming
                fullComment = "Комментарий отсутствует";
            }

        } else {
            fullComment = "Комментарий отсутствует"; // No parts after amount
        }
    } // else fullComment remains "Комментарий не найден" if descriptionStartIndex was invalid

    expenses.push({
        id: uuidv4(),
        dateStr,
        amountStr,
        currency,
        fullComment: fullComment || "Не удалось распознать комментарий", // Fallback if somehow null/empty
    });
  });
  return expenses;
};

// Parses tab-separated input with pre-defined categories
// Format: DATE<tab>AMOUNT<tab>COMMENT<tab>CATEGORY_INFO
// CATEGORY_INFO can be "MainCategory" or "MainCategory (SubCategory)"
export const parseTabSeparatedWithCategoryInput = (input: string): RawExpenseData[] => {
  const lines = input.split('\n').filter(line => line.trim() !== '');
  const expenses: RawExpenseData[] = [];

  lines.forEach(line => {
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length !== 4) {
      console.warn(`Skipping line due to incorrect number of parts (expected 4): "${line}"`);
      return; // Expecting Date, Amount, Comment, CategoryInfo
    }

    const [datePart, amountPart, commentPart, categoryInfoPart] = parts;

    // Validate and parse date (DD.MM.YYYY)
    const dateMatch = datePart.match(/^(\d{2}\.\d{2}\.\d{4})$/);
    if (!dateMatch) {
      console.warn(`Skipping line due to invalid date format: "${datePart}" in line: "${line}"`);
      return;
    }
    const dateStr = dateMatch[1];

    // Validate and parse amount (positive number, comma or dot decimal)
    const amount = parseFloat(amountPart.replace(',', '.'));
    if (isNaN(amount) || amount < 0) {
      console.warn(`Skipping line due to invalid or negative amount: "${amountPart}" in line: "${line}"`);
      return;
    }
    const amountStr = amount.toString();

    // Comment
    const fullComment = commentPart.trim();
    if (!fullComment) {
        console.warn(`Skipping line due to empty comment: "${line}"`);
        return;
    }

    // Parse CategoryInfo
    let predefinedMainCategoryName: string | undefined = undefined;
    let predefinedSubCategoryName: string | undefined = undefined;
    
    const categoryMatch = categoryInfoPart.match(/^(.*?)\s*\((.*?)\)$/);
    if (categoryMatch) {
      predefinedMainCategoryName = categoryMatch[1].trim();
      predefinedSubCategoryName = categoryMatch[2].trim();
    } else {
      predefinedMainCategoryName = categoryInfoPart.trim();
    }

    if (!predefinedMainCategoryName) {
        console.warn(`Skipping line due to empty category info: "${categoryInfoPart}" in line: "${line}"`);
        return;
    }

    expenses.push({
      id: uuidv4(),
      dateStr,
      amountStr,
      currency: CURRENCY_SYMBOL,
      fullComment,
      predefinedMainCategoryName,
      predefinedSubCategoryName,
    });
  });

  return expenses;
};
