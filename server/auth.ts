import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, UserProfile, UserAddress } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'farmacia-super-popular-jwt-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'member' | 'admin';
  };
}

export function generateToken(user: UserProfile): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function sanitizeUser(user: UserProfile): Omit<UserProfile, 'passwordHash' | 'recoveryCode' | 'recoveryCodeExpires'> {
  const { passwordHash, recoveryCode, recoveryCodeExpires, ...safeUser } = user;
  return safeUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autorizado. Token de autenticação não fornecido.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: 'member' | 'admin' };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão expirada ou token inválido. Por favor, faça login novamente.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta função.' });
      return;
    }
    next();
  });
}

// Controller methods
export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, cpf, phone, password, address, healthNotes } = req.body;

      if (!name || !email || !password || !phone) {
        res.status(400).json({ error: 'Nome, e-mail, telefone e senha são obrigatórios.' });
        return;
      }

      if (typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
        return;
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const existingEmail = await db.getUserByEmail(cleanEmail);
      if (existingEmail) {
        res.status(409).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
        return;
      }

      if (cpf) {
        const cleanCpf = String(cpf).replace(/\D/g, '');
        if (cleanCpf.length === 11) {
          const existingCpf = await db.getUserByCpf(cleanCpf);
          if (existingCpf) {
            res.status(409).json({ error: 'Já existe uma conta cadastrada com este CPF.' });
            return;
          }
        }
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const addresses: UserAddress[] = [];

      if (address && address.street && address.neighborhood) {
        addresses.push({
          id: `addr_${Date.now()}`,
          street: String(address.street).trim(),
          number: address.number ? String(address.number).trim() : 'S/N',
          complement: address.complement ? String(address.complement).trim() : '',
          neighborhood: String(address.neighborhood).trim(),
          city: address.city ? String(address.city).trim() : 'Itapema',
          state: address.state ? String(address.state).trim() : 'SC',
          cep: address.cep ? String(address.cep).trim() : '',
          isDefault: true
        });
      }

      const newUser: UserProfile = {
        id: userId,
        name: String(name).trim(),
        email: cleanEmail,
        cpf: cpf ? String(cpf).trim() : '',
        phone: String(phone).trim(),
        passwordHash,
        role: 'member',
        membershipTier: 'Standard',
        loyaltyPoints: 50, // Bônus de boas-vindas
        healthNotes: healthNotes ? String(healthNotes).trim() : '',
        addresses,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.createUser(newUser);

      // Verificação de persistência
      const verifiedUser = await db.getUserById(userId);
      if (!verifiedUser) {
        throw new Error('Falha ao confirmar gravação do usuário no banco de dados.');
      }

      // Limpa contador de rate limit em caso de sucesso
      if (typeof (req as any).resetAuthRateLimit === 'function') {
        await (req as any).resetAuthRateLimit();
      }

      const token = generateToken(verifiedUser);

      res.status(201).json({
        message: 'Cadastro realizado com sucesso! Bem-vindo(a) ao Clube Super Popular.',
        token,
        user: sanitizeUser(verifiedUser)
      });
    } catch (err: any) {
      console.error('Erro no registro:', err);
      res.status(500).json({ error: err.message || 'Erro interno ao processar cadastro. Tente novamente.' });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body; // identifier can be email or CPF or username

      if (!identifier || !password) {
        res.status(400).json({ error: 'Informe seu e-mail/CPF e a senha.' });
        return;
      }

      const cleanIdentifier = identifier.trim().toLowerCase();
      let user: UserProfile | undefined;

      if (cleanIdentifier.includes('@')) {
        user = await db.getUserByEmail(cleanIdentifier);
      } else {
        const cleanCpf = cleanIdentifier.replace(/\D/g, '');
        if (cleanCpf.length === 11) {
          user = await db.getUserByCpf(cleanCpf);
        } else if (cleanIdentifier === 'admin') {
          const allUsers = await db.getUsers();
          user = allUsers.find(u => u.role === 'admin');
        }
      }

      // Fallback search
      if (!user) {
        user = await db.getUserByEmail(cleanIdentifier);
      }

      if (!user) {
        res.status(401).json({ error: 'E-mail, CPF ou senha incorretos.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'E-mail, CPF ou senha incorretos.' });
        return;
      }

      // Limpa contador de rate limit após login bem-sucedido
      if (typeof (req as any).resetAuthRateLimit === 'function') {
        await (req as any).resetAuthRateLimit();
      }

      const token = generateToken(user);

      res.json({
        message: `Bem-vindo(a) de volta, ${user.name}!`,
        token,
        user: sanitizeUser(user)
      });
    } catch (err: any) {
      console.error('Erro no login:', err);
      res.status(500).json({ error: 'Erro interno ao processar login.' });
    }
  },

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Não autenticado.' });
        return;
      }

      const user = await db.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }

      res.json({ user: sanitizeUser(user) });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar dados do usuário.' });
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Não autenticado.' });
        return;
      }

      const { name, phone, cpf, healthNotes } = req.body;
      const updates: Partial<UserProfile> = {};

      if (name) updates.name = name.trim();
      if (phone) updates.phone = phone.trim();
      if (cpf) updates.cpf = cpf.trim();
      if (healthNotes !== undefined) updates.healthNotes = healthNotes;

      const updated = await db.updateUser(req.user.id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }

      res.json({
        message: 'Perfil atualizado com sucesso.',
        user: sanitizeUser(updated)
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
  },

  async addAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Não autenticado.' });
        return;
      }

      const user = await db.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }

      const { street, number, complement, neighborhood, city, state, cep, isDefault } = req.body;

      if (!street || !neighborhood) {
        res.status(400).json({ error: 'Rua e bairro são obrigatórios.' });
        return;
      }

      const newAddress: UserAddress = {
        id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        street: street.trim(),
        number: number ? number.trim() : 'S/N',
        complement: complement ? complement.trim() : '',
        neighborhood: neighborhood.trim(),
        city: city ? city.trim() : 'Itapema',
        state: state ? state.trim() : 'SC',
        cep: cep ? cep.trim() : '',
        isDefault: Boolean(isDefault) || user.addresses.length === 0
      };

      let addresses = [...user.addresses];
      if (newAddress.isDefault) {
        addresses = addresses.map(a => ({ ...a, isDefault: false }));
      }
      addresses.push(newAddress);

      const updated = await db.updateUser(req.user.id, { addresses });
      res.json({
        message: 'Endereço adicionado com sucesso.',
        addresses: updated?.addresses || [],
        user: updated ? sanitizeUser(updated) : null
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar endereço.' });
    }
  },

  async deleteAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Não autenticado.' });
        return;
      }

      const { addressId } = req.params;

      const user = await db.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }

      let addresses = user.addresses.filter(a => a.id !== addressId);
      if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
        addresses[0].isDefault = true;
      }

      const updated = await db.updateUser(req.user.id, { addresses });
      res.json({
        message: 'Endereço removido com sucesso.',
        addresses: updated?.addresses || [],
        user: updated ? sanitizeUser(updated) : null
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao remover endereço.' });
    }
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Por favor, informe seu e-mail cadastrado.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await db.getUserByEmail(cleanEmail);

      if (user) {
        // Gera código criptograficamente seguro de 6 dígitos
        const recoveryCode = crypto.randomInt(100000, 1000000).toString();
        const recoveryCodeExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

        // Salva código no banco de dados
        await db.updateUser(user.id, { recoveryCode, recoveryCodeExpires });
      }

      // Resposta genérica segura para prevenir enumeração de contas
      res.json({
        message: `Se houver uma conta cadastrada com este e-mail, as instruções e código de recuperação foram gerados para ${cleanEmail}.`,
        email: cleanEmail
      });
    } catch (err) {
      console.error('Erro ao solicitar recuperação de senha:', err);
      res.status(500).json({ error: 'Erro ao processar solicitação de recuperação.' });
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, newPassword, code } = req.body;
      if (!email || !newPassword || !code) {
        res.status(400).json({ error: 'E-mail, nova senha e código de verificação são obrigatórios.' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await db.getUserByEmail(cleanEmail);

      if (!user) {
        res.status(400).json({ error: 'Código de verificação incorreto ou inválido.' });
        return;
      }

      // Verifica código de recuperação
      if (!user.recoveryCode || user.recoveryCode !== code) {
        res.status(400).json({ error: 'Código de verificação incorreto ou inválido.' });
        return;
      }

      // Verifica expiração
      if (user.recoveryCodeExpires && new Date(user.recoveryCodeExpires).getTime() < Date.now()) {
        res.status(400).json({ error: 'O código de verificação expirou. Solicite um novo.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Salva nova senha e remove campos de recuperação
      const updated = await db.updateUser(user.id, {
        passwordHash,
        recoveryCode: undefined,
        recoveryCodeExpires: undefined
      });

      // Limpa contador de rate limit após sucesso
      if (typeof (req as any).resetAuthRateLimit === 'function') {
        await (req as any).resetAuthRateLimit();
      }

      const token = generateToken(updated!);

      res.json({
        message: 'Senha alterada com sucesso! Você já está autenticado.',
        token,
        user: sanitizeUser(updated!)
      });
    } catch (err) {
      console.error('Erro ao redefinir senha:', err);
      res.status(500).json({ error: 'Erro ao redefinir senha.' });
    }
  },

  async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, googleId } = req.body;

      if (!email) {
        res.status(400).json({ error: 'E-mail do Google é obrigatório.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      let user = await db.getUserByEmail(cleanEmail);

      if (!user) {
        // Automatically create account with Google info
        const salt = await bcrypt.genSalt(10);
        const randomPass = Math.random().toString(36).substring(2, 12);
        const passwordHash = await bcrypt.hash(randomPass, salt);
        const userId = `usr_google_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const newUser: UserProfile = {
          id: userId,
          name: name ? name.trim() : cleanEmail.split('@')[0],
          email: cleanEmail,
          cpf: '',
          phone: '',
          passwordHash,
          role: 'member',
          membershipTier: 'Standard',
          loyaltyPoints: 50,
          healthNotes: '',
          addresses: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.createUser(newUser);
        user = newUser;
      }

      const token = generateToken(user);
      res.json({
        message: `Autenticado com sucesso via Google! Olá, ${user.name}.`,
        token,
        user: sanitizeUser(user)
      });
    } catch (err) {
      console.error('Erro na autenticação com Google:', err);
      res.status(500).json({ error: 'Erro ao autenticar com Google.' });
    }
  }
};
