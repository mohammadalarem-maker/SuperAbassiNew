export interface Item {
  id: string;
  item_name: string;
  item_number: string;
  barcode: string;
  category: string;
  price: number;
  quantity: number;
  currency?: 'YER' | 'USD' | 'SAR';
}

export interface Activity {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  amount?: number;
  details?: string;
}

export interface CartItem {
  id: string;
  item_name: string;
  item_number?: string;
  category?: string;
  price: number;
  quantity: number;
  stock?: number;
  currency?: 'YER' | 'USD' | 'SAR';
}
