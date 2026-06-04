// Maps Supabase (snake_case) rows to the camelCase shapes the frontend uses,
// and back again for inserts/updates.
import type {
  Address,
  DeliveryPartner,
  Order,
  Product,
  Store,
  User,
} from "../../types";

const num = (v: any, fallback = 0): number =>
  v === null || v === undefined ? fallback : Number(v);

export function mapProfile(row: any): User {
  return {
    _id: row.id,
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    avatar: row.avatar ?? "",
    role: row.role,
    isAdmin: row.role === "ADMIN",
    addresses: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAddress(row: any): Address {
  return {
    _id: row.id,
    id: row.id,
    label: row.label,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip ?? "",
    isDefault: row.is_default ?? false,
    lat: num(row.lat),
    lng: num(row.lng),
  };
}

export function toAddressRow(form: any, userId?: string) {
  const row: any = {
    label: form.label,
    address: form.address,
    city: form.city,
    state: form.state,
    zip: form.zip ?? "",
    is_default: form.isDefault ?? false,
    lat: form.lat === undefined || form.lat === "" ? null : Number(form.lat),
    lng: form.lng === undefined || form.lng === "" ? null : Number(form.lng),
  };
  if (userId) row.user_id = userId;
  return row;
}

export function mapStore(row: any): Store {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    logo: row.logo ?? "",
    coverImage: row.cover_image ?? "",
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip ?? "",
    lat: row.lat === null || row.lat === undefined ? undefined : num(row.lat),
    lng: row.lng === null || row.lng === undefined ? undefined : num(row.lng),
    categories: row.categories ?? [],
    status: row.status,
    isOpen: row.is_open ?? true,
    deliveryRadius: num(row.delivery_radius),
    deliveryFee: num(row.delivery_fee),
    minOrder: num(row.min_order),
    commissionRate: num(row.commission_rate),
    owner: row.owner
      ? {
          id: row.owner.id,
          name: row.owner.name,
          email: row.owner.email,
          phone: row.owner.phone,
          role: row.owner.role,
        }
      : undefined,
    _count: {
      products: countOf(row.products),
      orders: countOf(row.orders),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Store;
}

// Supabase returns embedded `relation(count)` as [{ count: n }].
function countOf(rel: any): number {
  if (Array.isArray(rel) && rel.length && typeof rel[0]?.count === "number") {
    return rel[0].count;
  }
  if (Array.isArray(rel)) return rel.length;
  return 0;
}

export function toStoreRow(form: any, ownerId?: string) {
  const row: any = {};
  const map: Record<string, string> = {
    name: "name",
    description: "description",
    phone: "phone",
    email: "email",
    logo: "logo",
    coverImage: "cover_image",
    address: "address",
    city: "city",
    state: "state",
    zip: "zip",
    categories: "categories",
    isOpen: "is_open",
    status: "status",
  };
  for (const [camel, snake] of Object.entries(map)) {
    if (form[camel] !== undefined) row[snake] = form[camel];
  }
  if (form.lat !== undefined)
    row.lat = form.lat === "" || form.lat === null ? null : Number(form.lat);
  if (form.lng !== undefined)
    row.lng = form.lng === "" || form.lng === null ? null : Number(form.lng);
  if (form.deliveryRadius !== undefined)
    row.delivery_radius = Number(form.deliveryRadius);
  if (form.deliveryFee !== undefined) row.delivery_fee = Number(form.deliveryFee);
  if (form.minOrder !== undefined) row.min_order = Number(form.minOrder);
  if (form.commissionRate !== undefined)
    row.commission_rate = Number(form.commissionRate);
  if (ownerId) row.owner_id = ownerId;
  return row;
}

export function mapProduct(row: any): Product {
  const price = num(row.price);
  const originalPrice = num(row.original_price);
  const discount =
    originalPrice && price && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;
  // Backward compatible: products may store a single `image` and/or an
  // `images` array. images[0] is the primary; fall back to the legacy column.
  const images: string[] =
    Array.isArray(row.images) && row.images.length
      ? row.images.filter(Boolean)
      : row.image
        ? [row.image]
        : [];
  return {
    _id: row.id,
    id: row.id,
    storeId: row.store_id ?? null,
    store: row.store ? mapStore(row.store) : null,
    name: row.name,
    description: row.description ?? "",
    specifications: row.specifications ?? "",
    price,
    originalPrice,
    image: row.image || images[0] || "",
    images,
    category: row.category,
    unit: row.unit ?? "piece",
    stock: row.stock ?? 0,
    isOrganic: row.is_organic ?? false,
    isActive: row.is_active ?? true,
    rating: num(row.rating),
    reviewCount: row.review_count ?? 0,
    discount,
    createdAt: row.created_at,
  };
}

export function toProductRow(form: any, storeId?: string | null) {
  const row: any = {};
  const map: Record<string, string> = {
    name: "name",
    description: "description",
    specifications: "specifications",
    image: "image",
    category: "category",
    unit: "unit",
  };
  for (const [camel, snake] of Object.entries(map)) {
    if (form[camel] !== undefined) row[snake] = form[camel];
  }
  // Multi-image support: `images` is an array of URLs whose first entry is the
  // primary. Keep the legacy `image` column in sync with the primary image.
  if (Array.isArray(form.images)) {
    const images = form.images.filter(Boolean);
    row.images = images;
    if (images.length) row.image = images[0];
  }
  if (form.price !== undefined) row.price = Number(form.price);
  if (form.originalPrice !== undefined)
    row.original_price = Number(form.originalPrice);
  if (form.stock !== undefined) row.stock = Number(form.stock);
  if (form.isOrganic !== undefined) row.is_organic = Boolean(form.isOrganic);
  if (form.isActive !== undefined) row.is_active = Boolean(form.isActive);
  if (storeId !== undefined) row.store_id = storeId;
  return row;
}

export function mapDeliveryPartner(row: any): DeliveryPartner {
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar ?? "",
    vehicleType: row.vehicle_type ?? "bike",
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  } as DeliveryPartner;
}

export function mapOrder(row: any): Order {
  return {
    _id: row.id,
    id: row.id,
    user: row.user
      ? {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          phone: row.user.phone,
        }
      : row.user_id,
    storeId: row.store_id ?? null,
    store: row.store ? mapStore(row.store) : null,
    items: row.items ?? [],
    shippingAddress: row.shipping_address ?? {},
    paymentMethod: row.payment_method,
    subtotal: num(row.subtotal),
    deliveryFee: num(row.delivery_fee),
    tax: num(row.tax),
    total: num(row.total),
    status: row.status,
    statusHistory: row.status_history ?? [],
    deliveryPartner: row.delivery_partner
      ? mapDeliveryPartner(row.delivery_partner)
      : null,
    deliveryOtp: row.delivery_otp ?? "",
    isPaid: row.is_paid ?? false,
    createdAt: row.created_at,
  } as Order;
}
