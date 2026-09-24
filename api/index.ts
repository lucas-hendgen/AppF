import express from 'express';
import cors from 'cors';
import { initDatabase, db, Order } from '../server/db.js';
import { authController, requireAuth, requireAdmin, AuthenticatedRequest } from '../server/auth.js';
import { mercadoPagoController } from '../server/mercadopago.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  googleAuthRateLimiter
} from '../server/rateLimiter.js';

function checkScheduledOrder(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours + minutes / 60;

  if (day === 0) {
    return currentTime < 8 || currentTime >= 14;
  } else {
    return currentTime < 8 || currentTime >= 20;
  }
}

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Middleware para inicializar o banco de dados sob demanda
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Erro ao conectar no banco MySQL:', err);
    }
  }
  next();
});

// === ROTAS DE AUTENTICAÇÃO E PERFIL DE MEMBROS (Com Rate Limiting Ativo) ===
app.post('/api/auth/register', registerRateLimiter, authController.register);
app.post('/api/auth/login', loginRateLimiter, authController.login);
app.post('/api/auth/forgot-password', forgotPasswordRateLimiter, authController.forgotPassword);
app.post('/api/auth/reset-password', resetPasswordRateLimiter, authController.resetPassword);
app.post('/api/auth/google', googleAuthRateLimiter, authController.googleAuth);
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
app.get('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role === 'admin') {
      const orders = await db.getOrders();
      res.json({ orders });
      return;
    }
    const orders = await db.getOrdersByUserId(req.user!.id);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar pedidos.' });
  }
});

app.get('/api/orders/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    if (req.user?.role !== 'admin' && order.userId !== req.user?.id) {
      res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar este pedido.' });
      return;
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pedido.' });
  }
});

app.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orderData = req.body;
    if (!orderData.customerName || !orderData.items || !Array.isArray(orderData.items)) {
      res.status(400).json({ error: 'Dados do pedido incompletos.' });
      return;
    }

    let expectedSubtotal = 0;
    const validatedItems = [];

    for (const item of orderData.items) {
      const dbProd = await db.getProductById(item.id);
      if (!dbProd || dbProd.status !== 'Ativo') {
        res.status(400).json({ error: `Produto inválido ou indisponível: ${item.name || item.id}` });
        return;
      }

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

    let expectedDeliveryFee = 0;
    if (orderData.deliveryType === 'delivery' && orderData.address) {
      const neighborhoodName = typeof orderData.address === 'string'
        ? ''
        : String(orderData.address.neighborhood || '').toLowerCase();
      
      const allNeighborhoods = await db.getNeighborhoods();
      const dbNbh = allNeighborhoods.find(n => n.bairro.toLowerCase() === neighborhoodName);
      expectedDeliveryFee = dbNbh ? dbNbh.taxa : (Number(orderData.deliveryFee) || 5.0);
    }

    let expectedDiscount = 0;
    if (orderData.couponCode) {
      const allCoupons = await db.getCoupons();
      const dbCoupon = allCoupons.find(c => c.codigo.toUpperCase() === String(orderData.couponCode).toUpperCase());
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
      userId: req.user!.id,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone || '',
      deliveryType: orderData.deliveryType || 'delivery',
      address: orderData.address,
      tableNumber: orderData.tableNumber,
      items: validatedItems,
      subtotal: expectedSubtotal,
      deliveryFee: expectedDeliveryFee,
      discount: expectedDiscount,
      couponCode: orderData.couponCode ? String(orderData.couponCode).toUpperCase() : undefined,
      total: expectedTotal,
      paymentMethod: orderData.paymentMethod || 'pix',
      paymentStatus: orderData.paymentStatus || 'pending',
      status: 'recebido',
      changeAmount: orderData.changeAmount,
      notes: orderData.notes,
      scheduled: checkScheduledOrder(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await db.createOrder(newOrder);

    const user = await db.getUserById(req.user!.id);
    if (user) {
      const earnedPoints = Math.floor(newOrder.total * 2);
      await db.updateUser(user.id, {
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

app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const updates: Partial<Order> = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    const updated = await db.updateOrderStatus(req.params.id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    res.json({ message: 'Status do pedido atualizado com sucesso.', order: updated });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar status do pedido.' });
  }
});

app.put('/api/orders/:id/unschedule', requireAdmin, async (req, res) => {
  try {
    const updated = await db.updateOrder(req.params.id, { scheduled: false, status: 'preparando' });
    if (!updated) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    res.json({ message: 'Agendamento aprovado para entrega imediata.', order: updated });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar agendamento.' });
  }
});

app.put('/api/orders/:id/reject-schedule', requireAdmin, async (req, res) => {
  try {
    const updated = await db.updateOrder(req.params.id, { status: 'cancelado' });
    if (!updated) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    res.json({ message: 'Agendamento cancelado com sucesso.', order: updated });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao recusar agendamento.' });
  }
});

// === ROTAS DO ADMIN ===
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const orders = await db.getOrders();
    const users = await db.getUsers();

    let totalRevenue = 0;
    let pixRevenue = 0;
    let creditCardRevenue = 0;
    let debitCardRevenue = 0;
    let cashRevenue = 0;
    let cancelledCount = 0;
    let cancelledRevenue = 0;
    let pendingOrders = 0;
    let deliveryCount = 0;
    let pickupCount = 0;

    for (const order of orders) {
      if (order.status === 'cancelado') {
        cancelledCount++;
        cancelledRevenue += order.total;
        continue;
      }

      totalRevenue += order.total;

      const method = (order.paymentMethod || '').toLowerCase();
      if (method.includes('pix')) pixRevenue += order.total;
      else if (method.includes('card') || method.includes('cartao')) {
        if (method.includes('debit') || method.includes('debito')) debitCardRevenue += order.total;
        else creditCardRevenue += order.total;
      } else if (method.includes('cash') || method.includes('dinheiro')) {
        cashRevenue += order.total;
      }

      if (order.status === 'recebido' || order.status === 'preparando') pendingOrders++;
      if (order.deliveryType === 'delivery') deliveryCount++;
      else pickupCount++;
    }

    const salesTrend = [
      { date: 'Seg', value: Math.round(totalRevenue * 0.12) },
      { date: 'Ter', value: Math.round(totalRevenue * 0.15) },
      { date: 'Qua', value: Math.round(totalRevenue * 0.18) },
      { date: 'Qui', value: Math.round(totalRevenue * 0.14) },
      { date: 'Sex', value: Math.round(totalRevenue * 0.22) },
      { date: 'Sáb', value: Math.round(totalRevenue * 0.19) }
    ];

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
    res.status(500).json({ error: 'Erro ao calcular estatísticas.' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.getUsers();
    const safeUsers = users.map(u => {
      const { passwordHash, recoveryCode, recoveryCodeExpires, ...safe } = u;
      return safe;
    });
    res.json({ users: safeUsers });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// === PRODUTOS ===
app.get('/api/products', async (req, res) => {
  try {
    const all = await db.getProducts();
    const products = all.filter(p => p.status === 'Ativo');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos.' });
  }
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos.' });
  }
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const product = await db.createProduct(req.body);
    res.status(201).json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar produto.' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const product = await db.updateProduct(Number(req.params.id), req.body);
    if (!product) {
      res.status(404).json({ error: 'Produto não encontrado.' });
      return;
    }
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar produto.' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await db.deleteProduct(Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Produto não encontrado.' });
      return;
    }
    res.json({ message: 'Produto removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover produto.' });
  }
});

// === CUPONS ===
app.get('/api/coupons', async (req, res) => {
  try {
    const coupons = await db.getCoupons();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar cupons.' });
  }
});

app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Código do cupom é obrigatório.' });
      return;
    }
    const allCoupons = await db.getCoupons();
    const coupon = allCoupons.find(c => c.codigo.toUpperCase() === String(code).toUpperCase());
    if (!coupon) {
      res.status(404).json({ error: 'Cupom de desconto inválido ou expirado.' });
      return;
    }
    res.json({ coupon, message: `Cupom ${coupon.codigo} aplicado com sucesso!` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao validar cupom.' });
  }
});

