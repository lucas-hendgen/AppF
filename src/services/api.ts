import { UserProfile, Order, UserAddress, MercadoPagoConfig } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('fsp_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao realizar cadastro.');
    if (result.token) {
      localStorage.setItem('fsp_auth_token', result.token);
    }
    return result;
  },

  async login(identifier: string, password: string): Promise<{ token: string; user: UserProfile; message: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao realizar login.');
    if (result.token) {
      localStorage.setItem('fsp_auth_token', result.token);
    }
    return result;
  },

  async forgotPassword(email: string): Promise<{ message: string; recoveryCode?: string; email: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao solicitar recuperação de senha.');
    return result;
  },

  async resetPassword(email: string, newPassword: string, code: string): Promise<{ token: string; user: UserProfile; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword, code })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao redefinir senha.');
    if (result.token) {
      localStorage.setItem('fsp_auth_token', result.token);
    }
    return result;
  },

  async googleAuth(data: { email: string; name?: string; googleId?: string }): Promise<{ token: string; user: UserProfile; message: string }> {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao autenticar com Google.');
    if (result.token) {
      localStorage.setItem('fsp_auth_token', result.token);
    }
    return result;
  },

  async getMe(): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Não autenticado.');
    return result.user;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar perfil.');
    return result.user;
  },

  async addAddress(address: Omit<UserAddress, 'id'>): Promise<{ addresses: UserAddress[]; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(address)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao adicionar endereço.');
    return result;
  },

  async deleteAddress(addressId: string): Promise<{ addresses: UserAddress[]; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/address/${addressId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao remover endereço.');
    return result;
  },

  logout(): void {
    localStorage.removeItem('fsp_auth_token');
  },

  // === ORDERS ===
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(orderData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao registrar pedido.');
    return result.order;
  },

  async getOrders(userId?: string): Promise<Order[]> {
    const url = userId ? `${API_BASE}/orders?userId=${userId}` : `${API_BASE}/orders`;
    const res = await fetch(url, {
      headers: {
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao buscar pedidos.');
    return result.orders || [];
  },

  async getOrderById(orderId: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      headers: {
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Pedido não encontrado.');
    return result.order;
  },

  async updateOrderStatus(orderId: string, status: Order['status'], paymentStatus?: Order['paymentStatus']): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ status, paymentStatus })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar status.');
    return result.order;
  },

  async unscheduleOrder(orderId: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/unschedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao aprovar agendamento.');
    return result.order;
  },

  async rejectScheduledOrder(orderId: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/reject-schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao recusar agendamento.');
    return result.order;
  },

  // === MERCADO PAGO PAYMENTS ===
  async getPaymentConfig(): Promise<MercadoPagoConfig> {
    const res = await fetch(`${API_BASE}/payments/config`);
    return res.json();
  },

  async createMercadoPagoPreference(payload: {
    orderId: string;
    items: any[];
    payer?: any;
    deliveryFee?: number;
    discount?: number;
  }): Promise<{ id: string; init_point: string; sandbox_init_point: string; isSandbox: boolean }> {
    const res = await fetch(`${API_BASE}/payments/create-preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao gerar checkout do Mercado Pago.');
    return result;
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
    const res = await fetch(`${API_BASE}/payments/create-pix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao gerar PIX do Mercado Pago.');
    return result;
  },

  async checkPaymentStatus(orderId: string): Promise<{
    orderId: string;
    paymentStatus: Order['paymentStatus'];
    status: Order['status'];
    paymentMethod: string;
    total: number;
  }> {
    const res = await fetch(`${API_BASE}/payments/status/${orderId}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao consultar pagamento.');
    return result;
  },

  async simulatePaymentApproval(orderId: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/payments/simulate-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ orderId })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao aprovar simulação.');
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
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: {
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao carregar estatísticas.');
    return result;
  },

  async getAdminUsers(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: {
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao listar usuários.');
    return result.users || [];
  },

  // === PRODUTOS ===
  async fetchProducts(): Promise<import('../types').Product[]> {
    const res = await fetch(`${API_BASE}/products`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao carregar produtos.');
    return result.products || [];
  },

  async getAdminProducts(): Promise<import('../types').Product[]> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      headers: { ...getAuthHeader() }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao carregar produtos.');
    return result.products || [];
  },

  async createProduct(data: Omit<import('../types').Product, 'id'>): Promise<import('../types').Product> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar produto.');
    return result.product;
  },

  async updateProduct(id: number, data: Partial<import('../types').Product>): Promise<import('../types').Product> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar produto.');
    return result.product;
  },

  async deleteProduct(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao remover produto.');
  },

  // === CUPONS ===
  async fetchCoupons(): Promise<import('../types').Coupon[]> {
    const res = await fetch(`${API_BASE}/coupons`, {
      headers: {
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao carregar cupons.');
    return result.coupons || [];
  },

  async validateCoupon(code: string): Promise<import('../types').Coupon> {
    const res = await fetch(`${API_BASE}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao validar cupom.');
    return result.coupon;
  },

  async createCoupon(data: import('../types').Coupon): Promise<import('../types').Coupon> {
    const res = await fetch(`${API_BASE}/admin/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar cupom.');
    return result.coupon;
  },

  async deleteCoupon(code: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/coupons/${code}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao remover cupom.');
  },

  // === BAIRROS / ENTREGAS ===
  async fetchNeighborhoods(): Promise<import('../types').Neighborhood[]> {
    const res = await fetch(`${API_BASE}/neighborhoods`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao carregar bairros.');
    return result.neighborhoods || [];
  },

  async updateNeighborhood(bairro: string, taxa: number): Promise<import('../types').Neighborhood> {
    const res = await fetch(`${API_BASE}/admin/neighborhoods/${bairro}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ taxa })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar taxa de entrega.');
    return result.neighborhood;
  },

  // === BANNERS ===
  async fetchBanners(): Promise<import('../types').Banner[]> {
    const res = await fetch(`${API_BASE}/banners`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao carregar banners.');
    return result.banners || [];
  },

  async createBanner(data: Partial<import('../types').Banner>): Promise<import('../types').Banner> {
    const res = await fetch(`${API_BASE}/admin/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar banner.');
    return result.banner;
  },

  async updateBanner(id: string, data: Partial<import('../types').Banner>): Promise<import('../types').Banner> {
    const res = await fetch(`${API_BASE}/admin/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar banner.');
    return result.banner;
  },

  async deleteBanner(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/banners/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao remover banner.');
  }
};
