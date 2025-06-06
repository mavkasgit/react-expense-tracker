import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import expensesReducer from './features/expensesSlice'

console.log('Initializing store...')

// Проверяем поддержку BroadcastChannel
if (typeof BroadcastChannel === 'undefined') {
  console.error('%c[SYNC] BroadcastChannel не поддерживается в этом браузере', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;')
} else {
  console.log('%c[SYNC] BroadcastChannel поддерживается', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;')
}

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
  console.log('%c[SYNC] Received message from other tab:', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', event.data)
  if (event.data.type === 'SYNC_STATE') {
    console.log('%c[SYNC] Syncing state from other tab:', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', event.data.payload)
    // Only update if the incoming state is newer
    const currentState = store.getState()
    if (event.data.timestamp > (currentState as any)._lastSync) {
      console.log('%c[SYNC] Applying changes from other tab', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;')
      store.dispatch({
        type: 'persist/REHYDRATE',
        payload: event.data.payload
      })
    } else {
      console.log('%c[SYNC] Ignoring older state from other tab', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;')
    }
  }
}

// Отправляем изменения в другие вкладки
store.subscribe(() => {
  const state = store.getState()
  const timestamp = Date.now()
  console.log('%c[SYNC] Broadcasting state to other tabs:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', state)
  syncChannel.postMessage({
    type: 'SYNC_STATE',
    payload: state,
    timestamp
  })
})

export const persistor = persistStore(store)

// Типы для хуков
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch 