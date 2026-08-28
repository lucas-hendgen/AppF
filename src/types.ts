export interface UserAddress {
  id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  role: 'member' | 'admin';
  membershipTier: 'Standard' | 'Popular VIP' | 'Gold Fidelidade';
  loyaltyPoints: number;
  healthNotes?: string;
  addresses: UserAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Product {
  id: number;
  sku: string;
  nome: string;
  categoria: string;
  descricao: string;
  preco: string;
  status: 'Ativo' | 'Inativo';
  classificacaoAdicional?: string;
  observacoes?: string;
  imagem: string;
  selectedBasePrice?: number;
  selectedBaseName?: string;
}

export interface Category {
  id: string;
  nome_categoria: string;
  titulo_exibicao: string;
  descricao: string;
  ordem: number;
  icone?: string;
}

export interface CartItem {
  id: number;
  itemKey: string;
  nome: string;
  sku: string;
  descricao: string;
  preco: number;
  quantity: number;
  imagem: string;
  variations?: Record<string, any>;
  variationText?: string;
  removalText?: string;
  notes?: string;
}

export interface Coupon {
  codigo: string;
  tipo_desconto: 'produtos' | 'frete' | 'total';
  valor_desconto: string;
  data_inicio?: string;
  data_fim?: string;
  descricao?: string;
}

export interface Neighborhood {
  bairro: string;
  taxa: number;
}

export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  deliveryType: 'delivery' | 'pickup' | 'local' | 'default';
  address?: UserAddress | string;
  tableNumber?: string;
  items: Array<{
    id: number;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    variations?: string;
    removalText?: string;
    notes?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: 'mercadopago_pix' | 'mercadopago_card' | 'pix' | 'dinheiro' | 'cartao_entrega' | string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  mercadoPagoPaymentId?: string;
  mercadoPagoPreferenceId?: string;
  mercadoPagoQrCode?: string;
  mercadoPagoQrCodeBase64?: string;
  status: 'recebido' | 'preparando' | 'em_rota' | 'concluido' | 'cancelado';
  changeAmount?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MercadoPagoConfig {
  isConfigured: boolean;
  publicKey: string;
  sandboxMode: boolean;
  supportedMethods: string[];
}
