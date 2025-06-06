import { NextApiRequest, NextApiResponse } from 'next';

// Простой механизм аутентификации через API ключ
export const validateApiKey = (req: NextApiRequest) => {
  const apiKey = req.headers['x-api-key'];
  // В реальном приложении здесь будет проверка ключа
  return apiKey === process.env.API_KEY;
};

export const withAuth = (handler: Function) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return handler(req, res);
  };
}; 