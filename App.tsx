import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RawExpenseData, Category, ProcessedExpense, AppView, SubCategory } from './types';
import { USER_REQUESTED_DEFAULT_CATEGORIES } from './constants'; 
import { processRawExpenses, initialProcessExpense } from './services/categorizationService'; 
import { syncService } from './services/syncService';
import ExpenseInput from './components/ExpenseInput';
import CategoryManagement from './components/CategoryManagement';
import UncategorizedLog from './components/UncategorizedLog';
import ExpenseDisplayTable from './components/ExpenseDisplayTable';
import TabsNavigator from './components/TabsNavigator';
import { TrashIcon } from './components/icons';
import SyncStatus from './components/SyncStatus';

const App: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [syncError, setSyncError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>(() => {
    const savedCategories = localStorage.getItem('expenseTrackerCategories');
    try {
        if (savedCategories) {
            let parsed = JSON.parse(savedCategories) as Category[];
            if (Array.isArray(parsed) && parsed.every(item => item && typeof item.id === 'string' && typeof item.name === 'string')) {
                 console.log("DEBUG: Initializing categories from localStorage.");
                 parsed = parsed.map((cat, index) => ({
                    ...cat,
                    order: (typeof cat.order === 'number' && !isNaN(cat.order)) ? cat.order : index,
                    subCategories: Array.isArray(cat.subCategories) ? 
                                   cat.subCategories.map(sc => ({
                                       id: sc.id || uuidv4(), 
                                       name: sc.name,
                                       keywords: Array.isArray(sc.keywords) ? sc.keywords.map(k => String(k).toLowerCase()) : []
                                   })) : [] 
                })).sort((a, b) => a.order - b.order);
                return parsed;
            }
        }
    } catch (error) {
        console.error("Failed to parse categories from localStorage:", error);
    }
    
    console.log("DEBUG: Initializing categories from USER_REQUESTED_DEFAULT_CATEGORIES (constants.ts).");
    const defaultCats = USER_REQUESTED_DEFAULT_CATEGORIES.sort((a, b) => a.order - b.order);
    
    if (defaultCats.length > 0 && defaultCats[0].name === "Повседневные" && 
        defaultCats[0].subCategories.length > 0 && defaultCats[0].subCategories[0].name === "Продукты") {
        console.log(`DEBUG: Initial default keywords for 'Повседневные -> Продукты':`, JSON.stringify(defaultCats[0].subCategories[0].keywords));
    } else if (defaultCats.length > 0 && defaultCats[0].subCategories.length > 0) {
        const firstMainCatName = defaultCats[0].name;
        const firstSubCat = defaultCats[0].subCategories[0];
        console.log(`DEBUG: Initial default keywords for '${firstSubCat.name}' under '${firstMainCatName}':`, JSON.stringify(firstSubCat.keywords));
    }
    return defaultCats; 
  });

  const [allExpenses, setAllExpenses] = useState<ProcessedExpense[]>(() => {
     const savedExpenses = localStorage.getItem('expenseTrackerExpenses');
     if (savedExpenses) {
        try {
            const parsed = JSON.parse(savedExpenses) as ProcessedExpense[];
            if (Array.isArray(parsed)) {
                return parsed.map((exp: any) => ({
                    ...exp, 
                    date: new Date(exp.date), 
                }));
            }
        } catch (error) {
            console.error("Failed to parse expenses from localStorage:", error);
        }
     }
     return [];
  });
  const [currentView, setCurrentView] = useState<string>(AppView.Management);

  // Функция для синхронизации данных с сервером
  const syncWithServer = async () => {
    try {
      setSyncStatus('syncing');
      const result = await syncService.saveData(allExpenses, categories, lastSyncTime);
      
      if (result.error === 'Data is outdated') {
        // Если данные устарели, обновляем локальные данные
        setAllExpenses(result.currentData.expenses);
        setCategories(result.currentData.categories);
        setLastSyncTime(result.currentData.lastSync);
      } else {
        setLastSyncTime(result.lastSync);
      }
      
      setSyncStatus('idle');
      setSyncError(null);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Периодическая синхронизация
  useEffect(() => {
    const syncInterval = setInterval(syncWithServer, 30000); // каждые 30 секунд
    return () => clearInterval(syncInterval);
  }, [syncWithServer]);

  // Начальная синхронизация при загрузке
  useEffect(() => {
    syncWithServer();
  }, []);

  useEffect(() => {
    // Sort categories by order before saving to ensure consistency
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
    console.log("Saving categories to localStorage:", sortedCategories);
    localStorage.setItem('expenseTrackerCategories', JSON.stringify(sortedCategories));
  }, [categories]);

  useEffect(() => {
    console.log("Saving expenses to localStorage:", allExpenses);
    localStorage.setItem('expenseTrackerExpenses', JSON.stringify(allExpenses));
  }, [allExpenses]);
  
  const reProcessAllExpenses = useCallback((currentCategoriesToProcessWith: Category[]) => {
    console.log("reProcessAllExpenses triggered with categories:", currentCategoriesToProcessWith);
    setAllExpenses(prev => {
        console.log("reProcessAllExpenses: prev expenses count", prev.length);
        const reProcessed = prev.map(exp => {
            const rawExpData: RawExpenseData = { 
                id: exp.id, 
                dateStr: `${String(exp.date.getDate()).padStart(2, '0')}.${String(exp.date.getMonth() + 1).padStart(2, '0')}.${exp.date.getFullYear()}`,
                amountStr: exp.amount.toString(),
                currency: exp.currency,
                fullComment: exp.fullComment,
            };
            const processedPart = initialProcessExpense(rawExpData, currentCategoriesToProcessWith);
            return { id: exp.id, ...processedPart };
        }).sort((a,b) => b.date.getTime() - a.date.getTime());
        console.log("reProcessAllExpenses: new expenses count", reProcessed.length);
        return reProcessed;
    });
  }, []); 

  const handleProcessNewExpenses = useCallback((rawExpensesData: RawExpenseData[]) => {
    console.log("handleProcessNewExpenses: processing new raw expenses", rawExpensesData);
    const newProcessedExpenses = processRawExpenses(rawExpensesData, categories);
    console.log("handleProcessNewExpenses: new processed expenses", newProcessedExpenses);
    setAllExpenses(prevExpenses => [...prevExpenses, ...newProcessedExpenses].sort((a,b) => b.date.getTime() - a.date.getTime()));
  }, [categories]);


  const handleAddMainCategory = useCallback((mainCategoryName: string): string | undefined => {
    const trimmedName = mainCategoryName.trim();
    if (!trimmedName) {
        alert("Название основной категории не может быть пустым.");
        return undefined;
    }
    if (categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert(`Основная категория с именем "${trimmedName}" уже существует.`);
      return undefined;
    }
    const newCategoryId = uuidv4();
    // Assign new category the next order number
    const newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 0;
    const newCategoryToAdd: Category = { 
        id: newCategoryId, 
        name: trimmedName, 
        order: newOrder, 
        subCategories: [] 
    };
    setCategories(prev => [...prev, newCategoryToAdd].sort((a,b) => a.order - b.order));
    return newCategoryId;
  }, [categories]);
  
  const handleUpdateMainCategoryName = useCallback((mainCategoryId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert("Название основной категории не может быть пустым.");
        return;
    }
    setCategories(prev => {
        if (prev.find(c => c.id !== mainCategoryId && c.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert(`Основная категория с именем "${trimmedName}" уже существует.`);
            return prev;
        }
        const updated = prev.map(c => c.id === mainCategoryId ? { ...c, name: trimmedName } : c).sort((a,b) => a.order - b.order);
        const oldCategory = prev.find(c => c.id === mainCategoryId);
        if (oldCategory && oldCategory.name !== trimmedName) {
            console.log("DEBUG: Main category name changed. Re-processing expenses.");
            reProcessAllExpenses(updated); 
        }
        return updated;
    });
  }, [reProcessAllExpenses]);

  const reIndexCategoryOrder = (cats: Category[]): Category[] => {
    return cats.sort((a, b) => a.order - b.order).map((cat, index) => ({ ...cat, order: index }));
  };

  const handleDeleteMainCategory = useCallback((mainCategoryId: string) => {
    console.log(`DEBUG: handleDeleteMainCategory called with ID: ${mainCategoryId}`);
    const categoryToDelete = categories.find(cat => cat.id === mainCategoryId);
    
    if (!categoryToDelete) {
        console.warn(`DEBUG: Category with ID ${mainCategoryId} not found for deletion.`);
        return;
    }
    console.log(`DEBUG: Executing deletion for main category ${mainCategoryId} WITHOUT confirmation.`);

    setCategories(prev => {
        const filteredCategories = prev.filter(cat => cat.id !== mainCategoryId);
        const updatedCategories = reIndexCategoryOrder(filteredCategories);
        reProcessAllExpenses(updatedCategories); 
        return updatedCategories;
    });
   
    if (currentView === categoryToDelete.name) {
        console.log(`DEBUG: Current view was the deleted category. Switching to AllExpenses.`);
        setCurrentView(AppView.AllExpenses);
    }
  }, [categories, currentView, reProcessAllExpenses]);

  const handleAddSubCategory = useCallback((mainCategoryId: string, subCategoryName: string): string | undefined => {
    const trimmedName = subCategoryName.trim();
    if (!trimmedName) {
      alert("Название подкатегории не может быть пустым.");
      return undefined;
    }
    let newSubIdValue = uuidv4(); 
    let success = true;
    setCategories(prev => {
        const updatedCategories = prev.map(mc => {
            if (mc.id === mainCategoryId) {
                if (mc.subCategories.find(sc => sc.name.toLowerCase() === trimmedName.toLowerCase())) {
                    alert(`Подкатегория "${trimmedName}" уже существует в категории "${mc.name}".`);
                    success = false;
                    return mc;
                }
                const newSub: SubCategory = { id: newSubIdValue, name: trimmedName, keywords: [] };
                return { ...mc, subCategories: [...mc.subCategories, newSub].sort((a,b) => a.name.localeCompare(b.name)) };
            }
            return mc;
        });
        return updatedCategories; // No need to sort main categories here as order doesn't change
    });
    return success ? newSubIdValue : undefined;
  }, []);

  const handleUpdateSubCategory = useCallback((mainCategoryId: string, subCategoryId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert("Название подкатегории не может быть пустым.");
        return;
    }
    setCategories(prev => {
        let nameActuallyChanged = false;
        const updatedCategories = prev.map(mc => {
            if (mc.id === mainCategoryId) {
                const oldSubCategory = mc.subCategories.find(sc => sc.id === subCategoryId);
                if (mc.subCategories.find(sc => sc.id !== subCategoryId && sc.name.toLowerCase() === trimmedName.toLowerCase())) {
                    alert(`Подкатегория с именем "${trimmedName}" уже существует в категории "${mc.name}".`);
                    return mc;
                }
                if (oldSubCategory && oldSubCategory.name !== trimmedName) {
                    nameActuallyChanged = true;
                }
                return { 
                    ...mc, 
                    subCategories: mc.subCategories.map(sc => 
                        sc.id === subCategoryId ? { ...sc, name: trimmedName } : sc
                    ).sort((a,b) => a.name.localeCompare(b.name))
                };
            }
            return mc;
        });
        if (nameActuallyChanged) {
            console.log("DEBUG: Subcategory name changed. Re-processing expenses.");
            reProcessAllExpenses(updatedCategories);
        }
        return updatedCategories;
    });
  }, [reProcessAllExpenses]);

  const handleDeleteSubCategory = useCallback((mainCategoryId: string, subCategoryId: string) => {
     console.log(`DEBUG: handleDeleteSubCategory called with MainID: ${mainCategoryId}, SubID: ${subCategoryId}`);
     const mainCat = categories.find(mc => mc.id === mainCategoryId);
     const subCat = mainCat?.subCategories.find(sc => sc.id === subCategoryId);
     
     if (!subCat || !mainCat) {
        console.warn(`DEBUG: SubCategory (ID: ${subCategoryId}) or MainCategory (ID: ${mainCategoryId}) not found for deletion.`);
        return;
     }
     console.log(`DEBUG: Executing deletion for subcategory ${subCategoryId} from main category ${mainCat.name} WITHOUT confirmation.`);

    setCategories(prev => {
        const updatedCategories = prev.map(mc => 
            mc.id === mainCategoryId 
                ? { ...mc, subCategories: mc.subCategories.filter(sc => sc.id !== subCategoryId) } 
                : mc
        );
        reProcessAllExpenses(updatedCategories);
        return updatedCategories;
    });
  }, [categories, reProcessAllExpenses]);

  const handleAddKeywordToSubCategory = useCallback((mainCategoryId: string, subCategoryId: string, keyword: string) => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    if (!trimmedKeyword) return;
    
    setCategories(prevCategories => {
      let categoriesWereActuallyUpdated = false;
      const updatedCategories = prevCategories.map(mc => {
        if (mc.id === mainCategoryId) {
          return {
            ...mc,
            subCategories: mc.subCategories.map(sc => {
              if (sc.id === subCategoryId) {
                if (sc.keywords.map(k => k.toLowerCase()).includes(trimmedKeyword)) {
                  return sc; 
                }
                categoriesWereActuallyUpdated = true;
                return { ...sc, keywords: [...sc.keywords, trimmedKeyword].sort() };
              }
              return sc;
            })
          };
        }
        return mc;
      });

      if(categoriesWereActuallyUpdated) {
          console.log(`DEBUG: Keyword added. Re-processing all expenses with updated categories.`);
          reProcessAllExpenses(updatedCategories); 
      }
      return updatedCategories;
    });
  }, [reProcessAllExpenses]);

  const handleDeleteKeywordFromSubCategory = useCallback((mainCategoryId: string, subCategoryId: string, keyword: string) => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    
    setCategories(prevCategories => {
      let categoriesWereActuallyUpdated = false;
      const updatedCategories = prevCategories.map(mc => {
        if (mc.id === mainCategoryId) {
          return {
            ...mc,
            subCategories: mc.subCategories.map(sc => {
              if (sc.id === subCategoryId) {
                 const initialLength = sc.keywords.length;
                 const updatedKeywordsArr = sc.keywords.filter(k => k.toLowerCase() !== trimmedKeyword);
                 if(updatedKeywordsArr.length < initialLength) categoriesWereActuallyUpdated = true;
                return { ...sc, keywords: updatedKeywordsArr.sort() };
              }
              return sc;
            })
          };
        }
        return mc;
      });

      if(categoriesWereActuallyUpdated) {
          console.log(`DEBUG: Keyword deleted. Re-processing all expenses with updated categories.`);
          reProcessAllExpenses(updatedCategories);
      }
      return updatedCategories;
    });
  }, [reProcessAllExpenses]);

  const handleCategorizeUnidentifiedExpense = useCallback((
    expenseId: string, 
    targetMainCategoryId: string,
    targetSubCategoryId?: string,
    keywordToSave?: string
  ) => {
    const trimmedKeywordToSave = keywordToSave?.trim().toLowerCase();

    if (trimmedKeywordToSave && targetMainCategoryId && targetSubCategoryId) {
        console.log(`DEBUG: Attempting to save keyword "${trimmedKeywordToSave}" to MainCatID: ${targetMainCategoryId}, SubCatID: ${targetSubCategoryId}`);
        handleAddKeywordToSubCategory(targetMainCategoryId, targetSubCategoryId, trimmedKeywordToSave);
    }

    setAllExpenses(prevAllExpenses => {
      const manuallyCategorizedExpense = prevAllExpenses.find(exp => exp.id === expenseId);
      if (!manuallyCategorizedExpense) {
        console.warn(`DEBUG: Could not find expense with ID ${expenseId} to categorize.`);
        return prevAllExpenses;
      }
      const commentToMatch = manuallyCategorizedExpense.fullComment;
      console.log(`DEBUG: Manual categorization for expense ID ${expenseId}, comment: "${commentToMatch}" to MainCatID: ${targetMainCategoryId}, SubCatID: ${targetSubCategoryId}`);

      const updatedExpenses = prevAllExpenses.map(exp => {
        if (exp.id === expenseId) {
          return { 
            ...exp, 
            categoryId: targetMainCategoryId,
            subCategoryId: targetSubCategoryId,
            isUnidentified: false 
          };
        }
        if (exp.isUnidentified && exp.fullComment.toLowerCase() === commentToMatch.toLowerCase()) {
          console.log(`DEBUG: Auto-categorizing expense ID ${exp.id} due to matching comment (case-insensitive): "${commentToMatch}"`);
          return {
            ...exp,
            categoryId: targetMainCategoryId,
            subCategoryId: targetSubCategoryId,
            isUnidentified: false
          };
        }
        return exp;
      }).sort((a,b) => b.date.getTime() - a.date.getTime());
      
      return updatedExpenses;
    });
  }, [handleAddKeywordToSubCategory]);

  const handleDeleteExpensePermanently = useCallback((expenseId: string) => {
    console.log(`DEBUG: Deleting expense permanently with ID: ${expenseId}`);
    setAllExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseId));
  }, []);


  const handleResetAllExpenses = useCallback(() => {
    console.log("DEBUG: handleResetAllExpenses called");
    console.log(`DEBUG: Executing resetting all expenses WITHOUT confirmation.`);
    setAllExpenses([]);
  }, []);

  const handleResetCategoriesToDefault = useCallback(() => {
    console.log("DEBUG: handleResetCategoriesToDefault called");
    console.log(`DEBUG: Executing resetting categories to default WITHOUT confirmation.`);
    
    const defaultCats = USER_REQUESTED_DEFAULT_CATEGORIES.sort((a,b) => a.order - b.order); 
    console.log("DEBUG: Using USER_REQUESTED_DEFAULT_CATEGORIES for reset:", defaultCats);
    setCategories(defaultCats);
    console.log("DEBUG: Calling reProcessAllExpenses after category reset.");
    reProcessAllExpenses(defaultCats); 
    
    if (!defaultCats.find(dc => dc.name === currentView) && currentView !== AppView.Management && currentView !== AppView.AllExpenses) {
      console.log(`DEBUG: Current view ${currentView} not in new default categories. Switching to AllExpenses.`);
      setCurrentView(AppView.AllExpenses);
    }
  }, [currentView, reProcessAllExpenses]); 

  const handleMoveMainCategory = useCallback((categoryId: string, direction: 'up' | 'down') => {
    setCategories(prev => {
        const categoriesCopy = [...prev].sort((a, b) => a.order - b.order);
        const index = categoriesCopy.findIndex(cat => cat.id === categoryId);

        if (index === -1) return prev;
        if (direction === 'up' && index === 0) return prev;
        if (direction === 'down' && index === categoriesCopy.length - 1) return prev;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Swap items
        const itemToMove = categoriesCopy[index];
        const itemToSwapWith = categoriesCopy[targetIndex];
        categoriesCopy[index] = itemToSwapWith;
        categoriesCopy[targetIndex] = itemToMove;

        // Re-assign order based on new array positions
        return categoriesCopy.map((cat, newOrder) => ({ ...cat, order: newOrder }));
    });
  }, []);
  
  const handleMoveMainCategoryUp = useCallback((categoryId: string) => {
    handleMoveMainCategory(categoryId, 'up');
  }, [handleMoveMainCategory]);

  const handleMoveMainCategoryDown = useCallback((categoryId: string) => {
    handleMoveMainCategory(categoryId, 'down');
  }, [handleMoveMainCategory]);


  const unidentifiedExpenses = allExpenses.filter(exp => exp.isUnidentified);
  
  const sortedCategoriesForTabs = [...categories].sort((a,b) => a.order - b.order);
  const availableViews: string[] = [
    AppView.Management, 
    AppView.AllExpenses, 
    ...sortedCategoriesForTabs.map(c => c.name) // Use sorted categories for tab names
  ];
  // Sort the full list of views, keeping Management and AllExpenses at the top
  const uniqueViews = Array.from(new Set(availableViews)).sort((a,b) => {
    const isAManagement = a === AppView.Management;
    const isBManagement = b === AppView.Management;
    const isAAllExpenses = a === AppView.AllExpenses;
    const isBAllExpenses = b === AppView.AllExpenses;

    if (isAManagement) return -1;
    if (isBManagement) return 1;
    if (isAAllExpenses) return -1;
    if (isBAllExpenses) return 1;
    
    // For category names, find their original order
    const orderA = categories.find(c => c.name === a)?.order ?? Infinity;
    const orderB = categories.find(c => c.name === b)?.order ?? Infinity;
    
    if (orderA !== orderB) {
        return orderA - orderB;
    }
    return a.localeCompare(b); // Fallback to alphabetical if order is same (should not happen for main categories)
  });


  const renderCurrentView = () => {
    switch (currentView) {
      case AppView.Management:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ExpenseInput onProcessExpenses={handleProcessNewExpenses} />
              <UncategorizedLog
                unidentifiedExpenses={unidentifiedExpenses}
                categories={categories}
                onCategorizeExpense={handleCategorizeUnidentifiedExpense}
                onAddMainCategory={handleAddMainCategory} 
                onAddSubCategory={handleAddSubCategory}
                onDeleteExpensePermanently={handleDeleteExpensePermanently} 
              />
            </div>
            <div className="space-y-6">
              <CategoryManagement 
                categories={categories} 
                onAddMainCategory={handleAddMainCategory}
                onUpdateMainCategoryName={handleUpdateMainCategoryName}
                onDeleteMainCategory={handleDeleteMainCategory}
                onAddSubCategory={handleAddSubCategory}
                onUpdateSubCategory={handleUpdateSubCategory}
                onDeleteSubCategory={handleDeleteSubCategory}
                onAddKeyword={handleAddKeywordToSubCategory}
                onDeleteKeyword={handleDeleteKeywordFromSubCategory}
                onMoveMainCategoryUp={handleMoveMainCategoryUp}
                onMoveMainCategoryDown={handleMoveMainCategoryDown}
              />
              <div className="p-4 bg-white shadow rounded-lg space-y-4">
                <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Инструменты Сброса</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                   <button
                    onClick={handleResetAllExpenses}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center justify-center"
                    aria-label="Сбросить все расходы"
                  >
                    <TrashIcon className="w-5 h-5 mr-2" /> Сбросить ВСЕ Расходы
                  </button>
                  <button
                    onClick={handleResetCategoriesToDefault}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 flex items-center justify-center"
                    aria-label="Сбросить категории к стандартным"
                  >
                    <TrashIcon className="w-5 h-5 mr-2" /> Сбросить Категории
                  </button>
                </div>
                 <p className="text-xs text-gray-500">Внимание: Действия по сбросу необратимы.</p>
              </div>
            </div>
          </div>
        );
      case AppView.AllExpenses:
        return <ExpenseDisplayTable expenses={allExpenses} categories={categories} title="Все Расходы" onDeleteCategorizedExpense={handleDeleteExpensePermanently} />;
      default:
        const mainCategoryForView = categories.find(c => c.name === currentView);
        if (mainCategoryForView) {
          const filteredExpenses = allExpenses.filter(exp => exp.categoryId === mainCategoryForView.id);
          return <ExpenseDisplayTable expenses={filteredExpenses} categories={categories} title={`Расходы: ${mainCategoryForView.name}`} onDeleteCategorizedExpense={handleDeleteExpensePermanently} />;
        }
        console.warn(`DEBUG: Category view "${currentView}" not found. Defaulting to AllExpenses.`);
        setCurrentView(AppView.AllExpenses); 
        return <ExpenseDisplayTable expenses={allExpenses} categories={categories} title="Все Расходы" onDeleteCategorizedExpense={handleDeleteExpensePermanently} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Expense Tracker</h1>
        
        <div className="mb-4">
          <SyncStatus
            status={syncStatus}
            error={syncError}
            lastSyncTime={lastSyncTime}
          />
        </div>

        <TabsNavigator
          currentView={currentView}
          onViewChange={setCurrentView}
          categories={categories}
        />

        {renderCurrentView()}
      </div>
    </div>
  );
};

export default App;