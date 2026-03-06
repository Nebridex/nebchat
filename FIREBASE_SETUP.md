# NebChat Firebase Refactor (Blog + Yorumlar)

## Yeni Koleksiyonlar
- `articles`
- `categories`
- `comments`
- `authors` (opsiyonel)
- `siteSettings` (opsiyonel)

## Önerilen Firestore Rules
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function role() { return isSignedIn() ? request.auth.token.role : null; }
    function isEditor() { return role() in ['admin', 'editor']; }

    match /articles/{articleId} {
      allow read: if resource.data.status == 'published' || isEditor();
      allow create, update, delete: if isEditor();
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isEditor();
    }

    match /comments/{commentId} {
      allow read: if resource.data.status == 'published' || isEditor();
      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.body is string
        && request.resource.data.body.size() >= 12
        && request.resource.data.status in ['published', 'pending'];
      allow update: if isEditor() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow delete: if isEditor();
    }

    match /authors/{authorId} {
      allow read: if true;
      allow write: if isEditor();
    }

    match /siteSettings/{docId} {
      allow read: if true;
      allow write: if isEditor();
    }
  }
}
```

## Önerilen Indexler
- `articles`: `status ASC, publishedAt DESC`
- `articles`: `status ASC, category ASC, publishedAt DESC`
- `comments`: `articleSlug ASC, status ASC, createdAt ASC`
- `comments`: `status ASC, createdAt DESC` (moderasyon paneli)

## Manual Setup
1. Firebase Auth Email/Password aktif edin.
2. Admin/editor kullanıcılarına custom claim verin (`role: admin` / `role: editor`).
3. Firestore Rules ve indexleri deploy edin.
4. `admin.html` ekranından örnek içerikleri seed edin.
5. Üretimde yorumlarda `status: pending` akışını moderasyon politikanıza göre açın.
