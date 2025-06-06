
import React, { useState } from 'react';
import { RawExpenseData } from '../types';
import { parseSingleExpenseInput, parseBankStatementInput, parseTabSeparatedWithCategoryInput } from '../services/parserService';
import { PlusIcon } from './icons';

interface ExpenseInputProps {
  onProcessExpenses: (expenses: RawExpenseData[]) => void;
}

const ExpenseInput: React.FC<ExpenseInputProps> = ({ onProcessExpenses }) => {
  const [singleInput, setSingleInput] = useState<string>('');
  const [bulkInput, setBulkInput] = useState<string>('');
  const [tabulatedInput, setTabulatedInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [tabulatedError, setTabulatedError] = useState<string | null>(null);

  const handleSubmitSingle = () => {
    setError(null);
    setTabulatedError(null);
    if (!singleInput.trim()) return;
    const parsed = parseSingleExpenseInput(singleInput);
    if (parsed) {
      onProcessExpenses([parsed]);
      setSingleInput('');
    } else {
      setError('Неверный формат для одиночной траты. Попробуйте: СУММА Комментарий или ДД.ММ.ГГГГ СУММА "Комментарий"');
    }
  };

  const handleSingleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmitSingle();
    }
  };

  const handleSubmitBulk = () => {
    setError(null);
    setTabulatedError(null);
    if (bulkInput.trim() === '') {
        setError('Поле для банковской выписки пусто.');
        return;
    }
    const parsedList = parseBankStatementInput(bulkInput);
    if (parsedList.length > 0) {
      onProcessExpenses(parsedList);
      setBulkInput('');
    } else {
      setError('Не удалось распознать данные из банковской выписки. Проверьте формат.');
    }
  };

  const handleSubmitTabulated = () => {
    setError(null);
    setTabulatedError(null);
    if (tabulatedInput.trim() === '') {
      setTabulatedError('Поле для импорта таблицы пусто.');
      return;
    }
    const parsedList = parseTabSeparatedWithCategoryInput(tabulatedInput);
    if (parsedList.length > 0) {
      onProcessExpenses(parsedList);
      setTabulatedInput('');
    } else {
      setTabulatedError('Не удалось распознать данные из таблицы. Проверьте формат.');
    }
  };


  return (
    <div className="space-y-6 p-4 bg-white shadow rounded-lg">
      <h3 className="text-xl font-semibold text-gray-700 border-b pb-2">Ввод Расходов</h3>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md text-sm">{error}</p>}
      
      <div>
        <label htmlFor="singleExpense" className="block text-sm font-medium text-gray-700 mb-1">
          Одиночная трата
        </label>
        <div className="flex space-x-2">
          <input
            id="singleExpense"
            type="text"
            value={singleInput}
            onChange={(e) => setSingleInput(e.target.value)}
            onKeyDown={handleSingleInputKeyDown}
            placeholder='Сумма Комментарий (например: 10.50 Обед)'
            className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-500 text-gray-900 bg-white"
          />
          <button
            onClick={handleSubmitSingle}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center"
            aria-label="Добавить одиночную трату"
          >
            <PlusIcon className="w-5 h-5 mr-1" /> Добавить
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="bulkExpense" className="block text-sm font-medium text-gray-700 mb-1">
          Массив из банковской выписки
        </label>
        <textarea
          id="bulkExpense"
          rows={4}
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder={'Скопируйте строки из вашей банковской выписки сюда...'}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-500 text-gray-900 bg-white"
        />
        <button
          onClick={handleSubmitBulk}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex items-center"
          aria-label="Обработать банковскую выписку"
        >
          <PlusIcon className="w-5 h-5 mr-1" /> Обработать выписку
        </button>
      </div>

      <div className="pt-4 border-t">
        <label htmlFor="tabulatedExpense" className="block text-sm font-medium text-gray-700 mb-1">
            Импорт таблицы с категориями
        </label>
        {tabulatedError && <p className="text-red-500 bg-red-100 p-3 rounded-md text-sm my-2">{tabulatedError}</p>}
        <textarea
          id="tabulatedExpense"
          rows={4}
          value={tabulatedInput}
          onChange={(e) => setTabulatedInput(e.target.value)}
          placeholder={'ДАТА<TAB>СУММА<TAB>КОММЕНТАРИЙ<TAB>КАТЕГОРИЯ...'}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-500 text-gray-900 bg-white"
        />
        <button
          onClick={handleSubmitTabulated}
          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 flex items-center"
          aria-label="Обработать таблицу с категориями"
        >
          <PlusIcon className="w-5 h-5 mr-1" /> Обработать таблицу
        </button>
      </div>

    </div>
  );
};

export default ExpenseInput;
