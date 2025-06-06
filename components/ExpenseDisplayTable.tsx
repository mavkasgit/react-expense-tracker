
import React from 'react';
import { ProcessedExpense, Category } from '../types';
import { TrashIcon } from './icons';

interface ExpenseDisplayTableProps {
  expenses: ProcessedExpense[];
  categories: Category[]; 
  title: string;
  onDeleteCategorizedExpense?: (expenseId: string) => void; // Optional for flexibility, but will be provided
}

const ExpenseDisplayTable: React.FC<ExpenseDisplayTableProps> = ({ expenses, categories, title, onDeleteCategorizedExpense }) => {
  const getCategoryName = (expense: ProcessedExpense): string => {
    if (expense.isUnidentified || !expense.categoryId) return 'Неопознано';
    
    const mainCategory = categories.find(c => c.id === expense.categoryId);
    if (!mainCategory) return 'Неизвестная категория';

    if (expense.subCategoryId) {
      const subCategory = mainCategory.subCategories.find(sc => sc.id === expense.subCategoryId);
      if (subCategory) {
        return `${mainCategory.name} (${subCategory.name})`;
      }
      return `${mainCategory.name} (Подкатегория не найдена)`; 
    }
    return mainCategory.name;
  };

  if (expenses.length === 0) {
    return (
      <div className="p-4 bg-white shadow rounded-lg">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-gray-500">Нет расходов для отображения в этой категории.</p>
      </div>
    );
  }
  
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h3 className="text-xl font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Стоимость</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Комментарий</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
              {onDeleteCategorizedExpense && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.sort((a,b) => b.date.getTime() - a.date.getTime()).map(expense => (
              <tr key={expense.id} className={expense.isUnidentified ? 'bg-yellow-50' : ''}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{expense.date.toLocaleDateString('ru-RU')}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{expense.amount.toFixed(2)} {expense.currency}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs break-words">{expense.fullComment}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${expense.isUnidentified ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {getCategoryName(expense)}
                  </span>
                </td>
                {onDeleteCategorizedExpense && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    <button
                      onClick={() => onDeleteCategorizedExpense(expense.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                      aria-label={`Удалить расход ${expense.fullComment}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
           <tfoot>
            <tr className="bg-gray-100">
              <td className="px-4 py-3 text-left text-sm font-bold text-gray-700">Итого:</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-700">{totalAmount.toFixed(2)} {expenses.length > 0 ? expenses[0].currency : ''}</td>
              <td colSpan={onDeleteCategorizedExpense ? 3 : 2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ExpenseDisplayTable;
