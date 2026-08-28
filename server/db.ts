import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

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
}

const DATA_DIR = path.join(process.cwd(), 'data_storage');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

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
    const defaultProducts: Product[] = [
      {
        id: 1,
        sku: 'MED001',
        nome: 'Dipirona Monoidratada 500mg (10 comp)',
        categoria: 'medicamentos',
        descricao: 'Analgésico e antitérmico de rápida ação para dores de cabeça e febre.',
        preco: 'Consulte',
        status: 'Ativo',
        observacoes: 'Uso oral adulto e pediátrico acima de 15 anos. Consulte a bula.',
        imagem: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 2,
        sku: 'MED002',
        nome: 'Paracetamol 750mg (20 comp)',
        categoria: 'medicamentos',
        descricao: 'Alívio sintomático de dores leves a moderadas e redução de febre.',
        preco: 'Consulte',
        status: 'Ativo',
        observacoes: 'Não exceder a dose recomendada na embalagem.',
        imagem: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 3,
        sku: 'MED003',
        nome: 'Ibuprofeno 400mg (10 cápsulas líquidas)',
        categoria: 'medicamentos',
        descricao: 'Anti-inflamatório, analgésico e antitérmico para alívio de dores musculares.',
        preco: 'Consulte',
        status: 'Ativo',
        observacoes: 'Venda sob orientação do farmacêutico responsável.',
        imagem: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 4,
        sku: 'MED004',
        nome: 'Soro Fisiológico 0,9% 500ml',
        categoria: 'medicamentos',
        descricao: 'Solução estéril de cloreto de sódio para nebulização e limpeza nasal.',
        preco: '12,90',
        status: 'Ativo',
        observacoes: 'Frasco com bico dosador estéril.',
        imagem: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 5,
        sku: 'MED005',
        nome: 'Termômetro Digital Clínico com Alarme',
        categoria: 'medicamentos',
        descricao: 'Medição precisa de temperatura em menos de 60 segundos com ponta flexível.',
        preco: '29,90',
        status: 'Ativo',
        observacoes: 'Aprovado pelo INMETRO com memória da última medição.',
        imagem: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 6,
        sku: 'HIG001',
        nome: 'Álcool em Gel 70% Hidratante 500ml',
        categoria: 'higiene',
        descricao: 'Higienizador para mãos com Aloe Vera e rápida absorção sem ressecar.',
        preco: '9,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 7,
        sku: 'HIG002',
        nome: 'Sabonete Líquido Antibacteriano 250ml',
        categoria: 'higiene',
        descricao: 'Elimina 99,9% das bactérias com fragrância suave de camomila.',
        preco: '14,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 8,
        sku: 'HIG003',
        nome: 'Creme Dental Proteção Total 90g',
        categoria: 'higiene',
        descricao: 'Prevenção contra cáries, placa bacteriana e hálito fresco prolongado.',
        preco: '8,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1559591937-e160e1d0339d?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 9,
        sku: 'HIG004',
        nome: 'Fio Dental Encerado Menta 50m',
        categoria: 'higiene',
        descricao: 'Desliza facilmente entre os dentes sem desfiar.',
        preco: '7,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 10,
        sku: 'HIG005',
        nome: 'Protetor Solar Facial & Corporal FPS 50 120ml',
        categoria: 'higiene',
        descricao: 'Toque seco, alta resistência à água e proteção contra raios UVA/UVB.',
        preco: '39,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 11,
        sku: 'PER001',
        nome: 'Hidratante Corporal Pele Seca 400ml',
        categoria: 'perfumaria',
        descricao: 'Hidratação profunda por 48 horas com manteiga de karité e ceramidas.',
        preco: '24,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 12,
        sku: 'PER002',
        nome: 'Desodorante Antitranspirante Aerosol 150ml',
        categoria: 'perfumaria',
        descricao: 'Proteção invisível 72h sem manchas nas roupas.',
        preco: '15,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 13,
        sku: 'PER003',
        nome: 'Shampoo Anticaspa e Fortalecedor 350ml',
        categoria: 'perfumaria',
        descricao: 'Limpeza profunda do couro cabeludo com piritionato de zinco.',
        preco: '19,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 14,
        sku: 'INF001',
        nome: 'Fraldas Infantis Mega Proteção',
        categoria: 'infantil',
        descricao: 'Até 12 horas de absorção com barreiras antivazamento confortáveis.',
        preco: 'Tamanho#P (38 un):42,90/M (34 un):45,90/G (30 un):48,90/XG (26 un):52,90',
        status: 'Ativo',
        classificacaoAdicional: 'Tamanho:radio:P (38 un) +0,00/M (34 un) +0,00/G (30 un) +0,00/XG (26 un) +0,00',
        imagem: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 15,
        sku: 'INF002',
        nome: 'Lenços Umedecidos Hipoalergênicos (100 un)',
        categoria: 'infantil',
        descricao: 'Sem álcool etílico, enriquecidos com extrato de camomila e vitamina E.',
        preco: '12,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 16,
        sku: 'INF003',
        nome: 'Pomada Protetora para Assaduras 45g',
        categoria: 'infantil',
        descricao: 'Fórmula com óxido de zinco e óleo de amêndoas para prevenir irritações.',
        preco: '18,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 17,
        sku: 'VIT001',
        nome: 'Vitamina C 1g Efervescente (10 comp)',
        categoria: 'vitaminas',
        descricao: 'Auxilia no fortalecimento do sistema imunológico com sabor laranja.',
        preco: '29,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1616671285454-94c95d6f8a20?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 18,
        sku: 'VIT002',
        nome: 'Multivitamínico de A a Z Completo (60 cáps)',
        categoria: 'vitaminas',
        descricao: 'Complexo de 23 vitaminas e minerais essenciais para energia e vitalidade.',
        preco: '39,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=500&auto=format&fit=crop&q=80'
      },
      {
        id: 19,
        sku: 'VIT003',
        nome: 'Ômega 3 Puro 1000mg EPA/DHA (120 cáps)',
        categoria: 'vitaminas',
        descricao: 'Óleo de peixe de alta pureza livre de metais pesados para a saúde cardiovascular.',
        preco: '49,90',
        status: 'Ativo',
        imagem: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=500&auto=format&fit=crop&q=80'
      }
    ];
    writeJSON(PRODUCTS_FILE, defaultProducts);
    console.log('✅ Catálogo de produtos inicializado com sucesso.');
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

  // Products CRUD
  getProducts: (): Product[] => readJSON<Product[]>(PRODUCTS_FILE, []),
  saveProducts: (products: Product[]) => writeJSON(PRODUCTS_FILE, products),
  getProductById: (id: number): Product | undefined => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    return products.find(p => p.id === id);
  },
  createProduct: (product: Product): Product => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    products.unshift(product);
    writeJSON(PRODUCTS_FILE, products);
    return product;
  },
  updateProduct: (id: number, updates: Partial<Product>): Product | null => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = {
      ...products[index],
      ...updates
    };
    writeJSON(PRODUCTS_FILE, products);
    return products[index];
  },
  updateProductPrice: (id: number, newPrice: string): Product | null => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = {
      ...products[index],
      preco: newPrice
    };
    writeJSON(PRODUCTS_FILE, products);
    return products[index];
  },
  deleteProduct: (id: number): boolean => {
    const products = readJSON<Product[]>(PRODUCTS_FILE, []);
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    writeJSON(PRODUCTS_FILE, filtered);
    return true;
  }
};
