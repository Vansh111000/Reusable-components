# AppDataLayer

A reusable **Next.js backend data layer** built with **Prisma 8 +
Supabase PostgreSQL + Supabase Storage**.

The goal is to keep database access, file storage, and business logic
cleanly separated so this setup can be reused across Next.js projects.

------------------------------------------------------------------------

## Architecture

``` text
Next.js
│
├── Prisma DB Layer
│      ↓
│   Supabase PostgreSQL
│      ├── Users
│      ├── Posts
│      ├── Projects
│      └── File metadata
│
└── Storage Layer
       ↓
    Supabase Storage
       ├── Images
       ├── PDFs
       ├── Videos
       └── Other files
```

### Core rule

> **PostgreSQL stores structured data and file metadata/references.**
>
> **Supabase Storage stores the actual binary files.**

------------------------------------------------------------------------

# What We Built

## 1. Prisma PostgreSQL Layer

Location:

``` text
src/prisma/
```

Files:

``` text
src/prisma/
├── contract.prisma
├── contract.json
├── contract.d.ts
└── db.ts
```

### `contract.prisma`

Defines the application's database models.

Example:

``` prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String?
  name      String?
  posts     Post[]
  createdAt TimestamptzString @default(now())
  updatedAt temporal.updatedAtString()
}
```

### `contract.json`

Generated Prisma contract artifact.

Do not manually edit it.

Regenerate it using the Prisma contract tooling when the contract
changes.

### `contract.d.ts`

Generated TypeScript definitions for the contract.

Do not manually edit it.

### `db.ts`

Location:

``` text
src/prisma/db.ts
```

``` ts
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

export const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});
```

This is the application's Prisma database client.

------------------------------------------------------------------------

# 2. Supabase Storage Layer

Location:

``` text
src/storage/
```

Structure:

``` text
src/storage/
├── client.ts
└── service.ts
```

## `client.ts`

Creates the server-side Supabase client.

``` ts
import { createClient } from "@supabase/supabase-js";

export const storageClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Important

`SUPABASE_SERVICE_ROLE_KEY` is a secret.

Never:

``` text
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
```

Never expose it to browser/client-side code.

------------------------------------------------------------------------

# 3. Storage Service

Location:

``` text
src/storage/service.ts
```

Current functionality:

``` text
uploadFile()
deleteFile()
getSignedUrl()
downloadFile()
```

## Upload

``` ts
uploadFile(path, file)
```

Example:

``` text
users/123/documents/resume.pdf
```

The actual file is stored in:

``` text
Supabase Storage
└── uploads/
    └── users/
        └── 123/
            └── documents/
                └── resume.pdf
```

The database should store the path:

``` text
users/123/documents/resume.pdf
```

not the actual PDF.

------------------------------------------------------------------------

## Delete

``` ts
deleteFile(path)
```

Deletes the actual object from Supabase Storage.

------------------------------------------------------------------------

## Signed URL

``` ts
getSignedUrl(path, expiresIn)
```

Creates a temporary URL for a private file.

Example:

``` text
Database
   ↓
users/123/documents/resume.pdf
   ↓
getSignedUrl()
   ↓
Temporary URL
   ↓
Browser
```

Do not store the temporary signed URL permanently in PostgreSQL.

Store the stable `storagePath`.

------------------------------------------------------------------------

## Download

``` ts
downloadFile(path)
```

Downloads the file from Supabase Storage on the server.

------------------------------------------------------------------------

# 4. Storage Bucket

We created a private Supabase Storage bucket:

``` text
uploads
```

Recommended organization:

``` text
uploads/
└── users/
    └── {userId}/
        ├── avatars/
        ├── documents/
        ├── images/
        └── videos/
