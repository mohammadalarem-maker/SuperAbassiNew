import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useAuth } from './AuthContext';
import defaultAppIcon from '../assets/images/app_icon_1781726496895.jpg';

export interface POSItem {
  id: string;
  name: string;
  price: number;
  currency?: 'YER' | 'USD' | 'SAR';
  category: string;
  code?: string;
  stock: number;
  unit: string;
  minStock?: number;
  imageUrl?: string;
  purchasePrice?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points?: number;
  totalPurchases?: number;
  lastPurchaseDate?: string;
}

export interface CartItem {
  item: POSItem;
  qty: number;
  price: number;
}

interface DataContextType {
  items: POSItem[];
  customers: Customer[];
  categories: string[];
  categoriesDocs: { id: string; name: string }[];
  shopSettings: any;
  loading: boolean;
  
  // Shared Cart State across views to prevent data loss and increase response speed
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (item: POSItem, warnCallback?: (msg: string) => void, successCallback?: (msg: string) => void) => void;
  updateQty: (id: string, value: number | string, allowOverSell: boolean, errorCallback?: (msg: string) => void) => void;
  updatePrice: (id: string, newPrice: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<POSItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesDocs, setCategoriesDocs] = useState<{ id: string; name: string }[]>([]);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Default Fallbacks for Shop Settings
  const ensureSettingsDefaults = useCallback((data: any) => {
    if (!data) return data;
    const logo = defaultAppIcon;
    const name = "متجر سوبر ماركت العباسي";
    const phone = "784707050 - 778915055";
    const address = "صنعاء - مذبح - جوار فندق ضواحي صنعاء";
    const notes = "صيانة وبموجة هواتف\nبيع جوالات - صيانة برمجة - اكسسوارات - ادوات تجميل - نسخ الافلام والمسلسلات - طباعة\nشكراً لتعاملكم معنا! البضاعة المباعة لا ترد ولا تستبدل بعد 24 ساعة.";
    
    return {
      ...data,
      shopName: !data.shopName || data.shopName === "سوبر ماركت العباسي" ? name : data.shopName,
      shopPhone: !data.shopPhone || data.shopPhone === "77XXXXXXX" ? phone : data.shopPhone,
      shopAddress: !data.shopAddress || data.shopAddress === "صنعاء، اليمن" ? address : data.shopAddress,
      receiptNotes: !data.receiptNotes || (data.receiptNotes.includes("البضاعة المباعة لا ترد ولا تستبدل") && !data.receiptNotes.includes("صيانة وبموجة")) ? notes : data.receiptNotes,
      logoUrl: !data.logoUrl || data.logoUrl.includes("placeholder") ? logo : data.logoUrl,
      primaryColor: '#541919',
      secondaryColor: '#B3803E'
    };
  }, []);

