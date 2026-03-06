export const CATEGORY_LIST = [
  { slug: 'threat-intelligence', name: 'Threat Intelligence', description: 'Aktör taktikleri, IOC ve kampanya analizi.' },
  { slug: 'data-breaches', name: 'Data Breaches', description: 'İhlal vakaları ve etki değerlendirmeleri.' },
  { slug: 'vulnerabilities', name: 'Vulnerabilities', description: 'CVE analizleri, exploitability ve patch öncelikleri.' },
  { slug: 'ransomware', name: 'Ransomware', description: 'Operasyon zincirleri, pazarlık ve kurtarma stratejileri.' },
  { slug: 'dark-web', name: 'Dark Web', description: 'Sızıntı forumları, erişim satışı ve tehdit sinyalleri.' },
  { slug: 'brand-protection', name: 'Brand Protection', description: 'Sahte domain, kimlik avı ve marka kötüye kullanımı.' },
  { slug: 'soc-detection', name: 'SOC & Detection', description: 'SIEM, use-case tuning ve triage operasyonları.' },
  { slug: 'cloud-security', name: 'Cloud Security', description: 'Bulut yanlış yapılandırmaları ve runtime güvenliği.' },
  { slug: 'security-awareness', name: 'Security Awareness', description: 'İnsan faktörü, eğitim ve davranış güvenliği.' },
  { slug: 'turkiye-gundemi', name: 'Türkiye Gündemi', description: 'Türkiye merkezli olaylar, regülasyon ve sektör etkisi.' }
];

export const SEED_ARTICLES = [
  {
    slug: 'turkiye-banka-phishing-kampanyasi-analiz',
    title: 'Türkiye Bankacılık Sektörünü Hedefleyen Yeni Phishing Zinciri',
    excerpt: 'SMS spoofing, sahte çağrı merkezi ve reverse proxy kombinasyonuyla yürütülen kampanyanın teknik izi.',
    bodyMarkdown: `## Özet\nSon dört haftada Türkiye merkezli bankacılık müşterilerini hedefleyen kampanyada, kimlik avı paneli ile OTP yakalama adımı birleştirildi.\n\n## Kill Chain\n1. Sahte teslimat SMS\n2. Klon giriş ekranı\n3. Reverse proxy ile oturum devralma\n\n## Öneri\nMFA tek başına yeterli değil; cihaz risk puanı ve davranış analitiği zorunlu hale gelmeli.`,
    coverImageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    category: 'threat-intelligence',
    tags: ['phishing', 'bankacilik', 'mfa'],
    authorName: 'Ece Arslan',
    authorSlug: 'ece-arslan',
    publishedAt: '2026-01-12T08:00:00.000Z',
    status: 'published',
    featured: true,
    readingTime: 6,
    seoTitle: 'Türkiye Bankacılığında Phishing Zinciri Analizi',
    seoDescription: 'Bankacılık odaklı phishing kampanyasının teknik analizi ve savunma önerileri.'
  },
  {
    slug: 'cve-onceliklendirme-soc-runbook',
    title: 'SOC Ekipleri İçin CVE Önceliklendirme Runbook’u',
    excerpt: 'CVSS skoru tek başına yeterli değil. Sömürülebilirlik, varlık kritiklik ve maruz kalma birleştirilmeli.',
    bodyMarkdown: `## Neden yeni model?\nYalnızca CVSS takip eden ekipler alarm yorgunluğu yaşıyor.\n\n## Önerilen skorlama\n- Exploit maturity\n- Asset criticality\n- Internet exposure\n\n## Sonuç\nİlk 72 saatte kapatılacak açık havuzu netleşir.`,
    coverImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    category: 'vulnerabilities',
    tags: ['cve', 'soc', 'runbook'],
    authorName: 'Mert Işık',
    authorSlug: 'mert-isik',
    publishedAt: '2026-01-08T09:30:00.000Z',
    status: 'published',
    featured: false,
    readingTime: 5,
    seoTitle: 'SOC İçin CVE Önceliklendirme Rehberi',
    seoDescription: 'SOC ekipleri için aksiyon odaklı CVE önceliklendirme yaklaşımı.'
  },
  {
    slug: 'dark-web-erisim-satisi-2026-trend',
    title: 'Dark Web’de Kurumsal Erişim Satışlarında 2026 İlk Çeyrek Görünümü',
    excerpt: 'RDP/VPN erişim ilanlarının dağılımı, sektör bazlı fiyat aralıkları ve erken uyarı göstergeleri.',
    bodyMarkdown: `## Gözlem\nErişim satışı ilanları özellikle üretim ve lojistik sektöründe yükseldi.\n\n## Erken sinyaller\n- Yeni admin hesabı\n- Gece saatlerinde olağan dışı VPN\n\n## Aksiyon\nKimlik tabanlı tespit kullanım senaryoları zenginleştirilmeli.`,
    coverImageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
    category: 'dark-web',
    tags: ['dark-web', 'threat-hunting'],
    authorName: 'Selin Demir',
    authorSlug: 'selin-demir',
    publishedAt: '2026-01-05T07:45:00.000Z',
    status: 'published',
    featured: false,
    readingTime: 7,
    seoTitle: 'Dark Web Erişim Satışı Trendleri',
    seoDescription: 'Kurumsal erişim satışı ilanlarındaki trendler ve SOC ekipleri için öneriler.'
  }
];