```

Examples:

``` text
users/123/avatars/profile.jpg
users/123/documents/resume.pdf
users/123/images/product.png
users/123/videos/demo.mp4
```

For generated files, use unique IDs:

``` text
users/123/videos/550e8400-e29b-41d4-a716-446655440000.mp4
```

------------------------------------------------------------------------

# 5. File Model

Use a dedicated `File` model when files need their own lifecycle,
metadata, ownership, or when an entity can have multiple files.

Example:

``` prisma
model File {
  id           Int      @id @default(autoincrement())
  userId       Int
  originalName String
  storagePath  String   @unique
  mimeType     String
  size         Int
  createdAt    TimestamptzString @default(now())
  updatedAt    temporal.updatedAtString()
}
```

Conceptually:

``` text
User
  │
  └── 1 → many
           │
           ▼
          File
           │
           └── storagePath
                    │
                    ▼
             Supabase Storage
```

------------------------------------------------------------------------

# 6. When NOT to use a File model

If the file is tightly coupled to an entity and there is only one
relevant file, a direct path field is often simpler.

Example:

``` prisma
model User {
  id         Int    @id @default(autoincrement())
  email      String @unique
  avatarPath String?
}
```

Or:

``` prisma
model Project {
  id            Int    @id @default(autoincrement())
  name          String
  thumbnailPath String?
}
```

### Rule

Use:

``` text
avatarPath
thumbnailPath
coverImagePath
```

when there is one tightly coupled file.

Use:

``` text
File
```

when:

-   multiple files exist
-   files need metadata
-   files have independent lifecycle
-   files can belong to different entities
-   files need independent access control

------------------------------------------------------------------------

# 7. Environment Variables

Create:

``` text
.env
```

Example:

``` env
DATABASE_URL="postgresql://..."

NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"

SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

Never commit `.env`.

Your `.gitignore` should include:

``` text
.env
.env.local
.env.*.local
```

------------------------------------------------------------------------

# 8. Typical File Upload Flow

The recommended production flow is:

``` text
Client
  ↓
POST /api/files
  ↓
Authenticate user
  ↓
Validate file
  ↓
Generate storage path
  ↓
Upload to Supabase Storage
  ↓
Create File record with Prisma
  ↓
Return metadata
```

Example:

``` text
User uploads:
resume.pdf

Authenticated user:
123

Generated path:
users/123/documents/uuid.pdf
```

Then:

``` text
Supabase Storage:
uploads/users/123/documents/uuid.pdf

PostgreSQL:
File
├── userId = 123
├── originalName = resume.pdf
├── storagePath = users/123/documents/uuid.pdf
├── mimeType = application/pdf
└── size = ...
```

------------------------------------------------------------------------

# 9. File Retrieval Flow

``` text
Client requests file
        ↓
Authenticate user
        ↓
Find File record using Prisma
        ↓
Verify ownership
        ↓
Get storagePath
        ↓
Generate signed URL
        ↓
Return temporary URL
```

Never trust a `userId` supplied by the browser.

Derive ownership from the authenticated session.

------------------------------------------------------------------------

# 10. File Deletion Flow

``` text
Delete request
      ↓
Authenticate
      ↓
Find File record
      ↓
Verify ownership
      ↓
Delete object from Storage
      ↓
Delete metadata from PostgreSQL
```

If one operation succeeds and another fails, handle the inconsistency
explicitly.

------------------------------------------------------------------------

# 11. File Replacement

Prefer:

``` text
Upload new file
      ↓
Update DB reference
      ↓
Delete old file
```

instead of:

``` text
Delete old file
      ↓
Upload new file
```

The first approach reduces the chance of losing the existing file if the
new upload fails.

------------------------------------------------------------------------

# 12. API Structure

Recommended:

``` text
app/
└── api/
    └── files/
        └── route.ts
```

Possible endpoints:

``` text
POST   /api/files
GET    /api/files/:id
DELETE /api/files/:id
```

Business-specific endpoints can use the same underlying storage service.

------------------------------------------------------------------------

# 13. Recommended Full Project Structure

