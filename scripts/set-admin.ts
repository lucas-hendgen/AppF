import 'dotenv/config';
import readline from 'readline';
import bcrypt from 'bcryptjs';
import { getPool, initDatabase } from '../server/db.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace(/^--/, '').split('=');
      if (key && value) {
        result[key] = value;
      }
    }
  }
  return result;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run() {
  console.log('\n🔒 [FARMÁCIA SUPER POPULAR] - Gerenciador Seguro de Administrador\n');
  const args = parseArgs();

  let email = args.email || process.env.ADMIN_EMAIL || '';
  let password = args.password || process.env.ADMIN_PASSWORD || '';
  let name = args.name || process.env.ADMIN_NAME || 'Administrador Master';

  if (!args.email && !process.env.ADMIN_EMAIL) {
    email = await prompt('📧 Digite o E-mail do Administrador: ');
  }

  if (!args.password && !process.env.ADMIN_PASSWORD) {
    password = await prompt('🔑 Digite a Senha do Administrador: ');
  }

  if (!email || !password) {
    console.error('❌ Erro: E-mail e Senha são obrigatórios para definir um administrador.');
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();
  console.log(`⏳ Conectando ao MySQL e configurando administrador: ${cleanEmail}...`);

  await initDatabase();
  const pool = getPool();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const [existing]: any = await pool.query(
    'SELECT id, email, role FROM users WHERE email = ? LIMIT 1',
    [cleanEmail]
  );

  if (existing.length > 0) {
    await pool.query(
      `UPDATE users SET name = ?, passwordHash = ?, role = 'admin', updatedAt = ? WHERE email = ?`,
      [name, passwordHash, new Date().toISOString(), cleanEmail]
    );
    console.log(`\n✅ SUCESSO! A conta existente "${cleanEmail}" foi promovida/atualizada para ADMINISTRADOR com a nova senha.`);
  } else {
    const userId = `usr_admin_${Date.now()}`;
    await pool.query(
      `INSERT INTO users (id, name, email, cpf, phone, passwordHash, role, membershipTier, loyaltyPoints, healthNotes, addresses, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        cleanEmail,
        '000.000.000-00',
        '(47) 99999-8888',
        passwordHash,
        'admin',
        'Gold Fidelidade',
        1000,
        'Conta Administrativa',
        '[]',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    console.log(`\n✅ SUCESSO! Nova conta de ADMINISTRADOR criada para "${cleanEmail}".`);
  }

  console.log('\n📋 Detalhes do Acesso Administrativo:');
  console.log(`• Painel: http://localhost:3000/admin`);
  console.log(`• Identificador: ${cleanEmail}`);
  console.log(`• Role: admin`);
  console.log('• Senha atualizada com criptografia bcrypt.\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro ao configurar administrador:', err);
  process.exit(1);
});
