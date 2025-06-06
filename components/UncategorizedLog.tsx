
import React, { useState, useEffect } from 'react';
import { ProcessedExpense, Category, SubCategory } from '../types';
import { ArrowPathIcon, PlusIcon, TrashIcon } from './icons'; // Added TrashIcon

interface UncategorizedLogProps {
  unidentifiedExpenses: ProcessedExpense[];
  categories: Category[];
  onCategorizeExpense: (
    expenseId: string, 
    targetMainCategoryId: string,
    targetSubCategoryId?: string,
    keywordToSave?: string
  ) => void;
  onAddMainCategory: (mainCategoryName: string) => string | undefined; 
  onAddSubCategory: (mainCategoryId: string, subCategoryName: string) => string | undefined; 
  onDeleteExpensePermanently: (expenseId: string) => void; 
}

const CREATE_NEW_OPTION = "++CREATE_NEW++";
const NO_SUBCATEGORY_OPTION = "++NO_SUBCATEGORY++";

const UncategorizedLog: React.FC<UncategorizedLogProps> = ({ 
    unidentifiedExpenses, 
    categories, 
    onCategorizeExpense,
    onAddMainCategory,
    onAddSubCategory,
    onDeleteExpensePermanently 
}) => {
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>('');
  const [customMainCategoryName, setCustomMainCategoryName] = useState<string>('');
  
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('');
  const [customSubCategoryName, setCustomSubCategoryName] = useState<string>('');
  const [keywordToAssociate, setKeywordToAssociate] = useState<string>('');

  const availableMainCategories = categories.sort((a,b) => a.name.localeCompare(b.name));
  const currentMainCategory = categories.find(c => c.id === selectedMainCategoryId);
  const availableSubcategories = currentMainCategory ? currentMainCategory.subCategories.sort((a,b) => a.name.localeCompare(b.name)) : [];

  useEffect(() => {
    if (!selectedExpenseId) {
        resetSelections();
    } else {
        const currentExpense = unidentifiedExpenses.find(exp => exp.id === selectedExpenseId);
        // Try to extract a reasonable keyword suggestion, e.g., the first word if it's not too long, or a shop name.
        let suggestedKeyword = '';
        if (currentExpense) {
            const commentParts = currentExpense.fullComment.split(/[\s,"“”.]+/).filter(Boolean); // Split by space or quotes
            const potentialShopName = commentParts.find(part => part.match(/^[A-ZА-ЯЁ]{2,}/) && part.length > 2 && part.length < 20); // Prefer uppercase words
            if (potentialShopName) {
                suggestedKeyword = potentialShopName;
            } else if (commentParts.length > 0 && commentParts[commentParts.length -1].length < 15) { // last word if short
                suggestedKeyword = commentParts[commentParts.length -1];
            } else if (commentParts.length > 0 && commentParts[0].length < 15){ // first word if short
                 suggestedKeyword = commentParts[0];
            }
        }
        setKeywordToAssociate(suggestedKeyword.replace(/["“”.]/g, '') || ''); // Remove quotes from suggestion
        resetSelections(false); // Don't clear keyword when an expense is selected, only form fields
    }
  }, [selectedExpenseId, unidentifiedExpenses]);

  useEffect(() => {
    setSelectedSubCategoryId('');
    setCustomSubCategoryName('');
  }, [selectedMainCategoryId]);

  const resetSelections = (clearKeyword = true) => {
    setSelectedMainCategoryId('');
    setCustomMainCategoryName('');
    setSelectedSubCategoryId('');
    setCustomSubCategoryName('');
    if (clearKeyword) {
        setKeywordToAssociate('');
    }
  };

  const handleProcessClick = () => {
    if (!selectedExpenseId) return;

    let finalMainCategoryId = selectedMainCategoryId;
    if (selectedMainCategoryId === CREATE_NEW_OPTION) {
        const trimmedMainName = customMainCategoryName.trim();
        if (!trimmedMainName) {
            alert("Название новой основной категории не может быть пустым.");
            return;
        }
        const newMainId = onAddMainCategory(trimmedMainName);
        if (!newMainId) { 
            const existing = categories.find(c => c.name.toLowerCase() === trimmedMainName.toLowerCase());
            if (existing) finalMainCategoryId = existing.id;
            else {
                 alert("Не удалось создать или найти основную категорию.");
                 return;
            }
        } else {
            finalMainCategoryId = newMainId;
        }
    } else if (!finalMainCategoryId) {
        alert("Выберите или создайте основную категорию.");
        return;
    }

    let finalSubCategoryId: string | undefined = selectedSubCategoryId === NO_SUBCATEGORY_OPTION ? undefined : selectedSubCategoryId;

    if (selectedSubCategoryId === CREATE_NEW_OPTION) {
        const trimmedSubName = customSubCategoryName.trim();
        if (!trimmedSubName) {
            alert("Название новой подкатегории не может быть пустым.");
            return;
        }
        const newSubId = onAddSubCategory(finalMainCategoryId, trimmedSubName);
         if (!newSubId) { 
            const mainCatForSub = categories.find(c=>c.id === finalMainCategoryId);
            const existingSub = mainCatForSub?.subCategories.find(sc => sc.name.toLowerCase() === trimmedSubName.toLowerCase());
            if (existingSub) finalSubCategoryId = existingSub.id;
            else {
                alert("Не удалось создать или найти подкатегорию.");
                return;
            }
        } else {
            finalSubCategoryId = newSubId;
        }
    }
    
    onCategorizeExpense(selectedExpenseId, finalMainCategoryId, finalSubCategoryId, keywordToAssociate.trim());
    setSelectedExpenseId(null); 
  };
  
  const handleDeleteClick = (expenseIdToDelete: string) => {
    // Removed window.confirm for immediate deletion
    onDeleteExpensePermanently(expenseIdToDelete);
    if (selectedExpenseId === expenseIdToDelete) {
        setSelectedExpenseId(null); // Collapse the item if it was selected
    }
  };

  if (unidentifiedExpenses.length === 0) {
    return (
      <div className="p-4 bg-white shadow rounded-lg">
        <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Обработка Неопознанных Комментариев</h3>
        <p className="text-gray-600 mt-2">Нет неопознанных расходов для обработки.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-white shadow rounded-lg">
      <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Обработка Неопознанных Комментариев ({unidentifiedExpenses.length})</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {unidentifiedExpenses.map(expense => (
          <div key={expense.id} className="p-3 border rounded-md bg-yellow-50 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-700">
                    <span className="font-semibold">Дата:</span> {expense.date.toLocaleDateString('ru-RU')} | 
                    <span className="font-semibold">Сумма:</span> {expense.amount.toFixed(2)} {expense.currency}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                    <span className="font-semibold">Комментарий:</span> <span className="italic">{expense.fullComment}</span>
                    </p>
                </div>
                {/* Add a small delete button on the top right of each item, always visible */}
                 {!selectedExpenseId && (
                     <button 
                        onClick={() => handleDeleteClick(expense.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                        aria-label="Удалить этот расход"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                 )}
            </div>
            
            {selectedExpenseId === expense.id ? (
              <div className="mt-3 space-y-3 bg-yellow-100 p-3 rounded-md">
                {/* Main Category Selection */}
                <div>
                  <label htmlFor={`mainCatSelect-${expense.id}`} className="block text-xs font-medium text-gray-700">Основная категория:</label>
                  <select
                    id={`mainCatSelect-${expense.id}`}
                    value={selectedMainCategoryId}
                    onChange={(e) => setSelectedMainCategoryId(e.target.value)}
                    className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  >
                    <option value="">-- Выберите --</option>
                    {availableMainCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                    <option value={CREATE_NEW_OPTION}>++ Создать новую основную ++</option>
                  </select>
                  {selectedMainCategoryId === CREATE_NEW_OPTION && (
                    <input
                      type="text"
                      value={customMainCategoryName}
                      onChange={(e) => setCustomMainCategoryName(e.target.value)}
                      placeholder="Название новой основной категории"
                      className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-500 text-gray-900 bg-white"
                    />
                  )}
                </div>

                {/* SubCategory Selection */}
                {((selectedMainCategoryId && selectedMainCategoryId !== CREATE_NEW_OPTION) || (selectedMainCategoryId === CREATE_NEW_OPTION && customMainCategoryName.trim())) && (
                  <div>
                    <label htmlFor={`subCatSelect-${expense.id}`} className="block text-xs font-medium text-gray-700">Подкатегория (необязательно):</label>
                    <select
                      id={`subCatSelect-${expense.id}`}
                      value={selectedSubCategoryId}
                      onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                      className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      disabled={!currentMainCategory && selectedMainCategoryId !== CREATE_NEW_OPTION}
                    >
                      <option value={NO_SUBCATEGORY_OPTION}>-- Без подкатегории --</option>
                      {availableSubcategories.map(subCat => (
                        <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                      ))}
                      <option value={CREATE_NEW_OPTION}>++ Создать новую подкатегорию ++</option>
                    </select>
                    {selectedSubCategoryId === CREATE_NEW_OPTION && (
                      <input
                        type="text"
                        value={customSubCategoryName}
                        onChange={(e) => setCustomSubCategoryName(e.target.value)}
                        placeholder="Название новой подкатегории"
                        className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-500 text-gray-900 bg-white"
                      />
                    )}
                  </div>
                )}
                
                {/* Keyword Association Input */}
                {((selectedMainCategoryId && selectedMainCategoryId !== CREATE_NEW_OPTION && selectedSubCategoryId !== NO_SUBCATEGORY_OPTION) || 
                  (selectedMainCategoryId === CREATE_NEW_OPTION && customMainCategoryName.trim() && selectedSubCategoryId !== NO_SUBCATEGORY_OPTION) ||
                  (selectedMainCategoryId && selectedMainCategoryId !== CREATE_NEW_OPTION && selectedSubCategoryId === CREATE_NEW_OPTION && customSubCategoryName.trim()) ||
                  (selectedMainCategoryId === CREATE_NEW_OPTION && customMainCategoryName.trim() && selectedSubCategoryId === CREATE_NEW_OPTION && customSubCategoryName.trim()))  && (
                  <div>
                    <label htmlFor={`keywordAssociate-${expense.id}`} className="block text-xs font-medium text-gray-700">Ключевое слово для этой категории (из комментария):</label>
                    <input
                      id={`keywordAssociate-${expense.id}`}
                      type="text"
                      value={keywordToAssociate}
                      onChange={(e) => setKeywordToAssociate(e.target.value)}
                      placeholder="Например: маяк (для Продукты)"
                      className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-500 text-gray-900 bg-white"
                    />
                     <p className="text-xs text-gray-500 mt-0.5">Это слово будет добавлено к выбранной подкатегории.</p>
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <button 
                    onClick={handleProcessClick}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                  > <PlusIcon className="w-4 h-4 mr-1"/> Присвоить </button>
                  <button 
                    onClick={() => setSelectedExpenseId(null)}
                    className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                  > Отмена </button>
                   <button 
                        onClick={() => handleDeleteClick(expense.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                        aria-label="Удалить этот расход навсегда"
                    >
                        <TrashIcon className="w-4 h-4 mr-1" /> Удалить
                    </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setSelectedExpenseId(expense.id)}
                className="mt-2 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 flex items-center focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
              > <ArrowPathIcon className="w-4 h-4 mr-1" /> Обработать </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UncategorizedLog;
    