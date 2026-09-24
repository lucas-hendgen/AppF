import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, COUPONS, NEIGHBORHOODS } from '../src/data/pharmacyData.js';

export interface Category {
  id: string;
  nome_categoria: string;
  titulo_exibicao: string;
  descricao: string;
  status: 'Ativa' | 'Inativa';
  ordem: number;
  icone?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  apartmentNumber?: string;
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

// Configuração MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'farmacia_super_popular',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

let pool: mysql.Pool;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// Helper para desserializar JSON de colunas com segurança
function safeParseJSON<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Formatar usuário vindo do MySQL
function mapUser(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cpf: row.cpf || '',
    phone: row.phone || '',
    passwordHash: row.passwordHash,
    role: row.role || 'member',
    membershipTier: row.membershipTier || 'Standard',
    loyaltyPoints: Number(row.loyaltyPoints) || 0,
    healthNotes: row.healthNotes || '',
    addresses: safeParseJSON<UserAddress[]>(row.addresses, []),
    recoveryCode: row.recoveryCode || undefined,
    recoveryCodeExpires: row.recoveryCodeExpires || undefined,
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || new Date().toISOString()
  };
}

// Formatar pedido vindo do MySQL
function mapOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.userId || undefined,
    customerName: row.customerName,
    customerPhone: row.customerPhone || '',
    deliveryType: row.deliveryType || 'delivery',
    address: safeParseJSON<any>(row.address, undefined),
    tableNumber: row.tableNumber || undefined,
    items: safeParseJSON<OrderItem[]>(row.items, []),
    subtotal: Number(row.subtotal) || 0,
    deliveryFee: Number(row.deliveryFee) || 0,
    discount: Number(row.discount) || 0,
    couponCode: row.couponCode || undefined,
    total: Number(row.total) || 0,
    paymentMethod: row.paymentMethod || 'pix',
    paymentStatus: row.paymentStatus || 'pending',
    mercadoPagoPaymentId: row.mercadoPagoPaymentId || undefined,
    mercadoPagoPreferenceId: row.mercadoPagoPreferenceId || undefined,
    mercadoPagoQrCode: row.mercadoPagoQrCode || undefined,
    mercadoPagoQrCodeBase64: row.mercadoPagoQrCodeBase64 || undefined,
    status: row.status || 'recebido',
    changeAmount: row.changeAmount || undefined,
    notes: row.notes || undefined,
    scheduled: Boolean(row.scheduled),
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || new Date().toISOString()
  };
}

// Formatar banner vindo do MySQL
function mapBanner(row: any): Banner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    buttonText: row.buttonText,
    buttonLink: row.buttonLink,
    imageUrl: row.imageUrl || undefined,
    bgColor: row.bgColor,
    textColor: row.textColor,
    borderColor: row.borderColor,
    buttonColor: row.buttonColor,
    badgeText: row.badgeText || undefined,
    iconName: row.iconName || undefined,
    productIds: safeParseJSON<number[]>(row.productIds, undefined)
  };
}

