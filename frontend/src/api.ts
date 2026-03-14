const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const BACKEND_URL = 'http://127.0.0.1:8000';

export type Role = 'retailer' | 'wholesaler' | 'admin';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
  };
  
  if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && path !== '/accounts/token/' && path !== '/accounts/token/refresh/') {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (refreshTokenValue) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/accounts/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshTokenValue }),
        });
        if (refreshRes.ok) {
          const { access } = await refreshRes.json();
          localStorage.setItem('accessToken', access);
          window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { access } }));
          // Retry original request
          return request<T>(path, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${access}`,
            },
          });
        }
      } catch (e) {
        console.error("Token refresh failed", e);
      }
    }
    // If refresh fails or no refresh token, logout or throw error
  }

  if (!res.ok) {
    const text = await res.text();
    let errorData;
    try {
        errorData = JSON.parse(text);
    } catch {
        errorData = text;
    }
    throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData || `Request failed with status ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/accounts/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export interface SignupPayload {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: 'retailer' | 'wholesaler';
  business_name: string;
  business_type: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const { role, ...restPayload } = payload;
  return request<AuthResponse>(`/accounts/register/${role}/`, {
     method: 'POST',
     body: JSON.stringify(restPayload) // The backend probably doesn't need 'role' in the body since it's in the URL
  });
}

export async function fetchMe(accessToken: string): Promise<AuthUser & Record<string, unknown>> {
  return request<AuthUser & Record<string, unknown>>('/accounts/me/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// Catalog Categories
export interface Category {
  id: number;
  name: string;
  slug: string;
}

export async function getCategories(accessToken: string): Promise<Category[]> {
  return request<Category[]>('/catalog/categories/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// Retailer inventory
export interface Product {
  id: number;
  name: string;
  brand: string;
  unit: string;
  image?: string;
  category?: {
    id: number;
    name: string;
  };
}

export interface InventoryItem {
  id: number;
  product: Product;
  current_stock: number;
  reorder_level: number;
  reorder_quantity_suggestion: number | null;
  avg_daily_sales: number;
}

export async function getRetailerInventory(accessToken: string): Promise<InventoryItem[]> {
  return request<InventoryItem[]>('/inventory/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// AI insights
export interface AIInsight {
  id: number;
  product: {
    id: number;
    name: string;
    brand: string;
  } | null;
  type: string;
  title: string;
  description: string;
  recommendation_json: Record<string, unknown> | null;
  status: string;
  generated_at: string;
}

export async function getRetailerInsights(accessToken: string): Promise<AIInsight[]> {
  return request<AIInsight[]>('/ai/insights/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function generateMockInsights(accessToken: string): Promise<{ message: string }> {
  return request<{ message: string }>('/ai/insights/generate_mock_insights/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// Retailer orders
export interface OrderSummary {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  payment_status: string;
  payment_method: string | null;
  amount_paid: number;
  amount_due: number;
  due_date: string | null;
  delivery_address: string;
  expected_delivery_date: string | null;
  delivered_at: string | null;
}

export async function getRetailerOrders(accessToken: string): Promise<OrderSummary[]> {
  return request<OrderSummary[]>('/orders/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// Wholesaler orders
export async function getWholesalerOrders(accessToken: string): Promise<OrderSummary[]> {
  return request<OrderSummary[]>('/orders/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function updateOrderStatus(accessToken: string, orderId: number, status: string): Promise<OrderSummary> {
  return request<OrderSummary>(`/orders/${orderId}/update_status/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ status })
  });
}

// Wholesaler Products / Inventory
export async function getWholesalerOwnProducts(accessToken: string): Promise<WholesalerProduct[]> {
  return request<WholesalerProduct[]>('/catalog/wholesaler-products/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function addWholesalerProduct(accessToken: string, formData: FormData): Promise<WholesalerProduct> {
  return request<WholesalerProduct>('/catalog/wholesaler-products/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
}

// Marketplace Products
export interface WholesalerProduct {
  id: number;
  product: {
    id: number;
    name: string;
    brand: string;
    unit: string;
    image: string | null;
  };
  wholesale_price: number;
  mrp: number;
  available_stock: number;
  min_order_qty: number;
}

export async function getMarketplaceProducts(accessToken: string): Promise<WholesalerProduct[]> {
  return request<WholesalerProduct[]>('/catalog/wholesaler-products/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function addToCart(accessToken: string, wholesalerProductId: number, quantity: number): Promise<Cart> {
  return request<Cart>('/orders/cart/add_item/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ wholesaler_product_id: wholesalerProductId, quantity }),
  });
}

export interface CartItem {
  id: number;
  wholesaler_product: WholesalerProduct;
  quantity: number;
  unit_price_snapshot: number;
}

export interface Cart {
  id: number;
  status: string;
  items: CartItem[];
  total_amount?: number; // Calculated on frontend or backend
}

export async function getActiveCart(accessToken: string): Promise<Cart> {
  return request<Cart>('/orders/cart/active/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function updateWholesalerProduct(
  accessToken: string, 
  id: number, 
  updates: Partial<{ wholesale_price: number; available_stock: number; status: string; mrp: number }>
): Promise<WholesalerProduct> {
  return request<WholesalerProduct>(`/catalog/wholesaler-products/${id}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });
}

export async function updateCartItemQuantity(accessToken: string, cartItemId: number, quantity: number): Promise<Cart> {
  return request<Cart>('/orders/cart/update_item_quantity/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ cart_item_id: cartItemId, quantity }),
  });
}

export async function checkoutCart(accessToken: string, deliveryAddress: string): Promise<{ message: string; order_ids: number[] }> {
  return request<{ message: string; order_ids: number[] }>('/orders/cart/checkout/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ delivery_address: deliveryAddress }),
  });
}

// Admin
export interface AdminMetrics {
  role: string;
  metrics: {
    total_spent_30d?: number;
    revenue_30d?: number;
    orders_30d: number;
    pending_orders: number;
  }
}

export async function getDashboardMetrics(accessToken: string): Promise<AdminMetrics> {
  return request<AdminMetrics>('/analytics/dashboard/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
export function getFullImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}${path}`;
}

export const getProducts = async (token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/catalog/products/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
};

export const addInventoryItem = async (token: string, productId: number, currentStock: number, reorderLevel: number): Promise<InventoryItem> => {
  const response = await fetch(`${API_BASE_URL}/inventory/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      product_id: productId,
      current_stock: currentStock,
      reorder_level: reorderLevel
    })
  });
  if (!response.ok) throw new Error('Failed to add inventory item');
  return response.json();
};

export interface Payment {
  id: number;
  order: number;
  payment_method: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  payment_date: string;
  due_date: string | null;
  discount_applied: number;
  transaction_id: string | null;
}

export async function initiatePayment(
  accessToken: string,
  payload: { payment_method: string; upfront_amount?: number; delivery_address: string }
): Promise<{ message: string; orders: number[]; payments: Payment[] }> {
  return request<{ message: string; orders: number[]; payments: Payment[] }>('/payments/initiate/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function getPaymentHistory(accessToken: string, orderId: number): Promise<Payment[]> {
  return request<Payment[]>(`/payments/order/${orderId}/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function payOutstanding(accessToken: string, paymentId: number): Promise<{ message: string; discount_applied: number; amount_paid: number; payment: Payment }> {
  return request<{ message: string; discount_applied: number; amount_paid: number; payment: Payment }>(`/payments/${paymentId}/pay/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
