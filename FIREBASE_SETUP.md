# NebChat Firebase Kurulum Akışı

Bu doküman NebChat yayın pipeline'ını uçtan uca çalıştırmak için gerekli adımları içerir.

## 1) Authentication
1. Firebase Console → Authentication → Sign-in method.
2. **Email/Password** yöntemini aktif edin.
3. Editör hesabınızla kayıt olun / giriş yapın.
4. Admin SDK veya Cloud Functions üzerinden kullanıcıya custom claim verin:
   - `role: "admin"` veya `role: "editor"`

## 2) Firestore Rules
Aşağıdaki kuralları uygulayın (role tabanlı yazma):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function role() { return isSignedIn() ? request.auth.token.role : null; }
    function isEditor() { return role() in ['admin', 'editor']; }

    match /articles/{articleId} {
      allow read: if resource.data.status == 'published'
        || isEditor()
        || (isSignedIn() && resource.data.authorId == request.auth.uid);

      allow create: if isEditor()
        || (isSignedIn()
          && request.resource.data.authorId == request.auth.uid
          && request.resource.data.status in ['pending_review', 'draft']);

      allow update, delete: if isEditor()
        || (isSignedIn() && resource.data.authorId == request.auth.uid && resource.data.status in ['pending_review', 'draft']);
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isEditor();
    }

    match /comments/{commentId} {
      allow read: if resource.data.status == 'published'
        || isEditor()
        || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.body is string
        && request.resource.data.body.size() >= 12
        && request.resource.data.status in ['published', 'pending'];
      allow update: if isEditor() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow delete: if isEditor();
    }
  }
}
```

## 3) Firestore Indexes
Firestore → Indexes bölümünde aşağıdakileri oluşturun:
- `articles`: `status ASC, publishedAt DESC`
- `articles`: `status ASC, category ASC, publishedAt DESC`
- `comments`: `articleSlug ASC, status ASC, createdAt ASC`
- `comments`: `status ASC, createdAt DESC`
- `comments`: `userId ASC, createdAt DESC`
- `articles`: `authorId ASC, createdAt DESC`
- `categories`: `isVisible ASC, order ASC`

## 4) İçerik import (ana yol)
1. NebChat'e editör hesabıyla giriş yapın.
2. `admin.html` sayfasına gidin.
3. **Eksik örnek içerikleri ekle** butonuna tıklayın.
4. Sayfadaki log panelinden ilerlemeyi kontrol edin:
   - kategori kontrol/create
   - mevcutları atlayarak seed makale create
5. İşlem bitince `archive.html` sayfasını açın ve kartların geldiğini doğrulayın.

## 5) Opsiyonel CLI import
Aynı veriyi terminalden yazmak için:

```bash
node scripts/firestore_import_seed.mjs 6
```

## 6) Doğrulama checklist
- `articles` koleksiyonunda `status: "published"` kayıtları var.
- `categories` koleksiyonunda `slug` bazlı dokümanlar var.
- `archive.html` kartları listeliyor.
- `article.html?slug=...` detayı açılıyor.
- `category.html?slug=...` ilgili makaleleri çekiyor.