  // Set up cached centralized subscriptions
  useEffect(() => {
    if (!user) {
      console.log("Central DataContext: No user signed in, skipping subscriptions.");
      setItems([]);
      setCustomers([]);
      setCategories([]);
      setCategoriesDocs([]);
      setShopSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("Central DataContext: Attaching real-time optimized listeners for user:", user.email);
    let loadedItems = false;
    let loadedCustomers = false;
    let loadedCategories = false;
    let loadedSettings = false;

    const checkAllLoaded = () => {
      if (loadedItems && loadedCustomers && loadedCategories && loadedSettings) {
        setLoading(false);
      }
    };

    // 1. Items subscription
    const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as POSItem[];
      setItems(itemsData);
      loadedItems = true;
      checkAllLoaded();
    }, (error) => {
      console.error("Central Items fetch error:", error);
      handleFirestoreError(error, OperationType.LIST, 'items');
    });

    // 2. Customers subscription
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customersData);
      loadedCustomers = true;
      checkAllLoaded();
    }, (error) => {
      console.error("Central Customers fetch error:", error);
      handleFirestoreError(error, OperationType.LIST, 'customers');
    });

    // 3. Categories subscription
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const catsDocsData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: (doc.data() as any).name || ''
      }));
      setCategoriesDocs(catsDocsData);

      const cats = catsDocsData
        .map(d => d.name)
        .map(name => typeof name === 'string' ? name.trim() : '')
        .filter(Boolean);
      const uniqueCats = Array.from(new Set(cats)).filter(c => c !== 'الكل');
      setCategories(['الكل', ...uniqueCats]);
      loadedCategories = true;
      checkAllLoaded();
    }, (error) => {
      console.error("Central Categories fetch error:", error);
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    // 4. Shop Settings subscription
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setShopSettings(ensureSettingsDefaults(snap.data()));
      }
      loadedSettings = true;
      checkAllLoaded();
    }, (error) => {
      console.error("Central Settings fetch error:", error);
      loadedSettings = true;
      checkAllLoaded();
    });

    // Fallback loading safety in case standard empty collections block it forever
    const backupTimeout = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      console.log("Central DataContext: Cleaning up central listeners...");
      unsubItems();
      unsubCustomers();
      unsubCategories();
      unsubSettings();
      clearTimeout(backupTimeout);
    };
  }, [user, ensureSettingsDefaults]);

  // Optimized Action handlers with callbacks for localized error formatting without freezing the engine
  const addToCart = useCallback((item: POSItem, warnCallback?: (msg: string) => void, successCallback?: (msg: string) => void) => {
    if (item.stock <= 0) {
      if (warnCallback) warnCallback("عذراً، هذا الصنف غير متوفر في المخزن!");
      return;
    }

    let hasCurrencyMismatch = false;
    let existingCurrency: string | undefined = undefined;

    setCart(prev => {
      // Enforce same-currency constraint across the cart
      if (prev.length > 0) {
        existingCurrency = prev[0].item.currency || 'YER';
        const incomingCurrency = item.currency || 'YER';
        if (existingCurrency !== incomingCurrency) {
          hasCurrencyMismatch = true;
          return prev;
        }
      }

      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { item, qty: 1, price: item.price }];
    });

    if (hasCurrencyMismatch) {
      if (warnCallback) {
        const currNames: Record<string, string> = { YER: 'ريال يمني YER', USD: 'دولار أمريكي USD', SAR: 'ريال سعودي SAR' };
        warnCallback(`عذراً، لا يمكن خلط أصناف بعملات مختلفة في فاتورة واحدة! السلة تحتوي على أصناف بـ (${currNames[existingCurrency || 'YER']}) بينما الصنف المضاف بـ (${currNames[item.currency || 'YER']}). يرجى إتمام العملية أو تفريغ السلة.`);
      }
      return;
    }

    // Success if we didn't mismatch
    if (successCallback) {
      successCallback(`${item.name} تمت إضافته للسلة`);
    }
  }, []);

  const updateQty = useCallback((id: string, value: number | string, allowOverSell: boolean, errorCallback?: (msg: string) => void) => {
    setCart(prev => {
      const cartItem = prev.find(i => i.item.id === id);
      if (!cartItem) return prev;

      let newQty: number;
      if (typeof value === 'string') {
        newQty = parseInt(value) || 0;
      } else {
        newQty = Math.max(0, cartItem.qty + value);
      }

      if (newQty === 0) {
        return prev.filter(i => i.item.id !== id);
      }

      if (newQty > cartItem.item.stock && !allowOverSell) {
        if (errorCallback) errorCallback(`العذر، الكمية المتاحة هي ${cartItem.item.stock} فقط`);
        return prev.map(i => i.item.id === id ? { ...i, qty: cartItem.item.stock } : i);
      }

      return prev.map(i => i.item.id === id ? { ...i, qty: newQty } : i);
    });
  }, []);

  const updatePrice = useCallback((id: string, newPrice: number) => {
    setCart(prev => prev.map(i => i.item.id === id ? { ...i, price: newPrice } : i));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const value = useMemo(() => ({
    items,
    customers,
    categories,
    categoriesDocs,
    shopSettings,
    loading,
    cart,
    setCart,
    addToCart,
    updateQty,
    updatePrice,
    removeFromCart,
    clearCart
  }), [
    items,
    customers,
    categories,
    categoriesDocs,
    shopSettings,
    loading,
    cart,
    addToCart,
    updateQty,
    updatePrice,
    removeFromCart,
    clearCart
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
