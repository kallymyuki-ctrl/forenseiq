/* ============================================================
   ForenseIQ — Gerador de dados de demonstração (fictícios)
   Dados determinísticos: a mesma consulta devolve o mesmo
   resultado, simulando uma base real — porém 100% fictícia.
   ============================================================ */
const Mock = (() => {

  // ---- RNG determinístico a partir de uma string-semente ----
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let s = hash(String(seed)) || 123456789;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const int = (r, min, max) => Math.floor(r() * (max - min + 1)) + min;
  const pad = (n, l) => String(n).padStart(l, '0');

  // ---- Bases fictícias ----
  const FIRST_M = ['Carlos','João','Pedro','Lucas','Rafael','Bruno','André','Felipe','Gustavo','Marcelo','Ricardo','Eduardo','Thiago','Diego','Vinícius','Leandro','Rodrigo','Fábio','Alexandre','Renato'];
  const FIRST_F = ['Maria','Ana','Juliana','Fernanda','Camila','Patrícia','Aline','Larissa','Beatriz','Carolina','Vanessa','Priscila','Renata','Daniela','Amanda','Letícia','Bianca','Natália','Sabrina','Tatiane'];
  const LAST = ['Silva','Santos','Oliveira','Souza','Pereira','Costa','Rodrigues','Almeida','Nascimento','Lima','Araújo','Fernandes','Carvalho','Gomes','Martins','Rocha','Ribeiro','Barbosa','Moreira','Cardoso','Teixeira','Correia','Dias','Vieira'];
  const CITIES = [
    ['São Paulo','SP'],['Rio de Janeiro','RJ'],['Belo Horizonte','MG'],['Curitiba','PR'],['Porto Alegre','RS'],
    ['Salvador','BA'],['Recife','PE'],['Fortaleza','CE'],['Brasília','DF'],['Goiânia','GO'],
    ['Campinas','SP'],['Santos','SP'],['Niterói','RJ'],['Florianópolis','SC'],['Vitória','ES'],['Manaus','AM']
  ];
  const STREETS = ['Rua das Acácias','Av. Brasil','Rua XV de Novembro','Rua das Palmeiras','Av. Paulista','Rua São Jorge','Rua Sete de Setembro','Av. Atlântica','Rua do Comércio','Rua Santa Clara','Av. Independência','Rua Dom Pedro II','Travessa das Flores','Rua Marechal Deodoro'];
  const JOBS = ['Analista administrativo','Vendedor(a)','Professor(a)','Engenheiro(a) civil','Autônomo(a)','Motorista','Técnico(a) em enfermagem','Advogado(a)','Comerciante','Desenvolvedor(a) de software','Contador(a)','Designer gráfico','Corretor(a) de imóveis','Empresário(a)'];
  const CARRIERS = ['Vivo','Claro','TIM','Oi','Algar Telecom'];
  const CAR_BRANDS = [
    ['Volkswagen',['Gol','Polo','T-Cross','Virtus','Saveiro','Nivus']],
    ['Chevrolet',['Onix','Tracker','S10','Spin','Montana']],
    ['Fiat',['Strada','Argo','Mobi','Toro','Pulse','Cronos']],
    ['Toyota',['Corolla','Hilux','Yaris','Corolla Cross']],
    ['Hyundai',['HB20','Creta','Tucson']],
    ['Honda',['Civic','HR-V','City','Fit']],
    ['Jeep',['Renegade','Compass','Commander']],
    ['Renault',['Kwid','Duster','Sandero','Oroch']]
  ];
  const COLORS = ['Prata','Preto','Branco','Cinza','Vermelho','Azul','Verde'];
  const BREACHES = [
    { name:'MegaVazamento BR 2021', date:'2021-01-19', size:'223M registros', data:['Nome','CPF','Data de nascimento','Endereço','Score'] },
    { name:'E-commerce ShopFácil',  date:'2022-07-03', size:'12,4M registros', data:['E-mail','Senha (hash)','Telefone'] },
    { name:'Operadora TeleDados',   date:'2020-11-28', size:'44M registros',  data:['Nome','Telefone','CPF','Plano'] },
    { name:'Fórum TechBR',          date:'2019-05-12', size:'2,1M registros', data:['E-mail','Usuário','Senha (MD5)','IP'] },
    { name:'App Delivery Rápido',   date:'2023-02-08', size:'8,9M registros', data:['E-mail','Nome','Telefone','Endereço'] },
    { name:'Fintech PagueJá',       date:'2023-09-30', size:'3,6M registros', data:['E-mail','CPF','Saldo','Dispositivo'] },
    { name:'Rede Social VidaOn',    date:'2018-10-02', size:'31M registros',  data:['E-mail','Usuário','Telefone','Localização'] }
  ];
  const SOCIAL = [
    { id:'instagram', name:'Instagram', icon:'📸', url:u=>`https://instagram.com/${u}` },
    { id:'twitter',   name:'X / Twitter', icon:'🐦', url:u=>`https://x.com/${u}` },
    { id:'facebook',  name:'Facebook', icon:'📘', url:u=>`https://facebook.com/${u}` },
    { id:'linkedin',  name:'LinkedIn', icon:'💼', url:u=>`https://linkedin.com/in/${u}` },
    { id:'github',    name:'GitHub', icon:'🐙', url:u=>`https://github.com/${u}` },
    { id:'tiktok',    name:'TikTok', icon:'🎵', url:u=>`https://tiktok.com/@${u}` },
    { id:'youtube',   name:'YouTube', icon:'▶️', url:u=>`https://youtube.com/@${u}` },
    { id:'reddit',    name:'Reddit', icon:'👽', url:u=>`https://reddit.com/user/${u}` },
    { id:'pinterest', name:'Pinterest', icon:'📌', url:u=>`https://pinterest.com/${u}` },
    { id:'twitch',    name:'Twitch', icon:'🎮', url:u=>`https://twitch.tv/${u}` },
    { id:'telegram',  name:'Telegram', icon:'✈️', url:u=>`https://t.me/${u}` },
    { id:'spotify',   name:'Spotify', icon:'🎧', url:u=>`https://open.spotify.com/user/${u}` }
  ];

  // ---- Validações reais ----
  function validaCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let s = 0;
    for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
    let d1 = (s * 10) % 11 % 10;
    if (d1 !== +cpf[9]) return false;
    s = 0;
    for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
    return ((s * 10) % 11 % 10) === +cpf[10];
  }
  function validaCNPJ(c) {
    c = c.replace(/\D/g, '');
    if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
    const calc = n => {
      let p = n - 7, s = 0;
      for (let i = n; i >= 1; i--) { s += +c[n - i] * p--; if (p < 2) p = 9; }
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === +c[12] && calc(13) === +c[13];
  }
  const fmtCPF = c => c.replace(/\D/g,'').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const fmtCNPJ = c => c.replace(/\D/g,'').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

  function calcSigno(d, m) {
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Áries';
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Touro';
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Gêmeos';
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Câncer';
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Leão';
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Virgem';
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Libra';
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Escorpião';
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Sagitário';
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Capricórnio';
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Aquário';
    return 'Peixes';
  }

  // ---- Pessoa fictícia a partir de um CPF ----
  function pessoa(cpf) {
    const clean = cpf.replace(/\D/g, '');

    // Caso Especial: Marcelo Bandarz Brasil (réplica exata do relatório de referência)
    if (clean === '01196455058') {
      return {
        cpf: '011.964.550-58',
        nome: 'Marcelo Bandarz Brasil',
        sexo: 'Masculino',
        nascimento: '06/05/1987',
        idade: 39,
        signo: 'Touro',
        naturalidade: 'PORTO ALEGRE/RS',
        nacionalidade: 'Brasileiro',
        nomeMae: 'Anete Medeiros Bandarz',
        nomePai: 'Simeao Antonio Silveira Brasil',
        rg: '1085828984 - SJS/RS',
        rgOrgao: 'SJS',
        rgUf: 'RS',
        rgData: '23/10/2003',
        cns: '705004034896251',
        tituloEleitor: '96113060450 - Zona: 159 - Seção: 111',
        cnh: 'RS079976000',
        cnhPrimeiraHab: '11/06/2008',
        escolaridade: ['ENSINO MÉDIO COMPLETO', 'SUPERIOR COMPLETO'],
        rendaEstimada: 'R$ 2.131,00',
        classeSocial: 'B',
        subclasseSocial: 'B2',
        situacao: 'REGULAR',
        indicativoCriminal: true,
        ocupacao: 'ADMINISTRADOR (CBO 252105)',
        score: 620,
        obito: false,
        endereco: 'R ALBERTO DO CANTO, 311 - CS 1 FU',
        bairro: 'ABERTA DOS MORROS',
        cidade: 'PORTO ALEGRE',
        uf: 'RS',
        cep: '91755-350',
        telefone: '(51) 98534-9826',
        operadora: 'Claro',
        email: 'marcelo.brasil008@gmail.com',
        contadores: {
          enderecos: 14, telefones: 15, emails: 3, parentes: 15,
          empresas: 1, veiculos: 1, imoveis: 0, empregos: 1,
          beneficios: 1, vacinas: 2
        },
        historicoCriminal: [
          { num: '01', tipo: 'Mandado de Prisão', especie: 'Conversão da prisão em flagrante em preventiva', tribunal: 'TJRS', comarca: 'Tramandaí', processo: '5007270-03.2023.8.21.0073', peca: '5007270-03.2023.8.21.0073.01000122', expedicao: '04/05/2023', orgao: '2ª VARA CRIMINAL - TRAMANDAÍ/RS' },
          { num: '02', tipo: 'Alvará de Soltura', especie: 'Revogação da prisão preventiva', tribunal: 'TJRS', comarca: 'Tramandaí', processo: '5007270-03.2023.8.21.0073', peca: '5007270-03.2023.8.21.0073.05000220', expedicao: '04/05/2023', motivo: 'Revogação da prisão preventiva', orgao: '2ª VARA CRIMINAL - TRAMANDAÍ/RS' },
          { num: '03', tipo: 'Mandado de Prisão', especie: 'Conversão da prisão em flagrante em preventiva', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5107691-86.2024.8.21.0001', peca: '5107691-86.2024.8.21.0001.01000326', expedicao: '26/05/2024', orgao: 'Núcleo de Gestão Estratégica do Sistema Prisional - NUGESP' },
          { num: '04', tipo: 'Alvará de Soltura', especie: 'Liberdade provisória com cautelar', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5133423-69.2024.8.21.0001', peca: '5133423-69.2024.8.21.0001.05000300', expedicao: '18/03/2025', motivo: 'Liberdade provisória com ou sem medida cautelar', orgao: '1ª VARA DO JÚRI - PORTO ALEGRE/RS' },
          { num: '05', tipo: 'Certidão de Cumprimento do Alvará de Soltura', especie: 'Cumprimento de Alvará', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5133423-69.2024.8.21.0001', peca: '5133423-69.2024.8.21.0001.18000807', expedicao: '23/03/2025', orgao: '1ª VARA DO JÚRI - PORTO ALEGRE/RS' },
          { num: '06', tipo: 'Mandado de Medida Cautelar Protetiva de Urgência', especie: 'Medidas Protetivas', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5061364-15.2026.8.21.0001', peca: '5061364-15.2026.8.21.0001.21000111', expedicao: '17/03/2026', motivo: 'Medidas Protetivas de Urgência', orgao: '1º JUIZADO DA VIOLÊNCIA DOMÉSTICA E FAMILIAR - PORTO ALEGRE/RS' },
          { num: '07', tipo: 'Certidão de Cumprimento de Medida Protetiva', especie: 'Cumprimento de Medida', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5061364-15.2026.8.21.0001', peca: '5061364-15.2026.8.21.0001.30000214', expedicao: '04/04/2026', orgao: '1º JUIZADO DA VIOLÊNCIA DOMÉSTICA E FAMILIAR - PORTO ALEGRE/RS' },
          { num: '08', tipo: 'Mandado de Medida Cautelar Protetiva de Urgência', especie: 'Medidas Protetivas', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5108871-69.2026.8.21.0001', peca: '5108871-69.2026.8.21.0001.21000125', expedicao: '25/05/2026', motivo: 'Medidas Protetivas de Urgência', orgao: '3º Juizado da Violência Doméstica e Familiar - Porto Alegre/RS' },
          { num: '09', tipo: 'Mandado de Medida Cautelar Protetiva de Urgência', especie: 'Medidas Protetivas', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5163513-89.2026.8.21.0001', peca: '5163513-89.2026.8.21.0001.21000120', expedicao: '18/06/2026', motivo: 'Medidas Protetivas de Urgência', orgao: '1º JUIZADO DA VIOLÊNCIA DOMÉSTICA E FAMILIAR - PORTO ALEGRE/RS' },
          { num: '10', tipo: 'Certidão de Cumprimento de Medida Protetiva', especie: 'Cumprimento de Medida', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5163513-89.2026.8.21.0001', peca: '5163513-89.2026.8.21.0001.30000223', expedicao: '25/06/2026', orgao: '1º JUIZADO DA VIOLÊNCIA DOMÉSTICA E FAMILIAR - PORTO ALEGRE/RS' },
          { num: '11', tipo: 'Certidão de Cumprimento de Medida Protetiva', especie: 'Cumprimento de Medida', tribunal: 'TJRS', comarca: 'Porto Alegre', processo: '5108871-69.2026.8.21.0001', peca: '5108871-69.2026.8.21.0001.30000200', expedicao: '27/06/2026', orgao: '3º Juizado da Violência Doméstica e Familiar - Porto Alegre/RS' }
        ],
        atividadeOnline: {
          perfil: 'Marcelo “m4k” Brasil', nivel: 'Nível 2 (22 pontos)',
          avaliacoes: [
            { local: 'Green Park RS', nota: '4/5', endereco: 'R. Arnô da Silva Feijó, 305 - Tijuca, Alvorada - RS, 94836-260', resposta: 'Olá Marcelo obrigada por sua avaliação, como podemos melhorar para chegar nas 5 estrelinhas?' },
            { local: 'Restaurante Texacão', nota: '3/5', endereco: 'Av. Juca Batista, 2285 - Cavalhada, Porto Alegre - RS, 91770-001', resposta: null },
            { local: 'Janela Bar', nota: '4/5', endereco: 'R. Joaquim Nabuco, 281 - Cidade Baixa, Porto Alegre - RS, 90050-340', resposta: null },
            { local: 'Calico Jack Bar & Conveniência', nota: '4/5', endereco: 'R. José do Patrocínio, 896 - Cidade Baixa, Porto Alegre - RS, 90050-300', resposta: null },
            { local: 'McDonald\'s', nota: '3/5', endereco: 'R. São Manoel, 988 - São José, Porto Alegre - RS, 90620-110', resposta: null },
            { local: 'Pampa sushi zona sul porto alegre', nota: '3/5', endereco: 'Av. Edgar Píres de Castro, 235 - Hípica, Porto Alegre - RS, 91787-889', resposta: null },
            { local: 'SUPERMERCADOS CRUZEIRO', nota: '4/5', endereco: 'Av. Juca Batista, 1030 - Cavalhada, Porto Alegre - RS, 91770-000', resposta: null },
            { local: 'Consert Game', nota: '5/5', endereco: 'Av. Plínio Brasil Milano, 291 - Auxiliadora, Porto Alegre - RS, 90450-085', resposta: 'Agradecemos a avaliação e estamos sempre a disposição.' },
            { local: 'Biskaia', nota: '4/5', endereco: 'Av. Juca Batista, 3782 - Hípica, Porto Alegre - RS, 91755-000', resposta: null },
            { local: 'Sushi do Prado zona Sul', nota: '4/5', endereco: 'Av. Juca Batista, 4705 - Aberta dos Morros, Porto Alegre - RS, 91755-831', resposta: 'Agradecemos sua avaliação e aguardamos revê-lo em breve.' }
          ]
        },
        enderecos: [
          'R ALBERTO DO CANTO, 311 - CS 1 FU - ABERTA DOS MORROS - PORTO ALEGRE/RS - CEP: 91755-350',
          'R DO JUA, 1815 - OITIZEIRO - JOAO PESSOA/PB - CEP: 58088-170',
          'AV CELESTINO BERTOLUCCI, 535 - ABERTA DOS MORROS - PORTO ALEGRE/RS - CEP: 91755-020',
          'AL PASSARO PRETO, 47 - CX 1 - JD COLONIAL - RIBEIRAO DAS NEVES/MG - CEP: 33809-080',
          'R JULIO DIAS DE SOUZA, 222 - AP 2 - ABERTA DOS MORROS - PORTO ALEGRE/RS - CEP: 91755-130',
          'AV EDUARDO PRADO, 2202 - LJ 1 - CAVALHADA - PORTO ALEGRE/RS - CEP: 91751-000',
          'R JULIO DIAS DE SOUZA, 222 - C C - HIPICA - PORTO ALEGRE/RS - CEP: 91755-130',
          'R EVANGELISTA DE SOUZA, 875 - AP 4 - JD STO ALBERTO - SANTO ANDRE/SP - CEP: 09260-410',
          'R DR CAMPOS VELHO, 0 - CRISTAL - PORTO ALEGRE/RS - CEP: 90820-000',
          'R ALBERTO DO CANTO, 0 - ABERTA DOS MORROS - PORTO ALEGRE/RS - CEP: 91755-350',
          'RUA ALBERTO DO CANTO, 0 - CS 1 FU - ABERTA DOS MORROS - PORTO ALEGRE/RS - CEP: 91755-350',
          'Avenida Icaraí, 142 - C AV 18 - Cristal - Porto Alegre/RS - CEP: 90810-000',
          'Rua Doutor Campos Velho, 1142 - CS 18 - Cristal - Porto Alegre/RS - CEP: 90820-000',
          'OUTROS JAIME LINO DOS SANTOS FILHO, 761 - LOMBA DO PINHEIRO - PORTO ALEGRE/RS - CEP: 91550-610'
        ],
        telefones: [
          { num: '(51) 98534-9826', score: 'A' }, { num: '(51) 1111-65372', score: 'A' },
          { num: '(51) 99401-2102', score: 'C' }, { num: '(51) 3341-4260', score: 'A' },
          { num: '(51) 98465-4387', score: 'B' }, { num: '(51) 98590-8885', score: 'B' },
          { num: '(51) 99287-8549', score: 'D' }, { num: '(51) 99738-1138', score: 'D' },
          { num: '(51) 99754-1337', score: 'D' }, { num: '(51) 3973-8113', score: 'D' },
          { num: '(51) 3246-7958', score: 'D' }, { num: '(51) 98549-8960', score: 'D' },
          { num: '(51) 3264-9234', score: 'D' }, { num: '(51) 9738-1138', score: 'D' },
          { num: '(51) 9253-2067', score: 'C' }
        ],
        emails: [
          { mail: 'marcelo.brasil008@gmail.com', senhaVazada: 'jotoliti3698', score: 'OTIMO' },
          { mail: 'marcelobrasil08@gmail.com', senhaVazada: 'Jotoliti', score: 'OTIMO' },
          { mail: 'pitty_mp@hotmail.com', senhaVazada: 'nadiaduda5', score: 'PESSIMO' }
        ],
        parentes: [
          { nome: 'Anete Medeiros Bandarz', vinculo: 'Mãe', cpf: '—', nasc: 'N/A', renda: '—', prof: '—', local: '—' },
          { nome: 'Simeao Antonio Silveira Brasil', vinculo: 'Pai (falecido)', cpf: '296.376.270-49', nasc: '27/04/1957 (69 anos)', renda: 'R$ 4.314,00', prof: 'Professor de Ensino Superior', local: 'Chapecó/SC' },
          { nome: 'Maria Thereza da Silveira Brasil', vinculo: 'Avó Paterna', cpf: '292.130.880-00', nasc: '15/10/1928 (98 anos)', renda: 'R$ 1.621,00', prof: 'Aposentada', local: 'Porto Alegre/RS' },
          { nome: 'Olizio Rosal Brasil', vinculo: 'Avô Paterno', cpf: '—', nasc: 'N/A', renda: '—', prof: '—', local: '—' },
          { nome: 'Maria Delly Lopes da Silveira', vinculo: 'Bisavó Paterna', cpf: '—', nasc: 'N/A', renda: '—', prof: '—', local: '—' },
          { nome: 'Aurora Bueno Brasil', vinculo: 'Filha', cpf: '066.540.600-24', nasc: '19/10/2020 (5 anos)', renda: 'R$ 1.621,00', prof: 'Menor', local: 'Porto Alegre/RS' },
          { nome: 'Franciele Bandarz Brasil', vinculo: 'Irmã', cpf: '022.766.260-11', nasc: '17/09/1990 (36 anos)', renda: 'R$ 1.621,00', prof: 'Comerciante Varejista', local: 'Porto Alegre/RS' },
          { nome: 'Solange Silveira Brasil', vinculo: 'Tia Paterna', cpf: '403.873.050-68', nasc: '13/02/1959 (67 anos)', renda: 'R$ 1.621,00', prof: 'Cirurgiã Dentista - Clínico Geral', local: 'Porto Alegre/RS' },
          { nome: 'Amanda Brasil Loch', vinculo: 'Prima Paterna', cpf: '014.927.230-88', nasc: '08/05/1987 (39 anos)', renda: 'R$ 1.739,00', prof: 'Administradora', local: 'São Bernardo do Campo/SP' },
          { nome: 'Felipe Benjamin Brasil Amaro', vinculo: 'Sobrinho', cpf: '065.679.760-63', nasc: '06/04/2020 (6 anos)', renda: 'R$ 1.621,00', prof: 'Menor', local: 'Porto Alegre/RS' },
          { nome: 'Leonardo Brasil Lacerda', vinculo: 'Sobrinho', cpf: '602.416.540-41', nasc: '02/09/2013 (13 anos)', renda: 'R$ 1.621,00', prof: 'Estudante', local: 'Porto Alegre/RS' },
          { nome: 'Laryssa Silva Bueno', vinculo: 'Cônjuge', cpf: '871.279.030-34', nasc: '22/04/1998 (28 anos)', renda: 'R$ 1.621,00', prof: 'Assistente Administrativo', local: 'Porto Alegre/RS' },
          { nome: 'Gislene Silva', vinculo: 'Sogra', cpf: '—', nasc: 'N/A', renda: '—', prof: '—', local: '—' },
          { nome: 'Vladir Bueno', vinculo: 'Sogro (falecido)', cpf: '335.158.670-15', nasc: '05/02/1961 (65 anos)', renda: 'R$ 1.621,00', prof: 'Agente de Segurança', local: 'Porto Alegre/RS' },
          { nome: 'Janaina Cruz Bueno', vinculo: 'Cunhada', cpf: '008.471.400-08', nasc: '13/08/1984 (42 anos)', renda: 'R$ 1.621,00', prof: 'Vendedora de Comércio Varejista', local: 'São Paulo/SP' }
        ],
        parentesEndereco: [
          { nome: 'Franciele Bandarz Brasil', cpf: '022.766.260-11', cidade: 'Porto Alegre/RS', nasc: '17/09/1990 (36 anos)', renda: 'R$ 1.621,00', prof: 'COMERCIANTE VAREJISTA', endereco: 'Avenida Celestino Bertolucci, 535, Hípica, Porto Alegre, RS, 91755020' }
        ],
        profissoes: [ { nome: 'ADMINISTRADOR', cbo: '252105' } ],
        veiculos: [ { placa: 'IRX0705', modelo: 'PEUGEOT / 207 PASSION XR S', ano: '2012', cor: 'Prata', renavam: '326359532', chassi: '9362NKFWXCB001972' } ],
        empresas: [ { cnpj: '20.478.644/0001-05', razao: 'MARCELO BANDARZ BRASIL 01196455058', tipo: 'MEI' } ],
        beneficios: [ { tipo: 'AUXÍLIO EMERGENCIAL', uf: 'RS', municipio: 'PORTO ALEGRE', nis: '0', valor: 'R$ 2.550,00' } ],
        vacinas: [
          { vacina: 'COVID-19 PFIZER - COMIRNATY', fabricante: 'PFIZER', dose: '1ª Dose', lote: '28231BD', data: '24/08/2021', local: 'UNIDADE DE SAUDE CAMAQUA - PORTO ALEGRE/RS' },
          { vacina: 'COVID-19 PFIZER - COMIRNATY', fabricante: 'PFIZER', dose: '2ª Dose', lote: 'FK0596', data: '09/11/2021', local: 'UNIDADE DE SAUDE CAMAQUA - PORTO ALEGRE/RS' }
        ],
        propensoes: ['Luxo', 'TV a Cabo', 'Seguro Auto', 'Previdência Privada', 'Cartão de Crédito', 'Seguro Saúde', 'Usuário Intenso', 'Jogador Online', 'Videogame', 'Leitor Digital'],
        timeline: [
          { ano: '1928', data: '15/10/1928', cat: 'Família', tit: 'Nascimento de Maria Thereza da Silveira Brasil — Avó Paterna', desc: 'CPF: 292.130.880-00' },
          { ano: '1957', data: '27/04/1957', cat: 'Família', tit: 'Nascimento de Simeao Antonio Silveira Brasil — Pai', desc: 'CPF: 296.376.270-49' },
          { ano: '1959', data: '13/02/1959', cat: 'Família', tit: 'Nascimento de Solange Silveira Brasil — Tia Paterna', desc: 'CPF: 403.873.050-68' },
          { ano: '1961', data: '05/02/1961', cat: 'Família', tit: 'Nascimento de Vladir Bueno — Sogro', desc: 'CPF: 335.158.670-15' },
          { ano: '1984', data: '13/08/1984', cat: 'Família', tit: 'Nascimento de Janaina Cruz Bueno — Cunhada', desc: 'CPF: 008.471.400-08' },
          { ano: '1987', data: '06/05/1987', cat: 'Pessoal', tit: 'Nascimento de Marcelo Bandarz Brasil', desc: 'Local: PORTO ALEGRE/RS · Signo: Touro' },
          { ano: '1987', data: '08/05/1987', cat: 'Família', tit: 'Nascimento de Amanda Brasil Loch — Prima', desc: 'CPF: 014.927.230-88' },
          { ano: '1990', data: '17/09/1990', cat: 'Família', tit: 'Nascimento de Franciele Bandarz Brasil — Irmã', desc: 'CPF: 022.766.260-11' },
          { ano: '1998', data: '22/04/1998', cat: 'Família', tit: 'Nascimento de Laryssa Silva Bueno — Cônjuge', desc: 'CPF: 871.279.030-34' },
          { ano: '2008', data: '11/06/2008', cat: 'CNH', tit: 'Primeira Habilitação (CNH)', desc: 'Registro: RS079976000' },
          { ano: '2013', data: '02/09/2013', cat: 'Família', tit: 'Nascimento de Leonardo Brasil Lacerda — Sobrinho', desc: 'CPF: 602.416.540-41' },
          { ano: '2014', data: '21/06/2014', cat: 'Empresarial', tit: 'Abertura de MEI MARCELO BANDARZ BRASIL', desc: 'CNPJ: 20.478.644/0001-05' },
          { ano: '2017', data: '04/09/2017', cat: 'Família', tit: 'Falecimento de Vladir Bueno — Sogro', desc: 'CPF: 335.158.670-15' },
          { ano: '2020', data: '06/04/2020', cat: 'Família', tit: 'Nascimento de Felipe Benjamin Brasil Amaro — Sobrinho', desc: 'CPF: 065.679.760-63' },
          { ano: '2020', data: '19/10/2020', cat: 'Família', tit: 'Nascimento de Aurora Bueno Brasil — Filha', desc: 'CPF: 066.540.600-24' },
          { ano: '2021', data: '24/08/2021', cat: 'Saúde', tit: 'Vacina COVID-19 PFIZER — 1ª Dose (Lote: 28231BD)', desc: 'Unidade de Saúde Camaquã - Porto Alegre/RS' },
          { ano: '2021', data: '09/11/2021', cat: 'Saúde', tit: 'Vacina COVID-19 PFIZER — 2ª Dose (Lote: FK0596)', desc: 'Unidade de Saúde Camaquã - Porto Alegre/RS' },
          { ano: '2023', data: '11/03/2023', cat: 'Família', tit: 'Falecimento de Simeao Antonio Silveira Brasil — Pai', desc: 'CPF: 296.376.270-49' },
          { ano: '2023', data: '04/05/2023', cat: 'Criminal', tit: 'Mandado de Prisão — Flagrante em preventiva', desc: 'Proc: 5007270-03.2023.8.21.0073 · 2ª Vara Criminal Tramandaí/RS' },
          { ano: '2023', data: '04/05/2023', cat: 'Criminal', tit: 'Alvará de Soltura — Revogação da preventiva', desc: 'Proc: 5007270-03.2023.8.21.0073 · 2ª Vara Criminal Tramandaí/RS' },
          { ano: '2024', data: '26/05/2024', cat: 'Criminal', tit: 'Mandado de Prisão — NUGESP Porto Alegre', desc: 'Proc: 5107691-86.2024.8.21.0001 · NUGESP' },
          { ano: '2025', data: '18/03/2025', cat: 'Criminal', tit: 'Alvará de Soltura — Liberdade provisória', desc: 'Proc: 5133423-69.2024.8.21.0001 · 1ª Vara do Júri' },
          { ano: '2025', data: '23/03/2025', cat: 'Criminal', tit: 'Cumprimento de Alvará de Soltura', desc: 'Proc: 5133423-69.2024.8.21.0001 · 1ª Vara do Júri' },
          { ano: '2026', data: '17/03/2026', cat: 'Criminal', tit: 'Medida Protetiva de Urgência', desc: 'Proc: 5061364-15.2026.8.21.0001 · 1º Juizado Violência Doméstica' },
          { ano: '2026', data: '04/04/2026', cat: 'Criminal', tit: 'Cumprimento de Medida Protetiva', desc: 'Proc: 5061364-15.2026.8.21.0001 · 1º Juizado' },
          { ano: '2026', data: '25/05/2026', cat: 'Criminal', tit: 'Medida Protetiva de Urgência', desc: 'Proc: 5108871-69.2026.8.21.0001 · 3º Juizado Violência Doméstica' },
          { ano: '2026', data: '18/06/2026', cat: 'Criminal', tit: 'Medida Protetiva de Urgência', desc: 'Proc: 5163513-89.2026.8.21.0001 · 1º Juizado Violência Doméstica' },
          { ano: '2026', data: '25/06/2026', cat: 'Criminal', tit: 'Cumprimento de Medida Protetiva', desc: 'Proc: 5163513-89.2026.8.21.0001 · 1º Juizado' },
          { ano: '2026', data: '27/06/2026', cat: 'Criminal', tit: 'Cumprimento de Medida Protetiva', desc: 'Proc: 5108871-69.2026.8.21.0001 · 3º Juizado' }
        ]
      };
    }

    // Gerador determinístico de relatório completo para qualquer outro CPF
    const r = rng('cpf:' + clean);
    const fem = r() > 0.5;
    const first = pick(r, fem ? FIRST_F : FIRST_M);
    const mid = pick(r, LAST);
    const last = pick(r, LAST.filter(l => l !== mid));
    const nome = `${first} ${mid} ${last}`;
    const [cidade, uf] = pick(r, CITIES);
    const dia = int(r, 1, 28);
    const mes = int(r, 1, 12);
    const anoNasc = int(r, 1960, 2004);
    const nasc = `${pad(dia, 2)}/${pad(mes, 2)}/${anoNasc}`;
    const idade = 2026 - anoNasc;
    const signo = calcSigno(dia, mes);
    const mae = `${pick(r, FIRST_F)} ${pick(r, LAST)} ${last}`;
    const pai = `${pick(r, FIRST_M)} ${mid} ${last}`;
    const ddd = int(r, 11, 98);
    const tel = `(${ddd}) 9${pad(int(r,6000,9999),4)}-${pad(int(r,0,9999),4)}`;
    const emailUser = (first + '.' + last).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const score = int(r, 180, 950);
    const renda = int(r, 18, 180) * 100;
    const temCriminal = r() > 0.65;
    const rgNum = pad(int(r, 10000000, 99999999), 9);
    const cnsNum = '7' + pad(int(r, 10000000000000, 99999999999999), 14);
    const titNum = pad(int(r, 10000000000, 99999999999), 11);
    const cnhNum = 'RS' + pad(int(r, 100000000, 999999999), 9);

    const enderecos = [
      `${pick(r, STREETS)}, ${int(r,10,2500)} - Centro - ${cidade}/${uf} - CEP: ${pad(int(r,1000,99999),5)}-${pad(int(r,0,999),3)}`,
      `${pick(r, STREETS)}, ${int(r,10,1800)} - Jardim América - ${cidade}/${uf} - CEP: ${pad(int(r,1000,99999),5)}-${pad(int(r,0,999),3)}`,
      `${pick(r, STREETS)}, ${int(r,10,3000)} - Vila Nova - ${cidade}/${uf} - CEP: ${pad(int(r,1000,99999),5)}-${pad(int(r,0,999),3)}`
    ];

    const telefones = [
      { num: tel, score: 'A' },
      { num: `(${ddd}) 3${pad(int(r,2000,9999),3)}-${pad(int(r,0,9999),4)}`, score: 'B' },
      { num: `(${ddd}) 9${pad(int(r,7000,9999),4)}-${pad(int(r,0,9999),4)}`, score: 'C' }
    ];

    const emails = [
      { mail: `${emailUser}${int(r,1,99)}@gmail.com`, senhaVazada: 'senha' + int(r,1000,9999), score: 'OTIMO' },
      { mail: `${emailUser}@hotmail.com`, senhaVazada: 'brasil' + int(r,100,999), score: 'BOM' }
    ];

    const parentes = [
      { nome: mae, vinculo: 'Mãe', cpf: '—', nasc: '—', renda: '—', prof: '—', local: `${cidade}/${uf}` },
      { nome: pai, vinculo: 'Pai', cpf: `${pad(int(r,100,999),3)}.${pad(int(r,100,999),3)}.${pad(int(r,100,999),3)}-${pad(int(r,0,99),2)}`, nasc: `${pad(int(r,1,28),2)}/${pad(int(r,1,12),2)}/${anoNasc-28} (${idade+28} anos)`, renda: 'R$ 3.800,00', prof: 'Aposentado', local: `${cidade}/${uf}` },
      { nome: `${pick(r, r()>.5?FIRST_F:FIRST_M)} ${mid} ${last}`, vinculo: 'Irmão/Irmã', cpf: `${pad(int(r,100,999),3)}.${pad(int(r,100,999),3)}.${pad(int(r,100,999),3)}-${pad(int(r,0,99),2)}`, nasc: `${pad(int(r,1,28),2)}/${pad(int(r,1,12),2)}/${anoNasc+3} (${idade-3} anos)`, renda: 'R$ 2.400,00', prof: 'Comerciário', local: `${cidade}/${uf}` },
      { nome: `${pick(r, fem?FIRST_M:FIRST_F)} ${pick(r,LAST)} ${last}`, vinculo: 'Cônjuge', cpf: `${pad(int(r,100,999),3)}.${pad(int(r,100,999),3)}.${pad(int(r,100,999),3)}-${pad(int(r,0,99),2)}`, nasc: `${pad(int(r,1,28),2)}/${pad(int(r,1,12),2)}/${anoNasc+1} (${idade-1} anos)`, renda: 'R$ 2.900,00', prof: 'Profissional Liberal', local: `${cidade}/${uf}` }
    ];

    const historicoCriminal = temCriminal ? [
      { num: '01', tipo: 'Mandado de Medida Cautelar ou Intimação', especie: 'Medida Cautelar', tribunal: 'TJ' + uf, comarca: cidade, processo: `50${pad(int(r,1000,9999),4)}20-03.2024.8.21.0001`, peca: '5007270-03.2024.8.21.0001.01000122', expedicao: '14/08/2024', orgao: `Vara Criminal - ${cidade}/${uf}` }
    ] : [];

    const timeline = [
      { ano: String(anoNasc - 28), data: `15/04/${anoNasc - 28}`, cat: 'Família', tit: `Nascimento de ${pai} — Pai`, desc: 'Vínculo de 1º Grau' },
      { ano: String(anoNasc), data: nasc, cat: 'Pessoal', tit: `Nascimento de ${nome}`, desc: `Local: ${cidade}/${uf} · Signo: ${signo}` },
      { ano: String(anoNasc + 21), data: `11/06/${anoNasc + 21}`, cat: 'CNH', tit: 'Primeira Habilitação (CNH)', desc: `Registro: ${cnhNum}` },
      { ano: '2021', data: '24/08/2021', cat: 'Saúde', tit: 'Vacina COVID-19 PFIZER — 1ª Dose', desc: `Posto Central de Saúde - ${cidade}/${uf}` },
      { ano: '2021', data: '09/11/2021', cat: 'Saúde', tit: 'Vacina COVID-19 PFIZER — 2ª Dose', desc: `Posto Central de Saúde - ${cidade}/${uf}` }
    ];

    return {
      cpf: fmtCPF(clean),
      nome,
      sexo: fem ? 'Feminino' : 'Masculino',
      nascimento: nasc,
      idade,
      signo,
      naturalidade: `${cidade.toUpperCase()}/${uf}`,
      nacionalidade: 'Brasileiro',
      nomeMae: mae,
      nomePai: pai,
      rg: `${rgNum} - SSP/${uf}`,
      rgOrgao: 'SSP',
      rgUf: uf,
      rgData: `15/08/${anoNasc + 16}`,
      cns: cnsNum,
      tituloEleitor: `${titNum} - Zona: ${int(r,10,200)} - Seção: ${int(r,10,400)}`,
      cnh: cnhNum,
      cnhPrimeiraHab: `11/06/${anoNasc + 21}`,
      escolaridade: ['ENSINO MÉDIO COMPLETO', 'SUPERIOR COMPLETO'],
      rendaEstimada: 'R$ ' + renda.toLocaleString('pt-BR') + ',00',
      classeSocial: renda > 7000 ? 'A' : renda > 3000 ? 'B' : 'C',
      subclasseSocial: renda > 7000 ? 'A1' : renda > 3000 ? 'B2' : 'C1',
      situacao: r() > .08 ? 'REGULAR' : 'PENDENTE DE REGULARIZAÇÃO',
      indicativoCriminal: temCriminal,
      ocupacao: pick(r, JOBS),
      score,
      obito: r() > .97,
      endereco: enderecos[0],
      bairro: pick(r, ['Centro','Jardim América','Vila Nova','Boa Vista','Santa Mônica','Planalto','São José','Industrial']),
      cidade,
      uf,
      cep: `${pad(int(r,1000,99999),5)}-${pad(int(r,0,999),3)}`,
      telefone: tel,
      operadora: pick(r, CARRIERS),
      email: `${emailUser}${int(r,1,99)}@${pick(r,['gmail.com','hotmail.com','outlook.com','yahoo.com.br'])}`,
      contadores: {
        enderecos: enderecos.length,
        telefones: telefones.length,
        emails: emails.length,
        parentes: parentes.length,
        empresas: 1,
        veiculos: 1,
        imoveis: 0,
        empregos: 1,
        beneficios: 1,
        vacinas: 2
      },
      historicoCriminal,
      atividadeOnline: {
        perfil: `${first} “${first.toLowerCase().slice(0,3)}” ${last}`,
        nivel: 'Nível 1 (14 pontos)',
        avaliacoes: [
          { local: `Restaurante e Churrascaria ${last}`, nota: '5/5', endereco: `${enderecos[0]}`, resposta: 'Agradecemos a avaliação!' }
        ]
      },
      enderecos,
      telefones,
      emails,
      parentes,
      parentesEndereco: [
        { nome: parentes[2].nome, cpf: parentes[2].cpf, cidade: `${cidade}/${uf}`, nasc: parentes[2].nasc, renda: parentes[2].renda, prof: parentes[2].prof, endereco: enderecos[0] }
      ],
      profissoes: [ { nome: pick(r, JOBS), cbo: String(int(r, 100000, 999999)) } ],
      veiculos: [ { placa: `${pick(r, ['ABC','BRA','XYZ','IRX'])}-${int(r,1000,9999)}`, modelo: pick(r, ['FIAT STRADA','VOLKSWAGEN POLO','CHEVROLET ONIX','HYUNDAI HB20']), ano: String(int(r, 2012, 2024)), cor: pick(r, COLORS), renavam: String(int(r, 100000000, 999999999)), chassi: '9362' + int(r, 1000000000, 9999999999) } ],
      empresas: [ { cnpj: `${pad(int(r,10,99),2)}.${pad(int(r,100,999),3)}.${pad(int(r,100,999),3)}/0001-${pad(int(r,10,99),2)}`, razao: `${nome.toUpperCase()} ${clean}`, tipo: 'MEI' } ],
      beneficios: [ { tipo: 'AUXÍLIO EMERGENCIAL', uf, municipio: cidade, nis: '0', valor: 'R$ 2.550,00' } ],
      vacinas: [
        { vacina: 'COVID-19 PFIZER - COMIRNATY', fabricante: 'PFIZER', dose: '1ª Dose', lote: '28231BD', data: '24/08/2021', local: `UNIDADE DE SAUDE CENTRAL - ${cidade}/${uf}` },
        { vacina: 'COVID-19 PFIZER - COMIRNATY', fabricante: 'PFIZER', dose: '2ª Dose', lote: 'FK0596', data: '09/11/2021', local: `UNIDADE DE SAUDE CENTRAL - ${cidade}/${uf}` }
      ],
      propensoes: ['Cartão de Crédito', 'Seguro Auto', 'TV a Cabo', 'E-commerce', 'Streaming', 'Usuário Digital'],
      timeline
    };
  }

  // ---- Empresa fictícia (fallback p/ CNPJ sem API) ----
  function empresa(cnpj) {
    const clean = cnpj.replace(/\D/g, '');
    const r = rng('cnpj:' + clean);
    const nomes = ['COMERCIAL','DISTRIBUIDORA','TRANSPORTES','CONSULTORIA','TECNOLOGIA','CONSTRUTORA','LOGÍSTICA','ALIMENTOS','SERVIÇOS','INDÚSTRIA'];
    const sufixo = ['LTDA','S.A.','ME','EIRELI'];
    const base = pick(r, LAST).toUpperCase();
    const [cidade, uf] = pick(r, CITIES);
    return {
      cnpj: fmtCNPJ(clean),
      razao: `${base} ${pick(r,nomes)} ${pick(r,sufixo)}`,
      fantasia: `${base} ${pick(r,['Prime','Plus','Express','Brasil','Group'])}`,
      abertura: `${pad(int(r,1,28),2)}/${pad(int(r,1,12),2)}/${int(r,1992,2023)}`,
      situacao: r() > .12 ? 'ATIVA' : 'BAIXADA',
      natureza: pick(r, ['206-2 Sociedade Empresária Limitada','204-6 Sociedade Anônima Fechada','213-5 Empresário Individual']),
      cnae: pick(r, ['47.11-3-02 Comércio varejista','62.01-5-01 Desenvolvimento de software','49.30-2-02 Transporte rodoviário de carga','70.20-4-00 Consultoria empresarial']),
      capital: 'R$ ' + (int(r,1,900)*1000).toLocaleString('pt-BR') + ',00',
      porte: pick(r, ['ME','EPP','DEMAIS']),
      endereco: `${pick(r,STREETS)}, ${int(r,10,3000)}`,
      cidade, uf,
      telefone: `(${int(r,11,98)}) 3${pad(int(r,100,999),3)}-${pad(int(r,0,9999),4)}`,
      email: `contato@${base.toLowerCase()}${pick(r,['.com.br','.net.br'])}`,
      socios: [
        { nome: `${pick(r,FIRST_M)} ${pick(r,LAST)} ${pick(r,LAST)}`, qual: 'Sócio-Administrador' },
        { nome: `${pick(r,FIRST_F)} ${pick(r,LAST)} ${pick(r,LAST)}`, qual: 'Sócio' }
      ]
    };
  }

  // ---- Veículo fictício a partir da placa ----
  function veiculo(placa) {
    const clean = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const r = rng('placa:' + clean);
    const [marca, modelos] = pick(r, CAR_BRANDS);
    const ano = int(r, 2008, 2025);
    const p = pessoa(String(int(r, 10000000000, 99999999999)));
    return {
      placa: clean.length === 7 ? clean.slice(0,3) + '-' + clean.slice(3) : clean,
      marca, modelo: pick(r, modelos), anoFab: ano, anoMod: Math.min(ano + 1, 2026),
      cor: pick(r, COLORS), combustivel: pick(r, ['Flex','Gasolina','Diesel','Híbrido','Elétrico']),
      chassi: '9BW' + Array.from({length:14},()=>pick(r,'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split(''))).join(''),
      renavam: String(int(r, 10000000000, 99999999999)),
      municipio: p.cidade + '/' + p.uf,
      situacao: r() > .1 ? 'SEM RESTRIÇÃO' : pick(r, ['ALIENAÇÃO FIDUCIÁRIA','RESTRIÇÃO JUDICIAL']),
      roubo: r() > .96,
      ipva: r() > .25 ? 'QUITADO' : 'EM ABERTO',
      licenciamento: r() > .2 ? String(int(r,2024,2026)) : '2023 (ATRASADO)',
      multas: int(r, 0, 4),
      proprietario: p.nome, proprietarioDoc: p.cpf.slice(0,3) + '.***.***-' + p.cpf.slice(-2)
    };
  }

  // ---- Vazamentos a partir de e-mail/CPF/telefone ----
  function vazamentos(query) {
    const r = rng('leak:' + query.toLowerCase().trim());
    const n = int(r, 0, 5);
    const shuffled = [...BREACHES].sort(() => r() - 0.5);
    return shuffled.slice(0, n).sort((a,b) => b.date.localeCompare(a.date));
  }

  // ---- Telefone ----
  function telefone(num) {
    const clean = num.replace(/\D/g, '');
    const r = rng('tel:' + clean);
    const ddd = clean.length >= 10 ? clean.slice(0, 2) : String(int(r, 11, 98));
    const DDD_UF = {'11':'SP','12':'SP','13':'SP','14':'SP','15':'SP','16':'SP','17':'SP','18':'SP','19':'SP','21':'RJ','22':'RJ','24':'RJ','27':'ES','28':'ES','31':'MG','32':'MG','33':'MG','34':'MG','35':'MG','37':'MG','38':'MG','41':'PR','42':'PR','43':'PR','44':'PR','45':'PR','46':'PR','47':'SC','48':'SC','49':'SC','51':'RS','53':'RS','54':'RS','55':'RS','61':'DF','62':'GO','63':'TO','64':'GO','65':'MT','66':'MT','67':'MS','68':'AC','69':'RO','71':'BA','73':'BA','74':'BA','75':'BA','77':'BA','79':'SE','81':'PE','82':'AL','83':'PB','84':'RN','85':'CE','86':'PI','87':'PE','88':'CE','89':'PI','91':'PA','92':'AM','93':'PA','94':'PA','95':'RR','96':'AP','97':'AM','98':'MA','99':'MA'};
    const movel = clean.length === 11 && clean[2] === '9';
    const p = pessoa(String(hash('t' + clean)));
    return {
      numero: clean.length === 11 ? `(${ddd}) ${clean.slice(2,7)}-${clean.slice(7)}` : clean.length === 10 ? `(${ddd}) ${clean.slice(2,6)}-${clean.slice(6)}` : num,
      tipo: movel ? 'Móvel' : 'Fixo',
      operadora: pick(r, CARRIERS),
      portado: r() > .6,
      uf: DDD_UF[ddd] || '—',
      whatsapp: movel && r() > .25,
      titularProvavel: p.nome,
      titularDoc: p.cpf.slice(0,3) + '.***.***-' + p.cpf.slice(-2),
      ativo: r() > .12
    };
  }

  // ---- E-mail ----
  function email(addr) {
    const a = addr.toLowerCase().trim();
    const r = rng('mail:' + a);
    const valido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a);
    const dominio = valido ? a.split('@')[1] : '';
    const free = ['gmail.com','hotmail.com','outlook.com','yahoo.com','yahoo.com.br','bol.com.br','uol.com.br','icloud.com','proton.me'].includes(dominio);
    const leaks = vazamentos(a);
    return {
      email: a, valido,
      dominio, tipoDominio: free ? 'Provedor gratuito' : 'Domínio corporativo/próprio',
      mx: valido && r() > .06,
      descartavel: ['mailinator.com','tempmail.com','guerrillamail.com','10minutemail.com','yopmail.com'].includes(dominio),
      criadoEstimado: `${int(r,2008,2023)}`,
      reputacao: int(r, 20, 98),
      redesVinculadas: SOCIAL.filter(() => r() > .62).map(s => s.name),
      vazamentos: leaks
    };
  }

  const TJ_UF = { '01':'ac','02':'al','03':'ap','04':'am','05':'ba','06':'ce','07':'df','08':'es','09':'go','10':'ma','11':'mt','12':'ms','13':'mg','14':'pa','15':'pb','16':'pr','17':'pe','18':'pi','19':'rj','20':'rn','21':'rs','22':'ro','23':'rr','24':'sc','25':'se','26':'sp','27':'to' };
  function tribunalFromCNJ(num) {
    if (!/^\d{20}$/.test(num)) return null;
    const j = num.slice(13, 14), tr = num.slice(14, 16);
    if (j === '1') return 'stf';
    if (j === '3') return 'stj';
    if (j === '4') return 'trf' + (+tr);
    if (j === '5') return 'trt' + (+tr);
    if (j === '7') return 'stm';
    if (j === '8') return tr === '07' ? 'tjdft' : 'tj' + (TJ_UF[tr] || tr);
    return null;
  }

  // ---- OSINT Brasil & Brazuca Directory (base curada de fontes oficiais e gratuitas) ----
  const OSINT_BRASIL_DIRECTORY = [
    // Pessoas & Qualificação
    { cat: 'pessoas', nome: 'Portal da Transparência (Servidores & Benefícios)', ico: '🏛️', desc: 'Consulta de servidores públicos federais, remunerações, viagens a serviço e beneficiários de programas sociais.', url: 'https://portaldatransparencia.gov.br/servidores', tags: ['Oficial', 'Gratuito', 'Federal'] },
    { cat: 'pessoas', nome: 'TSE — DivulgaCandContas', ico: '🗳️', desc: 'Declarações completas de bens, doações eleitorais, certidões criminais eleitorais e histórico de candidaturas.', url: 'https://divulgacandcontas.tse.jus.br/', tags: ['Oficial', 'Gratuito', 'Patrimônio'] },
    { cat: 'pessoas', nome: 'TSE — Filiação Partidária', ico: '📜', desc: 'Relação oficial de filiados a partidos políticos brasileiros por município e zona eleitoral.', url: 'https://www.tse.jus.br/servicos-eleitorais/certidoes/certidao-de-filiacao-partidaria', tags: ['Oficial', 'Gratuito'] },
    { cat: 'pessoas', nome: 'Plataforma Lattes (CNPq)', ico: '🎓', desc: 'Currículo acadêmico e profissional detalhado, histórico de pesquisas, formações, orientadores e vínculos institucionais.', url: 'https://buscatextual.cnpq.br/buscatextual/busca.do', tags: ['Oficial', 'Gratuito', 'Acadêmico'] },
    { cat: 'pessoas', nome: 'CNA — Cadastro Nacional dos Advogados (OAB)', ico: '⚖️', desc: 'Consulta oficial de advogados inscritos na OAB, situação regular, seccional e número de inscrição.', url: 'https://cna.oab.org.br/', tags: ['Oficial', 'Gratuito', 'Profissional'] },
    { cat: 'pessoas', nome: 'CFM — Conselho Federal de Medicina', ico: '🩺', desc: 'Verificação cadastral de médicos, especialidades registradas, CRM e situação de registro.', url: 'https://portal.cfm.org.br/busca-medicos/', tags: ['Oficial', 'Gratuito', 'Saúde'] },
    { cat: 'pessoas', nome: 'CONFEA / CREA Nacional', ico: '📐', desc: 'Consulta pública de engenheiros, agrônomos e arquitetos com registro profissional ativo.', url: 'https://www.confea.org.br/servicos-ao-profissional/consulta-de-profissionais-e-empresas', tags: ['Oficial', 'Gratuito'] },
    { cat: 'pessoas', nome: 'COFEN / COREN — Enfermagem Nacional', ico: '💉', desc: 'Consulta pública de enfermeiros, técnicos e auxiliares de enfermagem em todo o Brasil.', url: 'http://www.cofen.gov.br/servicos-busca-profissionais', tags: ['Oficial', 'Gratuito'] },
    { cat: 'pessoas', nome: 'CFP — Cadastro Nacional de Psicólogos', ico: '🧠', desc: 'Verificação de registro profissional de psicólogos no Conselho Federal de Psicologia.', url: 'https://cadastro.cfp.org.br/', tags: ['Oficial', 'Gratuito'] },
    { cat: 'pessoas', nome: 'CFC — Conselho Federal de Contabilidade', ico: '📊', desc: 'Consulta pública de contadores e técnicos em contabilidade com registro ativo no Brasil.', url: 'https://cfc.org.br/registro/profissionais-e-empresas-registradas/', tags: ['Oficial', 'Gratuito'] },
    { cat: 'pessoas', nome: 'CFF — Conselho Federal de Farmácia', ico: '💊', desc: 'Consulta pública de farmacêuticos e estabelecimentos farmacêuticos registrados.', url: 'https://site.cff.org.br/', tags: ['Oficial', 'Gratuito'] },
    { cat: 'pessoas', nome: 'CFO — Conselho Federal de Odontologia', ico: '🦷', desc: 'Consulta oficial de cirurgiões-dentistas e especialistas odontológicos no país.', url: 'https://website.cfo.org.br/profissionais-cadastrados/', tags: ['Oficial', 'Gratuito'] },
    { cat: 'pessoas', nome: 'COFECI / CRECI — Corretores de Imóveis', ico: '🏠', desc: 'Consulta cadastral de corretores e imobiliárias credenciadas no sistema COFECI/CRECI.', url: 'https://www.cofeci.gov.br/', tags: ['Oficial', 'Gratuito'] },
    { cat: 'pessoas', nome: 'CNES — Estabelecimentos de Saúde (Datasus)', ico: '🏥', desc: 'Vínculos de profissionais da saúde em hospitais, clínicas e postos de saúde de todo o Brasil.', url: 'https://cnes.datasus.gov.br/', tags: ['Oficial', 'Gratuito', 'Datasus'] },
    { cat: 'pessoas', nome: 'Cadastro Nacional de Falecidos (Obituários)', ico: '⚰️', desc: 'Pesquisa pública em certidões de óbito, registros cartorários e obituários em território nacional.', url: 'https://www.falecidosnobrasil.org.br/', tags: ['OSINT', 'Gratuito'] },

    // Empresas & Vínculos Societários
    { cat: 'empresas', nome: 'Redesim — Consulta PJ Receita Federal', ico: '🏢', desc: 'Consulta oficial da situação cadastral de CNPJ, quadro de sócios e administradores (QSA) e atividades econômicas.', url: 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp', tags: ['Oficial', 'Gratuito', 'Receita'] },
    { cat: 'empresas', nome: 'Portal da Transparência — CEIS / CNEP / CEPIM', ico: '🚫', desc: 'Cadastro de Empresas Inidôneas e Suspensas, Empresas Punidas e Impedidas de Licitar com o poder público.', url: 'https://portaldatransparencia.gov.br/sancoes/ceis', tags: ['Oficial', 'Gratuito', 'Sanções'] },
    { cat: 'empresas', nome: 'Sintegra Nacional', ico: '📑', desc: 'Inscrição Estadual (IE), situação tributária estadual e regime de ICMS de empresas em todas as 27 UFs.', url: 'http://www.sintegra.gov.br/', tags: ['Oficial', 'Gratuito', 'Tributário'] },
    { cat: 'empresas', nome: 'Portal Nacional de Contratações Públicas (PNCP)', ico: '🛒', desc: 'Atas de registro de preço, editais, termos de contrato e compras de órgãos públicos no Brasil.', url: 'https://www.gov.br/pncp/pt-br', tags: ['Oficial', 'Gratuito', 'Licitações'] },
    { cat: 'empresas', nome: 'B3 & CVM — Consulta de Companhias Abertas', ico: '📈', desc: 'Demonstrações financeiras, fatos relevantes, acionistas controladores e governança corporativa na CVM/B3.', url: 'https://www.rad.cvm.gov.br/ENET/frmConsultaExternaCVM.aspx', tags: ['Oficial', 'Gratuito', 'Bolsa'] },
    { cat: 'empresas', nome: 'Portal do Empreendedor — MEI Oficial', ico: '💼', desc: 'Comprovante de Condição de Microempreendedor Individual (CCMEI) e situação cadastral do MEI.', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor', tags: ['Oficial', 'Gratuito'] },
    { cat: 'empresas', nome: 'Casa dos Dados (Base Aberta RFB)', ico: '📊', desc: 'Pesquisa avançada por sócio, CNAE, capital social e cidade sobre a base aberta completa da Receita Federal.', url: 'https://www.casadosdados.com.br/solucao/cnpj/pesquisa-avancada', tags: ['OSINT', 'Gratuito'] },
    { cat: 'empresas', nome: 'ConsultaSocio (Mapeamento de Sócios)', ico: '👥', desc: 'Cruzamento relacional de todas as empresas vinculadas a um nome ou documento no Brasil.', url: 'https://www.consultasocio.com/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'empresas', nome: 'Junta Comercial de São Paulo (JUCESP)', ico: '📁', desc: 'Ficha cadastral simplificada e completa de sociedades empresárias registradas em SP.', url: 'https://www.jucesponline.sp.gov.br/', tags: ['Oficial', 'Junta'] },
    { cat: 'empresas', nome: 'Junta Comercial do Rio de Janeiro (JUCERJA)', ico: '📁', desc: 'Consulta de atos societários, contratos sociais e certidões de empresas fluminenses.', url: 'https://www.jucerja.rj.gov.br/', tags: ['Oficial', 'Junta'] },
    { cat: 'empresas', nome: 'Junta Comercial de Minas Gerais (JUCEMG)', ico: '📁', desc: 'Pesquisa pública de empresas e atos constitutivos no estado de Minas Gerais.', url: 'https://jucemg.mg.gov.br/', tags: ['Oficial', 'Junta'] },
    { cat: 'empresas', nome: 'Junta Comercial do Rio Grande do Sul (JUCERGS)', ico: '📁', desc: 'Consulta pública de empresas registradas no estado do Rio Grande do Sul.', url: 'https://jucergs.rs.gov.br/', tags: ['Oficial', 'Junta'] },
    { cat: 'empresas', nome: 'Junta Comercial do Paraná (JUCEPAR)', ico: '📁', desc: 'Consulta pública de empresas e certidões no estado do Paraná.', url: 'https://www.jucepar.pr.gov.br/', tags: ['Oficial', 'Junta'] },
    { cat: 'empresas', nome: 'Junta Comercial de Santa Catarina (JUCESC)', ico: '📁', desc: 'Pesquisa de atos constitutivos e certidões no estado de Santa Catarina.', url: 'https://www.jucesc.sc.gov.br/', tags: ['Oficial', 'Junta'] },
    { cat: 'empresas', nome: 'Junta Comercial da Bahia (JUCEB)', ico: '📁', desc: 'Consulta pública de empresas e contratos sociais no estado da Bahia.', url: 'https://www.juceb.ba.gov.br/', tags: ['Oficial', 'Junta'] },

    // Justiça & Diários Oficiais
    { cat: 'justica', nome: 'DataJud / CNJ — Painel Nacional de Estatísticas', ico: '⚖️', desc: 'Metadados, tempos processuais e indicadores de processos judiciais de todos os tribunais do país.', url: 'https://paineis.cnj.jus.br/QvAJAXZfc/opendoc.htm?document=qvw_l/PainelCNJ.qvw&host=QVS%40paineis-cnj&anonymous=true', tags: ['Oficial', 'Gratuito', 'CNJ'] },
    { cat: 'justica', nome: 'BNMP 3.0 — Banco Nacional de Mandados de Prisão', ico: '🚨', desc: 'Consulta pública oficial de mandados de prisão em aberto e alvarás de soltura do CNJ.', url: 'https://portalbnmp.cnj.jus.br/', tags: ['Oficial', 'Gratuito', 'CNJ'] },
    { cat: 'justica', nome: 'DJEN — Diário da Justiça Eletrônico Nacional (CNJ)', ico: '📜', desc: 'Plataforma unificada oficial de publicações judiciais de todos os tribunais do Poder Judiciário.', url: 'https://comunica.pje.jus.br/', tags: ['Oficial', 'Gratuito', 'CNJ'] },
    { cat: 'justica', nome: 'DOU — Diário Oficial da União (Imprensa Nacional)', ico: '📰', desc: 'Leis, decretos, nomeações de cargos públicos, exonerações, licitações e contratos da União.', url: 'https://www.in.gov.br/leiturajornal', tags: ['Oficial', 'Gratuito', 'Imprensa Nacional'] },
    { cat: 'justica', nome: 'Jusbrasil Processos & Jurisprudência', ico: '📚', desc: 'Pesquisa unificada em milhões de processos judiciais, acórdãos e diários de justiça de todo o país.', url: 'https://www.jusbrasil.com.br/consulta-processual/', tags: ['OSINT', 'Freemium'] },
    { cat: 'justica', nome: 'Escavador — Pessoas, Processos & Empresas', ico: '⛏️', desc: 'Indexador de menções em diários oficiais da união e dos estados com busca por nome ou documento.', url: 'https://www.escavador.com/', tags: ['OSINT', 'Freemium'] },
    { cat: 'justica', nome: 'CNDT — Certidão Negativa de Débitos Trabalhistas (TST)', ico: '💼', desc: 'Emissão e validação pública de certidão de débitos na Justiça do Trabalho por CNPJ ou CPF.', url: 'https://cndt-certidao.tst.jus.br/inicio.faces', tags: ['Oficial', 'Gratuito', 'Trabalhista'] },
    { cat: 'justica', nome: 'Dívida Ativa da União — Lista de Devedores (PGFN)', ico: '💰', desc: 'Relação pública de pessoas físicas e jurídicas inscritas em dívida ativa da União e FGTS.', url: 'https://www.regularize.pgfn.gov.br/consulta-devedores', tags: ['Oficial', 'Gratuito', 'PGFN'] },
    { cat: 'justica', nome: 'Cenprot — Central Nacional de Protestos', ico: '📢', desc: 'Pesquisa gratuita de existência de protestos em cartórios de notas e protestos de todo o Brasil.', url: 'https://site.cenprot.com.br/', tags: ['Oficial', 'Gratuito', 'Cartórios'] },
    { cat: 'justica', nome: 'STF — Consulta Processual do Supremo', ico: '🏛️', desc: 'Acompanhamento processual de Ações Diretas de Inconstitucionalidade (ADI), Recursos Extraordinários e HCs no STF.', url: 'https://portal.stf.jus.br/processos/', tags: ['Oficial', 'Gratuito', 'STF'] },
    { cat: 'justica', nome: 'STJ — Superior Tribunal de Justiça', ico: '🏛️', desc: 'Pesquisa de processos, recursos especiais e jurisprudência unificada no STJ.', url: 'https://www.stj.jus.br/processo/consulta/', tags: ['Oficial', 'Gratuito', 'STJ'] },

    // Veículos, Aeronaves & Embarcações
    { cat: 'veiculos', nome: 'Sinesp Cidadão (Veículos Roubados / Furtados)', ico: '🚗', desc: 'Consulta oficial do Ministério da Justiça para checagem de queixa de roubo ou furto de veículos.', url: 'https://sinesp.mj.gov.br/', tags: ['Oficial', 'Gratuito', 'Gov'] },
    { cat: 'veiculos', nome: 'Senatran — Portal de Serviços de Trânsito', ico: '🚦', desc: 'Serviços federais de veículos, histórico de recalls pendentes e habilitação nacional.', url: 'https://portalservicos.senatran.serpro.gov.br/', tags: ['Oficial', 'Serpro'] },
    { cat: 'veiculos', nome: 'Tabela FIPE Oficial', ico: '📊', desc: 'Preço médio de mercado de automóveis, motocicletas e caminhões no Brasil.', url: 'https://veiculos.fipe.org.br/', tags: ['Oficial', 'Gratuito'] },
    { cat: 'veiculos', nome: 'ANAC — Registro Aeronáutico Brasileiro (RAB)', ico: '✈️', desc: 'Consulta oficial pública de proprietários, operadores, modelo e situação de aeronaves civis no Brasil.', url: 'https://sistemas.anac.gov.br/aeronaves/cons_rab.asp', tags: ['Oficial', 'Gratuito', 'Aeronaves'] },
    { cat: 'veiculos', nome: 'FlightRadar24 — Rastreamento Aéreo Global', ico: '🛫', desc: 'Radar ao vivo e histórico de voos, rotas e posicionamento de aeronaves no mundo todo.', url: 'https://www.flightradar24.com/', tags: ['OSINT', 'Freemium', 'Aeronaves'] },
    { cat: 'veiculos', nome: 'MarineTraffic — Rastreamento de Embarcações & Iates', ico: '🚢', desc: 'Posicionamento via AIS de navios, iates particulares e embarcações em tempo real nos portos e mares.', url: 'https://www.marinetraffic.com/', tags: ['OSINT', 'Freemium', 'Marinha'] },
    { cat: 'veiculos', nome: 'VesselFinder — AIS Vessel Tracking', ico: '⚓', desc: 'Monitoramento marítimo aberto de embarcações, rotas, portos de escala e proprietários.', url: 'https://www.vesselfinder.com/', tags: ['OSINT', 'Gratuito'] },

    // Domínios, DNS & Infraestrutura
    { cat: 'infra', nome: 'Registro.br WHOIS Oficial', ico: '🇧🇷', desc: 'Consulta pública de titularidade de domínios terminados em .br, CNPJ do titular, DNS e contatos.', url: 'https://registro.br/tecnologia/ferramentas/whois/', tags: ['Oficial', 'Gratuito', 'NIC.br'] },
    { cat: 'infra', nome: 'Shodan — Search Engine for Internet-Connected Devices', ico: '📡', desc: 'Motor de busca de servidores, portas abertas, roteadores, câmeras IP, certificados SSL e IoT.', url: 'https://www.shodan.io/', tags: ['OSINT', 'Freemium', 'Infra'] },
    { cat: 'infra', nome: 'theHarvester (Reconhecimento de Domínios / E-mails)', ico: '🌾', desc: 'Ferramenta open-source padrão para levantamento de subdomínios, e-mails corporativos e IPs públicos.', url: 'https://github.com/laramies/theHarvester', tags: ['Open Source', 'Kali', 'OSINT'] },
    { cat: 'infra', nome: 'SecurityTrails — Total Internet Inventory', ico: '🛡️', desc: 'Histórico de DNS passivo, mapeamento de subdomínios e WHOIS histórico de domínios mundiais.', url: 'https://securitytrails.com/', tags: ['OSINT', 'Freemium'] },
    { cat: 'infra', nome: 'crt.sh — Certificate Transparency Search', ico: '📜', desc: 'Descoberta de subdomínios e infraestruturas ocultas através de logs públicos de certificados SSL/TLS.', url: 'https://crt.sh/', tags: ['OSINT', 'Gratuito', 'Subdomínios'] },
    { cat: 'infra', nome: 'BGP Toolkit (Hurricane Electric)', ico: '🌐', desc: 'Análise de Autonomous System Numbers (ASN), prefixos IP, rotas BGP e topologia de rede.', url: 'https://bgp.he.net/', tags: ['Gratuito', 'Redes'] },
    { cat: 'infra', nome: 'VirusTotal — IP & Domain Intelligence', ico: '🦠', desc: 'Verificação de reputação de IPs, hashes de arquivos maliciosos, URLs suspeitas e detecções AV.', url: 'https://www.virustotal.com/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'infra', nome: 'Censys Search', ico: '🔎', desc: 'Varredura e indexação contínua de certificados SSL/TLS, serviços na web e superfícies de ataque.', url: 'https://search.censys.io/', tags: ['OSINT', 'Freemium'] },
    { cat: 'infra', nome: 'ViewDNS.info — Ferramentas de Investigação DNS', ico: '🛠️', desc: 'Reverse IP lookup, histórico de Whois, DNS report e DNS propagation checker.', url: 'https://viewdns.info/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'infra', nome: 'IPQualityScore (IPQS) — Detecção de Proxy / VPN / Risco', ico: '🛡️', desc: 'Avaliação de score de fraude, detecção de VPNs, proxies anônimos, bots e nós TOR.', url: 'https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test', tags: ['OSINT', 'Freemium'] },

    // Arquivos, Vazamentos & Dumps Públicos
    { cat: 'arquivos', nome: 'Intelligence X (IntelX)', ico: '🗄️', desc: 'Motor de busca em arquivos históricos da web, dumps públicos, pastes de desenvolvedores e deep web.', url: 'https://intelx.io/', tags: ['OSINT', 'Freemium', 'Arquivos'] },
    { cat: 'arquivos', nome: 'Wayback Machine (Internet Archive)', ico: '🕰️', desc: 'Mais de 800 bilhões de páginas arquivadas no tempo. Permite visualizar sites deletados ou modificados.', url: 'https://web.archive.org/', tags: ['Gratuito', 'Histórico'] },
    { cat: 'arquivos', nome: 'Archive.today', ico: '📸', desc: 'Criação e consulta de snapshots instantâneos e permanentes de páginas da web, contornando paywalls.', url: 'https://archive.today/', tags: ['Gratuito', 'Snapshots'] },
    { cat: 'arquivos', nome: 'Have I Been Pwned (HIBP)', ico: '🚨', desc: 'Base de dados pública internacional de e-mails comprometidos em grandes vazamentos de dados.', url: 'https://haveibeenpwned.com/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'arquivos', nome: 'DeHashed — Public Breach Search Engine', ico: '🔓', desc: 'Motor de busca em dados de violações públicas para verificação de vazamentos de credenciais corporativas.', url: 'https://www.dehashed.com/', tags: ['OSINT', 'Freemium'] },
    { cat: 'arquivos', nome: 'Hunter.io — Caçador de E-mails Corporativos', ico: '🎯', desc: 'Descobre os padrões de endereços de e-mail corporativos e listas de funcionários por domínio.', url: 'https://hunter.io/', tags: ['OSINT', 'Freemium'] },

    // Geolocalização, Imagens & GEOINT
    { cat: 'geo', nome: 'SunCalc — Calculadora de Sol e Sombras Forense', ico: '☀️', desc: 'Cálculo astronômico da posição do sol, azimute e ângulo de sombras para determinar horário exato de fotos.', url: 'https://www.suncalc.org/', tags: ['Forense', 'Gratuito', 'GEOINT'] },
    { cat: 'geo', nome: 'Google Lens & Imagens Reversas', ico: '🔍', desc: 'Busca reversa por imagens para identificação de pessoas, objetos, locais e origens visuais.', url: 'https://images.google.com/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'geo', nome: 'Yandex Reverse Image Search', ico: '🇷🇺', desc: 'Um dos mais potentes motores de busca reversa facial e de pontos turísticos globais.', url: 'https://yandex.com/images/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'geo', nome: 'TinEye Reverse Image Search', ico: '🔎', desc: 'Rastreamento de histórico de aparições de uma imagem específica e suas versões modificadas.', url: 'https://tineye.com/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'geo', nome: 'Sentinel Hub — Imagens de Satélite da Terra', ico: '🛰️', desc: 'Imagens multiespectrais de satélite da missão Copernicus da Agência Espacial Europeia atualizadas a cada 5 dias.', url: 'https://apps.sentinel-hub.com/eo-browser/', tags: ['OSINT', 'Gratuito', 'Satélite'] },
    { cat: 'geo', nome: 'Wikimapia — Mapeamento Colaborativo de Alvos', ico: '📍', desc: 'Mapa satelital com anotações abertas de prédios governamentais, condomínios e instalações.', url: 'https://wikimapia.org/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'geo', nome: 'Mapillary — Imagens de Rua Nível Terrestre', ico: '🛣️', desc: 'Banco de dados aberto de fotos em nível de rua (street-view) colaborativo com georreferenciamento.', url: 'https://www.mapillary.com/app', tags: ['OSINT', 'Gratuito'] },

    // Mídias Sociais & Redes
    { cat: 'social', nome: 'Sherlock (Repositório Oficial no GitHub)', ico: '🐙', desc: 'O software open-source mais consagrado do mundo para caça de perfis por username em centenas de redes.', url: 'https://github.com/sherlock-project/sherlock', tags: ['Open Source', 'OSINT'] },
    { cat: 'social', nome: 'WhatsMyName.app', ico: '👤', desc: 'Enumeração rápida de usernames em dezenas de plataformas web atualizadas em tempo real.', url: 'https://whatsmyname.app/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'social', nome: 'Telegram Directory & Lyzem Search', ico: '✈️', desc: 'Motor de busca público para canais, grupos abertos e mensagens em grupos públicos do Telegram.', url: 'https://lyzem.com/', tags: ['OSINT', 'Gratuito'] },
    { cat: 'social', nome: 'Telemetr.io — Analytics de Canais Telegram', ico: '📈', desc: 'Análise de métricas, histórico de administradores e engajamento em canais públicos do Telegram.', url: 'https://telemetr.io/', tags: ['OSINT', 'Freemium'] },
    { cat: 'social', nome: 'Reddit Search Tool', ico: '👽', desc: 'Busca avançada em postagens e comentários em toda a rede de comunidades do Reddit.', url: 'https://redditsearchtool.com/', tags: ['OSINT', 'Gratuito'] },

    // Criptoativos & Blockchain
    { cat: 'cripto', nome: 'Blockchain.com Explorer (Bitcoin BTC)', ico: '🪙', desc: 'Explorador oficial da blockchain do Bitcoin para verificação de saldo público e histórico de transações.', url: 'https://www.blockchain.com/explorer', tags: ['Blockchain', 'Gratuito'] },
    { cat: 'cripto', nome: 'Mempool.space — Bitcoin Mempool & On-chain', ico: '⛏️', desc: 'Visualizador de transações BTC em tempo real, taxas, blocos e confirmações on-chain.', url: 'https://mempool.space/', tags: ['Blockchain', 'Gratuito'] },
    { cat: 'cripto', nome: 'Etherscan — Ethereum & Smart Contracts', ico: '💎', desc: 'Explorador de blocos do Ethereum, tokens ERC-20 (USDT/USDC) e carteiras inteligentes.', url: 'https://etherscan.io/', tags: ['Blockchain', 'Gratuito'] },
    { cat: 'cripto', nome: 'Tronscan — TRON Network & USDT TRC-20', ico: '🔴', desc: 'Rastreamento de transferências de USDT na rede TRON, taxa de transação e contratos.', url: 'https://tronscan.org/', tags: ['Blockchain', 'Gratuito'] },
    { cat: 'cripto', nome: 'Solscan — Solana Blockchain Explorer', ico: '🟣', desc: 'Pesquisa de endereços de carteiras, tokens SPL e transações na rede Solana.', url: 'https://solscan.io/', tags: ['Blockchain', 'Gratuito'] },
    { cat: 'cripto', nome: 'Chainabuse — Banco de Denúncias de Golpes Cripto', ico: '🛡️', desc: 'Base global colaborativa para consulta e reporte de carteiras usadas em fraudes, ransomware e extorsão.', url: 'https://www.chainabuse.com/', tags: ['OSINT', 'Gratuito', 'Denúncias'] },
    { cat: 'cripto', nome: 'Arkham Intelligence — Visualizador de Fluxo Cripto', ico: '🕸️', desc: 'Plataforma de inteligência para de-anonimização e rastreamento de entidades em blockchains.', url: 'https://platform.arkhamintelligence.com/', tags: ['OSINT', 'Freemium'] },

    // Forense Digital & Metadados
    { cat: 'forense', nome: 'CyberChef — The Cyber Swiss Army Knife (GCHQ)', ico: '👨‍🍳', desc: 'Canivete suíço para peritos: conversão Base64, decodificação de hashes, descompressão e análise de dados.', url: 'https://gchq.github.io/CyberChef/', tags: ['Forense', 'Open Source', 'Gratuito'] },
    { cat: 'forense', nome: 'FotoForensics — Error Level Analysis (ELA)', ico: '🔬', desc: 'Análise forense de manipulação e adulteração de imagens digitais por nível de compressão de pixels.', url: 'https://fotoforensics.com/', tags: ['Forense', 'Gratuito'] },
    { cat: 'forense', nome: 'Jeffrey\'s Image Metadata Viewer', ico: '📷', desc: 'Extrator detalhado de metadados EXIF, IPTC, XMP, modelo de lente, câmera e coordenadas GPS em fotos.', url: 'http://exif.regex.info/exif.cgi', tags: ['Forense', 'Gratuito'] }
  ];

  // ---- Presets de Google Dorks Investigativo Pro ----
  const DORKS_TEMPLATES = [
    {
      id: 'docs-confidenciais',
      cat: 'Documentos',
      titulo: 'Documentos Restritos & PDFs Expostos',
      desc: 'Localiza arquivos PDF, Word e planilhas contendo termos como "confidencial", "contrato", "declaração" associados ao alvo.',
      build: q => `(filetype:pdf OR filetype:docx OR filetype:xlsx OR filetype:doc) "${q}" (confidencial OR restrito OR "uso interno" OR contrato OR minuta OR declaracao)`
    },
    {
      id: 'diarios-oficiais',
      cat: 'Diários & Leis',
      titulo: 'Menções em Diários Oficiais & Imprensa Nacional',
      desc: 'Pesquisa publicações oficiais na Imprensa Nacional (in.gov.br), Jusbrasil, Escavador e Diários de Justiça estaduais.',
      build: q => `(site:in.gov.br OR site:jusbrasil.com.br OR site:escavador.com OR site:jus.br) "${q}"`
    },
    {
      id: 'portais-transparencia',
      cat: 'Transparência',
      titulo: 'Servidores, Cargos & Gastos Públicos',
      desc: 'Varre portais de transparência federais, estaduais e municipais buscando vínculos de trabalho, portarias e licitações.',
      build: q => `(site:transparencia.gov.br OR site:gov.br/transparencia OR inurl:transparencia) "${q}" (servidor OR cargo OR portaria OR contrato OR diaria)`
    },
    {
      id: 'pastas-abertas',
      cat: 'Servidores',
      titulo: 'Diretórios Abertos (Directory Listing) & Backups',
      desc: 'Procura servidores com indexação aberta (Index of) contendo arquivos ou referências ao alvo.',
      build: q => `intitle:"index of" "${q}" OR intitle:"index of /" (backup OR dump OR data OR private) "${q}"`
    },
    {
      id: 'credenciais-configs',
      cat: 'Vazamentos',
      titulo: 'Arquivos de Configuração, .ENV & Chaves Expostas',
      desc: 'Localiza arquivos de variáveis de ambiente, logs e configurações que possam ter sido indexados publicamente.',
      build: q => `"${q}" (filetype:env OR filetype:sql OR filetype:log OR filetype:ini OR filetype:conf OR filetype:bak) ("password" OR "senha" OR "api_key" OR "secret")`
    },
    {
      id: 'redes-sociais',
      cat: 'Mídias',
      titulo: 'Perfis Sociais & Menções em Redes',
      desc: 'Varre LinkedIn, Instagram, Facebook, X/Twitter, TikTok e YouTube buscando menções exatas ao alvo.',
      build: q => `(site:linkedin.com/in/ OR site:instagram.com OR site:facebook.com OR site:twitter.com OR site:x.com OR site:tiktok.com) "${q}"`
    },
    {
      id: 'lattes-academico',
      cat: 'Acadêmico',
      titulo: 'Currículo Lattes & Produção Científica',
      desc: 'Pesquisa o perfil acadêmico no CNPq, dissertações, teses e artigos em repositórios universitários.',
      build: q => `(site:buscatextual.cnpq.br OR site:lattes.cnpq.br OR site:scielo.br OR filetype:pdf) "${q}" (curriculo OR lattes OR tese OR dissertacao OR orientador)`
    },
    {
      id: 'concursos-homologacao',
      cat: 'Concursos',
      titulo: 'Listas de Concursos, Vestibulares & Homologações',
      desc: 'Encontra classificações, listas de aprovados, nomeações e editais públicos com o nome ou documento do alvo.',
      build: q => `(filetype:pdf OR site:pciconcursos.com.br OR site:cespe.unb.br OR site:cebraspe.org.br OR site:vunesp.com.br) "${q}" (aprovado OR classificacao OR resultado OR homologacao)`
    },
    {
      id: 'licitacoes-contratos',
      cat: 'Compras',
      titulo: 'Licitações, Editais & Comprasnet',
      desc: 'Pesquisa atas de registro de preços, certames licitatórios e contratos administrativos no poder público.',
      build: q => `(site:comprasgovernamentais.gov.br OR site:gov.br/pncp OR inurl:licitacao) "${q}" (edital OR contrato OR "ata de registro")`
    },
    {
      id: 'planilhas-dados',
      cat: 'Financeiro',
      titulo: 'Planilhas Excel & Tabelas Financeiras Expostas',
      desc: 'Localiza arquivos XLSX e CSV contendo listas de pagamentos, balancetes ou dados cadastrais.',
      build: q => `(filetype:xlsx OR filetype:xls OR filetype:csv) "${q}" (saldo OR pagamento OR folha OR cadastro OR financeiro)`
    },
    {
      id: 'dados-pessoais-expostos',
      cat: 'Vazamentos',
      titulo: 'Listas Públicas de Pessoas, CPFs & Cadastros',
      desc: 'Identifica PDFs e listas públicas que contenham dados pessoais vinculados ao alvo.',
      build: q => `(filetype:pdf OR filetype:docx) "${q}" ("CPF" OR "RG" OR "inscricao" OR "matricula")`
    },
    {
      id: 'subdominios-alvo',
      cat: 'Domínios',
      titulo: 'Subdomínios Ocultos & Painéis Administrativos',
      desc: 'Para alvos do tipo domínio: descobre subdomínios expostos excluindo o www principal.',
      build: q => { const clean = q.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, ''); return `site:*.${clean} -www.${clean} -site:${clean}`; }
    },
  // ============================================================
  // Catálogo Oficial de 35 Módulos (Detetive Forense)
  // ============================================================
  const MODULOS_CATALOG = [
    // 1. Dados Completos
    {
      id: 'investigador-osint',
      categoria: 'dados_completos',
      catNome: 'Dados Completos',
      bannerTitle: 'INVESTIGADOR OSINT',
      nome: 'Investigador OSINT',
      ico: '👣',
      badges: ['Mais usado', 'OSINT'],
      desc: 'Busca dados de pessoas e empresas em diversas bases públicas junto com dados OSINT.',
      remaining: 100,
      targetView: 'cpf'
    },
    {
      id: 'investigador-pro',
      categoria: 'dados_completos',
      catNome: 'Dados Completos',
      bannerTitle: 'INVESTIGADOR PRO',
      nome: 'Investigador PRO',
      ico: '🕵️',
      badges: ['Mais usado', 'PRO'],
      desc: 'Consulta pericial completa de 20 páginas, 15 seções periciais, antecedentes criminais e timeline.',
      remaining: 47,
      targetView: 'cpf'
    },
    {
      id: 'qualificacao-cadastral',
      categoria: 'dados_completos',
      catNome: 'Dados Completos',
      bannerTitle: 'QUALIFICAÇÃO CIVIL',
      nome: 'Qualificação Cadastral & Docs',
      ico: '🪪',
      badges: ['Oficial', '100% Gratuito'],
      desc: 'Validação de CPF, RG, CNS, Título de Eleitor, CNH, renda estimada e score cadastral.',
      remaining: 100,
      targetView: 'cpf'
    },
    {
      id: 'parentesco-vinculos',
      categoria: 'dados_completos',
      catNome: 'Dados Completos',
      bannerTitle: 'MATRIZ DE PARENTESCO',
      nome: 'Árvore Genealógica (15 Graus)',
      ico: '🌳',
      badges: ['Pericial', 'Novo'],
      desc: 'Mapeamento de pais, avós, filhos, irmãos, tios, primos, sogros, cunhados e pessoas no mesmo endereço.',
      remaining: 50,
      targetView: 'cpf'
    },
    {
      id: 'timeline-vida',
      categoria: 'dados_completos',
      catNome: 'Dados Completos',
      bannerTitle: 'LINHA DO TEMPO',
      nome: 'Linha do Tempo (Life Timeline)',
      ico: '⏳',
      badges: ['Forense', 'Mais usado'],
      desc: 'Reconstrução cronológica de 29 marcos civis, profissionais, criminais e societários de 1928 a 2026.',
      remaining: 100,
      targetView: 'cpf'
    },

    // 2. Veículos
    {
      id: 'placa-veicular',
      categoria: 'veiculos',
      catNome: 'Veículos',
      bannerTitle: 'PLACA VEICULAR',
      nome: 'Placa Mercosul & Antiga',
      ico: '🚗',
      badges: ['Mais usado', '100% Gratuito'],
      desc: 'Decodificação pericial de placa, modelo, ano de fabricação, município e restrições.',
      remaining: 100,
      targetView: 'placa'
    },
    {
      id: 'renavam-chassi',
      categoria: 'veiculos',
      catNome: 'Veículos',
      bannerTitle: 'RENAVAM & CHASSI',
      nome: 'Decodificador WMI / Chassi',
      ico: '🔢',
      badges: ['Forense', 'Oficial'],
      desc: 'Validador algorítmico e decodificação do padrão internacional de fabricação automotiva.',
      remaining: 100,
      targetView: 'placa'
    },
    {
      id: 'detran-multas',
      categoria: 'veiculos',
      catNome: 'Veículos',
      bannerTitle: 'HISTÓRICO DETRAN',
      nome: 'Histórico DETRAN & Multas',
      ico: '🚦',
      badges: ['Oficial', '27 Estados'],
      desc: 'Portal agregador de consultas aos 27 DETRANs estaduais para débitos e licenciamento.',
      remaining: 100,
      targetView: 'placa'
    },
    {
      id: 'tabela-fipe',
      categoria: 'veiculos',
      catNome: 'Veículos',
      bannerTitle: 'TABELA FIPE',
      nome: 'Tabela FIPE & Depreciação',
      ico: '📊',
      badges: ['100% Gratuito', 'Oficial'],
      desc: 'Consulta de valor venal de mercado oficial FIPE e histórico de desvalorização.',
      remaining: 100,
      targetView: 'placa'
    },
    {
      id: 'leilao-sinistro',
      categoria: 'veiculos',
      catNome: 'Veículos',
      bannerTitle: 'LEILÃO & SINISTRO',
      nome: 'Checklist Leilão & Sinistro',
      ico: '🔨',
      badges: ['Pericial', 'Novo'],
      desc: 'Verificador de indicativos de perda total, remarcação de chassi e passagem por leilão.',
      remaining: 50,
      targetView: 'placa'
    },

    // 3. CNH
    {
      id: 'cnh-registro',
      categoria: 'cnh',
      catNome: 'CNH',
      bannerTitle: 'REGISTRO CNH',
      nome: 'Registro CNH & Categorias',
      ico: '🪪',
      badges: ['Oficial', 'Mais usado'],
      desc: 'Validador do dígito verificador da CNH, checagem de categorias (A/B/C/D/E) e primeira habilitação.',
      remaining: 100,
      targetView: 'cpf'
    },
    {
      id: 'cnh-bloqueios',
      categoria: 'cnh',
      catNome: 'CNH',
      bannerTitle: 'BLOQUEIOS & EAR',
      nome: 'Pontuação & Impedimentos CNH',
      ico: '⛔',
      badges: ['Oficial', 'Novo'],
      desc: 'Consulta de suspensão do direito de dirigir, bloqueios judiciais e Exerce Atividade Remunerada (EAR).',
      remaining: 50,
      targetView: 'cpf'
    },

    // 4. Ferramentas Forenses
    {
      id: 'exif-metadata',
      categoria: 'ferramentas',
      catNome: 'Ferramentas',
      bannerTitle: 'EXTRATOR EXIF',
      nome: 'Extrator EXIF & Metadados',
      ico: '📍',
      badges: ['Forense', '100% Gratuito'],
      desc: 'Extração instantânea no navegador de GPS, modelo da câmera, data/hora e software de edição.',
      remaining: 100,
      targetView: 'forense'
    },
    {
      id: 'hash-analyzer',
      categoria: 'ferramentas',
      catNome: 'Ferramentas',
      bannerTitle: 'CALCULADOR HASH',
      nome: 'Calculador Hash (MD5/SHA256)',
      ico: '🔐',
      badges: ['Custódia', 'Forense'],
      desc: 'Cálculo de hashes criptográficos (MD5, SHA-1, SHA-256) para garantia de cadeia de custódia.',
      remaining: 100,
      targetView: 'forense'
    },
    {
      id: 'email-header',
      categoria: 'ferramentas',
      catNome: 'Ferramentas',
      bannerTitle: 'HEADER E-MAIL',
      nome: 'Analisador de Cabeçalho E-mail',
      ico: '✉️',
      badges: ['Segurança', 'OSINT'],
      desc: 'Decodificação de SPF, DKIM, DMARC e IPs de roteamento de mensagens de e-mail.',
      remaining: 100,
      targetView: 'email'
    },
    {
      id: 'url-sandbox',
      categoria: 'ferramentas',
      catNome: 'Ferramentas',
      bannerTitle: 'URL & PHISHING',
      nome: 'Verificador de URLs & Phishing',
      ico: '🛡️',
      badges: ['Segurança', '100% Gratuito'],
      desc: 'Inspeção de reputação de links, domínios maliciosos e expansão de encurtadores.',
      remaining: 100,
      targetView: 'recon'
    },
    {
      id: 'google-dorks',
      categoria: 'ferramentas',
      catNome: 'Ferramentas',
      bannerTitle: 'GOOGLE DORKS',
      nome: 'Construtor de Google Dorks',
      ico: '⚡',
      badges: ['Mais usado', 'OSINT'],
      desc: 'Gerador de operadores avançados para encontrar PDFs, planilhas, cadastros e painéis expostos.',
      remaining: 100,
      targetView: 'dorks'
    },

    // 5. Fotos & Reconhecimento
    {
      id: 'reconhecimento-facial',
      categoria: 'fotos',
      catNome: 'Fotos',
      bannerTitle: 'RECONHECIMENTO FACIAL',
      nome: 'Reconhecimento Facial OSINT',
      ico: '👤',
      badges: ['Mais usado', 'Novo'],
      desc: 'Busque pessoas apenas com uma foto em motores de busca reversa e biometria aberta.',
      remaining: 15,
      targetView: 'facial'
    },
    {
      id: 'busca-social',
      categoria: 'fotos',
      catNome: 'Fotos',
      bannerTitle: 'BUSCA SOCIAL',
      nome: 'Busca Social Multiplataforma',
      ico: '🌐',
      badges: ['Mais usado', 'Novo'],
      desc: 'Poderosa busca reversa na web: use FOTO, CPF ou NOME e encontre informações e atividades.',
      remaining: 15,
      targetView: 'username'
    },
    {
      id: 'ela-forense',
      categoria: 'fotos',
      catNome: 'Fotos',
      bannerTitle: 'ANÁLISE ELA FOTOS',
      nome: 'Análise Forense ELA (Imagens)',
      ico: '🔬',
      badges: ['Pericial', 'Forense'],
      desc: 'Detecção de manipulações, montagens e edições digitais em fotografias periciadas.',
      remaining: 50,
      targetView: 'facial'
    },

    // 6. Empresarial
    {
      id: 'cnpj-receita',
      categoria: 'empresarial',
      catNome: 'Empresarial',
      bannerTitle: 'CNPJ RECEITA FEDERAL',
      nome: 'Consulta CNPJ Completa',
      ico: '🏢',
      badges: ['Mais usado', 'Oficial'],
      desc: 'Razão social, situação cadastral, CNAE, endereço, capital e quadro societário (QSA).',
      remaining: 100,
      targetView: 'cnpj'
    },
    {
      id: 'qsa-socios',
      categoria: 'empresarial',
      catNome: 'Empresarial',
      bannerTitle: 'QUADRO SOCIETÁRIO',
      nome: 'Quadro de Sócios (QSA)',
      ico: '👥',
      badges: ['Oficial', '100% Gratuito'],
      desc: 'Mapeamento de sócios administradores, participações, procuradores e coligadas.',
      remaining: 100,
      targetView: 'cnpj'
    },
    {
      id: 'simples-mei',
      categoria: 'empresarial',
      catNome: 'Empresarial',
      bannerTitle: 'SIMPLES & MEI',
      nome: 'Simples Nacional & MEI',
      ico: '🧾',
      badges: ['Oficial', 'Receita Federal'],
      desc: 'Consulta de opção pelo Simples Nacional, SIMEI e data de enquadramento.',
      remaining: 100,
      targetView: 'cnpj'
    },
    {
      id: 'filiais-rede',
      categoria: 'empresarial',
      catNome: 'Empresarial',
      bannerTitle: 'REDE & FILIAIS',
      nome: 'Filiais & Grupo Econômico',
      ico: '🏬',
      badges: ['Corporativo', 'Novo'],
      desc: 'Identificação de filiais ativas, matrizes e conexões empresariais no Brasil.',
      remaining: 100,
      targetView: 'cnpj'
    },

    // 7. Registros Nacionais
    {
      id: 'datajud-cnj',
      categoria: 'registros',
      catNome: 'Registros Nacionais',
      bannerTitle: 'PROCESSOS DATAJUD',
      nome: 'Processos Judiciais (DataJud)',
      ico: '⚖️',
      badges: ['Mais usado', 'Oficial CNJ'],
      desc: 'Consulta direta no CNJ e tribunais (TRF, TJ, TRT, STJ) com metadados Datamart.',
      remaining: 100,
      targetView: 'processos'
    },
    {
      id: 'bnmp-mandados',
      categoria: 'registros',
      catNome: 'Registros Nacionais',
      bannerTitle: 'MANDADOS BNMP 3.0',
      nome: 'Mandados de Prisão (BNMP)',
      ico: '🚨',
      badges: ['Oficial CNJ', '100% Gratuito'],
      desc: 'Banco Nacional de Mandados de Prisão do CNJ — checagem de ordens de captura.',
      remaining: 100,
      targetView: 'mandados'
    },
    {
      id: 'pgfn-divida',
      categoria: 'registros',
      catNome: 'Registros Nacionais',
      bannerTitle: 'DÍVIDA ABERTA PGFN',
      nome: 'Dívida Ativa da União (PGFN)',
      ico: '📉',
      badges: ['Oficial', '100% Gratuito'],
      desc: 'Consulta a inscrições na Dívida Ativa da União, FGTS e execuções fiscais federais.',
      remaining: 100,
      targetView: 'mandados'
    },
    {
      id: 'cndt-trabalhista',
      categoria: 'registros',
      catNome: 'Registros Nacionais',
      bannerTitle: 'CERTIDÃO TRABALHISTA',
      nome: 'Certidão Negativa (CNDT/TST)',
      ico: '💼',
      badges: ['Oficial TST', '100% Gratuito'],
      desc: 'Banco Nacional de Devedores Trabalhistas (BNDT) da Justiça do Trabalho.',
      remaining: 100,
      targetView: 'mandados'
    },
    {
      id: 'cenprot-protestos',
      categoria: 'registros',
      catNome: 'Registros Nacionais',
      bannerTitle: 'CENTRAL PROTESTOS',
      nome: 'Protestos Cartorários (Cenprot)',
      ico: '🏛️',
      badges: ['Cartórios', 'Oficial'],
      desc: 'Consulta nacional em cartórios de protesto de títulos e documentos.',
      remaining: 100,
      targetView: 'mandados'
    },

    // 8. Financeiro
    {
      id: 'patrimonio-bens',
      categoria: 'financeiro',
      catNome: 'Financeiro',
      bannerTitle: 'PATRIMÔNIO & BENS',
      nome: 'Patrimônio & Participações',
      ico: '💰',
      badges: ['Mais usado', 'OSINT'],
      desc: 'Levantamento patrimonial em bases públicas de empresas, capitais e declarações.',
      remaining: 100,
      targetView: 'bens'
    },
    {
      id: 'pix-validador',
      categoria: 'financeiro',
      catNome: 'Financeiro',
      bannerTitle: 'CHAVES PIX & ISPB',
      nome: 'Validador de Chaves PIX',
      ico: '📱',
      badges: ['Bancário', '100% Gratuito'],
      desc: 'Identificador do formato da chave PIX, tipo de chave e roteamento do banco ISPB.',
      remaining: 100,
      targetView: 'bens'
    },
    {
      id: 'aeronaves-embarcacoes',
      categoria: 'financeiro',
      catNome: 'Financeiro',
      bannerTitle: 'AERONAVES & EMBARCAÇÕES',
      nome: 'Aeronaves RAB & Embarcações',
      ico: '✈️',
      badges: ['Oficial ANAC', '100% Gratuito'],
      desc: 'Registro Aeronáutico Brasileiro da ANAC e rastreamento de navios/embarcações.',
      remaining: 100,
      targetView: 'aeronaves'
    },
    {
      id: 'cripto-blockchain',
      categoria: 'financeiro',
      catNome: 'Financeiro',
      bannerTitle: 'RASTREAMENTO CRIPTO',
      nome: 'Rastreamento Cripto / Wallet',
      ico: '🪙',
      badges: ['Blockchain', 'OSINT'],
      desc: 'Rastreamento de carteiras Bitcoin, Ethereum, Tron e Solana com saldo e transações.',
      remaining: 100,
      targetView: 'cripto'
    },

    // 9. Geradores
    {
      id: 'gerador-documentos',
      categoria: 'geradores',
      catNome: 'Geradores',
      bannerTitle: 'GERADOR DE TESTES',
      nome: 'Gerador & Validador de Docs',
      ico: '🎲',
      badges: ['Dev / Perícia', '100% Gratuito'],
      desc: 'Geração e validação de CPF, CNPJ, CNH, RG, PIS e dados sintéticos para testes e perícias.',
      remaining: 100,
      targetView: 'forense'
    },

    // 10. Especiais
    {
      id: 'vazamentos-senhas',
      categoria: 'especiais',
      catNome: 'Especiais',
      bannerTitle: 'VAZAMENTOS & BREACHES',
      nome: 'Vazamentos & Credenciais',
      ico: '🔒',
      badges: ['Segurança', 'Mais usado'],
      desc: 'Verificação de e-mails comprometidos em vazamentos públicos de bancos de dados.',
      remaining: 100,
      targetView: 'vazamentos'
    }
  ];

  return { rng, hash, pick, int, validaCPF, validaCNPJ, fmtCPF, fmtCNPJ, pessoa, empresa, veiculo, vazamentos, telefone, email, SOCIAL, BREACHES, tribunalFromCNJ, OSINT_BRASIL_DIRECTORY, DORKS_TEMPLATES, MODULOS_CATALOG };
})();

