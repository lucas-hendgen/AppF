import express from 'express';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { initDatabase, db, Order } from './server/db.js';
import { authController, requireAuth, requireAdmin, AuthenticatedRequest } from './server/auth.js';
import { mercadoPagoController } from './server/mercadopago.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares essenciais
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Inicializa banco de dados seguro
  initDatabase();

  // === ROTAS DE AUTENTICAÇÃO E PERFIL DE MEMBROS ===
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/forgot-password', authController.forgotPassword);
  app.post('/api/auth/reset-password', authController.resetPassword);
  app.post('/api/auth/google', authController.googleAuth);
  app.get('/api/auth/me', requireAuth, authController.me);
  app.put('/api/auth/profile', requireAuth, authController.updateProfile);
  app.post('/api/auth/address', requireAuth, authController.addAddress);
  app.delete('/api/auth/address/:addressId', requireAuth, authController.deleteAddress);

  // === ROTAS DO MERCADO PAGO ===
  app.get('/api/payments/config', mercadoPagoController.getConfig);
  app.post('/api/payments/create-preference', mercadoPagoController.createPreference);
  app.post('/api/payments/create-pix', mercadoPagoController.createPixPayment);
  app.get('/api/payments/status/:orderId', mercadoPagoController.checkPaymentStatus);
  app.post('/api/payments/simulate-approval', mercadoPagoController.simulatePaymentApproval);
  app.post('/api/payments/webhook', mercadoPagoController.handleWebhook);

  // === ROTAS DE PEDIDOS (ORDERS) ===
  app.get('/api/orders', (req: AuthenticatedRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const JWT_SECRET = process.env.JWT_SECRET || 'farmacia-super-popular-jwt-secret-key-2026';
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded.role === 'admin') {
            res.json({ orders: db.getOrders() });
            return;
          }
          res.json({ orders: db.getOrdersByUserId(decoded.id) });
          return;
        } catch {
          // Token inválido, cai no fluxo geral
        }
      }
      // Se não autenticado ou filtro público
      const userId = req.query.userId as string;
      if (userId) {
        res.json({ orders: db.getOrdersByUserId(userId) });
      } else {
        res.json({ orders: db.getOrders() });
      }
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar pedidos.' });
    }
  });

  app.get('/api/orders/:id', (req, res) => {
    try {
      const order = db.getOrderById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      res.json({ order });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar pedido.' });
    }
  });

  app.post('/api/orders', (req, res) => {
    try {
      const orderData = req.body;
      if (!orderData.customerName || !orderData.items || !Array.isArray(orderData.items)) {
        res.status(400).json({ error: 'Dados do pedido incompletos.' });
        return;
      }

      const orderId = orderData.id || `FSP-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder: Order = {
        id: orderId,
        userId: orderData.userId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone || '',
        deliveryType: orderData.deliveryType || 'delivery',
        address: orderData.address,
        tableNumber: orderData.tableNumber,
        items: orderData.items,
        subtotal: Number(orderData.subtotal || 0),
        deliveryFee: Number(orderData.deliveryFee || 0),
        discount: Number(orderData.discount || 0),
        couponCode: orderData.couponCode,
        total: Number(orderData.total || 0),
        paymentMethod: orderData.paymentMethod || 'pix',
        paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'dinheiro' || orderData.paymentMethod === 'cartao_entrega' ? 'pending' : 'pending'),
        status: 'recebido',
        changeAmount: orderData.changeAmount,
        notes: orderData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const saved = db.createOrder(newOrder);

      // Se o usuário estiver logado, creditar pontos de fidelidade
      if (orderData.userId) {
        const user = db.getUserById(orderData.userId);
        if (user) {
          const earnedPoints = Math.floor(newOrder.total * 2); // 2 pontos por R$ 1,00
          db.updateUser(user.id, {
            loyaltyPoints: (user.loyaltyPoints || 0) + earnedPoints
          });
        }
      }

      res.status(201).json({
        message: 'Pedido registrado com sucesso no sistema da farmácia.',
        order: saved
      });
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      res.status(500).json({ error: 'Erro ao registrar pedido.' });
    }
  });

  app.put('/api/orders/:id/status', requireAdmin, (req, res) => {
    try {
      const { status, paymentStatus } = req.body;
      const updates: Partial<Order> = {};
      if (status) updates.status = status;
      if (paymentStatus) updates.paymentStatus = paymentStatus;

      const updated = db.updateOrder(req.params.id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      res.json({ message: 'Status do pedido atualizado.', order: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar status do pedido.' });
    }
  });

  // === ROTAS DE PRODUTOS (CATÁLOGO FARMACÊUTICO) ===
  app.get('/api/products', (_req, res) => {
    try {
      const products = db.getProducts();
      res.json({ products });
    } catch (err) {
      console.error('Erro ao listar produtos:', err);
      res.status(500).json({ error: 'Erro ao listar produtos.' });
    }
  });

  app.get('/api/products/:id', (req, res) => {
    try {
      const product = db.getProductById(Number(req.params.id));
      if (!product) {
        res.status(404).json({ error: 'Produto não encontrado.' });
        return;
      }
      res.json({ product });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar produto.' });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const { nome, sku, categoria, preco, descricao, status, imagem, classificacaoAdicional, observacoes } = req.body;
      if (!nome || !preco) {
        res.status(400).json({ error: 'Nome e Preço são obrigatórios.' });
        return;
      }

      const newProduct = {
        id: Date.now(),
        sku: sku || `PROD${Math.floor(100 + Math.random() * 900)}`,
        nome,
        categoria: categoria || 'medicamentos',
        preco: String(preco).trim(),
        descricao: descricao || '',
        status: status || 'Ativo',
        classificacaoAdicional: classificacaoAdicional || '',
        observacoes: observacoes || '',
        imagem: imagem || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
      };

      const saved = db.createProduct(newProduct);
      res.status(201).json({ message: 'Produto adicionado ao catálogo com sucesso.', product: saved });
    } catch (err) {
      console.error('Erro ao criar produto:', err);
      res.status(500).json({ error: 'Erro ao adicionar produto.' });
    }
  });

  app.put('/api/products/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;
      const updated = db.updateProduct(id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Produto não encontrado.' });
        return;
      }
      res.json({ message: 'Produto atualizado com sucesso.', product: updated });
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
  });

  app.patch('/api/products/:id/price', (req, res) => {
    try {
      const id = Number(req.params.id);
      const { preco } = req.body;
      if (!preco) {
        res.status(400).json({ error: 'Preço é obrigatório.' });
        return;
      }
      const updated = db.updateProductPrice(id, String(preco).trim());
      if (!updated) {
        res.status(404).json({ error: 'Produto não encontrado.' });
        return;
      }
      res.json({ message: 'Preço do produto atualizado com sucesso.', product: updated });
    } catch (err) {
      console.error('Erro ao atualizar valor do produto:', err);
      res.status(500).json({ error: 'Erro ao atualizar valor do produto.' });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = db.deleteProduct(id);
      if (!deleted) {
        res.status(404).json({ error: 'Produto não encontrado ou já removido.' });
        return;
      }
      res.json({ message: 'Produto removido do catálogo com sucesso.', success: true, id });
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      res.status(500).json({ error: 'Erro ao remover produto.' });
    }
  });

  // === ADMIN USERS & STATS ===
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    try {
      const users = db.getUsers().map(u => {
        const { passwordHash, ...safe } = u;
        return safe;
      });
      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar usuários.' });
    }
  });

  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    try {
      const orders = db.getOrders();
      const users = db.getUsers();
      
      const totalRevenue = orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.total, 0);

      const deliveryCount = orders.filter(o => o.deliveryType === 'delivery').length;
      const pickupCount = orders.filter(o => o.deliveryType === 'pickup' || o.deliveryType === 'local').length;
      const pendingOrders = orders.filter(o => o.status !== 'concluido' && o.status !== 'cancelado').length;

      res.json({
        totalRevenue,
        totalOrders: orders.length,
        totalMembers: users.length,
        pendingOrders,
        deliveryCount,
        pickupCount
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao gerar estatísticas.' });
    }
  });

  // === VITE / STATIC SERVING ===
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Farmácia Super Popular rodando em http://localhost:${PORT}`);
  });
}

startServer();
