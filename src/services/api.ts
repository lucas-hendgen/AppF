import { UserProfile, Order, UserAddress, MercadoPagoConfig, Product } from '../types';

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

  async resetPassword(email: string, newPassword: string): Promise<{ token: string; user: UserProfile; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword })
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
    totalOrders: number;
    totalMembers: number;
    pendingOrders: number;
    deliveryCount: number;
    pickupCount: number;
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

  // === PRODUCTS (CATÁLOGO FARMACÊUTICO) ===
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao carregar catálogo de produtos.');
    return result.products || [];
  },

  async getProductById(id: number): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Produto não encontrado.');
    return result.product;
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(productData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao adicionar produto.');
    return result.product;
  },

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar dados do produto.');
    return result.product;
  },

  async updateProductPrice(id: number, price: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}/price`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ preco: price })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar preço do produto.');
    return result.product;
  },

  async deleteProduct(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader()
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao excluir produto.');
    return true;
  }
};
