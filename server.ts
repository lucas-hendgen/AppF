import express from 'express';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { initDatabase, db, Order } from './server/db.js';
import { authController, requireAuth, requireAdmin, AuthenticatedRequest } from './server/auth.js';
import { mercadoPagoController } from './server/mercadopago.js';

function checkScheduledOrder(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours + minutes / 60;

  if (day === 0) { // Domingo
    return currentTime < 8 || currentTime >= 14;
  } else { // Segunda a Sábado
    return currentTime < 8 || currentTime >= 20;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Segurança e Middlewares essenciais
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

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
  app.post('/api/payments/create-preference', requireAuth, mercadoPagoController.createPreference);
  app.post('/api/payments/create-pix', requireAuth, mercadoPagoController.createPixPayment);
  app.get('/api/payments/status/:orderId', requireAuth, mercadoPagoController.checkPaymentStatus);
  app.post('/api/payments/simulate-approval', requireAuth, mercadoPagoController.simulatePaymentApproval);
  app.post('/api/payments/webhook', mercadoPagoController.handleWebhook);

  // === ROTAS DE PEDIDOS (ORDERS) ===
  app.get('/api/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role === 'admin') {
        res.json({ orders: db.getOrders() });
        return;
      }
      res.json({ orders: db.getOrdersByUserId(req.user!.id) });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar pedidos.' });
    }
  });

  app.get('/api/orders/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const order = db.getOrderById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      // Autorização: O usuário deve ser dono do pedido ou admin
      if (req.user?.role !== 'admin' && order.userId !== req.user?.id) {
        res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar este pedido.' });
        return;
      }
      res.json({ order });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar pedido.' });
    }
  });

  app.post('/api/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const orderData = req.body;
      if (!orderData.customerName || !orderData.items || !Array.isArray(orderData.items)) {
        res.status(400).json({ error: 'Dados do pedido incompletos.' });
        return;
      }

      // --- VALIDAÇÃO DE PREÇOS E TOTAIS NO BACK-END (Anti-Price Tampering) ---
      let expectedSubtotal = 0;
      const validatedItems = [];

      for (const item of orderData.items) {
        const dbProd = db.getProductById(item.id);
        if (!dbProd || dbProd.status !== 'Ativo') {
          res.status(400).json({ error: `Produto inválido ou indisponível: ${item.name || item.id}` });
          return;
        }

        // Determinar preço unitário correto com base no banco de dados
        let unitPrice = 0;
        if (dbProd.preco.includes('#')) {
          const rawVars = dbProd.preco.split('#')[1].split('/');
          let foundVarPrice = null;
          const targetVar = item.variations ? String(item.variations).trim() : '';

          for (const v of rawVars) {
            const [vName, vPrice] = v.split(':');
            if (vName.trim() === targetVar) {
              foundVarPrice = parseFloat(String(vPrice).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
              break;
            }
          }
          if (foundVarPrice === null) {
            // Se variação não bateu, usa o preço da primeira disponível
            const firstPriceRaw = rawVars[0].split(':')[1];
            unitPrice = parseFloat(String(firstPriceRaw).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
          } else {
            unitPrice = foundVarPrice;
          }
        } else {
          unitPrice = parseFloat(String(dbProd.preco).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
        }

        const rawQty = Number(item.quantity);
        if (isNaN(rawQty) || rawQty <= 0 || !Number.isInteger(rawQty)) {
          res.status(400).json({ error: `Quantidade inválida para o item: ${item.name || item.id}` });
          return;
        }
        const qty = rawQty;
        expectedSubtotal += unitPrice * qty;

        validatedItems.push({
          id: item.id,
          name: dbProd.nome,
          sku: dbProd.sku,
          price: unitPrice,
          quantity: qty,
          variations: item.variations,
          notes: item.notes
        });
      }

      // Validar Taxa de Entrega
      let expectedDeliveryFee = 0;
      if (orderData.deliveryType === 'delivery' && orderData.address) {
        const neighborhoodName = typeof orderData.address === 'string'
          ? ''
          : String(orderData.address.neighborhood || '').toLowerCase();
        
        const dbNbh = db.getNeighborhoods().find(n => n.bairro.toLowerCase() === neighborhoodName);
        expectedDeliveryFee = dbNbh ? dbNbh.taxa : (Number(orderData.deliveryFee) || 5.0);
      }

      // Validar Cupom de Desconto
      let expectedDiscount = 0;
      if (orderData.couponCode) {
        const dbCoupon = db.getCoupons().find(c => c.codigo.toUpperCase() === String(orderData.couponCode).toUpperCase());
        if (dbCoupon) {
          const val = dbCoupon.valor_desconto;
          if (dbCoupon.tipo_desconto === 'produtos') {
            if (val.includes('%')) {
              const pct = parseFloat(val.replace('%', '')) || 0;
              expectedDiscount = (expectedSubtotal * pct) / 100;
            } else {
              expectedDiscount = parseFloat(val.replace(',', '.')) || 0;
            }
          } else if (dbCoupon.tipo_desconto === 'frete') {
            if (val.includes('%')) {
              const pct = parseFloat(val.replace('%', '')) || 0;
              expectedDiscount = (expectedDeliveryFee * pct) / 100;
            } else {
              expectedDiscount = Math.min(expectedDeliveryFee, parseFloat(val.replace(',', '.')) || 0);
            }
          } else if (dbCoupon.tipo_desconto === 'total') {
            const base = expectedSubtotal + expectedDeliveryFee;
            if (val.includes('%')) {
              const pct = parseFloat(val.replace('%', '')) || 0;
              expectedDiscount = (base * pct) / 100;
            } else {
              expectedDiscount = parseFloat(val.replace(',', '.')) || 0;
            }
          }
        }
      }

      const expectedTotal = Math.max(0, expectedSubtotal + expectedDeliveryFee - expectedDiscount);

      // Verificar adulteração de total (aceita pequena margem de arredondamento de 0.02)
      const clientTotal = Number(orderData.total || 0);
      if (Math.abs(clientTotal - expectedTotal) > 0.02) {
        res.status(400).json({
          error: 'Erro de validação financeira. O valor total do pedido diverge do esperado pelo sistema.'
        });
        return;
      }

      const orderId = orderData.id || `FSP-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder: Order = {
        id: orderId,
        userId: req.user!.id, // Força a associação segura com o usuário logado
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone || '',
        deliveryType: orderData.deliveryType || 'delivery',
        address: orderData.address,
        tableNumber: orderData.tableNumber,
        items: validatedItems, // Utiliza os itens validados e com preços garantidos do DB
        subtotal: expectedSubtotal,
        deliveryFee: expectedDeliveryFee,
        discount: expectedDiscount,
        couponCode: orderData.couponCode ? String(orderData.couponCode).toUpperCase() : undefined,
        total: expectedTotal,
        paymentMethod: orderData.paymentMethod || 'pix',
        paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'dinheiro' || orderData.paymentMethod === 'cartao_entrega' ? 'pending' : 'pending'),
        status: 'recebido',
        changeAmount: orderData.changeAmount,
        notes: orderData.notes,
        scheduled: checkScheduledOrder(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const saved = db.createOrder(newOrder);

      // Creditar pontos de fidelidade
      const user = db.getUserById(req.user!.id);
      if (user) {
        const earnedPoints = Math.floor(newOrder.total * 2); // 2 pontos por R$ 1,00
        db.updateUser(user.id, {
          loyaltyPoints: (user.loyaltyPoints || 0) + earnedPoints
        });
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

  app.put('/api/orders/:id/unschedule', requireAdmin, (req, res) => {
    try {
      const updated = db.updateOrder(req.params.id, { scheduled: false });
      if (!updated) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      res.json({ message: 'Agendamento aprovado.', order: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao aprovar agendamento do pedido.' });
    }
  });

  app.put('/api/orders/:id/reject-schedule', requireAdmin, (req, res) => {
    try {
      const updated = db.updateOrder(req.params.id, { scheduled: false, status: 'cancelado' });
      if (!updated) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      res.json({ message: 'Agendamento recusado e pedido cancelado.', order: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao recusar agendamento do pedido.' });
    }
  });

  // === PRODUTOS ===
  app.get('/api/products', (req, res) => {
    try {
      const products = db.getProducts().filter(p => p.status === 'Ativo');
      res.json({ products });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar produtos.' });
    }
  });

  // === CUPONS E BAIRROS ===
  app.get('/api/coupons', requireAdmin, (req, res) => {
    try {
      res.json({ coupons: db.getCoupons() });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar cupons.' });
    }
  });

  app.post('/api/coupons/validate', (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ error: 'Código do cupom é obrigatório.' });
        return;
      }
      const cleanCode = code.trim().toUpperCase();
      const found = db.getCoupons().find(c => c.codigo.toUpperCase() === cleanCode);
      if (!found) {
        res.status(404).json({ error: 'Cupom não encontrado ou inválido.' });
        return;
      }
      res.json({ coupon: found });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao validar cupom.' });
    }
  });

  app.get('/api/neighborhoods', (req, res) => {
    try {
      res.json({ neighborhoods: db.getNeighborhoods() });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar bairros.' });
    }
  });

  app.get('/api/admin/products', requireAdmin, (req, res) => {
    try {
      res.json({ products: db.getProducts() });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar produtos.' });
    }
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    try {
      const data = req.body;
      if (!data.nome || !data.sku || !data.categoria) {
        res.status(400).json({ error: 'Nome, SKU e categoria são obrigatórios.' });
        return;
      }
      const product = db.createProduct(data);
      res.status(201).json({ product });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao criar produto.' });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = db.updateProduct(id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Produto não encontrado.' });
        return;
      }
      res.json({ product: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = db.deleteProduct(id);
      if (!deleted) {
        res.status(404).json({ error: 'Produto não encontrado.' });
        return;
      }
      res.json({ message: 'Produto removido com sucesso.' });
    } catch (err) {
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
      
      const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
      const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

      const pixRevenue = paidOrders
        .filter(o => o.paymentMethod === 'mercadopago_pix' || o.paymentMethod === 'pix')
        .reduce((sum, o) => sum + o.total, 0);

      const creditCardRevenue = paidOrders
        .filter(o => o.paymentMethod === 'mercadopago_card')
        .reduce((sum, o) => sum + o.total, 0);

      const debitCardRevenue = paidOrders
        .filter(o => o.paymentMethod === 'cartao_entrega' || o.paymentMethod === 'debit_card')
        .reduce((sum, o) => sum + o.total, 0);

      const cashRevenue = paidOrders
        .filter(o => o.paymentMethod === 'dinheiro')
        .reduce((sum, o) => sum + o.total, 0);

      const cancelledOrders = orders.filter(o => o.status === 'cancelado');
      const cancelledCount = cancelledOrders.length;
      const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + o.total, 0);

      const deliveryCount = orders.filter(o => o.deliveryType === 'delivery').length;
      const pickupCount = orders.filter(o => o.deliveryType === 'pickup' || o.deliveryType === 'local').length;
      const pendingOrders = orders.filter(o => o.status !== 'concluido' && o.status !== 'cancelado').length;

      // Calcular faturamento diário dos últimos 7 dias
      const salesTrend = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        const dayTotal = paidOrders
          .filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate.toDateString() === date.toDateString();
          })
          .reduce((sum, o) => sum + o.total, 0);

        return { date: dateStr, value: dayTotal };
      });

      res.json({
        totalRevenue,
        pixRevenue,
        creditCardRevenue,
        debitCardRevenue,
        cashRevenue,
        cancelledCount,
        cancelledRevenue,
        totalOrders: orders.length,
        totalMembers: users.length,
        pendingOrders,
        deliveryCount,
        pickupCount,
        salesTrend
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao gerar estatísticas.' });
    }
  });

  app.post('/api/admin/coupons', requireAdmin, (req, res) => {
    try {
      const coupon = db.createCoupon(req.body);
      res.status(201).json({ coupon });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao criar cupom.' });
    }
  });

  app.delete('/api/admin/coupons/:code', requireAdmin, (req, res) => {
    try {
      const deleted = db.deleteCoupon(req.params.code);
      if (!deleted) {
        res.status(404).json({ error: 'Cupom não encontrado.' });
        return;
      }
      res.json({ message: 'Cupom removido com sucesso.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao remover cupom.' });
    }
  });

  app.put('/api/admin/neighborhoods/:bairro', requireAdmin, (req, res) => {
    try {
      const updated = db.updateNeighborhood(req.params.bairro, req.body.taxa);
      if (!updated) {
        res.status(404).json({ error: 'Bairro não encontrado.' });
        return;
      }
      res.json({ neighborhood: updated });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar taxa de entrega.' });
    }
  });

  // === ROTAS DE BANNERS ===
  app.get('/api/banners', (req, res) => {
    try {
      res.json({ banners: db.getBanners() });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar banners.' });
    }
  });

  app.post('/api/admin/banners', requireAdmin, (req, res) => {
    try {
      const banner = db.createBanner(req.body);
      res.status(201).json({ banner });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao criar banner.' });
    }
  });

  app.put('/api/admin/banners/:id', requireAdmin, (req, res) => {
    try {
      const banner = db.updateBanner(req.params.id, req.body);
      if (!banner) {
        res.status(404).json({ error: 'Banner não encontrado.' });
        return;
      }
      res.json({ banner });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar banner.' });
    }
  });

  app.delete('/api/admin/banners/:id', requireAdmin, (req, res) => {
    try {
      const deleted = db.deleteBanner(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Banner não encontrado.' });
        return;
      }
      res.json({ message: 'Banner removido com sucesso.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao remover banner.' });
    }
  });

  // === TRATAMENTO GLOBAL DE ERROS (Middleware JSON para evitar HTML) ===
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ [ERRO INTERNO NO SERVIDOR]', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      error: err.message || 'Ocorreu um erro interno no servidor. Por favor, tente novamente.'
    });
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
