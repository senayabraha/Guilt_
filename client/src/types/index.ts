export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role?: string;
  addresses: Address[];
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Lightweight store info attached to products (used by the cart for store-scoped totals)
export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  deliveryFee: number;
  taxRate: number;
  minOrderAmount: number;
  isActive: boolean;
  isApproved: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  phone?: string;
  email?: string;
  subCity?: string;
  address?: string;
  lat?: number;
  lng?: number;
  isApproved: boolean;
  isActive: boolean;
  deliveryFee: number;
  minOrderAmount: number;
  taxRate: number;
  openingHours?: string;
  products?: Product[];
}

export interface Address {
  _id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
  lat: number;
  lng: number;
}

export interface Category {
  slug: string;
  name: string;
  image: string;
}

export interface Product {
  _id: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  image: string;
  category: string;
  unit: string;
  stock: number;
  isOrganic: boolean;
  rating: number;
  reviewCount: number;
  discount: number;
  storeId?: string;
  store?: StoreSummary;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  product: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface DeliveryPartner {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  vehicleType: "bike" | "scooter" | "car";
  isActive: boolean;
  createdAt: string;
}

export interface Order {
  _id: string;
  user: string | { _id: string; name: string; email: string; phone?: string };
  items: OrderItem[];
  shippingAddress: Omit<Address, "_id" | "isDefault">;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: string;
  statusHistory: { status: string; timestamp: string; note: string }[];
  deliveryPartner: DeliveryPartner | null;
  deliveryOtp: string;
  isPaid: boolean;
  createdAt: string;
}
