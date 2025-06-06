
import React, { useState, useEffect } from 'react';
import { Category, SubCategory } from '../types';
import { PlusIcon, TrashIcon, EditIcon, CheckIcon, ArrowUpIcon, ArrowDownIcon } from './icons'; // Added Arrow Icons

interface CategoryManagementProps {
  categories: Category[];
  onAddMainCategory: (mainCategoryName: string) => string | undefined;
  onUpdateMainCategoryName: (mainCategoryId: string, newName: string) => void;
  onDeleteMainCategory: (mainCategoryId: string) => void;
  
  onAddSubCategory: (mainCategoryId: string, subCategoryName: string) => string | undefined;
  onUpdateSubCategory: (mainCategoryId: string, subCategoryId: string, newName: string) => void;
  onDeleteSubCategory: (mainCategoryId: string, subCategoryId: string) => void;

  onAddKeyword: (mainCategoryId: string, subCategoryId: string, keyword: string) => void;
  onDeleteKeyword: (mainCategoryId: string, subCategoryId: string, keyword: string) => void;

  onMoveMainCategoryUp: (mainCategoryId: string) => void;
  onMoveMainCategoryDown: (mainCategoryId: string) => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ 
  categories, 
  onAddMainCategory,
  onUpdateMainCategoryName,
  onDeleteMainCategory,
  onAddSubCategory,
  onUpdateSubCategory,
  onDeleteSubCategory,
  onAddKeyword,
  onDeleteKeyword,
  onMoveMainCategoryUp,
  onMoveMainCategoryDown,
}) => {
  const [newMainCategoryName, setNewMainCategoryName] = useState('');
  
  const [editingMainCategory, setEditingMainCategory] = useState<Category | null>(null);
  const [editMainName, setEditMainName] = useState('');
  
  const [editSubName, setEditSubName] = useState(''); 
  const [currentSubcategoryForKeywords, setCurrentSubcategoryForKeywords] = useState<SubCategory | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newSubCategoryNameForMain, setNewSubCategoryNameForMain] = useState('');

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  // Sync local editingMainCategory with props.categories
  useEffect(() => {
    if (editingMainCategory && editingMainCategory.id) {
      const categoryFromProps = categories.find(cat => cat.id === editingMainCategory.id);
      if (categoryFromProps) {
        if (JSON.stringify(categoryFromProps) !== JSON.stringify(editingMainCategory)) {
          console.log("DEBUG: Syncing editingMainCategory from props", categoryFromProps);
          setEditingMainCategory(categoryFromProps);
          setEditMainName(categoryFromProps.name);
        }
      } else {
        setEditingMainCategory(null);
      }
    }
  }, [categories, editingMainCategory?.id]);

  // Sync currentSubcategoryForKeywords with the (potentially updated) editingMainCategory
  useEffect(() => {
    if (editingMainCategory && currentSubcategoryForKeywords && currentSubcategoryForKeywords.id) {
      const subCategoryFromEditingMain = editingMainCategory.subCategories.find(
        sc => sc.id === currentSubcategoryForKeywords.id
      );
      if (subCategoryFromEditingMain) {
        if (JSON.stringify(subCategoryFromEditingMain) !== JSON.stringify(currentSubcategoryForKeywords)) {
          console.log("DEBUG: Syncing currentSubcategoryForKeywords from editingMainCategory", subCategoryFromEditingMain);
          setCurrentSubcategoryForKeywords(subCategoryFromEditingMain);
        }
      } else {
        setCurrentSubcategoryForKeywords(null);
      }
    }
  }, [editingMainCategory, currentSubcategoryForKeywords?.id]);


  useEffect(() => {
    if (editingMainCategory) {
      setEditMainName(editingMainCategory.name);
      setNewSubCategoryNameForMain(''); 
    } else {
      setEditMainName('');
    }
  }, [editingMainCategory?.id, editingMainCategory?.name]); 

  useEffect(() => {
    if (!currentSubcategoryForKeywords) {
        setNewKeyword('');
    }
  }, [currentSubcategoryForKeywords]);


  const handleAddMainCategoryInternal = () => {
    if (newMainCategoryName.trim()) {
      onAddMainCategory(newMainCategoryName.trim());
      setNewMainCategoryName('');
    } else {
      alert("Название основной категории не может быть пустым.");
    }
  };

  const handleSaveMainCategoryUpdate = () => {
    if (editingMainCategory && editMainName.trim()) {
      onUpdateMainCategoryName(editingMainCategory.id, editMainName.trim());
      setEditingMainCategory(prev => prev ? {...prev, name: editMainName.trim()} : null);
    } else {
        alert("Название основной категории не может быть пустым.")
    }
  };

  const handleAddSubCategoryInternal = () => {
    if (editingMainCategory && newSubCategoryNameForMain.trim()) {
        const newSubId = onAddSubCategory(editingMainCategory.id, newSubCategoryNameForMain.trim());
        if (newSubId) { 
            setNewSubCategoryNameForMain('');
        }
    } else if (!newSubCategoryNameForMain.trim()) {
        alert("Название подкатегории не может быть пустым.");
    }
  };
  
  const handleRenameSubCategory = (subCatId: string, currentName: string) => {
    const newName = prompt(`Переименовать подкатегорию "${currentName}":`, currentName);
    if (newName && newName.trim() && newName.trim() !== currentName && editingMainCategory) {
      onUpdateSubCategory(editingMainCategory.id, subCatId, newName.trim());
    } else if (newName === "") {
        alert("Название подкатегории не может быть пустым.");
    }
  };

  const handleDeleteSubCategoryInternal = (subCatId: string) => {
    if (editingMainCategory) {
        onDeleteSubCategory(editingMainCategory.id, subCatId);
    }
  };

  const openKeywordModal = (subCategory: SubCategory) => {
    setCurrentSubcategoryForKeywords(subCategory);
  };

  const handleAddKeywordInternal = () => {
    if (currentSubcategoryForKeywords && editingMainCategory && newKeyword.trim()) {
      onAddKeyword(editingMainCategory.id, currentSubcategoryForKeywords.id, newKeyword.trim());
      setNewKeyword('');
    }
  };
  
  const handleDeleteKeywordInternal = (keyword: string) => {
    if (currentSubcategoryForKeywords && editingMainCategory) {
      onDeleteKeyword(editingMainCategory.id, currentSubcategoryForKeywords.id, keyword);
    }
  };


  return (
    <div className="space-y-6 p-4 bg-white shadow rounded-lg">
      <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Управление Категориями</h3>
      
      <div className="space-y-3 p-3 border rounded-md bg-slate-50">
        <h4 className="text-md font-medium text-gray-600">Добавить новую основную категорию</h4>
        <div className="flex space-x-2">
            <input
              type="text"
              value={newMainCategoryName}
              onChange={(e) => setNewMainCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMainCategoryInternal()}
              placeholder="Например: Путешествия"
              className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-500 text-gray-900 bg-white"
            />
            <button
                onClick={handleAddMainCategoryInternal}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex items-center"
            > <PlusIcon className="w-5 h-5 mr-1" /> Добавить </button>
        </div>
      </div>

      {/* Modal for Editing Main Category, its Subcategories, and launching Keyword Modal */}
      {editingMainCategory && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full z-40 flex justify-center items-start pt-10" role="dialog" aria-modal="true">
          <div className="relative p-5 border w-full max-w-xl shadow-lg rounded-md bg-white space-y-4 mx-2">
             <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-800">Редактировать: {editMainName}</h4>
                <button onClick={() => setEditingMainCategory(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
             </div>
             <div>
                <label htmlFor="editMainCatNameModal" className="block text-sm font-medium text-gray-700">Название основной категории</label>
                <div className="flex space-x-2">
                    <input 
                        id="editMainCatNameModal" 
                        type="text" 
                        value={editMainName} 
                        onChange={(e) => setEditMainName(e.target.value)} 
                        className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                    />
                    <button onClick={handleSaveMainCategoryUpdate} className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 flex items-center" aria-label="Сохранить имя основной категории">
                        <CheckIcon className="w-5 h-5"/> <span className="ml-1 sm:hidden md:inline">Сохранить</span>
                    </button>
                </div>
            </div>
            
            <div className="border-t pt-3 mt-3">
                <h5 className="text-md font-medium text-gray-700 mb-2">Подкатегории</h5>
                {editingMainCategory.subCategories.length > 0 && (
                    <ul className="space-y-2 max-h-48 overflow-y-auto mb-3 border rounded-md p-2 bg-slate-50">
                        {editingMainCategory.subCategories.sort((a,b) => a.name.localeCompare(b.name)).map((subCat) => (
                           <li key={subCat.id} className="flex justify-between items-center text-sm p-1.5 hover:bg-slate-100 rounded">
                             <span className="text-gray-800">{subCat.name}</span>
                             <div className="flex items-center space-x-1.5">
                               <button onClick={() => handleRenameSubCategory(subCat.id, subCat.name)} className="text-xs text-blue-600 hover:text-blue-900 p-1 flex items-center" aria-label={`Переименовать ${subCat.name}`}><EditIcon className="w-4 h-4 mr-0.5"/> <span className="hidden sm:inline">Изм.</span></button>
                               <button onClick={() => openKeywordModal(subCat)} className="text-xs text-purple-600 hover:text-purple-900 p-1" aria-label={`Ключевые слова для ${subCat.name}`}>Ключи</button>
                               <button 
                                 onClick={() => handleDeleteSubCategoryInternal(subCat.id)} 
                                 className="text-xs text-red-600 hover:text-red-800 p-1 bg-red-100 hover:bg-red-200 rounded flex items-center" 
                                 aria-label={`Удалить ${subCat.name}`}
                               >
                                 <TrashIcon className="w-4 h-4 mr-0.5"/> <span className="hidden sm:inline">Удалить</span>
                               </button>
                             </div>
                           </li> 
                        ))}
                    </ul>
                )}
                 <div className="flex space-x-2 items-center mt-2">
                    <input
                        type="text"
                        value={newSubCategoryNameForMain}
                        onChange={(e) => setNewSubCategoryNameForMain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubCategoryInternal()}
                        placeholder="Новая подкатегория"
                        className="flex-grow mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white"
                    />
                    <button onClick={handleAddSubCategoryInternal} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 flex items-center" aria-label="Добавить подкатегорию">
                        <PlusIcon className="w-4 h-4 mr-0.5"/> <span className="hidden sm:inline">Добавить</span>
                    </button>
                </div>
            </div>
            <div className="flex justify-end pt-4">
                 <button onClick={() => setEditingMainCategory(null)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Keyword Management Modal */}
      {currentSubcategoryForKeywords && editingMainCategory && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-start pt-16" role="dialog" aria-modal="true">
            <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white space-y-3 mx-2">
                <div className="flex justify-between items-center">
                    <h5 className="text-md font-medium text-gray-800">Ключевые слова для: "{currentSubcategoryForKeywords.name}"</h5>
                    <button onClick={() => setCurrentSubcategoryForKeywords(null)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                 {currentSubcategoryForKeywords.keywords.length > 0 ? (
                    <ul className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2 bg-slate-50">
                        {currentSubcategoryForKeywords.keywords.sort().map(kw => (
                            <li key={kw} className="flex justify-between items-center text-sm p-1 hover:bg-slate-100 rounded">
                                <span className="text-gray-700">{kw}</span>
                                <button 
                                  onClick={() => handleDeleteKeywordInternal(kw)} 
                                  className="text-xs text-red-600 hover:text-red-800 p-0.5 bg-red-100 hover:bg-red-200 rounded flex items-center" 
                                  aria-label={`Удалить ключевое слово ${kw}`}
                                >
                                  <TrashIcon className="w-3 h-3 mr-0.5"/> <span className="hidden sm:inline">Удалить</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                 ) : <p className="text-sm text-gray-500">Ключевых слов нет.</p>}
                <div className="flex space-x-2 items-center pt-1">
                    <input 
                        type="text"
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddKeywordInternal()}
                        placeholder="Новое ключевое слово"
                        className="flex-grow mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white"
                    />
                    <button onClick={handleAddKeywordInternal} className="px-3 py-1.5 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 flex items-center" aria-label="Добавить ключевое слово">
                        <PlusIcon className="w-4 h-4 mr-0.5"/> <span className="hidden sm:inline">Добавить</span>
                    </button>
                </div>
                 <div className="flex justify-end pt-3">
                    <button onClick={() => setCurrentSubcategoryForKeywords(null)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Готово</button>
                </div>
            </div>
        </div>
      )}


      {/* List of Main Categories */}
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-600 mb-2">Список Основных Категорий</h4>
        {categories.length === 0 ? (
          <p className="text-gray-500">Основные категории еще не добавлены.</p>
        ) : (
          <ul className="space-y-2">
            {sortedCategories.map((mainCat, index) => ( // Use sortedCategories here
              <li key={mainCat.id} className="p-3 border rounded-md bg-slate-50 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span 
                        className="text-gray-900 font-medium cursor-pointer hover:text-indigo-600" 
                        onClick={() => setEditingMainCategory(mainCat)}
                        title="Редактировать категорию"
                    >
                        {mainCat.name}
                    </span>
                    {mainCat.subCategories.length > 0 && (
                        <span className="text-xs text-gray-500">({mainCat.subCategories.length} подкатегорий)</span>
                    )}
                  </div>
                  <div className="space-x-2 flex items-center">
                    <button
                        onClick={() => onMoveMainCategoryUp(mainCat.id)}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Переместить вверх"
                    >
                        <ArrowUpIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onMoveMainCategoryDown(mainCat.id)}
                        disabled={index === sortedCategories.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Переместить вниз"
                    >
                        <ArrowDownIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setEditingMainCategory(mainCat)} 
                        className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center" 
                        aria-label={`Редактировать ${mainCat.name}`}>
                        <EditIcon className="w-4 h-4 mr-1"/> Редактировать
                    </button>
                    <button 
                        onClick={() => onDeleteMainCategory(mainCat.id)} 
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center" 
                        aria-label={`Удалить ${mainCat.name}`}>
                        <TrashIcon className="w-4 h-4 mr-1"/> Удалить
                    </button>
                  </div>
                </div>
                 {mainCat.subCategories.length > 0 && (
                    <div className="mt-1.5 pl-4">
                        <p className="text-xs text-gray-600">Подкатегории: {mainCat.subCategories.map(sc => sc.name).join(', ')}</p>
                    </div>
                 )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
