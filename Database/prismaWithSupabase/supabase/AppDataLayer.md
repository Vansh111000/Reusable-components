# Prisma + Supabase Storage Layer

## Reusable Architecture: `AppDataLayer`

### Purpose

`AppDataLayer` is the reusable backend infrastructure pattern for
Next.js applications that use:

-   Prisma 8 ORM
-   Supabase PostgreSQL
-   Supabase Storage

The core rule is:

> PostgreSQL stores structured application data and file
> metadata/references. Supabase Storage stores the actual binary files.

------------------------------------------------------------------------

## 1. Architecture

``` text
                         Next.js
                            |
              +-------------+-------------+
              |                           |
        Prisma DB Layer             Storage Service
              |                           |
              v                           v
     Supabase PostgreSQL          Supabase Storage
              |                           |
       Users / Posts / Files       Images / PDFs / Videos
```

A typical file flow:

``` text
User uploads file
       |
       v
Authenticate user
       |
       v
Generate controlled storage path
       |
       v
Supabase Storage
       |
       | returns storage path
       v
Prisma -> store metadata/path
```

------------------------------------------------------------------------

## 2. What belongs where?

### PostgreSQL / Prisma

Store:

-   users
-   posts
-   projects
-   subscriptions
-   file metadata
-   storage path/reference
-   ownership
-   timestamps
-   application state

Do NOT store normal uploaded images/PDFs/videos as database blobs unless
there is a specific reason.

### Supabase Storage

Store:

-   images
-   PDFs
-   videos
-   documents
-   other binary files

------------------------------------------------------------------------

## 3. File references: two valid approaches

### Approach A --- Dedicated `File` model

Use when an entity can have multiple files or files need independent
lifecycle/access control.

Example:

``` text
User 1 ---- * File
Post 1 ---- * File
Project 1 - * File
```

Example `File` record:

``` text
id
userId
originalName
storagePath
mimeType
size
createdAt
updatedAt
```

### Approach B --- Path attribute on an existing model

Use when the file is tightly coupled to one entity and there is only one
relevant file.

Example:

``` text
User
  avatarPath

Project
  thumbnailPath

Post
  coverImagePath
```

This avoids unnecessary tables.

### Rule

Use a `File` model when:

-   multiple files are possible
-   files have their own metadata
-   files can be deleted/replaced independently
-   multiple entities can own/reference files

Use a direct path field when:

-   there is one tightly coupled file
-   the file has no meaningful independent lifecycle

------------------------------------------------------------------------

# 4. Recommended project structure

``` text
src/
├── prisma/
│   ├── contract.prisma
│   ├── contract.json
│   ├── contract.d.ts
│   └── db.ts
│
└── storage/
    ├── client.ts
    └── service.ts

app/
└── api/
    └── files/
        └── route.ts
```

Optional application layer:

``` text
src/
└── services/
    ├── user.service.ts
    ├── post.service.ts
    └── file.service.ts
```

Keep database/storage infrastructure separate from business logic.

------------------------------------------------------------------------

# 5. Prisma database client

`src/prisma/db.ts`

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

This is the central Prisma database client.

Application code uses:

``` ts
db.orm.public.User
db.orm.public.Post
db.orm.public.File
```

------------------------------------------------------------------------

# 6. Prisma contract

`src/prisma/contract.prisma`

``` prisma
// use prisma-next

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String?
  name      String?
  posts     Post[]
  files     File[]
  createdAt TimestamptzString @default(now())
  updatedAt temporal.updatedAtString()
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  files     File[]
  createdAt TimestamptzString @default(now())
  updatedAt temporal.updatedAtString()
}

model File {
  id           Int      @id @default(autoincrement())
  user         User     @relation(fields: [userId], references: [id])
  userId       Int
  post         Post?    @relation(fields: [postId], references: [id])
  postId       Int?
  originalName String
  storagePath  String   @unique
  mimeType     String
  size         Int
  createdAt    TimestamptzString @default(now())
  updatedAt    temporal.updatedAtString()
}
```

This is an example reusable model. Add/remove relations based on the
application.

------------------------------------------------------------------------

# 7. Storage client

`src/storage/client.ts`

``` ts
import { createClient } from "@supabase/supabase-js";

export const storageClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

Environment:

``` env
DATABASE_URL="postgresql://..."

NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

The service-role key must remain server-side and must never use the
`NEXT_PUBLIC_` prefix.

------------------------------------------------------------------------

# 8. Storage service

`src/storage/service.ts`

``` ts
import { storageClient } from "./client";

const BUCKET = "uploads";

export async function uploadFile(path: string, file: File) {
  const { data, error } = await storageClient.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return data;
}

export async function deleteFile(path: string) {
  const { data, error } = await storageClient.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }

  return data;
}

export async function getSignedUrl(
  path: string,
  expiresIn = 3600
) {
  const { data, error } = await storageClient.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Signed URL creation failed: ${error.message}`);
  }

  return data.signedUrl;
}

