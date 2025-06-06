import { ProcessedExpense, Category } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'test-key';

interface SyncData {
  expenses: ProcessedExpense[];
  categories: Category[];
  lastSync: number;
}

export const syncService = {
  async getData(): Promise<SyncData> {
    try {
      const response = await fetch(`${API_URL}/sync`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  },

  async saveData(data: SyncData): Promise<{ success: boolean; lastSync: number }> {
    try {
      const response = await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        if (response.status === 409) {
          // Данные устарели, получаем актуальные данные
          const currentData = await response.json();
          return {
            success: false,
            lastSync: currentData.lastSync
          };
        }
        throw new Error('Failed to save data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  }
}; 