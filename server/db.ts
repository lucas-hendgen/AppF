import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { INITIAL_PRODUCTS, COUPONS, NEIGHBORHOODS } from '../src/data/pharmacyData.js';

export interface Coupon {
  codigo: string;
  tipo_desconto: 'produtos' | 'frete' | 'total' | string;
  valor_desconto: string;
  descricao: string;
}

export interface Neighborhood {
  bairro: string;
  taxa: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  imageUrl?: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  buttonColor: string;
  badgeText?: string;
  iconName?: string;
  productIds?: number[];
}

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
  passwordHash: string;
  role: 'member' | 'admin';
  membershipTier: 'Standard' | 'Popular VIP' | 'Gold Fidelidade';
  loyaltyPoints: number;
  healthNotes?: string;
  addresses: UserAddress[];
  recoveryCode?: string;
  recoveryCodeExpires?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  variations?: string;
  removalText?: string;
  notes?: string;
}

export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  deliveryType: 'delivery' | 'pickup' | 'local' | 'default';
  address?: UserAddress | string;
  tableNumber?: string;
  items: OrderItem[];
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
  scheduled?: boolean;
  createdAt: string;
  updatedAt: string;
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
  imagem?: string;
  promotionalSection?: 'ofertas_imperdiveis' | 'leve_mais' | 'super_ofertas' | 'mais_vendidos' | 'lancamentos' | 'geral';
  ean?: string;
  estoque?: number;
}

const DATA_DIR = path.join(process.cwd(), 'data_storage');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');
const NEIGHBORHOODS_FILE = path.join(DATA_DIR, 'neighborhoods.json');
const BANNERS_FILE = path.join(DATA_DIR, 'banners.json');

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Erro ao ler arquivo ${file}:`, err);
    return fallback;
  }
}

function writeJSON<T>(file: string, data: T): void {
  try {
    const tempFile = `${file}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, file);
  } catch (err) {
    console.error(`Erro ao escrever no arquivo ${file}:`, err);
  }
}

