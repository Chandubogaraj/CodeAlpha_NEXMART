# NEXMART — Advanced E-Commerce Store

A full-stack Node.js + Express + MongoDB e-commerce app with JWT authentication, real cart/order flow, and a modern dark-themed SPA frontend.

## Features

### Backend
- **JWT Authentication** — register, login, protected routes
- **Password Hashing** — bcryptjs with salt rounds
- **MongoDB + Mongoose** — proper schemas with validation
- **Products** — search, filter by category, pagination, reviews, stock management
- **Orders** — full order lifecycle, stock auto-update, order cancellation with stock restore
- **Role-based Access** — admin vs user
- **Rate Limiting** — express-rate-limit on all routes (stricter on auth)
- **Input Validation** — express-validator on all POST/PUT routes
- **Error Handling** — centralized error handler

### Frontend (SPA)
- Dark luxury theme with Syne + DM Sans fonts
- Product grid with category filters, search, pagination
- Product detail page with quantity selector
- Cart with quantity update, remove, persisted in localStorage
- Full checkout form → real order creation
- Order history & order detail pages
- Login / Register with tabs
- Toast notifications, loading states

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 3. Start server
npm start
# or for dev with auto-reload:
npm run dev
```

Open http://localhost:5000

## Seed Demo Products

Visit http://localhost:5000 and click **"Load Demo Products"** — or hit:
```
POST http://localhost:5000/api/products/seed/init
```

## API Reference

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | — | Register new user |
| POST | /api/auth/login | — | Login, get token |
| GET | /api/auth/me | ✓ | Get current user |

### Products
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/products | — | List (search, filter, paginate) |
| GET | /api/products/:id | — | Product detail |
| POST | /api/products | Admin | Create product |
| PUT | /api/products/:id | Admin | Update product |
| DELETE | /api/products/:id | Admin | Delete product |
| POST | /api/products/:id/reviews | ✓ | Add review |

### Orders
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/orders | ✓ | Create order |
| GET | /api/orders/my | ✓ | User's orders |
| GET | /api/orders/:id | ✓ | Order detail |
| PATCH | /api/orders/:id/cancel | ✓ | Cancel order |
| GET | /api/orders | Admin | All orders |
| PATCH | /api/orders/:id/status | Admin | Update status |

### Users
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/users/profile | ✓ | Get profile |
| PUT | /api/users/profile | ✓ | Update profile |
| PUT | /api/users/change-password | ✓ | Change password |
| GET | /api/users | Admin | All users |

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express 4
- **Database**: MongoDB + Mongoose 8
- **Auth**: JWT + bcryptjs
- **Validation**: express-validator
- **Security**: express-rate-limit, cors
- **Frontend**: Vanilla JS SPA, no build step required