export async function downloadFile(path: string) {
  const { data, error } = await storageClient.storage
    .from(BUCKET)
    .download(path);

  if (error) {
    throw new Error(`Storage download failed: ${error.message}`);
  }

  return data;
}
```

------------------------------------------------------------------------

# 9. Storage path convention

Do not allow the client to arbitrarily choose storage paths.

Prefer:

``` text
uploads/
└── users/
    └── {userId}/
        ├── avatars/
        ├── documents/
        └── images/
```

Examples:

``` text
users/123/avatars/profile.jpg
users/123/documents/resume.pdf
users/123/images/product.png
```

For generated content:

``` text
users/123/videos/{uuid}.mp4
```

Use generated IDs where collisions are possible.

------------------------------------------------------------------------

# 10. Upload + database transaction pattern

The binary file and database record are two different systems, so they
cannot be treated as one atomic transaction.

Recommended sequence:

``` text
1. Authenticate user
2. Validate file
3. Generate storage path
4. Upload to Supabase Storage
5. Create File row in PostgreSQL
6. Return database record
```

If step 5 fails after step 4 succeeds:

``` text
Storage contains file
Database does not contain record
```

Therefore cleanup is required:

``` text
if database insert fails:
    delete uploaded storage object
    throw error
```

This is a compensating action, not a database transaction.

------------------------------------------------------------------------

# 11. Retrieval pattern

Never store temporary signed URLs as the permanent database value.

Store:

``` text
storagePath = users/123/documents/resume.pdf
```

When access is needed:

``` text
Database
   |
   v
storagePath
   |
   v
getSignedUrl(path)
   |
   v
temporary URL
   |
   v
client
```

This is especially appropriate for private buckets.

------------------------------------------------------------------------

# 12. Security rules

### Server-only

Keep:

``` text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

server-side.

Never expose them to browser code.

### Ownership

Before returning/deleting a user's file:

``` text
authenticatedUser.id
        ==
file.userId
```

must be verified.

Do not trust:

``` text
userId
```

sent by the browser.

Derive it from the authenticated session.

### File validation

Before upload, validate:

-   MIME type
-   file size
-   extension where appropriate
-   ownership
-   allowed bucket/path

For example:

``` text
PDF     -> application/pdf
PNG     -> image/png
JPEG    -> image/jpeg
```

------------------------------------------------------------------------

# 13. Recommended API design

``` text
POST   /api/files
GET    /api/files/:id
DELETE /api/files/:id
```

### POST

``` text
authenticate
    ↓
validate file
    ↓
generate path
    ↓
upload to Storage
    ↓
create File row
    ↓
return metadata
```

### GET

``` text
authenticate
    ↓
find File
    ↓
verify ownership
    ↓
create signed URL
    ↓
return URL
```

### DELETE

``` text
authenticate
    ↓
find File
    ↓
verify ownership
    ↓
delete Storage object
    ↓
delete File row
```

------------------------------------------------------------------------

# 14. Important failure cases

### Storage upload succeeds, DB insert fails

Delete the uploaded object.

### DB record exists, Storage object is missing

Return an appropriate error and optionally run cleanup/reconciliation.

### User deletes a file

Delete both:

``` text
Supabase Storage object
+
PostgreSQL metadata row
```

### User replaces a file

Prefer:

``` text
upload new file
    ↓
update DB reference
    ↓
delete old file
```

rather than deleting the old file first. This reduces the chance of
ending up with no usable file if the new upload fails.

------------------------------------------------------------------------

# 15. Final architecture

``` text
                           Next.js
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
       Prisma DB Layer                    Storage Layer
             |                                 |
             v                                 v
  Supabase PostgreSQL                  Supabase Storage
             |                                 |
     +-------+--------+                +-------+--------+
     |       |        |                |       |        |
    User    Post     File            Images   PDFs    Videos
                    |
                    |
             storagePath
                    |
                    v
             actual file in
          Supabase Storage
```

### The rule to remember

> **Database = metadata, relationships, ownership, application state.**
>
> **Storage = actual binary files.**
>
> **Prisma = typed interface to PostgreSQL.**
>
> **Storage service = typed/application interface to Supabase Storage.**

------------------------------------------------------------------------

# 16. Reusable name

Use:

**`AppDataLayer`**

or, if you want a more infrastructure-oriented name:

**`DataAccessLayer`**

Recommended folder-level naming:

``` text
src/
├── prisma/       # Database access
├── storage/      # Object/file storage
└── services/     # Business logic
```

This pattern can be reused in your Next.js projects without tying
business logic directly to Supabase APIs.
