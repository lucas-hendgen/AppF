import { Product, Category, Neighborhood, Coupon } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'medicamentos',
    nome_categoria: 'medicamentos',
    titulo_exibicao: '💊 Medicamentos',
    descricao: 'Analgésicos, antitérmicos, anti-inflamatórios e soluções',
    ordem: 1
  },
  {
    id: 'higiene',
    nome_categoria: 'higiene',
    titulo_exibicao: '🧴 Higiene Pessoal',
    descricao: 'Sabonetes, cremes dentais, álcool em gel e protetor solar',
    ordem: 2
  },
  {
    id: 'perfumaria',
    nome_categoria: 'perfumaria',
    titulo_exibicao: '🌸 Perfumaria & Cuidados',
    descricao: 'Hidratantes, desodorantes, shampoos e colônias',
    ordem: 3
  },
  {
    id: 'infantil',
    nome_categoria: 'infantil',
    titulo_exibicao: '👶 Linha Infantil & Bebê',
    descricao: 'Fraldas descartáveis, lenços e pomadas para assaduras',
    ordem: 4
  },
  {
    id: 'vitaminas',
    nome_categoria: 'vitaminas',
    titulo_exibicao: '🍊 Vitaminas & Suplementos',
    descricao: 'Vitamina C, multivitamínicos e Ômega 3',
    ordem: 5
  }
];

export const INITIAL_PRODUCTS: Product[] = [
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

export const NEIGHBORHOODS: Neighborhood[] = [
  { bairro: 'centro', taxa: 3.0 },
  { bairro: 'meia praia', taxa: 5.0 },
  { bairro: 'morretes', taxa: 6.0 },
  { bairro: 'canto da praia', taxa: 7.0 },
  { bairro: 'tabuleiro', taxa: 6.5 },
  { bairro: 'várzea', taxa: 8.0 },
  { bairro: 'alto são bento', taxa: 8.5 },
  { bairro: 'ilhotas', taxa: 10.0 }
];

export const COUPONS: Coupon[] = [
  {
    codigo: 'POPULAR10',
    tipo_desconto: 'produtos',
    valor_desconto: '10%',
    descricao: '10% de desconto em todos os produtos'
  },
  {
    codigo: 'FRETEGRATIS',
    tipo_desconto: 'frete',
    valor_desconto: '100%',
    descricao: 'Frete grátis para toda Itapema'
  },
  {
    codigo: 'BEMVINDO5',
    tipo_desconto: 'total',
    valor_desconto: '5.00',
    descricao: 'R$ 5,00 de desconto no valor total'
  }
];
