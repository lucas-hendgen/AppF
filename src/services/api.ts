import { UserProfile, Order, UserAddress, MercadoPagoConfig } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('fsp_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper seguro para chamadas à API que previne SyntaxError com respostas HTML/Proxy
async function safeRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const text = await res.text();
    let data: any = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Se a resposta for HTML (ex: 502/504 Bad Gateway, Cloud Run Error, 404 Nginx)
        if (!res.ok) {
          throw new Error(
            res.status >= 500
              ? 'O servidor está temporariamente indisponível. Por favor, tente novamente em instantes.'
              : `Erro de comunicação com o servidor (Código HTTP ${res.status}).`
          );
        }
      }
    }

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || (res.status >= 500
        ? 'Ocorreu uma instabilidade momentânea no servidor. Tente novamente.'
        : `Erro na requisição (Código ${res.status}).`);
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('A conexão demorou muito para responder. Verifique sua internet e tente novamente.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // === AUTHENTICATION ===
  async register(data: {
    name: string;
    email: string;
    cpf?: string;
    phone: string;
    password: string;
    address?: Partial<UserAddress>;
    healthNotes?: string;
  }): Promise<{ token: string; user: UserProfile; message: string }> {
    const result = await safeRequest<{ token: string; user: UserProfile; message: string }>(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (result.token) {
      localStorage.setItem('fsp_auth_token', result.token);
    }
    return result;
  },

  async login(identifier: string, password: string): Promise<{ token: string; user: UserProfile; message: string }> {
    const result = await safeRequest<{ token: string; user: UserProfile; message: string }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    if (result.token) {
      localStorage.setItem('fsp_auth_token', result.token);
    }
    return result;
  },

  async forgotPassword(email: string): Promise<{ message: string; email: string }> {
    return safeRequest<{ message: string; email: string }>(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(email: string, newPassword: string, code: string): Promise<{ token: string; user: UserProfile; message: string }> {
    const result = await safeRequest<{ token: string; user: UserProfile; message: string }>(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword, code })
    });
    if (result.token) {
      localStorage.setItem('fsp_auth_token', result.token);
    }
    return result;
  },

  async getMe(): Promise<UserProfile> {
    const result = await safeRequest<{ user: UserProfile }>(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    return result.user;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const result = await safeRequest<{ user: UserProfile; message: string }>(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    return result.user;
  },

  async addAddress(address: Omit<UserAddress, 'id'>): Promise<{ addresses: UserAddress[]; user: UserProfile }> {
    return safeRequest<{ addresses: UserAddress[]; user: UserProfile }>(`${API_BASE}/auth/address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(address)
    });
  },

  async deleteAddress(addressId: string): Promise<{ addresses: UserAddress[]; user: UserProfile }> {
    return safeRequest<{ addresses: UserAddress[]; user: UserProfile }>(`${API_BASE}/auth/address/${addressId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  },

  logout(): void {
    localStorage.removeItem('fsp_auth_token');
  },

  // === ORDERS ===
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const result = await safeRequest<{ order: Order; message: string }>(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(orderData)
    });
    return result.order;
  },

  async getOrders(userId?: string): Promise<Order[]> {
    const url = userId ? `${API_BASE}/orders?userId=${userId}` : `${API_BASE}/orders`;
    const result = await safeRequest<{ orders: Order[] }>(url, {
      headers: { ...getAuthHeader() }
    });
    return result.orders || [];
  },

  async getOrderById(orderId: string): Promise<Order> {
    const result = await safeRequest<{ order: Order }>(`${API_BASE}/orders/${orderId}`, {
      headers: { ...getAuthHeader() }
    });
    return result.order;
  },

  async updateOrderStatus(orderId: string, status: Order['status'], paymentStatus?: Order['paymentStatus']): Promise<Order> {
    const result = await safeRequest<{ order: Order }>(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ status, paymentStatus })
    });
    return result.order;
  },

  async unscheduleOrder(orderId: string): Promise<Order> {
    const result = await safeRequest<{ order: Order }>(`${API_BASE}/orders/${orderId}/unschedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    return result.order;
  },

  async rejectScheduledOrder(orderId: string): Promise<Order> {
    const result = await safeRequest<{ order: Order }>(`${API_BASE}/orders/${orderId}/reject-schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    return result.order;
  },

  // === MERCADO PAGO PAYMENTS ===
  async getPaymentConfig(): Promise<MercadoPagoConfig> {
    return safeRequest<MercadoPagoConfig>(`${API_BASE}/payments/config`);
  },

  async createMercadoPagoPreference(payload: {
    orderId: string;
    items: any[];
    payer?: any;
    deliveryFee?: number;
    discount?: number;
  }): Promise<{ id: string; init_point: string; sandbox_init_point: string; isSandbox: boolean }> {
    return safeRequest<{ id: string; init_point: string; sandbox_init_point: string; isSandbox: boolean }>(`${API_BASE}/payments/create-preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });
  },

  async createMercadoPagoPix(payload: {
    orderId: string;
    amount: number;
    payerEmail?: string;
    payerName?: string;
    payerCpf?: string;
  }): Promise<{
    paymentId: string;
    status: string;
    qrCode: string;
    qrCodeBase64?: string;
    expiresAt?: string;
    isSandbox: boolean;
  }> {
    return safeRequest<{
      paymentId: string;
      status: string;
      qrCode: string;
      qrCodeBase64?: string;
      expiresAt?: string;
      isSandbox: boolean;
    }>(`${API_BASE}/payments/create-pix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });
  },

  async checkPaymentStatus(orderId: string): Promise<{
    orderId: string;
    paymentStatus: Order['paymentStatus'];
    status: Order['status'];
    paymentMethod: string;
    total: number;
  }> {
    return safeRequest<{
      orderId: string;
      paymentStatus: Order['paymentStatus'];
      status: Order['status'];
      paymentMethod: string;
      total: number;
    }>(`${API_BASE}/payments/status/${orderId}`, {
      headers: { ...getAuthHeader() }
    });
  },

  async simulatePaymentApproval(orderId: string): Promise<Order> {
    const result = await safeRequest<{ order: Order }>(`${API_BASE}/payments/simulate-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ orderId })
    });
    return result.order;
  },

  // === ADMIN ===
  async getAdminStats(): Promise<{
    totalRevenue: number;
    pixRevenue: number;
    creditCardRevenue: number;
    debitCardRevenue: number;
    cashRevenue: number;
    cancelledCount: number;
    cancelledRevenue: number;
    totalOrders: number;
    totalMembers: number;
    pendingOrders: number;
    deliveryCount: number;
    pickupCount: number;
    salesTrend: { date: string; value: number }[];
  }> {
    return safeRequest(`${API_BASE}/admin/stats`, {
      headers: { ...getAuthHeader() }
    });
  },

  async getAdminUsers(): Promise<UserProfile[]> {
    const result = await safeRequest<{ users: UserProfile[] }>(`${API_BASE}/admin/users`, {
      headers: { ...getAuthHeader() }
    });
    return result.users || [];
  },

  // === PRODUTOS ===
  async fetchProducts(): Promise<import('../types').Product[]> {
    const result = await safeRequest<{ products: import('../types').Product[] }>(`${API_BASE}/products`);
    return result.products || [];
  },

  async getAdminProducts(): Promise<import('../types').Product[]> {
    const result = await safeRequest<{ products: import('../types').Product[] }>(`${API_BASE}/admin/products`, {
      headers: { ...getAuthHeader() }
    });
    return result.products || [];
  },

  async createProduct(data: Omit<import('../types').Product, 'id'>): Promise<import('../types').Product> {
    const result = await safeRequest<{ product: import('../types').Product }>(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return result.product;
  },

  async updateProduct(id: number, data: Partial<import('../types').Product>): Promise<import('../types').Product> {
    const result = await safeRequest<{ product: import('../types').Product }>(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return result.product;
  },

  async deleteProduct(id: number): Promise<void> {
    await safeRequest(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  },

  // === CUPONS ===
  async fetchCoupons(): Promise<import('../types').Coupon[]> {
    const result = await safeRequest<{ coupons: import('../types').Coupon[] }>(`${API_BASE}/coupons`, {
      headers: { ...getAuthHeader() }
    });
    return result.coupons || [];
  },

  async validateCoupon(code: string): Promise<import('../types').Coupon> {
    const result = await safeRequest<{ coupon: import('../types').Coupon }>(`${API_BASE}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return result.coupon;
  },

  async createCoupon(data: import('../types').Coupon): Promise<import('../types').Coupon> {
    const result = await safeRequest<{ coupon: import('../types').Coupon }>(`${API_BASE}/admin/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return result.coupon;
  },

  async deleteCoupon(code: string): Promise<void> {
    await safeRequest(`${API_BASE}/admin/coupons/${code}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  },

  // === BAIRROS / ENTREGAS ===
  async fetchNeighborhoods(): Promise<import('../types').Neighborhood[]> {
    const result = await safeRequest<{ neighborhoods: import('../types').Neighborhood[] }>(`${API_BASE}/neighborhoods`);
    return result.neighborhoods || [];
  },

  async updateNeighborhood(bairro: string, taxa: number): Promise<import('../types').Neighborhood> {
    const result = await safeRequest<{ neighborhood: import('../types').Neighborhood }>(`${API_BASE}/admin/neighborhoods/${bairro}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ taxa })
    });
    return result.neighborhood;
  },

  // === BANNERS ===
  async fetchBanners(): Promise<import('../types').Banner[]> {
    const result = await safeRequest<{ banners: import('../types').Banner[] }>(`${API_BASE}/banners`);
    return result.banners || [];
  },

  async createBanner(data: Partial<import('../types').Banner>): Promise<import('../types').Banner> {
    const result = await safeRequest<{ banner: import('../types').Banner }>(`${API_BASE}/admin/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return result.banner;
  },

  async updateBanner(id: string, data: Partial<import('../types').Banner>): Promise<import('../types').Banner> {
    const result = await safeRequest<{ banner: import('../types').Banner }>(`${API_BASE}/admin/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return result.banner;
  },

  async deleteBanner(id: string): Promise<void> {
    await safeRequest(`${API_BASE}/admin/banners/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  },

  // === CATEGORIAS ===
  async fetchCategories(includeAll = false): Promise<import('../types').Category[]> {
    const query = includeAll ? '?all=true' : '';
    const result = await safeRequest<{ categories: import('../types').Category[] }>(`${API_BASE}/categories${query}`);
    return result.categories || [];
  },

  async createCategory(data: Partial<import('../types').Category>): Promise<import('../types').Category> {
    const result = await safeRequest<{ category: import('../types').Category }>(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return result.category;
  },

  async updateCategory(id: string, data: Partial<import('../types').Category>): Promise<import('../types').Category> {
    const result = await safeRequest<{ category: import('../types').Category }>(`${API_BASE}/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return result.category;
  },

  async deleteCategory(id: string, fallback?: string): Promise<void> {
    const query = fallback ? `?fallback=${encodeURIComponent(fallback)}` : '';
    await safeRequest(`${API_BASE}/admin/categories/${id}${query}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
  }
};
