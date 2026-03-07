# NebChat

NebChat, Türkiye odaklı bir siber güvenlik yayın platformudur. İçerikler runtime sırasında **yalnızca Firestore** üzerinden okunur.

## Sayfalar
- `index.html` — ana sayfa
- `archive.html` — makale arşivi
- `article.html?slug=...` — makale detayı + yorumlar
- `category.html?slug=...` — kategori akışı
- `admin.html` — editör/import paneli

## İçerik import (önerilen ana akış: admin.html)
1. Firebase Auth içinde Email/Password açın.
2. Editör kullanıcısına custom claim verin (`role: admin` veya `role: editor`).
3. Firestore rules ve indexleri uygulayın (`FIREBASE_SETUP.md`).
4. Sitede editör hesabı ile giriş yapın.
5. `admin.html` açın.
6. **Örnek içerikleri Firestore'a aktar** butonuna tıklayın.
7. Log ekranında kategori + makale upsert ilerlemesini takip edin.
8. `archive.html` açıp içeriklerin göründüğünü doğrulayın.

## CLI import (opsiyonel)
`seed/articles.seed.json` dosyasından makale/kategori upsert:

```bash
node scripts/firestore_import_seed.mjs 10
```

12 makale yüklemek için:

```bash
node scripts/firestore_import_seed.mjs 12
```

Kontrol:

```bash
dir scripts
```

## Seed kaynakları
- Makaleler: `seed/articles.seed.json`
- Varsayılan kategori listesi: `js/content.js`

## Not
Yorum yazmak için oturum gerekir. Makale/kategori yazma işlemleri yalnızca admin/editor rolüne açık olmalıdır.