// Inicializa o banco de dados MySQL, cria tabelas e insere dados padrão
export async function initDatabase(): Promise<void> {
  try {
    // 1. Conecta sem selecionar database para garantir que a base existe
    const initConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await initConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await initConn.end();

    const p = getPool();

    // 2. Cria tabela de usuários
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        cpf VARCHAR(32) DEFAULT '',
        phone VARCHAR(32) DEFAULT '',
        passwordHash VARCHAR(255) NOT NULL,
        role VARCHAR(32) DEFAULT 'member',
        membershipTier VARCHAR(64) DEFAULT 'Standard',
        loyaltyPoints INT DEFAULT 0,
        healthNotes TEXT,
        addresses JSON,
        recoveryCode VARCHAR(10),
        recoveryCodeExpires VARCHAR(64),
        createdAt VARCHAR(64),
        updatedAt VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Cria tabela de produtos
    await p.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku VARCHAR(64),
        nome VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        descricao TEXT,
        preco VARCHAR(100) NOT NULL,
        status VARCHAR(32) DEFAULT 'Ativo',
        classificacaoAdicional VARCHAR(255),
        observacoes TEXT,
        imagem VARCHAR(500),
        promotionalSection VARCHAR(100),
        ean VARCHAR(64),
        estoque INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Cria tabela de pedidos
    await p.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        userId VARCHAR(64),
        customerName VARCHAR(255) NOT NULL,
        customerPhone VARCHAR(32) NOT NULL,
        deliveryType VARCHAR(32) NOT NULL,
        address JSON,
        tableNumber VARCHAR(32),
        items JSON NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        deliveryFee DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        couponCode VARCHAR(64),
        total DECIMAL(10,2) NOT NULL,
        paymentMethod VARCHAR(64) NOT NULL,
        paymentStatus VARCHAR(32) DEFAULT 'pending',
        mercadoPagoPaymentId VARCHAR(100),
        mercadoPagoPreferenceId VARCHAR(100),
        mercadoPagoQrCode TEXT,
        mercadoPagoQrCodeBase64 LONGTEXT,
        status VARCHAR(32) DEFAULT 'recebido',
        changeAmount VARCHAR(32),
        notes TEXT,
        scheduled TINYINT(1) DEFAULT 0,
        createdAt VARCHAR(64),
        updatedAt VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Cria tabela de cupons
    await p.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        codigo VARCHAR(64) PRIMARY KEY,
        tipo_desconto VARCHAR(32) NOT NULL,
        valor_desconto VARCHAR(32) NOT NULL,
        descricao VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. Cria tabela de bairros
    await p.query(`
      CREATE TABLE IF NOT EXISTS neighborhoods (
        bairro VARCHAR(100) PRIMARY KEY,
        taxa DECIMAL(10,2) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. Cria tabela de banners
    await p.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) NOT NULL,
        buttonText VARCHAR(100) NOT NULL,
        buttonLink VARCHAR(255) NOT NULL,
        imageUrl VARCHAR(500),
        bgColor VARCHAR(100) NOT NULL,
        textColor VARCHAR(100) NOT NULL,
        borderColor VARCHAR(100) NOT NULL,
        buttonColor VARCHAR(100) NOT NULL,
        badgeText VARCHAR(100),
        iconName VARCHAR(100),
        productIds JSON
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8. Cria tabela de controle de Rate Limiting (Segurança Anti-Brute Force)
    await p.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key_id VARCHAR(191) PRIMARY KEY,
        points INT NOT NULL DEFAULT 1,
        expire_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_rate_limits_expire (expire_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 9. Cria tabela de categorias de produtos (Com suporte a Inativação e Exclusão)
    await p.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        nome_categoria VARCHAR(100) NOT NULL UNIQUE,
        titulo_exibicao VARCHAR(150) NOT NULL,
        descricao VARCHAR(255) DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'Ativa',
        ordem INT NOT NULL DEFAULT 0,
        icone VARCHAR(64) DEFAULT NULL,
        createdAt VARCHAR(64),
        updatedAt VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // === SEED DE CATEGORIAS PADRÃO ===
    const [catRows]: any = await p.query(`SELECT COUNT(*) as count FROM categories`);
    if (catRows[0].count === 0) {
      for (const cat of INITIAL_CATEGORIES) {
        await p.query(
          `INSERT INTO categories (id, nome_categoria, titulo_exibicao, descricao, status, ordem, icone, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cat.id,
            cat.nome_categoria.toLowerCase(),
            cat.titulo_exibicao,
            cat.descricao || '',
            cat.status || 'Ativa',
            cat.ordem || 0,
            cat.icone || null,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
      }
      console.log('✅ MySQL: Categorias padrão inseridas com sucesso!');
    }

    // === SEED E SINCRONIZAÇÃO DE USUÁRIOS (ADMIN E MEMBROS) ===
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@farmaciasuperpopular.com.br').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Farmacêutico Responsável';
    const adminCpf = process.env.ADMIN_CPF || '000.000.000-00';
    const adminPhone = process.env.ADMIN_PHONE || '(47) 99999-8888';

    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync(adminPassword, salt);

    // Upsert / Sincronização do Administrador configurado no .env
    const [existingAdmin]: any = await p.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [adminEmail]
    );

    if (existingAdmin.length === 0) {
      await p.query(
        `INSERT INTO users (id, name, email, cpf, phone, passwordHash, role, membershipTier, loyaltyPoints, healthNotes, addresses, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'usr_admin_01',
          adminName,
          adminEmail,
          adminCpf,
          adminPhone,
          adminHash,
          'admin',
          'Gold Fidelidade',
          1250,
          'Conta Administrativa Principal',
          '[]',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      console.log(`✅ MySQL: Administrador configurado criado (${adminEmail})`);
    } else {
      // Atualiza nome, senha e garante role = 'admin'
      await p.query(
        `UPDATE users SET name = ?, passwordHash = ?, role = 'admin', updatedAt = ? WHERE email = ?`,
        [adminName, adminHash, new Date().toISOString(), adminEmail]
      );
      console.log(`✅ MySQL: Administrador sincronizado com sucesso (${adminEmail})`);
    }

    // Seed de membro padrão se a tabela de usuários tiver apenas o admin
    const [userRows]: any = await p.query(`SELECT COUNT(*) as count FROM users`);
    if (userRows[0].count <= 1) {
      const memberHash = bcrypt.hashSync('senha123', salt);
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

      const [memberExists]: any = await p.query(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [defaultMember.email]
      );
      if (memberExists.length === 0) {
        await p.query(
          `INSERT INTO users (id, name, email, cpf, phone, passwordHash, role, membershipTier, loyaltyPoints, healthNotes, addresses, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            defaultMember.id,
            defaultMember.name,
            defaultMember.email,
            defaultMember.cpf,
            defaultMember.phone,
            defaultMember.passwordHash,
            defaultMember.role,
            defaultMember.membershipTier,
            defaultMember.loyaltyPoints,
            defaultMember.healthNotes,
            JSON.stringify(defaultMember.addresses),
            defaultMember.createdAt,
            defaultMember.updatedAt
          ]
        );
        console.log('✅ MySQL: Membro padrão de demonstração criado.');
      }
    }

    // === SEED DE PRODUTOS PADRÃO ===
    const [prodRows]: any = await p.query(`SELECT COUNT(*) as count FROM products`);
    if (prodRows[0].count === 0) {
      for (const prod of INITIAL_PRODUCTS) {
        await p.query(
          `INSERT INTO products (id, sku, nome, categoria, descricao, preco, status, classificacaoAdicional, observacoes, imagem, promotionalSection, ean, estoque)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            prod.id,
            prod.sku,
            prod.nome,
            prod.categoria,
            prod.descricao,
            prod.preco,
            prod.status,
            prod.classificacaoAdicional || null,
            prod.observacoes || null,
            prod.imagem || null,
            prod.promotionalSection || null,
            prod.ean || null,
            prod.estoque || 100
          ]
        );
      }
      console.log('✅ MySQL: Catálogo inicial de produtos inserido com sucesso!');
    }

    // === SEED DE CUPONS PADRÃO ===
    const [couponRows]: any = await p.query(`SELECT COUNT(*) as count FROM coupons`);
    if (couponRows[0].count === 0) {
      for (const c of COUPONS) {
        await p.query(
          `INSERT INTO coupons (codigo, tipo_desconto, valor_desconto, descricao)
           VALUES (?, ?, ?, ?)`,
          [c.codigo, c.tipo_desconto, c.valor_desconto, c.descricao]
        );
      }
      console.log('✅ MySQL: Cupons padrão inseridos com sucesso!');
    }

    // === SEED DE BAIRROS PADRÃO ===
    const [nbhRows]: any = await p.query(`SELECT COUNT(*) as count FROM neighborhoods`);
    if (nbhRows[0].count === 0) {
      for (const n of NEIGHBORHOODS) {
        await p.query(
          `INSERT INTO neighborhoods (bairro, taxa) VALUES (?, ?)`,
          [n.bairro, n.taxa]
        );
      }
      console.log('✅ MySQL: Bairros e taxas padrão inseridos com sucesso!');
    }

    // === SEED DE BANNERS PADRÃO ===
    const [bannerRows]: any = await p.query(`SELECT COUNT(*) as count FROM banners`);
    if (bannerRows[0].count === 0) {
      await p.query(
        `INSERT INTO banners (id, title, subtitle, buttonText, buttonLink, imageUrl, bgColor, textColor, borderColor, buttonColor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'b1',
          'Promoção de Verão - Farmácia Super Popular',
          'Energia e Proteção para sua Família!',
          'Aproveite agora!',
          '#catalog-section',
          '/banner-principal.png',
          'bg-gradient-to-br from-emerald-50 to-teal-50/50',
          'text-slate-800',
          'border-emerald-100/80',
          'bg-[#10b981] hover:bg-[#059669] text-white'
        ]
      );
      console.log('✅ MySQL: Banner padrão inserido com sucesso!');
    }

    console.log(`🔌 Conectado com sucesso ao banco MySQL: ${dbConfig.database}`);
  } catch (err) {
    console.error('❌ Erro na inicialização do MySQL:', err);
    throw err;
  }
}

