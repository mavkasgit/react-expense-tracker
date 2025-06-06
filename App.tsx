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
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { useDispatch, useSelector } from 'react-redux';
import { addExpense, removeExpense, addCategory, removeCategory } from './features/expensesSlice';
import LastUpdateTime from './components/LastUpdateTime';

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const expenses = useSelector((state: any) => state.expenses.items);
  const categories = useSelector((state: any) => state.expenses.categories);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [activeView, setActiveView] = useState<string>(AppView.Management);

  useEffect(() => {
    setLastUpdateTime(Date.now());
  }, [expenses]);

  useEffect(() => {
    setLastUpdateTime(Date.now());
  }, [categories]);

  const reProcessAllExpenses = useCallback((currentCategoriesToProcessWith: Category[]) => {
    dispatch(removeExpense(expenses));
    const reProcessed = expenses.filter(exp => exp && exp.date && !isNaN(exp.date.getTime())).map(exp => {
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
    dispatch(addExpense(reProcessed));
  }, [expenses, dispatch]); 

  const handleProcessNewExpenses = useCallback((rawExpensesData: RawExpenseData[]) => {
    const newProcessedExpenses = processRawExpenses(rawExpensesData, categories);
    dispatch(addExpense(newProcessedExpenses));
  }, [categories, dispatch]);

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
    dispatch(addCategory(newCategoryToAdd));
    return newCategoryId;
  }, [categories, dispatch]);
  
  const handleUpdateMainCategoryName = useCallback((mainCategoryId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert("Название основной категории не может быть пустым.");
        return;
    }
    dispatch(removeCategory(mainCategoryId));
    const updated = categories.map(c => c.id === mainCategoryId ? { ...c, name: trimmedName } : c).sort((a,b) => a.order - b.order);
    dispatch(addCategory(updated));
  }, [categories, dispatch]);

  const handleDeleteMainCategory = useCallback((mainCategoryId: string) => {
    const categoryToDelete = categories.find(cat => cat.id === mainCategoryId);
    if (!categoryToDelete) return;
    
    dispatch(removeCategory(mainCategoryId));
   
    if (activeView === categoryToDelete.name) {
        setActiveView(AppView.AllExpenses);
    }
  }, [categories, activeView, dispatch]);

  const handleAddSubCategory = useCallback((mainCategoryId: string, subCategoryName: string): string | undefined => {
    const trimmedName = subCategoryName.trim();
    if (!trimmedName) {
      alert("Название подкатегории не может быть пустым.");
      return undefined;
    }
    let newSubIdValue = uuidv4(); 
    let success = true;
    dispatch(removeCategory(mainCategoryId));
    const updatedCategories = categories.map(mc => {
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
    dispatch(addCategory(updatedCategories));
    return success ? newSubIdValue : undefined;
  }, [categories, dispatch]);

  const handleUpdateSubCategory = useCallback((mainCategoryId: string, subCategoryId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert("Название подкатегории не может быть пустым.");
        return;
    }
    dispatch(removeCategory(mainCategoryId));
    const updatedCategories = categories.map(mc => {
        if (mc.id === mainCategoryId) {
            const oldSubCategory = mc.subCategories.find(sc => sc.id === subCategoryId);
            if (mc.subCategories.find(sc => sc.id !== subCategoryId && sc.name.toLowerCase() === trimmedName.toLowerCase())) {
                alert(`Подкатегория с именем "${trimmedName}" уже существует в категории "${mc.name}".`);
                return mc;
            }
            if (oldSubCategory && oldSubCategory.name !== trimmedName) {
                reProcessAllExpenses(updatedCategories);
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
    dispatch(addCategory(updatedCategories));
  }, [reProcessAllExpenses, dispatch]);

  const handleDeleteSubCategory = useCallback((mainCategoryId: string, subCategoryId: string) => {
    const mainCat = categories.find(mc => mc.id === mainCategoryId);
    const subCat = mainCat?.subCategories.find(sc => sc.id === subCategoryId);
    
    if (!subCat || !mainCat) return;

    dispatch(removeCategory(mainCategoryId));
  }, [categories, dispatch]);

  const handleAddKeywordToSubCategory = useCallback((mainCategoryId: string, subCategoryId: string, keyword: string) => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    if (!trimmedKeyword) return;
    
    dispatch(removeCategory(mainCategoryId));
    const updatedCategories = categories.map(mc => {
      if (mc.id === mainCategoryId) {
        return {
          ...mc,
          subCategories: mc.subCategories.map(sc => {
            if (sc.id === subCategoryId) {
              if (sc.keywords.map(k => k.toLowerCase()).includes(trimmedKeyword)) {
                return sc; 
              }
              return { ...sc, keywords: [...sc.keywords, trimmedKeyword].sort() };
            }
            return sc;
          })
        };
      }
      return mc;
    });
    dispatch(addCategory(updatedCategories));
  }, [dispatch]);

  const handleDeleteKeywordFromSubCategory = useCallback((mainCategoryId: string, subCategoryId: string, keyword: string) => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    
    dispatch(removeCategory(mainCategoryId));
    const updatedCategories = categories.map(mc => {
      if (mc.id === mainCategoryId) {
        return {
          ...mc,
          subCategories: mc.subCategories.map(sc => {
            if (sc.id === subCategoryId) {
               const initialLength = sc.keywords.length;
               const updatedKeywordsArr = sc.keywords.filter(k => k.toLowerCase() !== trimmedKeyword);
               if(updatedKeywordsArr.length < initialLength) {
                 reProcessAllExpenses(updatedCategories);
               }
                return { ...sc, keywords: updatedKeywordsArr.sort() };
              }
              return sc;
            })
          };
        }
        return mc;
      });
    });
    dispatch(addCategory(updatedCategories));
  }, [reProcessAllExpenses, dispatch]);

  const handleCategorizeUnidentifiedExpense = useCallback(
    (expenseId: string, 
     targetMainCategoryId: string,
     targetSubCategoryId?: string,
     keywordToSave?: string) => {
      const trimmedKeywordToSave = keywordToSave?.trim().toLowerCase();
      if (!trimmedKeywordToSave) return;

      const expenseToUpdate = expenses.find(e => e.id === expenseId);
      if (!expenseToUpdate) return;

      const mainCategory = categories.find(c => c.id === targetMainCategoryId);
      if (!mainCategory) return;

      const subCategory = targetSubCategoryId 
        ? mainCategory.subCategories.find(sc => sc.id === targetSubCategoryId)
        : undefined;

      if (targetSubCategoryId && !subCategory) return;

      dispatch(removeCategory(targetMainCategoryId));
      const updatedCategories = categories.map(mc => {
        if (mc.id === targetMainCategoryId) {
          return {
            ...mc,
            subCategories: mc.subCategories.map(sc => {
              if (sc.id === targetSubCategoryId) {
                return {
                  ...sc,
                  keywords: [...sc.keywords, trimmedKeywordToSave].sort()
                };
              }
              return sc;
            })
          };
        }
        return mc;
      });
      dispatch(addCategory(updatedCategories));
      reProcessAllExpenses(updatedCategories);
    }, [expenses, categories, reProcessAllExpenses, dispatch]);

  const renderCurrentView = () => {
    switch (activeView) {
      case AppView.Management:
        return (
          <div className="space-y-6">
            <CategoryManagement
              onAddMainCategory={handleAddMainCategory}
              onUpdateMainCategoryName={handleUpdateMainCategoryName}
              onDeleteMainCategory={handleDeleteMainCategory}
              onAddSubCategory={handleAddSubCategory}
              onUpdateSubCategory={handleUpdateSubCategory}
              onDeleteSubCategory={handleDeleteSubCategory}
              onAddKeywordToSubCategory={handleAddKeywordToSubCategory}
              onDeleteKeywordFromSubCategory={handleDeleteKeywordFromSubCategory}
            />
            <UncategorizedLog
              onCategorizeUnidentifiedExpense={handleCategorizeUnidentifiedExpense}
            />
          </div>
        );
      case AppView.AllExpenses:
        return (
          <ExpenseDisplayTable
            expenses={expenses}
            onDeleteExpense={(id) => dispatch(removeExpense(id))}
          />
        );
      default:
        const categoryView = categories.find(c => c.name === activeView);
        if (categoryView) {
          const categoryExpenses = expenses.filter(e => 
            e.mainCategory === categoryView.name || 
            categoryView.subCategories.some(sc => sc.name === e.subCategory)
          );
          return (
            <ExpenseDisplayTable
              expenses={categoryExpenses}
              onDeleteExpense={(id) => dispatch(removeExpense(id))}
            />
          );
        }
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Учет расходов</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <ExpenseInput onProcessNewExpenses={handleProcessNewExpenses} />
        </div>
        <div className="mt-8">
          <TabsNavigator
            activeView={activeView}
            onViewChange={setActiveView}
            categories={categories}
          />
        </div>
        <div className="mt-8">
          {renderCurrentView()}
        </div>
        <LastUpdateTime timestamp={lastUpdateTime} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
};

export default App;
