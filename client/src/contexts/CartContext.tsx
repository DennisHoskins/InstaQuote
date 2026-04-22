import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import { apiClient, getNonce } from '../api/apiClient';

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
  refreshPrices: () => Promise<void>;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const nonce = getNonce();
    if (!nonce) {
      setLoaded(true);
      return;
    }

    apiClient.get('/cart')
      .then((data: any[]) => {
        setItems(data.map((row: any) => ({
          item_code: row.item_code,
          sku: row.sku ?? '',
          description: row.description ?? '',
          category: row.category ?? '',
          quantity: row.quantity,
          unit_price: parseFloat(row.unit_price),
          image_url: row.image_url ?? undefined,
        })));
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        localStorage.removeItem('instaquote_cart');
        setLoaded(true);
      });
  }, []);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setItems(currentItems => {
      const existingIndex = currentItems.findIndex(i => i.item_code === item.item_code);
      let newQuantity = quantity;

      if (existingIndex >= 0) {
        newQuantity = currentItems[existingIndex].quantity + quantity;
      }

      apiClient.post('/cart', {
        item_code: item.item_code,
        quantity: newQuantity,
        unit_price: item.unit_price,
      }).catch(err => console.error('Failed to sync cart item:', err));

      if (existingIndex >= 0) {
        const updated = [...currentItems];
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQuantity };
        return updated;
      } else {
        return [...currentItems, { ...item, quantity }];
      }
    });
  };

  const removeItem = (item_code: string) => {
    setItems(currentItems => currentItems.filter(item => item.item_code !== item_code));
    apiClient.delete(`/cart/${item_code}`)
      .catch(err => console.error('Failed to remove cart item:', err));
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

    const currentItem = items.find(i => i.item_code === item_code);
    if (currentItem) {
      apiClient.post('/cart', {
        item_code,
        quantity,
        unit_price: currentItem.unit_price,
      }).catch(err => console.error('Failed to update cart quantity:', err));
    }
  };

  const refreshPrices = async () => {
    const updated = await Promise.all(
      items.map(async (item) => {
        try {
          const fresh = await api.getItem(item.item_code);
          const newPrice = fresh.total_ws_price;

          apiClient.post('/cart', {
            item_code: item.item_code,
            quantity: item.quantity,
            unit_price: newPrice,
          }).catch(err => console.error('Failed to sync refreshed price:', err));

          return { ...item, unit_price: newPrice };
        } catch {
          return item;
        }
      })
    );
    setItems(updated);
  };

  const clearCart = () => {
    setItems([]);
    apiClient.delete('/cart')
      .catch(err => console.error('Failed to clear cart:', err));
  };

  const total = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!loaded) {
    return null;
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        refreshPrices,
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