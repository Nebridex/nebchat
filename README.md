# NebChat

NebChat artık forum değil; Türkiye odaklı modern bir siber güvenlik yayın platformudur.

## Sayfalar
- `index.html` — ana sayfa
- `archive.html` — makale arşivi
- `article.html?slug=...` — makale detayı + yorumlar
- `category.html?slug=...` — kategori akışı
- `about.html` — hakkımızda
- `contact.html` — iletişim
- `profile.html` — giriş/kayıt
- `admin.html` — editör paneli

## Firebase
- Auth: yorum yazmak için kullanıcı oturumu
- Firestore: articles, categories, comments
- Storage: kapak görselleri için hazır

Kurallar/index önerileri için: `FIREBASE_SETUP.md`
