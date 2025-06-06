import { Expense, Category } from '../types';

const API_URL = '/api/sync';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'test-key-123'; // Используем переменную окружения

export const syncService = {
  async fetchData() {
    try {
      const response = await fetch(API_URL, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  },

  async saveData(expenses: Expense[], categories: Category[], lastSync: number) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          expenses,
          categories,
          lastSync
        })
      });

      if (!response.ok) {
        if (response.status === 409) {
          // Конфликт данных - получаем актуальные данные
          const conflictData = await response.json();
          return conflictData;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  }
}; 