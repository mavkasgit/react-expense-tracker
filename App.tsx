
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RawExpenseData, Category, ProcessedExpense, AppView, SubCategory } from './types';
import { USER_REQUESTED_DEFAULT_CATEGORIES } from './constants'; 
import { processRawExpenses, initialProcessExpense } from './services/categorizationService'; 
import ExpenseInput from './components/ExpenseInput';
import CategoryManagement from './components/CategoryManagement';
import UncategorizedLog from './components/UncategorizedLog';
import ExpenseDisplayTable from './components/ExpenseDisplayTable';
import TabsNavigator from './components/TabsNavigator';
import { TrashIcon } from './components/icons';

const App: React.FC = () => {
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
                                       name: sc.name || "Без имени", 
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
    console.log("DEBUG: Attempting to initialize allExpenses state.");
    const savedExpenses = localStorage.getItem('expenseTrackerExpenses');
    if (savedExpenses) {
        try {
            const parsedFromStorage = JSON.parse(savedExpenses);
            console.log("DEBUG: Parsed expenses from localStorage:", parsedFromStorage);

            if (Array.isArray(parsedFromStorage)) {
                const validExpenses: ProcessedExpense[] = [];
                parsedFromStorage.forEach((exp: any, index: number) => {
                    if (!exp || typeof exp !== 'object') {
                        console.warn(`DEBUG: Skipping invalid expense entry (not an object) at index ${index} from localStorage.`);
                        return;
                    }
                    if (typeof exp.id !== 'string') {
                         console.warn(`DEBUG: Skipping expense entry with missing or invalid ID at index ${index} from localStorage. Expense:`, exp);
                        return;
                    }

                    let parsedDate: Date;
                    if (typeof exp.date === 'string') {
                        parsedDate = new Date(exp.date);
                    } else {
                        console.warn(`DEBUG: Expense ID ${exp.id} has invalid date type (not a string):`, exp.date, `. Skipping.`);
                        return; 
                    }

                    if (isNaN(parsedDate.getTime())) {
                        console.warn(`DEBUG: Expense ID ${exp.id} has invalid date value after parsing: "${exp.date}". Original type: ${typeof exp.date}. Skipping.`);
                        return; 
                    }

                    const amount = parseFloat(exp.amount);
                    if (isNaN(amount)) {
                        console.warn(`DEBUG: Expense ID ${exp.id} has invalid amount: "${exp.amount}". Skipping.`);
                        return;
                    }
                    
                    validExpenses.push({
                        id: exp.id,
                        date: parsedDate,
                        amount: amount,
                        currency: typeof exp.currency === 'string' ? exp.currency : 'BYN',
                        comment: typeof exp.comment === 'string' ? exp.comment : '',
                        fullComment: typeof exp.fullComment === 'string' ? exp.fullComment : (exp.comment || ''),
                        categoryId: typeof exp.categoryId === 'string' ? exp.categoryId : undefined,
                        subCategoryId: typeof exp.subCategoryId === 'string' ? exp.subCategoryId : undefined,
                        isUnidentified: typeof exp.isUnidentified === 'boolean' ? exp.isUnidentified : true,
                    });
                });
                console.log(`DEBUG: Loaded ${validExpenses.length} valid expenses from localStorage.`);
                return validExpenses.sort((a,b) => b.date.getTime() - a.date.getTime());
            } else {
                console.warn("DEBUG: Saved expenses in localStorage is not an array.");
            }
        } catch (error) {
            console.error("DEBUG: Failed to parse expenses from localStorage:", error);
        }
    } else {
        console.log("DEBUG: No expenses found in localStorage. Initializing as empty array.");
    }
    return [];
  });
  
  const [activeView, setActiveView] = useState<string>(AppView.Management);

  useEffect(() => {
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
        const reProcessed = prev.filter(exp => exp && exp.date && !isNaN(exp.date.getTime())).map(exp => {
            const rawExpData: RawExpenseData = { 
                id: exp.id, 
                dateStr: `${String(exp.date.getDate()).padStart(2, '0')}.${String(exp.date.getMonth() + 1).padStart(2, '0')}.${exp.date.getFullYear()}`,
                amountStr: exp.amount.toString(),
                currency: exp.currency,
                fullComment: exp.fullComment,
            };
            const processedPart = initialProcessExpense(rawExpData, currentCategoriesToProcessWith);
            return { id: exp.id, ...processedPart };
        }).sort((a,b) => {
            const timeA = a.date && !isNaN(a.date.getTime()) ? a.date.getTime() : 0;
            const timeB = b.date && !isNaN(b.date.getTime()) ? b.date.getTime() : 0;
            return timeB - timeA;
        });
        console.log("reProcessAllExpenses: new expenses count", reProcessed.length);
        return reProcessed;
    });
  }, []); 

  const handleProcessNewExpenses = useCallback((rawExpensesData: RawExpenseData[]) => {
    console.log("handleProcessNewExpenses: processing new raw expenses", rawExpensesData);
    const newProcessedExpenses = processRawExpenses(rawExpensesData, categories);
    console.log("handleProcessNewExpenses: new processed expenses", newProcessedExpenses);
    setAllExpenses(prevExpenses => 
        [...prevExpenses, ...newProcessedExpenses]
        .filter(exp => exp && exp.date && !isNaN(exp.date.getTime())) 
        .sort((a,b) => {
            const timeA = a.date && !isNaN(a.date.getTime()) ? a.date.getTime() : 0;
            const timeB = b.date && !isNaN(b.date.getTime()) ? b.date.getTime() : 0;
            return timeB - timeA;
        })
    );
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
  }, [reProcessAllExpenses, categories]);

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
   
    if (activeView === categoryToDelete.name) {
        console.log(`DEBUG: Current view was the deleted category. Switching to AllExpenses.`);
        setActiveView(AppView.AllExpenses);
    }
  }, [categories, activeView, reProcessAllExpenses, setActiveView]);

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
        return updatedCategories;
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
    } else if (trimmedKeywordToSave && targetMainCategoryId && !targetSubCategoryId) {
         console.warn(`DEBUG: Keyword "${trimmedKeywordToSave}" provided for main category ${targetMainCategoryId}, but no subcategory selected. Keyword not saved.`);
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
    
    if (!defaultCats.find(dc => dc.name === activeView) && activeView !== AppView.Management && activeView !== AppView.AllExpenses) {
      console.log(`DEBUG: Current view ${activeView} not in new default categories. Switching to AllExpenses.`);
      setActiveView(AppView.AllExpenses);
    }
  }, [activeView, reProcessAllExpenses, setActiveView]); 

  const handleMoveMainCategory = useCallback((categoryId: string, direction: 'up' | 'down') => {
    setCategories(prev => {
        const categoriesCopy = [...prev].sort((a, b) => a.order - b.order);
        const index = categoriesCopy.findIndex(cat => cat.id === categoryId);

        if (index === -1) return prev;
        if (direction === 'up' && index === 0) return prev;
        if (direction === 'down' && index === categoriesCopy.length - 1) return prev;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        const itemToMove = categoriesCopy[index];
        const itemToSwapWith = categoriesCopy[targetIndex];
        categoriesCopy[index] = itemToSwapWith;
        categoriesCopy[targetIndex] = itemToMove;

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
  const availableViewsForTabs: string[] = [
    AppView.Management, 
    AppView.AllExpenses, 
    ...sortedCategoriesForTabs.map(c => c.name) 
  ];
  
  const uniqueViews = Array.from(new Set(availableViewsForTabs)).sort((a,b) => {
    const orderMap: Record<string, number> = {
        [AppView.Management]: -2,
        [AppView.AllExpenses]: -1,
    };
    const orderA = orderMap[a] !== undefined ? orderMap[a] : categories.find(c => c.name === a)?.order ?? Infinity;
    const orderB = orderMap[b] !== undefined ? orderMap[b] : categories.find(c => c.name === b)?.order ?? Infinity;

    return orderA - orderB;
  });


  const renderCurrentView = () => {
    switch (activeView) {
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
        const mainCategoryForView = categories.find(c => c.name === activeView);
        if (mainCategoryForView) {
          const filteredExpenses = allExpenses.filter(exp => exp.categoryId === mainCategoryForView.id);
          return <ExpenseDisplayTable expenses={filteredExpenses} categories={categories} title={`Расходы: ${mainCategoryForView.name}`} onDeleteCategorizedExpense={handleDeleteExpensePermanently} />;
        }
        console.warn(`DEBUG: Category view "${activeView}" not found. Defaulting to AllExpenses.`);
        setActiveView(AppView.AllExpenses); 
        return <ExpenseDisplayTable expenses={allExpenses} categories={categories} title="Все Расходы" onDeleteCategorizedExpense={handleDeleteExpensePermanently} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800 p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-700 tracking-tight">Трекер Расходов</h1>
        <p className="text-lg text-slate-600 mt-1">Управляйте своими финансами с легкостью</p>
      </header>
      
      <TabsNavigator currentView={activeView} onSelectView={setActiveView} availableViews={uniqueViews} />
      
      <main className="mt-6">
        {renderCurrentView()}
      </main>

      <footer className="mt-12 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} React Expense Tracker. Вдохновлено Google Sheets.</p>
      </footer>
    </div>
  );
};

export default App;
