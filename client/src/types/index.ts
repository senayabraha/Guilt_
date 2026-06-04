export type UserRole = "CUSTOMER" | "VENDOR" | "ADMIN";
export type StoreStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export interface Store {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  logo?: string;
  coverImage?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  lat?: number;
  lng?: number;
  categories: string[];
  status: StoreStatus;
  isOpen: boolean;
  deliveryRadius?: number;
  deliveryFee?: number;
  minOrder?: number;
  commissionRate?: number;
  owner?: { id: string; name: string; email: string; phone?: string; role?: UserRole };
  _count?: { products?: number; orders?: number };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role?: UserRole;
  stores?: Store[];
  addresses: Address[];
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  _id: string;
  id?: string;
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
  storeId?: string | null;
  store?: Store | null;
  name: string;
  description: string;
  specifications?: string;
  price: number;
  originalPrice: number;
  image: string;
  images?: string[];
  category: string;
  unit: string;
  stock: number;
  isOrganic: boolean;
  isActive?: boolean;
  rating: number;
  reviewCount: number;
  discount: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  product: string;
  storeId?: string | null;
  name: string;
  image: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface DeliveryPartner {
  _id: string;
  id?: string;
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
  id?: string;
  user: string | { _id?: string; id?: string; name: string; email: string; phone?: string };
  storeId?: string | null;
  store?: Store | null;
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
