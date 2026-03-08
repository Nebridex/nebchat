# NebChat Firebase Kurulum Akışı

Bu doküman NebChat yayın pipeline'ını uçtan uca çalıştırmak için gerekli adımları içerir.

## 1) Authentication
1. Firebase Console → Authentication → Sign-in method.
2. **Email/Password** yöntemini aktif edin.
3. Yönetici hesabını oluşturun: **oz.cht.t@gmail.com**
4. Editör paneli erişimi yalnızca bu e-posta ile verilir.

## 2) Firestore Rules
Aşağıdaki kuralları uygulayın (moderasyon + tek yönetici e-posta modeli):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdminEmail() { return isSignedIn() && request.auth.token.email == 'oz.cht.t@gmail.com'; }

    match /articles/{articleId} {
      allow read: if resource.data.status == 'published'
        || isAdminEmail()
        || (isSignedIn() && resource.data.authorId == request.auth.uid);

      allow create: if isAdminEmail()
        || (isSignedIn()
          && request.resource.data.authorId == request.auth.uid
          && request.resource.data.status == 'pending_review');

      allow update, delete: if isAdminEmail()
        || (isSignedIn()
          && resource.data.authorId == request.auth.uid
          && resource.data.status in ['pending_review', 'draft']
          && request.resource.data.status in ['pending_review', 'draft']);
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdminEmail();
    }

    match /comments/{commentId} {
      allow read: if resource.data.status == 'published'
        || isAdminEmail()
        || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.body is string
        && request.resource.data.body.size() >= 12
        && request.resource.data.status in ['published', 'pending'];
      allow update: if isAdminEmail();
      allow delete: if isAdminEmail();
    }
  }
}
```

## 3) Firestore Indexes
Firestore → Indexes bölümünde aşağıdakileri oluşturun:
- `articles`: `status ASC, createdAt DESC`
- `articles`: `status ASC, publishedAt DESC`
- `articles`: `status ASC, category ASC, publishedAt DESC`
- `articles`: `authorId ASC, createdAt DESC`
- `comments`: `articleSlug ASC, status ASC, createdAt ASC`
- `comments`: `status ASC, createdAt DESC`
- `comments`: `userId ASC, createdAt DESC`
- `categories`: `isVisible ASC, order ASC`

## 4) İçerik import (ana yol)
1. NebChat'e **oz.cht.t@gmail.com** hesabıyla giriş yapın.
2. `admin.html` sayfasına gidin.
3. **Eksik örnek içerikleri ekle** butonuna tıklayın.
4. Sayfadaki log panelinden ilerlemeyi kontrol edin.
5. İşlem bitince `archive.html` sayfasını açın ve kartların geldiğini doğrulayın.

## 5) Moderasyon akışı
1. Üye kullanıcılar `write.html` üzerinden yazı gönderir.
2. Yazılar `status: pending_review` ile kaydolur.
3. `admin.html` → **İnceleme Bekleyen Yazılar** sekmesinde listelenir.
4. Yönetici buradan `Yayınla`, `Taslağa Al`, `Reddet` veya `Düzenle` işlemlerini yapar.

## 6) Opsiyonel CLI import

```bash
node scripts/firestore_import_seed.mjs 6
```

## 7) Doğrulama checklist
- `articles` koleksiyonunda `pending_review` ve `published` kayıtları ayrışıyor.
- `profile.html` içinde `Yorum Geçmişi` ve `Gönderdiğim Yazılar` görünür.
- `admin.html` sadece **oz.cht.t@gmail.com** hesabında açılıyor.
- `archive.html` ve `article.html` sadece published içerikleri sunuyor.
