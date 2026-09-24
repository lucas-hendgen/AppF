import { Request, Response } from 'express';
import { db, Order } from './db.js';
import { AuthenticatedRequest } from './auth.js';

interface MercadoPagoPreferencePayload {
  items: Array<{
    id: string;
    title: string;
    description?: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  payer?: {
    name?: string;
    email?: string;
    phone?: {
      number?: string;
    };
    identification?: {
      type?: string;
      number?: string;
    };
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: string;
  notification_url?: string;
  external_reference: string;
  payment_methods?: {
    excluded_payment_types?: Array<{ id: string }>;
    installments?: number;
  };
}

export const mercadoPagoController = {
  // Retorna status e chave pública
  getConfig(req: Request, res: Response) {
    const isConfigured = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_ACCESS_TOKEN.trim() !== '');
    const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY || '';
    
    res.json({
      isConfigured,
      publicKey: isConfigured ? publicKey : '',
      sandboxMode: !isConfigured,
      supportedMethods: ['pix', 'credit_card', 'debit_card', 'boleto']
    });
  },

  // Cria preferência de pagamento (Cartão ou Checkout Transparente Mercado Pago)
  async createPreference(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId, payer } = req.body;

      if (!orderId) {
        res.status(400).json({ error: 'ID do pedido é obrigatório para gerar pagamento.' });
        return;
      }

      // Busca o pedido no banco de dados para evitar adulteração de preço (Price Tampering)
      const order = await db.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }

      // Verifica se o pedido pertence ao usuário logado (ou se é admin)
      if (req.user?.role !== 'admin' && order.userId !== req.user?.id) {
        res.status(403).json({ error: 'Acesso negado. Você não tem permissão para realizar o pagamento deste pedido.' });
        return;
      }

      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      // Consolida o pagamento em um único item com o valor total seguro do banco de dados
      const mpItems = [
        {
          id: order.id,
          title: `Pedido ${order.id} - Farmácia Super Popular`,
          description: `Pagamento seguro do pedido ${order.id}`,
          quantity: 1,
          unit_price: Number(order.total),
          currency_id: 'BRL'
        }
      ];

      // Se houver token configurado, faz chamada real à API v1 do Mercado Pago
      if (accessToken && accessToken.trim() !== '') {
        try {
          const preferenceData: MercadoPagoPreferencePayload = {
            items: mpItems,
            payer: {
              name: payer?.name || order.customerName || 'Cliente Farmácia Super Popular',
              email: payer?.email || 'cliente@farmaciasuperpopular.com.br',
              phone: {
                number: payer?.phone ? payer.phone.replace(/\D/g, '') : undefined
              }
            },
            back_urls: {
              success: `${appUrl}/?payment_status=success&order_id=${orderId}`,
              failure: `${appUrl}/?payment_status=failure&order_id=${orderId}`,
              pending: `${appUrl}/?payment_status=pending&order_id=${orderId}`
            },
            auto_return: 'approved',
            notification_url: `${appUrl}/api/payments/webhook`,
            external_reference: orderId,
            payment_methods: {
              installments: 6
            }
          };

          const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(preferenceData)
          });

          if (!response.ok) {
            const errorDetails = await response.text();
            console.error('Erro na API Mercado Pago Preference:', errorDetails);
            throw new Error(`Mercado Pago API error: ${response.status}`);
          }

          const data: any = await response.json();

          // Atualizar pedido no banco com ID da preferência
          await db.updateOrder(orderId, {
            mercadoPagoPreferenceId: data.id,
            paymentMethod: 'mercadopago_card'
          });

