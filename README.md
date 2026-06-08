# NEXMART — Advanced E-Commerce Store

A full-stack Node.js + Express + MongoDB e-commerce app with JWT authentication, real cart/order flow, and a modern dark-themed SPA frontend.

## Features

### Backend

* JWT Authentication — register, login, protected routes
* Password Hashing — bcryptjs with salt rounds
* MongoDB + Mongoose — proper schemas with validation
* Products — search, filter by category, pagination, reviews, stock management
* Orders — full order lifecycle, stock auto-update, order cancellation with stock restore
* Role-based Access — admin vs user
* Rate Limiting — express-rate-limit on all routes (stricter on auth)
* Input Validation — express-validator on all POST/PUT routes
* Error Handling — centralized error handler

### Frontend (SPA)

* Dark luxury theme with Syne + DM Sans fonts
* Product grid with category filters, search, pagination
* Product detail page with quantity selector
* Cart with quantity update, remove, persisted in localStorage
* Full checkout form → real order creation
* Order history & order detail pages
* Login / Register with tabs
* Toast notifications, loading states

## Setup

```bash
npm install

cp .env.example .env

npm start
# or
npm run dev
```

Open:

```text
http://localhost:5000
```

## Seed Demo Products

```text
POST /api/products/seed/init
```

## API Reference

### Auth

* POST `/api/auth/register`
* POST `/api/auth/login`
* GET `/api/auth/me`

### Products

* GET `/api/products`
* GET `/api/products/:id`
* POST `/api/products`
* PUT `/api/products/:id`
* DELETE `/api/products/:id`
* POST `/api/products/:id/reviews`

### Orders

* POST `/api/orders`
* GET `/api/orders/my`
* GET `/api/orders/:id`
* PATCH `/api/orders/:id/cancel`
* GET `/api/orders`
* PATCH `/api/orders/:id/status`

### Users

* GET `/api/users/profile`
* PUT `/api/users/profile`
* PUT `/api/users/change-password`
* GET `/api/users`

## Tech Stack

* Runtime: Node.js
* Framework: Express.js
* Database: MongoDB + Mongoose
* Authentication: JWT + bcryptjs
* Validation: express-validator
* Security: express-rate-limit, cors
* Frontend: Vanilla JavaScript SPA
