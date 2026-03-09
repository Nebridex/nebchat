# NebChat

NebChat, Türkiye odaklı bir siber güvenlik yayın platformudur. İçerikler runtime sırasında Firestore üzerinden okunur.

## Sayfalar
- `index.html` — ana sayfa
- `archive.html` — makale arşivi
- `article.html?slug=...` — makale detayı + yorumlar
- `category.html?slug=...` — kategori akışı
- `profile.html` — üye giriş / panel
- `write.html` — üye yazı gönderimi (inceleme kuyruğu)
- `admin.html` — moderasyon paneli (yalnızca `oz.cht.t@gmail.com`)

## Moderasyon modeli
- Kayıtlı kullanıcılar yazı gönderir.
- Gönderiler `status: pending_review` ile kaydedilir.
- Yalnızca yönetici (`oz.cht.t@gmail.com`) admin panelinden yazıları:
  - Yayınla (`published`)
  - Taslağa Al (`draft`)
  - Reddet (`rejected`)
  - Düzenle

## Güvenli seed import
- `admin.html` üzerindeki **Eksik örnek içerikleri ekle** butonu idempotent çalışır.
- Var olan makaleler/kategoriler varsayılan akışta ezilmez.
- Zorla güncelleme ayrı buton ve onay adımı ile yapılır.

## Kurulum
1. Firebase Auth içinde Email/Password açın.
2. Yönetici hesabını `oz.cht.t@gmail.com` ile oluşturun.
3. Firestore rules/indexleri `FIREBASE_SETUP.md` dosyasına göre uygulayın.
4. Yönetici hesabı ile giriş yapıp `admin.html` üzerinden seed içeriği ekleyin.

## Opsiyonel CLI import
```bash
node scripts/firestore_import_seed.mjs 6
```

## Firestore `articles` export + edit akışı (managed export olmadan)
Aşağıdaki scriptler repo içindeki Firebase proje ayarını (`js/firebase.js` -> `projectId`) kullanır ve Admin SDK kimlik doğrulamasıyla çalışır.

Önce kimlik doğrulaması için birini ayarlayın:
- `GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json`
- veya `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'`

### 1) Articles export
```bash
node scripts/export_articles.mjs
# çıktı: exports/articles-export.json
```

### 2) Düzenleme taslağı üret
```bash
node scripts/prepare_article_edits.mjs
# çıktı: exports/articles-edit-draft.json
```

### 3) Düzenlenen içerikleri Firestore'a uygula
```bash
node scripts/apply_article_edits.mjs exports/articles-edit-draft.json
```

Not: Export dosyasında her kayıt için `id` alanı korunur; apply adımı bu `id` üzerinden `articles/{id}` dokümanlarını merge ederek günceller.