// Database helper functions operando no MySQL
export const db = {
  // === USERS ===
  async getUsers(): Promise<UserProfile[]> {
    const [rows]: any = await getPool().query(`SELECT * FROM users ORDER BY createdAt DESC`);
    return rows.map(mapUser);
  },

  async getUserById(id: string): Promise<UserProfile | undefined> {
    const [rows]: any = await getPool().query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
    return rows.length > 0 ? mapUser(rows[0]) : undefined;
  },

  async getUserByEmail(email: string): Promise<UserProfile | undefined> {
    const [rows]: any = await getPool().query(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`, [email.trim()]);
    return rows.length > 0 ? mapUser(rows[0]) : undefined;
  },

  async getUserByCpf(cpf: string): Promise<UserProfile | undefined> {
    const cleanCpf = cpf.replace(/\D/g, '');
    const [rows]: any = await getPool().query(
      `SELECT * FROM users WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ? LIMIT 1`,
      [cleanCpf]
    );
    return rows.length > 0 ? mapUser(rows[0]) : undefined;
  },

  async createUser(user: UserProfile): Promise<UserProfile> {
    await getPool().query(
      `INSERT INTO users (id, name, email, cpf, phone, passwordHash, role, membershipTier, loyaltyPoints, healthNotes, addresses, recoveryCode, recoveryCodeExpires, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email,
        user.cpf || '',
        user.phone || '',
        user.passwordHash,
        user.role || 'member',
        user.membershipTier || 'Standard',
        user.loyaltyPoints || 0,
        user.healthNotes || '',
        JSON.stringify(user.addresses || []),
        user.recoveryCode || null,
        user.recoveryCodeExpires || null,
        user.createdAt || new Date().toISOString(),
        user.updatedAt || new Date().toISOString()
      ]
    );
    return user;
  },

  async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    const updatedUser: UserProfile = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await getPool().query(
      `UPDATE users SET 
        name = ?, 
        email = ?, 
        cpf = ?, 
        phone = ?, 
        passwordHash = ?, 
        role = ?, 
        membershipTier = ?, 
        loyaltyPoints = ?, 
        healthNotes = ?, 
        addresses = ?, 
        recoveryCode = ?, 
        recoveryCodeExpires = ?, 
        updatedAt = ?
       WHERE id = ?`,
      [
        updatedUser.name,
        updatedUser.email,
        updatedUser.cpf,
        updatedUser.phone,
        updatedUser.passwordHash,
        updatedUser.role,
        updatedUser.membershipTier,
        updatedUser.loyaltyPoints,
        updatedUser.healthNotes,
        JSON.stringify(updatedUser.addresses || []),
        updatedUser.recoveryCode || null,
        updatedUser.recoveryCodeExpires || null,
        updatedUser.updatedAt,
        id
      ]
    );

    return updatedUser;
  },

  // === ORDERS ===
  async getOrders(): Promise<Order[]> {
    const [rows]: any = await getPool().query(`SELECT * FROM orders ORDER BY createdAt DESC`);
    return rows.map(mapOrder);
  },

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    const [rows]: any = await getPool().query(`SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC`, [userId]);
    return rows.map(mapOrder);
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    const [rows]: any = await getPool().query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id]);
    return rows.length > 0 ? mapOrder(rows[0]) : undefined;
  },

  async createOrder(order: Order): Promise<Order> {
    await getPool().query(
      `INSERT INTO orders (id, userId, customerName, customerPhone, deliveryType, address, tableNumber, items, subtotal, deliveryFee, discount, couponCode, total, paymentMethod, paymentStatus, mercadoPagoPaymentId, mercadoPagoPreferenceId, mercadoPagoQrCode, mercadoPagoQrCodeBase64, status, changeAmount, notes, scheduled, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.userId || null,
        order.customerName,
        order.customerPhone,
        order.deliveryType,
        order.address ? JSON.stringify(order.address) : null,
        order.tableNumber || null,
        JSON.stringify(order.items),
        order.subtotal,
        order.deliveryFee,
        order.discount || 0,
        order.couponCode || null,
        order.total,
        order.paymentMethod,
        order.paymentStatus || 'pending',
        order.mercadoPagoPaymentId || null,
        order.mercadoPagoPreferenceId || null,
        order.mercadoPagoQrCode || null,
        order.mercadoPagoQrCodeBase64 || null,
        order.status || 'recebido',
        order.changeAmount || null,
        order.notes || null,
        order.scheduled ? 1 : 0,
        order.createdAt || new Date().toISOString(),
        order.updatedAt || new Date().toISOString()
      ]
    );
    return order;
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) return null;

    const merged = { ...order, ...updates, updatedAt: new Date().toISOString() };

    await getPool().query(
      `UPDATE orders SET
        userId = ?,
        customerName = ?,
        customerPhone = ?,
        deliveryType = ?,
        address = ?,
        tableNumber = ?,
        items = ?,
        subtotal = ?,
        deliveryFee = ?,
        discount = ?,
        couponCode = ?,
        total = ?,
        paymentMethod = ?,
        paymentStatus = ?,
        mercadoPagoPaymentId = ?,
        mercadoPagoPreferenceId = ?,
        mercadoPagoQrCode = ?,
        mercadoPagoQrCodeBase64 = ?,
        status = ?,
        changeAmount = ?,
        notes = ?,
        scheduled = ?,
        updatedAt = ?
       WHERE id = ?`,
      [
        merged.userId || null,
        merged.customerName,
        merged.customerPhone,
        merged.deliveryType,
        merged.address ? JSON.stringify(merged.address) : null,
        merged.tableNumber || null,
        JSON.stringify(merged.items),
        merged.subtotal,
        merged.deliveryFee,
        merged.discount || 0,
        merged.couponCode || null,
        merged.total,
        merged.paymentMethod,
        merged.paymentStatus,
        merged.mercadoPagoPaymentId || null,
        merged.mercadoPagoPreferenceId || null,
        merged.mercadoPagoQrCode || null,
        merged.mercadoPagoQrCodeBase64 || null,
        merged.status,
        merged.changeAmount || null,
        merged.notes || null,
        merged.scheduled ? 1 : 0,
        merged.updatedAt,
        id
      ]
    );

    return merged;
  },

  // Alias para compatibilidade
  async updateOrderStatus(id: string, updates: Partial<Order>): Promise<Order | null> {
    return this.updateOrder(id, updates);
  },

  // === PRODUCTS ===
  async getProducts(): Promise<Product[]> {
    const [rows]: any = await getPool().query(`SELECT * FROM products ORDER BY id ASC`);
    return rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      estoque: Number(r.estoque) || 0
    }));
  },

  async getProductById(id: number): Promise<Product | undefined> {
    const [rows]: any = await getPool().query(`SELECT * FROM products WHERE id = ? LIMIT 1`, [id]);
    if (rows.length === 0) return undefined;
    return {
      ...rows[0],
      id: Number(rows[0].id),
      estoque: Number(rows[0].estoque) || 0
    };
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const [result]: any = await getPool().query(
      `INSERT INTO products (sku, nome, categoria, descricao, preco, status, classificacaoAdicional, observacoes, imagem, promotionalSection, ean, estoque)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.sku,
        product.nome,
        product.categoria,
        product.descricao,
        product.preco,
        product.status || 'Ativo',
        product.classificacaoAdicional || null,
        product.observacoes || null,
        product.imagem || null,
        product.promotionalSection || null,
        product.ean || null,
        product.estoque || 0
      ]
    );
    return { ...product, id: result.insertId };
  },

  async updateProduct(id: number, updates: Partial<Omit<Product, 'id'>>): Promise<Product | null> {
    const product = await this.getProductById(id);
    if (!product) return null;

    const merged = { ...product, ...updates };

    await getPool().query(
      `UPDATE products SET
        sku = ?,
        nome = ?,
        categoria = ?,
        descricao = ?,
        preco = ?,
        status = ?,
        classificacaoAdicional = ?,
        observacoes = ?,
        imagem = ?,
        promotionalSection = ?,
        ean = ?,
        estoque = ?
       WHERE id = ?`,
      [
        merged.sku,
        merged.nome,
        merged.categoria,
        merged.descricao,
        merged.preco,
        merged.status,
        merged.classificacaoAdicional || null,
        merged.observacoes || null,
        merged.imagem || null,
        merged.promotionalSection || null,
        merged.ean || null,
        merged.estoque || 0,
        id
      ]
    );

    return merged;
  },

  async deleteProduct(id: number): Promise<boolean> {
    const [result]: any = await getPool().query(`DELETE FROM products WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  // === COUPONS ===
  async getCoupons(): Promise<Coupon[]> {
    const [rows]: any = await getPool().query(`SELECT * FROM coupons`);
    return rows;
  },

  async createCoupon(coupon: Coupon): Promise<Coupon> {
    await getPool().query(
      `INSERT INTO coupons (codigo, tipo_desconto, valor_desconto, descricao)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
        tipo_desconto = VALUES(tipo_desconto),
        valor_desconto = VALUES(valor_desconto),
        descricao = VALUES(descricao)`,
      [coupon.codigo.toUpperCase(), coupon.tipo_desconto, coupon.valor_desconto, coupon.descricao]
    );
    return coupon;
  },

  async deleteCoupon(code: string): Promise<boolean> {
    const [result]: any = await getPool().query(`DELETE FROM coupons WHERE UPPER(codigo) = ?`, [code.toUpperCase()]);
    return result.affectedRows > 0;
  },

  // === NEIGHBORHOODS ===
  async getNeighborhoods(): Promise<Neighborhood[]> {
    const [rows]: any = await getPool().query(`SELECT * FROM neighborhoods ORDER BY bairro ASC`);
    return rows.map((r: any) => ({ bairro: r.bairro, taxa: Number(r.taxa) }));
  },

  async updateNeighborhood(bairro: string, taxa: number): Promise<Neighborhood | null> {
    const [result]: any = await getPool().query(
      `INSERT INTO neighborhoods (bairro, taxa)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE taxa = VALUES(taxa)`,
      [bairro, Number(taxa)]
    );
    return { bairro, taxa: Number(taxa) };
  },

  // === BANNERS ===
  async getBanners(): Promise<Banner[]> {
    const [rows]: any = await getPool().query(`SELECT * FROM banners`);
    return rows.map(mapBanner);
  },

  async createBanner(banner: Omit<Banner, 'id'>): Promise<Banner> {
    const [countRows]: any = await getPool().query(`SELECT COUNT(*) as count FROM banners`);
    const newId = `b${countRows[0].count + 1}`;
    const newBanner: Banner = { ...banner, id: newId };

    await getPool().query(
      `INSERT INTO banners (id, title, subtitle, buttonText, buttonLink, imageUrl, bgColor, textColor, borderColor, buttonColor, badgeText, iconName, productIds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newBanner.id,
        newBanner.title,
        newBanner.subtitle,
        newBanner.buttonText,
        newBanner.buttonLink,
        newBanner.imageUrl || null,
        newBanner.bgColor,
        newBanner.textColor,
        newBanner.borderColor,
        newBanner.buttonColor,
        newBanner.badgeText || null,
        newBanner.iconName || null,
        newBanner.productIds ? JSON.stringify(newBanner.productIds) : null
      ]
    );
    return newBanner;
  },

  async updateBanner(id: string, updates: Partial<Omit<Banner, 'id'>>): Promise<Banner | null> {
    const [rows]: any = await getPool().query(`SELECT * FROM banners WHERE id = ? LIMIT 1`, [id]);
    if (rows.length === 0) return null;

    const current = mapBanner(rows[0]);
    const merged = { ...current, ...updates };

    await getPool().query(
      `UPDATE banners SET
        title = ?,
        subtitle = ?,
        buttonText = ?,
        buttonLink = ?,
        imageUrl = ?,
        bgColor = ?,
        textColor = ?,
        borderColor = ?,
        buttonColor = ?,
        badgeText = ?,
        iconName = ?,
        productIds = ?
       WHERE id = ?`,
      [
        merged.title,
        merged.subtitle,
        merged.buttonText,
        merged.buttonLink,
        merged.imageUrl || null,
        merged.bgColor,
        merged.textColor,
        merged.borderColor,
        merged.buttonColor,
        merged.badgeText || null,
        merged.iconName || null,
        merged.productIds ? JSON.stringify(merged.productIds) : null,
        id
      ]
    );

    return merged;
  },

  async deleteBanner(id: string): Promise<boolean> {
    const [result]: any = await getPool().query(`DELETE FROM banners WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  // === CATEGORIAS DE PRODUTOS ===
  async getCategories(onlyActive = false): Promise<Category[]> {
    const query = onlyActive 
      ? `SELECT * FROM categories WHERE status = 'Ativa' ORDER BY ordem ASC, titulo_exibicao ASC`
      : `SELECT * FROM categories ORDER BY ordem ASC, titulo_exibicao ASC`;
    const [rows]: any = await getPool().query(query);
    return rows.map((r: any) => ({
      id: r.id,
      nome_categoria: r.nome_categoria,
      titulo_exibicao: r.titulo_exibicao,
      descricao: r.descricao || '',
      status: (r.status === 'Inativa' ? 'Inativa' : 'Ativa') as 'Ativa' | 'Inativa',
      ordem: Number(r.ordem) || 0,
      icone: r.icone || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  },

  async getCategoryById(id: string): Promise<Category | null> {
    const [rows]: any = await getPool().query(
      `SELECT * FROM categories WHERE id = ? OR LOWER(nome_categoria) = ? LIMIT 1`,
      [id, id.toLowerCase()]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      nome_categoria: r.nome_categoria,
      titulo_exibicao: r.titulo_exibicao,
      descricao: r.descricao || '',
      status: (r.status === 'Inativa' ? 'Inativa' : 'Ativa') as 'Ativa' | 'Inativa',
      ordem: Number(r.ordem) || 0,
      icone: r.icone || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  },

  async createCategory(cat: Partial<Category>): Promise<Category> {
    const cleanName = String(cat.nome_categoria || cat.id || '').trim().toLowerCase();
    const id = cat.id ? String(cat.id).trim().toLowerCase() : `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const titulo = cat.titulo_exibicao ? String(cat.titulo_exibicao).trim() : cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    const now = new Date().toISOString();

    const newCat: Category = {
      id,
      nome_categoria: cleanName,
      titulo_exibicao: titulo,
      descricao: cat.descricao ? String(cat.descricao).trim() : '',
      status: (cat.status === 'Inativa' ? 'Inativa' : 'Ativa') as 'Ativa' | 'Inativa',
      ordem: Number(cat.ordem) || 0,
      icone: cat.icone || undefined,
      createdAt: now,
      updatedAt: now
    };

    await getPool().query(
      `INSERT INTO categories (id, nome_categoria, titulo_exibicao, descricao, status, ordem, icone, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         titulo_exibicao = VALUES(titulo_exibicao),
         descricao = VALUES(descricao),
         status = VALUES(status),
         ordem = VALUES(ordem),
         icone = VALUES(icone),
         updatedAt = VALUES(updatedAt)`,
      [
        newCat.id,
        newCat.nome_categoria,
        newCat.titulo_exibicao,
        newCat.descricao,
        newCat.status,
        newCat.ordem,
        newCat.icone || null,
        newCat.createdAt,
        newCat.updatedAt
      ]
    );

    return newCat;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    const current = await this.getCategoryById(id);
    if (!current) return null;

    const merged: Category = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Se o nome da categoria mudou, atualiza os produtos que usavam o nome anterior
    if (updates.nome_categoria && updates.nome_categoria.toLowerCase() !== current.nome_categoria.toLowerCase()) {
      await getPool().query(
        `UPDATE products SET categoria = ? WHERE LOWER(categoria) = ?`,
        [updates.nome_categoria.toLowerCase(), current.nome_categoria.toLowerCase()]
      );
    }

    await getPool().query(
      `UPDATE categories SET
        nome_categoria = ?,
        titulo_exibicao = ?,
        descricao = ?,
        status = ?,
        ordem = ?,
        icone = ?,
        updatedAt = ?
       WHERE id = ?`,
      [
        merged.nome_categoria,
        merged.titulo_exibicao,
        merged.descricao,
        merged.status,
        merged.ordem,
        merged.icone || null,
        merged.updatedAt,
        current.id
      ]
    );

    return merged;
  },

  async deleteCategory(id: string, fallbackCategory = 'medicamentos'): Promise<boolean> {
    const current = await this.getCategoryById(id);
    if (!current) return false;

    // Move produtos vinculados para a categoria de fallback para não ficarem órfãos
    await getPool().query(
      `UPDATE products SET categoria = ? WHERE LOWER(categoria) = ?`,
      [fallbackCategory.toLowerCase(), current.nome_categoria.toLowerCase()]
    );

    const [result]: any = await getPool().query(
      `DELETE FROM categories WHERE id = ?`,
      [current.id]
    );

    return result.affectedRows > 0;
  }
};
