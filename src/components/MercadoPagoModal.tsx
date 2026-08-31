import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Copy, Clock, ShieldCheck, QrCode, CreditCard, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';

interface MercadoPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  pixData?: {
    paymentId: string;
    qrCode: string;
    qrCodeBase64?: string;
    expiresAt?: string;
    isSandbox?: boolean;
  } | null;
  preferenceData?: {
    id: string;
    init_point: string;
    sandbox_init_point: string;
    isSandbox: boolean;
  } | null;
  onPaymentSuccess: (order: Order) => void;
}

export const MercadoPagoModal: React.FC<MercadoPagoModalProps> = ({
  isOpen,
  onClose,
  order,
  pixData,
  preferenceData,
  onPaymentSuccess
}) => {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed' | 'refunded'>(order?.paymentStatus || 'pending');
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 30 minutes in seconds

  useEffect(() => {
    if (!isOpen || !order) return;
    setPaymentStatus(order.paymentStatus || 'pending');

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Polling payment status every 4 seconds
    const pollInterval = setInterval(async () => {
      if (paymentStatus === 'paid') return;
      try {
        const res = await api.checkPaymentStatus(order.id);
        if (res.paymentStatus === 'paid') {
          setPaymentStatus('paid');
          const updatedOrder = await api.getOrderById(order.id);
          onPaymentSuccess(updatedOrder);
        }
      } catch (err) {
        console.warn('Polling status error:', err);
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [isOpen, order, paymentStatus]);

  if (!isOpen || !order) return null;

  const copyPixCode = () => {
    const code = pixData?.qrCode || order.mercadoPagoQrCode || '';
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSimulateApproval = async () => {
    setChecking(true);
    try {
      const updated = await api.simulatePaymentApproval(order.id);
      setPaymentStatus('paid');
      onPaymentSuccess(updated);
    } catch (err) {
      console.error('Erro ao simular aprovação:', err);
    } finally {
      setChecking(false);
    }
  };

  const formatMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isPix = order.paymentMethod === 'mercadopago_pix' || Boolean(pixData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] text-slate-655">
        
        {/* Header Mercado Pago */}
        <div className="p-5 bg-gradient-to-r from-[#005f88] to-[#003852] text-white flex items-center justify-between border-b border-[#009ee3]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wide text-white">Mercado Pago</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-white/20 rounded-full">
                  Pagamento Seguro
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Pedido {order.id} • R$ {order.total.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-center">
          
          {/* PAID STATUS SUCCESS */}
          {paymentStatus === 'paid' ? (
            <div className="py-6 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Pagamento Aprovado com Sucesso!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  O Mercado Pago confirmou o recebimento de <strong className="text-slate-800">R$ {order.total.toFixed(2).replace('.', ',')}</strong>.
                </p>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-2xl text-xs text-emerald-800 font-medium text-left space-y-1">
                <p>✓ Pedido enviado para a bancada de separação da farmácia.</p>
                <p>✓ Um farmacêutico irá conferir os itens antes do envio.</p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-100/30 transition-all"
              >
                Acompanhar Pedido
              </button>
            </div>
          ) : isPix ? (
            /* PIX PAYMENT FLOW */
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Expira em: <strong className="text-slate-800 font-bold">{formatMinutes(timeLeft)}</strong></span>
              </div>

              {/* QR Code Container */}
              <div className="relative p-4 bg-white rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
                {pixData?.qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX Mercado Pago"
                    className="w-48 h-48 mx-auto object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      pixData?.qrCode || order.mercadoPagoQrCode || '00020126580014br.gov.bcb.pix'
                    )}`}
                    alt="QR Code PIX Mercado Pago"
                    className="w-48 h-48 mx-auto object-contain rounded-lg"
                  />
                )}
                <div className="absolute inset-x-0 bottom-1 flex justify-center">
                  <span className="text-[10px] font-bold text-gray-700 bg-white/90 px-2 py-0.5 rounded shadow-sm">
                    PIX Instantâneo
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-left bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-xs text-blue-800 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-blue-900">
                  <QrCode className="w-4 h-4 text-blue-600" /> Como pagar:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800/90">
                  <li>Abra o aplicativo do seu banco de preferência</li>
                  <li>Escolha a opção <strong>Pagar com PIX / Ler QR Code</strong></li>
                  <li>Ou use o botão <strong>Copia e Cola</strong> abaixo</li>
                </ol>
              </div>

              {/* Copia e Cola Input and Button */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData?.qrCode || order.mercadoPagoQrCode || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 truncate select-all focus:outline-none"
                  />
                  <button
                    onClick={copyPixCode}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#009EE3] hover:bg-[#0074A6] text-white shadow-sm'
                    }`}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Sandbox Approval Simulation */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <button
                  onClick={handleSimulateApproval}
                  disabled={checking}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {checking ? 'Confirmando...' : 'Simular Confirmação de Pagamento (Ambiente de Teste)'}
                </button>
                <p className="text-[10px] text-slate-500">
                  O sistema verifica o status automaticamente a cada 4 segundos.
                </p>
              </div>
            </div>
          ) : (
            /* CARD / PREFERENCE REDIRECT */
            <div className="space-y-4 py-2">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-left space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Checkout Mercado Pago</span>
                </div>
                <p className="text-xs text-blue-800/90 leading-relaxed">
                  Pague com total segurança utilizando cartão de crédito em até 6x, cartão de débito virtual da Caixa ou saldo Mercado Pago.
                </p>
              </div>

              {preferenceData?.init_point && (
                <a
                  href={preferenceData.init_point}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-[#009EE3] hover:bg-[#0074A6] text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  Pagar Agora no Mercado Pago
                </a>
              )}

              <button
                onClick={handleSimulateApproval}
                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Simular Aprovação Imediata
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