app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
  try {
    const coupon = await db.createCoupon(req.body);
    res.status(201).json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar cupom.' });
  }
});

app.delete('/api/admin/coupons/:code', requireAdmin, async (req, res) => {
  try {
    const deleted = await db.deleteCoupon(req.params.code);
    if (!deleted) {
      res.status(404).json({ error: 'Cupom não encontrado.' });
      return;
    }
    res.json({ message: 'Cupom removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover cupom.' });
  }
});

// === BAIRROS ===
app.get('/api/neighborhoods', async (req, res) => {
  try {
    const neighborhoods = await db.getNeighborhoods();
    res.json({ neighborhoods });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar bairros.' });
  }
});

app.put('/api/admin/neighborhoods/:bairro', requireAdmin, async (req, res) => {
  try {
    const neighborhood = await db.updateNeighborhood(req.params.bairro, req.body.taxa);
    if (!neighborhood) {
      res.status(404).json({ error: 'Bairro não encontrado.' });
      return;
    }
    res.json({ neighborhood });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar bairro.' });
  }
});

// === BANNERS ===
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await db.getBanners();
    res.json({ banners });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar banners.' });
  }
});

app.post('/api/admin/banners', requireAdmin, async (req, res) => {
  try {
    const banner = await db.createBanner(req.body);
    res.status(201).json({ banner });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar banner.' });
  }
});

app.put('/api/admin/banners/:id', requireAdmin, async (req, res) => {
  try {
    const banner = await db.updateBanner(req.params.id, req.body);
    if (!banner) {
      res.status(404).json({ error: 'Banner não encontrado.' });
      return;
    }
    res.json({ banner });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar banner.' });
  }
});

app.delete('/api/admin/banners/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await db.deleteBanner(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Banner não encontrado.' });
      return;
    }
    res.json({ message: 'Banner removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover banner.' });
  }
});

// === ROTAS DE CATEGORIAS DE PRODUTOS ===
app.get('/api/categories', async (req, res) => {
  try {
    const onlyActive = req.query.all !== 'true';
    const categories = await db.getCategories(onlyActive);
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar categorias.' });
  }
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const category = await db.createCategory(req.body);
    res.status(201).json({ category });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao criar categoria.' });
  }
});

app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const category = await db.updateCategory(req.params.id, req.body);
    if (!category) {
      res.status(404).json({ error: 'Categoria não encontrada.' });
      return;
    }
    res.json({ category });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar categoria.' });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const fallback = req.query.fallback ? String(req.query.fallback) : 'medicamentos';
    const deleted = await db.deleteCategory(req.params.id, fallback);
    if (!deleted) {
      res.status(404).json({ error: 'Categoria não encontrada.' });
      return;
    }
    res.json({ message: 'Categoria removida com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao remover categoria.' });
  }
});

// === TRATAMENTO GLOBAL DE ERROS ===
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ [ERRO INTERNO NO SERVIDOR]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Ocorreu um erro interno no servidor. Por favor, tente novamente.'
  });
});

export default app;
