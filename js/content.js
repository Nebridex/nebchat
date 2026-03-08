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
  { slug: 'incident-response', name: 'Incident Response', description: 'Olay müdahale hazırlığı, ilk saat operasyonu ve toparlanma.' },
  { slug: 'third-party-risk', name: 'Third-Party Risk', description: 'Tedarik zinciri, dış bağımlılıklar ve sözleşme kaynaklı riskler.' },
  { slug: 'turkiye-gundemi', name: 'Türkiye Gündemi', description: 'Türkiye merkezli olaylar, regülasyon ve sektör etkisi.' }
];

export const TOPIC_HUBS = [
  { slug: 'ai-security', name: 'AI Security', query: 'ai', description: 'LLM güvenliği, prompt injection ve model çevresi riskleri.' },
  { slug: 'ransomware', name: 'Ransomware', category: 'ransomware', description: 'Ransomware operasyonları, kriz yönetimi ve toparlanma.' },
  { slug: 'threat-intelligence', name: 'Threat Intelligence', category: 'threat-intelligence', description: 'Kampanya analizi ve operasyonel tehdit içgörüleri.' },
  { slug: 'dark-web', name: 'Dark Web', category: 'dark-web', description: 'Sızıntı ekosistemi ve yeraltı sinyal takibi.' },
  { slug: 'turkiye-siber-gundemi', name: 'Türkiye Siber Gündemi', category: 'turkiye-gundemi', description: 'Türkiye odaklı regülasyon ve sektör etkileri.' }
];

export const TRENDING_TOPICS = [
  { label: 'AI Security', href: 'topic.html?slug=ai-security' },
  { label: 'Identity Security', href: 'archive.html?q=identity' },
  { label: 'Ransomware Resilience', href: 'topic.html?slug=ransomware' },
  { label: 'Supply Chain Risk', href: 'archive.html?q=supply%20chain' },
  { label: 'Türkiye Siber Gündemi', href: 'topic.html?slug=turkiye-siber-gundemi' }
];
