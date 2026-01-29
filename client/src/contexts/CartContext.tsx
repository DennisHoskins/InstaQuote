import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  item_code: string;
  sku: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  image_url?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (item_code: string) => void;
  updateQuantity: (item_code: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'instaquote_cart';

function loadCartFromStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load cart from storage:', error);
    return [];
  }
}

function saveCartToStorage(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save cart to storage:', error);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());

  // Persist to localStorage whenever items change
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setItems(currentItems => {
      const existingIndex = currentItems.findIndex(i => i.item_code === item.item_code);
      
      if (existingIndex >= 0) {
        // Item exists, update quantity
        const updated = [...currentItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      } else {
        // New item
        return [...currentItems, { ...item, quantity }];
      }
    });
  };

  const removeItem = (item_code: string) => {
    setItems(currentItems => currentItems.filter(item => item.item_code !== item_code));
  };

  const updateQuantity = (item_code: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(item_code);
      return;
    }

    setItems(currentItems => {
      const updated = [...currentItems];
      const index = updated.findIndex(i => i.item_code === item_code);
      
      if (index >= 0) {
        updated[index] = { ...updated[index], quantity };
      }
      
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider 
      value={{ 
        items, 
        addItem, 
        removeItem, 
        updateQuantity, 
        clearCart, 
        total, 
        itemCount 
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}