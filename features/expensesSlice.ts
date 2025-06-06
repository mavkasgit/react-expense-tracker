import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Expense {
  id: string
  amount: number
  category: string
  description: string
  date: string
}

export interface ExpensesState {
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
      console.log('Adding expense:', action.payload)
      state.items.push(action.payload)
      console.log('New state after adding expense:', state)
    },
    removeExpense: (state, action: PayloadAction<string>) => {
      console.log('Removing expense with id:', action.payload)
      state.items = state.items.filter(item => item.id !== action.payload)
      console.log('New state after removing expense:', state)
    },
    addCategory: (state, action: PayloadAction<string>) => {
      console.log('Adding category:', action.payload)
      if (!state.categories.includes(action.payload)) {
        state.categories.push(action.payload)
        console.log('New state after adding category:', state)
      }
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      console.log('Removing category:', action.payload)
      state.categories = state.categories.filter(cat => cat !== action.payload)
      console.log('New state after removing category:', state)
    }
  }
})

export const { addExpense, removeExpense, addCategory, removeCategory } = expensesSlice.actions
export default expensesSlice.reducer 