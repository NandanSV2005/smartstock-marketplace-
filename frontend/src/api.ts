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

export const updateInventoryItem = async (token: string, inventoryId: number, updates: Partial<{ current_stock: number; reorder_level: number }>): Promise<InventoryItem> => {
  const response = await fetch(`${API_BASE_URL}/inventory/${inventoryId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update inventory item');
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

export interface SaleItem {
  id: number;
  product: number;
  product_name: string;
  quantity_sold: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: number;
  retailer: number;
  retailer_name: string;
  sale_date: string;
  invoice_number: string;
  total_items: number;
  total_amount: number;
  items: SaleItem[];
}

export interface CreateSaleItemPayload {
  product: number;
  quantity_sold: number;
  unit_price: number;
}

export interface CreateSalePayload {
  items: CreateSaleItemPayload[];
}

export async function createSale(accessToken: string, payload: CreateSalePayload): Promise<Sale> {
  return request<Sale>('/sales/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function getSalesHistory(accessToken: string): Promise<Sale[]> {
  return request<Sale[]>('/sales/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Notifications
export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  metadata_json: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export async function getNotifications(accessToken: string): Promise<AppNotification[]> {
  return request<AppNotification[]>('/notifications/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function markNotificationRead(accessToken: string, id: number): Promise<AppNotification> {
  return request<AppNotification>(`/notifications/${id}/mark_read/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function markAllNotificationsRead(accessToken: string): Promise<{message: string}> {
  return request<{message: string}>('/notifications/mark_all_read/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Analytics
export interface RetailerKPIs {
  total_sales_revenue: number;
  orders_this_month: number;
  outstanding_credit: number;
  low_stock_count: number;
}

export interface SalesTrendData {
  date: string;
  total_quantity: number;
  total_revenue: number;
}

export interface InventoryLevelData {
  name: string;
  current_stock: number;
  reorder_level: number;
  max_stock: number;
}

export async function getRetailerKPIs(accessToken: string): Promise<RetailerKPIs> {
  return request<RetailerKPIs>('/analytics/retailer-kpis/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getRetailerSalesTrend(accessToken: string): Promise<SalesTrendData[]> {
  return request<SalesTrendData[]>('/analytics/sales-trend/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getRetailerInventoryLevels(accessToken: string): Promise<InventoryLevelData[]> {
  return request<InventoryLevelData[]>('/analytics/inventory-levels/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── Part 1: Smart Reordering Engine ─────────────────────────────────────────

export interface RealtimeInsightAction {
  type: 'add_to_cart';
  wholesaler_product_id: number;
  supplier_id: number;
  supplier_name: string;
  price: number;
  quantity: number;
}

export interface RealtimeInsight {
  product: string;
  product_id: number;
  current_stock: number;
  reorder_level: number;
  avg_daily_sales: number;
  days_to_stockout: number | null;
  suggested_reorder_quantity: number;
  alert_level: 'critical' | 'warning' | 'low_stock' | 'ok' | 'no_data';
  message: string;
  action: RealtimeInsightAction | null;
}

export async function getRealtimeInsights(accessToken: string): Promise<RealtimeInsight[]> {
  return request<RealtimeInsight[]>('/ai/insights/realtime/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── Part 2: Credit Intelligence ──────────────────────────────────────────────

export interface RetailerCreditProfile {
  retailer_id: number;
  retailer_name: string;
  business_type: string;
  credit_score: number;
  risk_level: 'low' | 'medium' | 'high';
  credit_limit_suggestion: number;
  total_credit_used: number;
  overdue_count: number;
}

export async function getCreditProfiles(accessToken: string): Promise<RetailerCreditProfile[]> {
  return request<RetailerCreditProfile[]>('/payments/credit-profiles/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function recalculateCreditScore(
  accessToken: string,
  retailerId: number
): Promise<RetailerCreditProfile> {
  return request<RetailerCreditProfile>(
    `/payments/credit-profiles/${retailerId}/recalculate/`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

// ─── Part 3: Wholesaler Financial Visibility ──────────────────────────────────

export interface ReceivablesSummary {
  total_pending_amount: number;
  total_credit_orders: number;
  overdue_count: number;
  overdue_amount: number;
}

export async function getReceivablesSummary(accessToken: string): Promise<ReceivablesSummary> {
  return request<ReceivablesSummary>('/payments/receivables-summary/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
