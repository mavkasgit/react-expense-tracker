import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import expensesReducer, { ExpensesState } from './features/expensesSlice'

console.log('Initializing store...')

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['expenses']
}

const persistedReducer = persistReducer(persistConfig, expensesReducer)

export const store = configureStore({
  reducer: {
    expenses: persistedReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
})

// Создаем канал для синхронизации между вкладками
const syncChannel = new BroadcastChannel('expense-tracker-sync')
console.log('BroadcastChannel created')

// Слушаем изменения в других вкладках
syncChannel.onmessage = (event) => {
  console.log('Received message from other tab:', event.data)
  if (event.data.type === 'SYNC_STATE') {
    console.log('Syncing state from other tab:', event.data.payload)
    // Only update if the incoming state is newer
    const currentState = store.getState()
    if (event.data.timestamp > (currentState as any)._lastSync) {
      store.dispatch({
        type: 'persist/REHYDRATE',
        payload: event.data.payload
      })
    }
  }
}

// Отправляем изменения в другие вкладки
store.subscribe(() => {
  const state = store.getState()
  const timestamp = Date.now()
  console.log('State changed, broadcasting to other tabs:', state)
  syncChannel.postMessage({
    type: 'SYNC_STATE',
    payload: state,
    timestamp
  })
})

export const persistor = persistStore(store, null, () => {
  console.log('Redux Persist rehydration completed')
  // After initial rehydration, broadcast the current state
  const state = store.getState()
  syncChannel.postMessage({
    type: 'SYNC_STATE',
    payload: state,
    timestamp: Date.now()
  })
})

// Типы для хуков
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector 