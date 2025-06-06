import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Expense {
  id: string
  amount: number
  category: string
  description: string
  date: string
}

interface ExpensesState {
  items: Expense[]
  categories: string[]
}

const initialState: ExpensesState = {
  items: [],
  categories: ['Продукты', 'Транспорт', 'Развлечения', 'Коммунальные услуги']
}

export const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    addExpense: (state, action: PayloadAction<Expense>) => {
      state.items.push(action.payload)
    },
    removeExpense: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload)
    },
    addCategory: (state, action: PayloadAction<string>) => {
      if (!state.categories.includes(action.payload)) {
        state.categories.push(action.payload)
      }
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(cat => cat !== action.payload)
    }
  }
})

export const { addExpense, removeExpense, addCategory, removeCategory } = expensesSlice.actions
export default expensesSlice.reducer 