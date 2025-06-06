
import { Category, AppView, SubCategory } from './types';
import { v4 as uuidv4 } from 'uuid';

const createSubCategory = (name: string, keywordsString: string): SubCategory => ({
  id: uuidv4(),
  name,
  keywords: keywordsString 
    ? keywordsString.split(',').map(k => k.trim().toLowerCase()).filter(k => k) 
    : [],
});

// New comprehensive default categories
const NEW_DEFAULT_CATEGORIES: Category[] = [
  { 
    id: uuidv4(), 
    name: "Повседневные", 
    order: 0,
    subCategories: [
      createSubCategory("Продукты", "грин, копеечка, простор, маяк, евроопт, белмаркет"),
      createSubCategory("Транспорт", "метро, маршрутка, поезд, автобус, троллейбус, трамвай"),
      createSubCategory("Еда вне дома", "еда"),
      createSubCategory("Бары и рестораны", "бар, ресторан"),
      createSubCategory("Развлечения", "Развлечения, Развлечение"),
      createSubCategory("Регулярные", "регуляр"),
      createSubCategory("Здоровье", "здоровье"),
      createSubCategory("Одежда", "одежда"),
      createSubCategory("Алкоголь", "пиво"),
      createSubCategory("Подарки", "подарок, подарки"),
      createSubCategory("Прочее", ""),
    ] 
  },
  { 
    id: uuidv4(), 
    name: "Крупные", 
    order: 1,
    subCategories: [
      createSubCategory("Путешествия", "Путешествия"),
      createSubCategory("Одежда", "Одежда"),
      createSubCategory("Гаджеты", "Гаджеты"),
      createSubCategory("Праздники", "Праздики"), // Keywords updated as per user's list
      createSubCategory("Красота и здоровье", "Крастота и здоровье"), // Keywords updated as per user's list
      createSubCategory("Образование", "Образование"),
      createSubCategory("WB", "WB, вб"),
    ] 
  },
  { 
    id: uuidv4(), 
    name: "Квартира", 
    order: 2,
    subCategories: [
      createSubCategory("Коммунальные платежи", "ком плат"),
      createSubCategory("Электроэнергия", "свет"),
      createSubCategory("Ремонт", "ремонт"),
      createSubCategory("Интернет", "инет, интернет"),
      createSubCategory("Природный газ", "газ"),
      createSubCategory("Все для дома", "все для дома"),
    ] 
  },
];

export const DEFAULT_CATEGORIES: Category[] = NEW_DEFAULT_CATEGORIES;

const userRequestedMainCategoryNames = ["Повседневные", "Крупные", "Квартира"];

// Ensure USER_REQUESTED_DEFAULT_CATEGORIES preserves order and creates new IDs
export const USER_REQUESTED_DEFAULT_CATEGORIES: Category[] = DEFAULT_CATEGORIES
  .filter(cat => userRequestedMainCategoryNames.includes(cat.name))
  .map((cat, index) => ({ // Use map's index for default order if cat.order is not reliable or needs overriding
    ...cat, 
    id: uuidv4(), 
    order: cat.order !== undefined ? cat.order : index, // Ensure order is set
    subCategories: cat.subCategories.map(sc => ({
        ...sc, 
        id: uuidv4(), 
        keywords: [...sc.keywords] 
    }))
  })).sort((a, b) => a.order - b.order); // Sort by order just in case


export const CURRENCY_SYMBOL = "BYN";