# API Key Usage Documentation

FileShareX exposes a **REST API** for programmatic access to files and folders. All API requests under the `/api/v1` namespace require authentication via an **API key**.

---

## Authentication

Include your API key in every request using one of these methods:

1. **Authorization header (recommended)**  
   `Authorization: Bearer <your-api-key>`

2. **X-API-Key header**  
   `X-API-Key: <your-api-key>`

API keys start with the prefix `fsk_`. The full key is shown only once when you create it in the dashboard; store it securely. If the key is missing, invalid, or expired, the API returns `401 Unauthorized`.

---

## Base URL

Use your application base URL and the `/api/v1` path:

- **Development:** `http://localhost:3000/api/v1`
- **Production:** `https://your-domain.com/api/v1`

---

## API Key Scoping

- **User-scoped key** (no department): Uses the key owner’s role and has access to all folders/files the user can access in the company.
- **Department-scoped key** (optional `departmentId` when creating): Acts with DEPARTMENT_MANAGER role limited to that department’s resources. Only SUPER_ADMIN, COMPANY_ADMIN, or DEPARTMENT_MANAGER can create department-scoped keys.

---

## Endpoints

### 1. List folders and files

**GET** `/api/v1/folders`

Returns child folders and files for a given parent folder (or root if no parent).

**Query parameters**

| Parameter   | Type   | Required | Description                                                                 |
|------------|--------|----------|-----------------------------------------------------------------------------|
| `folderId` | number or `root` or omit | No       | Parent folder ID. Omit or use `root` for company root (folders only; no files at root). |

**Example request**

```bash
curl -X GET "https://your-domain.com/api/v1/folders?folderId=5" \
  -H "Authorization: Bearer fsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Success response (200)**

```json
{
  "folderId": 5,
  "folders": [
    {
      "id": 10,
      "name": "Projects",
      "path": "/Projects",
      "isDepartmentRoot": false,
      "createdAt": "2026-01-15T10:00:00.000Z",
      "createdBy": "user@example.com"
    }
  ],
  "files": [
    {
      "id": 101,
      "name": "report",
      "extension": "pdf",
      "sizeBytes": 102400,
      "mimeType": "application/pdf",
      "malwareStatus": "CLEAN",
      "gdprRiskLevel": "UNKNOWN",
      "uploadedAt": "2026-01-20T14:30:00.000Z",
      "createdBy": "user@example.com"
    }
  ]
}
```

**Errors**

- `401` — Missing or invalid/expired API key  
- `400` — Invalid `folderId`  
- `403` — No read access to the parent folder  

---

### 2. Create folder

**POST** `/api/v1/folders/create`

Creates a new folder under the given parent (or at company root if parent is null).

**Request body (JSON)**

| Field            | Type   | Required | Description                    |
|-----------------|--------|----------|--------------------------------|
| `name`          | string | Yes      | Folder name                    |
| `parentFolderId`| number \| null | No  | Parent folder ID; omit or `null` for root |

**Example request**

```bash
curl -X POST "https://your-domain.com/api/v1/folders/create" \
  -H "Authorization: Bearer fsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Folder", "parentFolderId": 5}'
```

**Success response (200)**

```json
{
  "id": 12,
  "name": "New Folder",
  "path": "/ParentPath/New Folder",
  "parentFolderId": 5,
  "createdAt": "2026-01-20T15:00:00.000Z"
}
```

**Errors**

- `401` — Missing or invalid/expired API key  
- `400` — Missing or invalid `name`  
- `403` — No write access to parent folder  
- `404` — Parent folder not found  
- `409` — Folder with that name already exists in the same parent  

---

### 3. Upload file

**POST** `/api/v1/files/upload`

Uploads a file into a folder. Request must be `multipart/form-data`.

**Form fields**

| Field     | Type   | Required | Description      |
|----------|--------|----------|------------------|
| `file`   | file   | Yes      | The file to upload |
| `folderId` | number | Yes    | Target folder ID |

**Limits**

- Max file size: **100 MB**

**Example request**

```bash
curl -X POST "https://your-domain.com/api/v1/files/upload" \
  -H "Authorization: Bearer fsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -F "file=@/path/to/document.pdf" \
  -F "folderId=5"
```

**Success response (200)**

```json
{
  "id": 201,
  "name": "document.pdf",
  "sizeBytes": 102400,
  "folderId": 5,
  "malwareStatus": "PENDING",
  "uploadedAt": "2026-01-20T15:10:00.000Z"
}
```

**Errors**

- `401` — Missing or invalid/expired API key  
- `400` — Missing `file` or invalid `folderId`  
- `403` — No write access to folder or file blocked (e.g. malware)  
- `404` — Folder not found  
- `413` — File too large (> 100 MB)  
- `502` — Storage upload failed  

---

### 4. Get file download URL

**GET** `/api/v1/files/:fileId/download`

Returns a signed URL to download the file. The URL is valid for 1 hour. Access is logged for audit.

**Path parameters**

| Parameter | Type   | Description   |
|-----------|--------|---------------|
| `fileId`  | number | File ID       |

**Example request**

```bash
curl -X GET "https://your-domain.com/api/v1/files/201/download" \
  -H "Authorization: Bearer fsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Success response (200)**

```json
{
  "downloadUrl": "https://cdn.example.com/path/to/file?token=...&expires=...",
  "expiresInSeconds": 3600
}
```

**Errors**

- `401` — Missing or invalid/expired API key  
- `400` — Invalid `fileId`  
- `403` — No read access, or file blocked (e.g. malware)  
- `404` — File not found  
- `410` — File not available (e.g. deleted)  
- `502` — Download URL not configured  

---

## Creating and managing API keys

1. Log in to the FileShareX dashboard.  
2. Go to **API Κλειδιά** (API Keys).  
3. Create a key: choose a **name** and optionally a **department** for department-scoped access.  
4. Copy the **raw key** (starts with `fsk_`) immediately; it is not shown again.  
5. Use this key in the `Authorization: Bearer <key>` or `X-API-Key: <key>` header for all `/api/v1` requests.

You can revoke a key by deleting it in the dashboard.

---

## Error response format

Failed requests return JSON with an `error` message:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:

- `400` — Bad request (invalid parameters or body)  
- `401` — Unauthorized (missing or invalid API key)  
- `403` — Forbidden (valid key but insufficient permissions)  
- `404` — Resource not found  
- `409` — Conflict (e.g. duplicate folder name)  
- `410` — Gone (e.g. file no longer available)  
- `413` — Payload too large  
- `502` — Server/upstream error (e.g. storage)  

---

## Summary

| Method | Endpoint                     | Description                |
|--------|------------------------------|----------------------------|
| GET    | `/api/v1/folders`            | List folders and files     |
| POST   | `/api/v1/folders/create`     | Create folder              |
| POST   | `/api/v1/files/upload`       | Upload file                |
| GET    | `/api/v1/files/:fileId/download` | Get signed download URL |

All requests require: **Authorization: Bearer &lt;api-key&gt;** or **X-API-Key: &lt;api-key&gt;**.