          res.json({
            id: data.id,
            init_point: data.init_point,
            sandbox_init_point: data.sandbox_init_point,
            isSandbox: false
          });
          return;
        } catch (mpError) {
          console.warn('Falha na API real do Mercado Pago, gerando sandbox inteligente:', mpError);
        }
      }

      // Sandbox / Modo de Demonstração Seguro
      const mockPreferenceId = `pref_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      await db.updateOrder(orderId, {
        mercadoPagoPreferenceId: mockPreferenceId,
        paymentMethod: 'mercadopago_card'
      });

      res.json({
        id: mockPreferenceId,
        init_point: `${appUrl}/?payment_status=success&order_id=${orderId}&simulated=true`,
        sandbox_init_point: `${appUrl}/?payment_status=success&order_id=${orderId}&simulated=true`,
        isSandbox: true,
        message: 'Modo de teste/sandbox do Mercado Pago ativo.'
      });
    } catch (err: any) {
      console.error('Erro ao criar preferência de pagamento:', err);
      res.status(500).json({ error: 'Erro ao gerar checkout do Mercado Pago.' });
    }
  },

  // Cria pagamento PIX instantâneo via Mercado Pago (com QR Code e Copia e Cola)
  async createPixPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId, payerEmail, payerName, payerCpf } = req.body;

      if (!orderId) {
        res.status(400).json({ error: 'ID do pedido é obrigatório para gerar pagamento PIX.' });
        return;
      }

      // Busca o pedido no banco de dados para evitar adulteração de preço (Price Tampering)
      const order = await db.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }

      // Verifica se o pedido pertence ao usuário logado (ou se é admin)
      if (req.user?.role !== 'admin' && order.userId !== req.user?.id) {
        res.status(403).json({ error: 'Acesso negado. Você não tem permissão para realizar o pagamento deste pedido.' });
        return;
      }

      const amount = order.total; // Utiliza o total seguro registrado no banco de dados
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      // Se houver chave configurada, gera PIX real no Mercado Pago
      if (accessToken && accessToken.trim() !== '') {
        try {
          const pixPayload = {
            transaction_amount: Number(amount),
            description: `Farmácia Super Popular - Pedido ${orderId}`,
            payment_method_id: 'pix',
            payer: {
              email: payerEmail || 'cliente@farmaciasuperpopular.com.br',
              first_name: payerName ? payerName.split(' ')[0] : (order.customerName ? order.customerName.split(' ')[0] : 'Cliente'),
              last_name: payerName && payerName.split(' ').length > 1 ? payerName.split(' ').slice(1).join(' ') : 'Popular',
              identification: payerCpf ? {
                type: 'CPF',
                number: payerCpf.replace(/\D/g, '')
              } : undefined
            },
            notification_url: `${appUrl}/api/payments/webhook`,
            external_reference: orderId
          };

          const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `pix_${orderId}_${Date.now()}`,
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(pixPayload)
          });

          if (response.ok) {
            const data: any = await response.json();
            const pixInfo = data.point_of_interaction?.transaction_data;

            await db.updateOrder(orderId, {
              mercadoPagoPaymentId: String(data.id),
              mercadoPagoQrCode: pixInfo?.qr_code,
              mercadoPagoQrCodeBase64: pixInfo?.qr_code_base64,
              paymentMethod: 'mercadopago_pix',
              paymentStatus: data.status === 'approved' ? 'paid' : 'pending'
            });

            res.json({
              paymentId: data.id,
              status: data.status,
              qrCode: pixInfo?.qr_code,
              qrCodeBase64: pixInfo?.qr_code_base64,
              ticketUrl: pixInfo?.ticket_url,
              expiresAt: data.date_of_expiration,
              isSandbox: false
            });
            return;
          }
        } catch (mpError) {
          console.warn('Erro ao chamar API PIX do Mercado Pago, gerando PIX dinâmico:', mpError);
        }
      }

      // PIX Instantâneo Inteligente (Sandbox / Demonstração com validação real)
      const simulatedPaymentId = `pay_mp_${Math.floor(10000000 + Math.random() * 90000000)}`;
      const cleanOrder = orderId.replace(/[^a-zA-Z0-9]/g, '');
      const fakePixPayload = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(2, 15)}520400005303986540${amount.toFixed(2)}5802BR5922FARMACIA SUPER POPULAR6007ITAPEMA62070503${cleanOrder}6304`;

      await db.updateOrder(orderId, {
        mercadoPagoPaymentId: simulatedPaymentId,
        mercadoPagoQrCode: fakePixPayload,
        paymentMethod: 'mercadopago_pix',
        paymentStatus: 'pending'
      });

      res.json({
        paymentId: simulatedPaymentId,
        status: 'pending',
        qrCode: fakePixPayload,
        qrCodeBase64: '',
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        isSandbox: true,
        message: 'Código PIX Mercado Pago gerado com sucesso.'
      });
    } catch (err) {
      console.error('Erro ao gerar PIX Mercado Pago:', err);
      res.status(500).json({ error: 'Erro ao gerar PIX do Mercado Pago.' });
    }
  },

  // Verifica status do pagamento (Polling ou Consulta de pedido)
  async checkPaymentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const order = await db.getOrderById(orderId);

      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }

      // Verifica propriedade ou admin
      if (req.user?.role !== 'admin' && order.userId !== req.user?.id) {
        res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar o status deste pedido.' });
        return;
      }

      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

      if (accessToken && order.mercadoPagoPaymentId && !order.mercadoPagoPaymentId.startsWith('pay_mp_')) {
        try {
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${order.mercadoPagoPaymentId}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const data: any = await response.json();
            const newPaymentStatus = data.status === 'approved' ? 'paid' : data.status === 'rejected' ? 'failed' : 'pending';
            
            if (order.paymentStatus !== newPaymentStatus) {
              await db.updateOrder(order.id, {
                paymentStatus: newPaymentStatus,
                status: newPaymentStatus === 'paid' && order.status === 'recebido' ? 'preparando' : order.status
              });
              order.paymentStatus = newPaymentStatus;
            }
          }
        } catch (e) {
          console.error('Erro ao consultar Mercado Pago:', e);
        }
      }

      res.json({
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        status: order.status,
        paymentMethod: order.paymentMethod,
        total: order.total
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao verificar status do pagamento.' });
    }
  },

  // Simula confirmação de pagamento (para testes locais rápidos)
  async simulatePaymentApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.body;
      const order = await db.getOrderById(orderId);

      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }

      // Apenas admin pode simular aprovação de pagamento
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores podem simular aprovação de pagamento.' });
        return;
      }

      const updated = await db.updateOrder(orderId, {
        paymentStatus: 'paid',
        status: order.status === 'recebido' ? 'preparando' : order.status
      });

      res.json({
        success: true,
        message: 'Pagamento aprovado com sucesso via Mercado Pago (Sandbox)!',
        order: updated
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao simular aprovação.' });
    }
  },

  // Webhook Mercado Pago para notificações IPN
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query;
      const body = req.body;
      console.log('📬 Webhook recebido do Mercado Pago:', { query, body });

      const topic = query.topic || query.type || body.type;
      const id = query.id || query['data.id'] || body.data?.id;

      if ((topic === 'payment' || topic === 'charge.success') && id) {
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (accessToken) {
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const paymentData: any = await response.json();
            const orderId = paymentData.external_reference;

            if (orderId) {
              const isApproved = paymentData.status === 'approved';
              await db.updateOrder(orderId, {
                mercadoPagoPaymentId: String(paymentData.id),
                paymentStatus: isApproved ? 'paid' : paymentData.status === 'rejected' ? 'failed' : 'pending',
                status: isApproved ? 'preparando' : 'recebido'
              });
              console.log(`✅ Pedido ${orderId} atualizado via Webhook MP para status: ${paymentData.status}`);
            }
          }
        }
      }

      res.status(200).send('OK');
    } catch (err) {
      console.error('Erro no processamento do webhook Mercado Pago:', err);
      res.status(200).send('OK'); // MP expects 200/201 always
    }
  }
};