// Inicializar usuários padrão com senhas criptografadas se não existirem
export function initDatabase() {
  const users = readJSON<UserProfile[]>(USERS_FILE, []);
  
  if (users.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('admin123', salt);
    const memberHash = bcrypt.hashSync('senha123', salt);

    const defaultAdmin: UserProfile = {
      id: 'usr_admin_01',
      name: 'Farmacêutico Responsável',
      email: 'admin@farmaciasuperpopular.com.br',
      cpf: '000.000.000-00',
      phone: '(47) 99999-8888',
      passwordHash: adminHash,
      role: 'admin',
      membershipTier: 'Gold Fidelidade',
      loyaltyPoints: 1250,
      healthNotes: 'Conta Administrativa MasterFarma',
      addresses: [
        {
          id: 'addr_01',
          street: 'Av. Nereu Ramos',
          number: '897',
          neighborhood: 'Centro',
          city: 'Itapema',
          state: 'SC',
          cep: '88220-000',
          isDefault: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const defaultMember: UserProfile = {
      id: 'usr_member_01',
      name: 'Maria Helena Silva',
      email: 'maria.helena@email.com',
      cpf: '123.456.789-00',
      phone: '(47) 98877-6655',
      passwordHash: memberHash,
      role: 'member',
      membershipTier: 'Popular VIP',
      loyaltyPoints: 340,
      healthNotes: 'Alérgica a Dipirona e Ácido Acetilsalicílico (AAS). Hipertensa.',
      addresses: [
        {
          id: 'addr_02',
          street: 'Rua 230',
          number: '450',
          complement: 'Apto 302',
          neighborhood: 'Meia Praia',
          city: 'Itapema',
          state: 'SC',
          cep: '88220-000',
          isDefault: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    writeJSON(USERS_FILE, [defaultAdmin, defaultMember]);
    console.log('✅ Banco de dados inicializado com usuários padrão.');
  }

  // Inicializar produtos se vazio
  const products = readJSON<Product[]>(PRODUCTS_FILE, []);
  if (products.length === 0) {
    writeJSON(PRODUCTS_FILE, INITIAL_PRODUCTS);
    console.log('✅ Banco de dados inicializado com produtos padrão.');
  }

  // Inicializar pedidos se vazio
  const orders = readJSON<Order[]>(ORDERS_FILE, []);
  if (orders.length === 0) {
    const initialOrder: Order = {
      id: 'PED-7841',
      userId: 'usr_member_01',
      customerName: 'Maria Helena Silva',
      customerPhone: '(47) 98877-6655',
      deliveryType: 'delivery',
      address: {
        id: 'addr_02',
        street: 'Rua 230',
        number: '450',
        complement: 'Apto 302',
        neighborhood: 'Meia Praia',
        city: 'Itapema',
        state: 'SC',
        cep: '88220-000'
      },
      items: [
        {
          id: 4,
          name: 'Soro Fisiológico 0,9% 500ml',
          sku: 'MED004',
          price: 12.9,
          quantity: 2
        },
        {
          id: 19,
          name: 'Vitamina C 1g Efervescente',
          sku: 'VIT001',
          price: 29.9,
          quantity: 1
        }
      ],
      subtotal: 55.7,
      deliveryFee: 5.0,
      discount: 0,
      total: 60.7,
      paymentMethod: 'mercadopago_pix',
      paymentStatus: 'paid',
      status: 'preparando',
      notes: 'Entregar na portaria com o zelador.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeJSON(ORDERS_FILE, [initialOrder]);
  }

  // Inicializar cupons se vazio
  const coupons = readJSON<Coupon[]>(COUPONS_FILE, []);
  if (coupons.length === 0) {
    writeJSON(COUPONS_FILE, COUPONS);
    console.log('✅ Banco de dados inicializado com cupons padrão.');
  }

  // Inicializar bairros se vazio
  const neighborhoods = readJSON<Neighborhood[]>(NEIGHBORHOODS_FILE, []);
  if (neighborhoods.length === 0) {
    writeJSON(NEIGHBORHOODS_FILE, NEIGHBORHOODS);
    console.log('✅ Banco de dados inicializado com bairros padrão.');
  }

  // Inicializar banners se vazio (apenas 1 banner padrão principal)
  const banners = readJSON<any[]>(BANNERS_FILE, []);
  if (banners.length === 0) {
    const initialBanners = [
      {
        id: "b1",
        title: "Promoção de Verão - Farmácia Super Popular",
        subtitle: "Energia e Proteção para sua Família!",
        buttonText: "Aproveite agora!",
        buttonLink: "#catalog-section",
        imageUrl: "/banner-principal.png",
        bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50/50",
        textColor: "text-slate-800",
        borderColor: "border-emerald-100/80",
        buttonColor: "bg-[#10b981] hover:bg-[#059669] text-white"
      }
    ];
    writeJSON(BANNERS_FILE, initialBanners);
    console.log('✅ Banco de dados inicializado com banner padrão.');
  }
}

// Database helper functions
export const db = {
  // Users
  getUsers: (): UserProfile[] => readJSON<UserProfile[]>(USERS_FILE, []),
  saveUsers: (users: UserProfile[]) => writeJSON(USERS_FILE, users),
  getUserById: (id: string) => {
    const users = readJSON<UserProfile[]>(USERS_FILE, []);
    return users.find(u => u.id === id);
  },
  getUserByEmail: (email: string) => {
    const users = readJSON<UserProfile[]>(USERS_FILE, []);
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  getUserByCpf: (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    const users = readJSON<UserProfile[]>(USERS_FILE, []);
    return users.find(u => u.cpf.replace(/\D/g, '') === cleanCpf);
  },
  createUser: (user: UserProfile) => {
    const users = readJSON<UserProfile[]>(USERS_FILE, []);
    users.push(user);
    writeJSON(USERS_FILE, users);
    return user;
  },
  updateUser: (id: string, updates: Partial<UserProfile>) => {
    const users = readJSON<UserProfile[]>(USERS_FILE, []);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeJSON(USERS_FILE, users);
    return users[index];
  },

  // Orders
  getOrders: (): Order[] => readJSON<Order[]>(ORDERS_FILE, []),
  getOrdersByUserId: (userId: string): Order[] => {
    const orders = readJSON<Order[]>(ORDERS_FILE, []);
    return orders.filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getOrderById: (id: string): Order | undefined => {
    const orders = readJSON<Order[]>(ORDERS_FILE, []);
    return orders.find(o => o.id === id);
  },
  createOrder: (order: Order): Order => {
    const orders = readJSON<Order[]>(ORDERS_FILE, []);
    orders.unshift(order);
    writeJSON(ORDERS_FILE, orders);
    return order;
  },
  updateOrder: (id: string, updates: Partial<Order>): Order | null => {
    const orders = readJSON<Order[]>(ORDERS_FILE, []);
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) return null;
    orders[index] = {
      ...orders[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeJSON(ORDERS_FILE, orders);
    return orders[index];
  },

  // Products
  getProducts: (): Product[] => readJSON<Product[]>(PRODUCTS_FILE, []),
  getProductById: (id: number): Product | undefined => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    return products.find(p => p.id === id);
  },
  createProduct: (product: Omit<Product, 'id'>): Product => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
    const newProduct: Product = { ...product, id: maxId + 1 };
    products.push(newProduct);
    writeJSON(PRODUCTS_FILE, products);
    return newProduct;
  },
  updateProduct: (id: number, updates: Partial<Omit<Product, 'id'>>): Product | null => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...updates };
    writeJSON(PRODUCTS_FILE, products);
    return products[index];
  },
  deleteProduct: (id: number): boolean => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return false;
    products.splice(index, 1);
    writeJSON(PRODUCTS_FILE, products);
    return true;
  },

  // Coupons
  getCoupons: (): Coupon[] => readJSON<Coupon[]>(COUPONS_FILE, []),
  createCoupon: (coupon: Coupon): Coupon => {
    const coupons = readJSON<Coupon[]>(COUPONS_FILE, []);
    const index = coupons.findIndex(c => c.codigo.toUpperCase() === coupon.codigo.toUpperCase());
    if (index !== -1) {
      coupons[index] = coupon;
    } else {
      coupons.push(coupon);
    }
    writeJSON(COUPONS_FILE, coupons);
    return coupon;
  },
  deleteCoupon: (code: string): boolean => {
    const coupons = readJSON<Coupon[]>(COUPONS_FILE, []);
    const index = coupons.findIndex(c => c.codigo.toUpperCase() === code.toUpperCase());
    if (index === -1) return false;
    coupons.splice(index, 1);
    writeJSON(COUPONS_FILE, coupons);
    return true;
  },

  // Neighborhoods
  getNeighborhoods: (): Neighborhood[] => readJSON<Neighborhood[]>(NEIGHBORHOODS_FILE, []),
  updateNeighborhood: (bairro: string, taxa: number): Neighborhood | null => {
    const neighborhoods = readJSON<Neighborhood[]>(NEIGHBORHOODS_FILE, []);
    const index = neighborhoods.findIndex(n => n.bairro.toLowerCase() === bairro.toLowerCase());
    if (index === -1) return null;
    neighborhoods[index].taxa = Number(taxa);
    writeJSON(NEIGHBORHOODS_FILE, neighborhoods);
    return neighborhoods[index];
  },

  // Banners
  getBanners: (): Banner[] => readJSON<Banner[]>(BANNERS_FILE, []),
  createBanner: (banner: Omit<Banner, 'id'>): Banner => {
    const banners = readJSON<Banner[]>(BANNERS_FILE, []);
    const maxId = banners.reduce((max, b) => Math.max(max, parseInt(b.id.replace('b', '')) || 0), 0);
    const newBanner: Banner = { ...banner, id: `b${maxId + 1}` };
    banners.push(newBanner);
    writeJSON(BANNERS_FILE, banners);
    return newBanner;
  },
  updateBanner: (id: string, updates: Partial<Omit<Banner, 'id'>>): Banner | null => {
    const banners = readJSON<Banner[]>(BANNERS_FILE, []);
    const index = banners.findIndex(b => b.id === id);
    if (index === -1) return null;
    banners[index] = { ...banners[index], ...updates };
    writeJSON(BANNERS_FILE, banners);
    return banners[index];
  },
  deleteBanner: (id: string): boolean => {
    const banners = readJSON<Banner[]>(BANNERS_FILE, []);
    const filtered = banners.filter(b => b.id !== id);
    if (filtered.length === banners.length) return false;
    writeJSON(BANNERS_FILE, filtered);
    return true;
  }
};
