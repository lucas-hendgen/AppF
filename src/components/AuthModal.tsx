import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Phone, FileText, CheckCircle2, ShieldCheck, Sparkles, Eye, EyeOff, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, authModalReason, closeAuthModal, openAuthModal, login, register, forgotPassword, resetPassword, googleAuth } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot_password'>(authModalMode);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync mode when modal opens or mode changes
  useEffect(() => {
    setActiveTab(authModalMode);
    setErrorMsg('');
    setSuccessMsg('');
  }, [authModalMode, isAuthModalOpen]);

  // Form states - Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form states - Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStreet, setRegStreet] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [regNeighborhood, setRegNeighborhood] = useState('Centro');
  const [regHealthNotes, setRegHealthNotes] = useState('');

  // Form states - Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'reset'>('request');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  if (!isAuthModalOpen) return null;

  // Format CPF helper
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setRegCpf(v);
  };

  // Format Phone helper
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 6) {
      v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{1,5})/, '($1) $2');
    }
    setRegPhone(v);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await login(loginIdentifier, loginPassword);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await register({
        name: regName,
        email: regEmail,
        cpf: regCpf,
        phone: regPhone,
        password: regPassword,
        address: regStreet ? {
          street: regStreet,
          number: regNumber || 'S/N',
          neighborhood: regNeighborhood,
          city: 'Itapema',
          state: 'SC'
        } : undefined,
        healthNotes: regHealthNotes
      });
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setErrorMsg('Informe seu e-mail cadastrado.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await forgotPassword(forgotEmail);
      setSuccessMsg(res.message || 'Código de recuperação enviado com sucesso! Verifique o console do servidor.');
      setRecoveryStep('reset');
    } catch (err: any) {
      setErrorMsg(err.message || 'E-mail não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode) {
      setErrorMsg('Informe o código de verificação enviado.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await resetPassword(forgotEmail, newPassword, recoveryCode);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAction = async (customEmail?: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const email = customEmail || forgotEmail || (loginIdentifier.includes('@') ? loginIdentifier : 'maria.helena@email.com');
      const name = email.includes('maria') ? 'Maria Helena Silveira' : 'Cliente Google';
      const res = await googleAuth({
        email,
        name,
        googleId: `goog_${Date.now()}`
      });
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao autenticar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] text-slate-600">
        
        {/* Header with gradient */}
        <div className="p-6 bg-gradient-to-br from-[#064e3b] to-[#047857] text-white relative border-b border-[#065f46]/30">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 text-emerald-300 rounded-2xl border border-emerald-400/20 shadow-inner">
              {activeTab === 'forgot_password' ? (
                <KeyRound className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {activeTab === 'forgot_password' ? 'Recuperação de Senha' : 'Portal de Membros & Saúde'}
              </h2>
              <p className="text-xs text-emerald-100">
                {activeTab === 'forgot_password' 
                  ? 'Recupere o acesso via Google ou por e-mail com facilidade'
                  : 'Acesse seus pedidos, descontos do clube e histórico farmacêutico'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          {activeTab !== 'forgot_password' ? (
            <div className="flex gap-2 mt-5 p-1 bg-black/20 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'login'
                    ? 'bg-[#10b981] text-white shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Entrar na Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'register'
                    ? 'bg-[#10b981] text-white shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Criar Conta Grátis
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-100 hover:text-white bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-lg transition-all font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Login
              </button>
              <span className="text-xs text-emerald-200 font-medium">Recuperação Segura</span>
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Context Reason Banner (e.g. required for purchase) */}
          {authModalReason && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-semibold flex items-center gap-2.5 shadow-md">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <span>{authModalReason}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: LOGIN */}
          {/* ======================================================== */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  E-mail ou CPF
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="ex: seu.email@exemplo.com ou CPF"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (loginIdentifier.includes('@')) {
                        setForgotEmail(loginIdentifier);
                      }
                      setActiveTab('forgot_password');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-[#10b981] hover:text-[#34d399] font-semibold hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-100/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Validando credenciais...' : 'Acessar Conta de Membro'}
              </button>

              {/* Fast Google Login Option */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase font-bold tracking-wider">Ou continue com</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleAction()}
                disabled={loading}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                  <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"/>
                </svg>
                <span>Entrar com a Conta Google</span>
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REGISTER */}
          {/* ======================================================== */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              
              {/* Quick Google Sign up */}
              <button
                type="button"
                onClick={() => handleGoogleAction('novo.membro@gmail.com')}
                disabled={loading}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-3 mb-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                  <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"/>
                </svg>
                <span>Cadastre-se Rápido com Google</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase font-bold tracking-wider">Ou preencha seus dados</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silveira"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    E-mail *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={handlePhoneChange}
                      placeholder="(47) 99999-9999"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    CPF (Para Descontos)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={regCpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Senha (mín 6 dig) *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço Inicial Opcional */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Endereço Principal em Itapema (Opcional)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={regStreet}
                      onChange={(e) => setRegStreet(e.target.value)}
                      placeholder="Rua / Avenida"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-[#10b981]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="Número"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-[#10b981]"
                    />
                  </div>
                </div>
                <select
                  value={regNeighborhood}
                  onChange={(e) => setRegNeighborhood(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-[#10b981]"
                >
                  <option value="Centro" className="bg-white text-slate-800">Centro (Itapema)</option>
                  <option value="Meia Praia" className="bg-white text-slate-800">Meia Praia</option>
                  <option value="Morretes" className="bg-white text-slate-800">Morretes</option>
                  <option value="Canto da Praia" className="bg-white text-slate-800">Canto da Praia</option>
                  <option value="Tabuleiro" className="bg-white text-slate-800">Tabuleiro</option>
                  <option value="Várzea" className="bg-white text-slate-800">Várzea</option>
                  <option value="Alto São Bento" className="bg-white text-slate-800">Alto São Bento</option>
                </select>
              </div>

              {/* Observações Farmacêuticas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Observações de Saúde / Alergias (Sigiloso)
                </label>
                <textarea
                  rows={2}
                  value={regHealthNotes}
                  onChange={(e) => setRegHealthNotes(e.target.value)}
                  placeholder="Ex: Alergia a Dipirona, diabético(a), hipertenso(a)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                ></textarea>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-[11px] text-emerald-800 font-medium">
                  Você ganha <strong className="font-bold text-emerald-950">+50 Pontos Fidelidade</strong> no ato do cadastro!
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-100/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Criando sua conta...' : 'Concluir Cadastro de Membro'}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 3: FORGOT PASSWORD (GOOGLE + EMAIL) */}
          {/* ======================================================== */}
          {activeTab === 'forgot_password' && (
            <div className="space-y-5">
              
              {/* Option 1: Recover / Login with Google */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200/50">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Opção 1: Recuperação Imediata com Google</h3>
                    <p className="text-xs text-slate-500">Acesse sua conta instantaneamente sem precisar lembrar a senha</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGoogleAction()}
                  disabled={loading}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-emerald-500 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-3 shadow-md"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                    <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"/>
                  </svg>
                  <span>Recuperar / Entrar com Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase font-bold tracking-wider">Ou redefinir por E-mail</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Option 2: Recover via Email */}
              {recoveryStep === 'request' ? (
                <form onSubmit={handleForgotPasswordRequest} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Seu E-mail Cadastrado
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="ex: seu.email@exemplo.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enviaremos um código de verificação para redefinir sua senha com segurança.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-100/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? 'Enviando código...' : 'Enviar Código de Recuperação'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 animate-in fade-in">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    Código de 6 dígitos enviado para <strong>{forgotEmail}</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Código de Verificação (6 Dígitos)
                    </label>
                    <input
                      type="text"
                      required
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Ex: 123456"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 text-center tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nova Senha (mínimo 6 caracteres)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite sua nova senha"
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('request')}
                      className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold rounded-xl text-slate-600"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-100/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? 'Salvando nova senha...' : 'Salvar Senha e Entrar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
