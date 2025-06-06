import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './auth';

// Временное хранилище данных (в реальном приложении будет база данных)
let dataStore = {
  expenses: [],
  categories: [],
  lastSync: Date.now()
};

export default withAuth(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Получение данных
    return res.status(200).json({
      expenses: dataStore.expenses,
      categories: dataStore.categories,
      lastSync: dataStore.lastSync
    });
  }

  if (req.method === 'POST') {
    // Обновление данных
    const { expenses, categories, lastSync } = req.body;
    
    // Проверяем, что данные не устарели
    if (lastSync < dataStore.lastSync) {
      return res.status(409).json({
        error: 'Data is outdated',
        currentData: {
          expenses: dataStore.expenses,
          categories: dataStore.categories,
          lastSync: dataStore.lastSync
        }
      });
    }

    // Обновляем данные
    dataStore = {
      expenses,
      categories,
      lastSync: Date.now()
    };

    return res.status(200).json({
      success: true,
      lastSync: dataStore.lastSync
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}); 