``` text
project/
│
├── app/
│   └── api/
│       └── files/
│           └── route.ts
│
├── src/
│   ├── prisma/
│   │   ├── contract.prisma
│   │   ├── contract.json
│   │   ├── contract.d.ts
│   │   └── db.ts
│   │
│   ├── storage/
│   │   ├── client.ts
│   │   └── service.ts
│   │
│   └── services/
│       ├── user.service.ts
│       ├── post.service.ts
│       └── file.service.ts
│
├── .env
├── package.json
└── prisma.config.ts
```

### Responsibilities

``` text
API Routes
   ↓
Services
   ↓
Prisma / Storage
   ↓
Supabase
```

Keep business logic out of the low-level storage client.

------------------------------------------------------------------------

# 14. Example Service Architecture

``` text
route.ts
   ↓
file.service.ts
   ├── authenticate
   ├── validate
   ├── generate path
   ├── storage.uploadFile()
   └── db → File
```

The route should not contain all the implementation details.

This separation makes the infrastructure reusable.

------------------------------------------------------------------------

# 15. Security Checklist

Before production:

-   Keep `DATABASE_URL` server-side.
-   Keep `SUPABASE_SERVICE_ROLE_KEY` server-side.
-   Never use the service-role key in client components.
-   Validate uploaded file types.
-   Validate file size.
-   Generate storage paths on the server.
-   Never trust client-provided ownership.
-   Check authenticated user ownership before reading/deleting files.
-   Prefer private buckets for sensitive files.
-   Use signed URLs for private file access.
-   Do not permanently store signed URLs.
-   Add cleanup if a DB insert fails after a successful upload.

------------------------------------------------------------------------

# 16. Current Features

### Database

-   [x] Prisma 8 PostgreSQL runtime
-   [x] Supabase PostgreSQL connection
-   [x] Typed Prisma contract
-   [x] Generated TypeScript contract
-   [x] User model
-   [x] Post model
-   [x] User → Post relationship
-   [x] Database querying tested successfully

### Storage

-   [x] Supabase Storage bucket
-   [x] Server-side Storage client
-   [x] File upload
-   [x] File deletion
-   [x] Signed URLs
-   [x] File download
-   [x] Private bucket architecture
-   [x] User-based storage path convention

### Planned application layer

-   [ ] Authentication integration
-   [ ] File model in Prisma
-   [ ] File service
-   [ ] Upload API
-   [ ] Download/signed URL API
-   [ ] Delete API
-   [ ] File validation
-   [ ] Ownership authorization
-   [ ] Upload/DB failure cleanup
-   [ ] Optional file size/type policies

------------------------------------------------------------------------

# 17. Quick Usage Reference

### Database

Import:

``` ts
import { db } from "@/src/prisma/db";
```

Example read:

``` ts
const users = await db.orm.public.User.all();
```

### Storage

Import:

``` ts
import {
  uploadFile,
  deleteFile,
  getSignedUrl,
  downloadFile,
} from "@/src/storage/service";
```

Upload:

``` ts
const result = await uploadFile(
  "users/123/documents/resume.pdf",
  file
);
```

Delete:

``` ts
await deleteFile("users/123/documents/resume.pdf");
```

Signed URL:

``` ts
const url = await getSignedUrl(
  "users/123/documents/resume.pdf",
  3600
);
```

Download:

``` ts
const file = await downloadFile(
  "users/123/documents/resume.pdf"
);
```

------------------------------------------------------------------------

# 18. Mental Model

Remember these four responsibilities:

``` text
Prisma
→ Talks to PostgreSQL

PostgreSQL
→ Stores structured application data

Storage Service
→ Talks to Supabase Storage

Supabase Storage
→ Stores actual files
```

And:

``` text
File model
→ Connects application ownership/metadata
  to the actual object in Storage
```

------------------------------------------------------------------------

## Name

This reusable architecture is called:

# `AppDataLayer`

Recommended internal structure:

``` text
src/prisma/
src/storage/
src/services/
```

Use `AppDataLayer` when referring to this pattern in future projects.
