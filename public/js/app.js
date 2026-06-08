// ─── State ────────────────────────────────────────────────────────────────────
const STATE = {
  page: "home",
  user: null,
  token: null,
  cart: [],           // [{product, name, image, price, quantity}]
  searchQuery: "",
  currentCategory: "All",
  currentPage: 1,
  searchTimer: null
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  STATE.token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  if (userStr) STATE.user = JSON.parse(userStr);
  const cartStr = localStorage.getItem("cart");
  if (cartStr) STATE.cart = JSON.parse(cartStr);

  updateNavUI();
  updateCartCount();
  navigate("home");
});

// ─── API helper ───────────────────────────────────────────────────────────────
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (STATE.token) headers["Authorization"] = `Bearer ${STATE.token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(page, params = {}) {
  STATE.page = page;
  STATE.params = params;
  const app = document.getElementById("app");
  app.innerHTML = '<div class="loader-wrap"><div class="loader"></div></div>';

  switch (page) {
    case "home":      renderHome(); break;
    case "products":  renderProducts(); break;
    case "product":   renderProduct(params.id); break;
    case "cart":      renderCart(); break;
    case "checkout":  renderCheckout(); break;
    case "auth":      renderAuth(); break;
    case "orders":    renderOrders(); break;
    case "order":     renderOrderDetail(params.id); break;
    default:          renderHome();
  }
}

function updateNavUI() {
  const authLink = document.getElementById("authLink");
  const logoutLink = document.getElementById("logoutLink");
  const ordersLink = document.getElementById("ordersLink");
  if (STATE.user) {
    authLink.style.display = "none";
    logoutLink.style.display = "inline";
    logoutLink.textContent = STATE.user.name.split(" ")[0];
    ordersLink.style.display = "inline";
  } else {
    authLink.style.display = "inline";
    logoutLink.style.display = "none";
    ordersLink.style.display = "none";
  }
}

function handleLogout() {
  STATE.user = null;
  STATE.token = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateNavUI();
  showToast("Logged out successfully");
  navigate("home");
}

// ─── Search ───────────────────────────────────────────────────────────────────
function handleSearch(val) {
  clearTimeout(STATE.searchTimer);
  STATE.searchQuery = val;
  STATE.searchTimer = setTimeout(() => {
    if (STATE.page !== "products") navigate("products");
    else renderProducts();
  }, 300);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "default") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(STATE.toastTimer);
  STATE.toastTimer = setTimeout(() => { t.classList.remove("show"); }, 3000);
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
function addToCart(product) {
  const existing = STATE.cart.find(i => i.product === product._id || i.product === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    STATE.cart.push({
      product: product._id || product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1
    });
  }
  saveCart();
  updateCartCount();
  showToast(`${product.name} added to cart`, "success");
}

function removeFromCart(productId) {
  STATE.cart = STATE.cart.filter(i => i.product !== productId);
  saveCart();
  updateCartCount();
  if (STATE.page === "cart") renderCart();
}

function updateCartQty(productId, delta) {
  const item = STATE.cart.find(i => i.product === productId);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  saveCart();
  updateCartCount();
  if (STATE.page === "cart") renderCart();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(STATE.cart));
}

function updateCartCount() {
  const total = STATE.cart.reduce((s, i) => s + i.quantity, 0);
  document.getElementById("cartCount").textContent = total;
}

function cartSubtotal() {
  return STATE.cart.reduce((s, i) => s + i.price * i.quantity, 0);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function stars(rating, numReviews = 0) {
  let html = '<div class="stars">';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= Math.round(rating) ? 'filled' : 'empty'}">★</span>`;
  }
  html += `<span class="star-count">(${numReviews})</span></div>`;
  return html;
}

function statusBadge(status) {
  return `<span class="order-status status-${status}">${status}</span>`;
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
async function renderHome() {
  let featured = [];
  try {
    const data = await api("/products?featured=true&limit=6");
    featured = data.products || [];
  } catch (e) {}

  const featuredHTML = featured.length
    ? featured.map(productCard).join("")
    : '<p style="color:var(--text2)">No featured products yet. <a href="#" onclick="api(\'/products/seed/init\',{method:\'POST\'}).then(()=>navigate(\'home\'))" style="color:var(--accent)">Seed demo products</a></p>';

  document.getElementById("app").innerHTML = `
    <div class="hero">
      <div class="hero-label">✦ New Arrivals</div>
      <h1>Shop The <span>Future</span><br/>Of Retail</h1>
      <p>Curated premium products delivered to your doorstep. Quality you can feel.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="navigate('products')">
          Shop Now →
        </button>
        <button class="btn btn-secondary" onclick="seedProducts()">
          Load Demo Products
        </button>
      </div>
    </div>

    <div class="section-header">
      <div>
        <div class="section-title">Featured Products</div>
        <div class="section-subtitle">Hand-picked just for you</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="navigate('products')">View All →</button>
    </div>

    <div class="product-grid">${featuredHTML}</div>
  `;
}

async function seedProducts() {
  try {
    await api("/products/seed/init", { method: "POST" });
    showToast("Demo products loaded!", "success");
    navigate("home");
  } catch (e) {
    showToast(e.message, "error");
  }
}

// ─── PRODUCTS PAGE ────────────────────────────────────────────────────────────
async function renderProducts() {
  const categories = ["All", "Electronics", "Clothing", "Books", "Home", "Sports", "Beauty", "Other"];
  const cat = STATE.currentCategory;
  const search = STATE.searchQuery;

  let qp = `page=${STATE.currentPage}&limit=12`;
  if (cat !== "All") qp += `&category=${cat}`;
  if (search) qp += `&search=${encodeURIComponent(search)}`;

  document.getElementById("app").innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">${search ? `Results for "${search}"` : "All Products"}</div>
        <div class="section-subtitle" id="productCount">Loading…</div>
      </div>
    </div>

    <div class="filter-bar">
      ${categories.map(c => `
        <button class="filter-chip ${c === cat ? "active" : ""}"
          onclick="STATE.currentCategory='${c}';STATE.currentPage=1;renderProducts()">
          ${c}
        </button>`).join("")}
    </div>

    <div id="productGridWrap">
      <div class="loader-wrap"><div class="loader"></div></div>
    </div>
    <div id="paginationWrap"></div>
  `;

  try {
    const data = await api(`/products?${qp}`);
    document.getElementById("productCount").textContent =
      `${data.total} product${data.total !== 1 ? "s" : ""} found`;

    document.getElementById("productGridWrap").innerHTML =
      data.products.length
        ? `<div class="product-grid">${data.products.map(productCard).join("")}</div>`
        : `<div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try a different search or category</p>
           </div>`;

    if (data.pages > 1) {
      let pages = "";
      for (let i = 1; i <= data.pages; i++) {
        pages += `<button class="page-btn ${i === data.page ? "active" : ""}"
          onclick="STATE.currentPage=${i};renderProducts()">${i}</button>`;
      }
      document.getElementById("paginationWrap").innerHTML =
        `<div class="pagination">${pages}</div>`;
    }
  } catch (e) {
    document.getElementById("productGridWrap").innerHTML =
      `<div class="empty-state"><p style="color:var(--danger)">${e.message}</p><button class="btn btn-secondary" onclick="seedProducts()">Seed demo data</button></div>`;
  }
}

function productCard(p) {
  const discount = p.originalPrice && p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;

  return `
    <div class="product-card" onclick="navigate('product',{id:'${p._id || p.id}'})">
      <img src="${p.image}" alt="${p.name}" class="product-card-img" loading="lazy" />
      <div class="product-card-body">
        ${p.stock === 0
          ? '<span class="product-badge out">Out of Stock</span>'
          : p.stock < 5
            ? `<span class="product-badge" style="color:var(--warn);border-color:rgba(251,146,60,0.2);background:rgba(251,146,60,0.08)">Only ${p.stock} left</span>`
            : ''
        }
        ${stars(p.rating, p.numReviews)}
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description}</div>
        <div class="product-footer">
          <div>
            <div class="product-price">${fmt(p.price)}</div>
            ${discount ? `<div class="product-original">${fmt(p.originalPrice)}</div>` : ""}
            ${discount ? `<div class="product-discount">${discount}% off</div>` : ""}
          </div>
          <button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${JSON.stringify(p).replace(/"/g,'&quot;')})" ${p.stock === 0 ? 'disabled' : ''} title="Add to cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
      </div>
    </div>`;
}

// ─── PRODUCT DETAIL ───────────────────────────────────────────────────────────
async function renderProduct(id) {
  try {
    const data = await api(`/products/${id}`);
    const p = data.product;
    const discount = p.originalPrice && p.originalPrice > p.price
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

    document.getElementById("app").innerHTML = `
      <div class="breadcrumb">
        <a onclick="navigate('home')">Home</a>
        <span>›</span>
        <a onclick="navigate('products')">${p.category}</a>
        <span>›</span>
        ${p.name}
      </div>

      <div class="product-detail">
        <div>
          <img src="${p.image}" alt="${p.name}" class="product-detail-img" />
        </div>
        <div class="product-detail-info">
          <div class="brand-tag">${p.brand || p.category}</div>
          <h1>${p.name}</h1>
          ${stars(p.rating, p.numReviews)}
          <div class="detail-price">
            ${fmt(p.price)}
            ${discount ? `<span style="font-size:18px;color:var(--accent3);margin-left:12px">${discount}% off</span>` : ""}
          </div>
          ${p.originalPrice && discount ? `<div style="color:var(--text3);font-size:14px;text-decoration:line-through;margin-top:-8px;margin-bottom:8px">${fmt(p.originalPrice)}</div>` : ""}
          <p class="detail-desc">${p.description}</p>

          <div class="detail-meta">
            <div class="detail-meta-row"><strong>Category</strong>${p.category}</div>
            <div class="detail-meta-row"><strong>Stock</strong>
              <span style="color:${p.stock > 5 ? 'var(--accent3)' : p.stock > 0 ? 'var(--warn)' : 'var(--danger)'}">
                ${p.stock > 0 ? `${p.stock} available` : "Out of stock"}
              </span>
            </div>
          </div>

          ${p.stock > 0 ? `
          <div class="qty-control">
            <button class="qty-btn" onclick="changeDetailQty(-1)">−</button>
            <div class="qty-num" id="detailQty">1</div>
            <button class="qty-btn" onclick="changeDetailQty(1)">+</button>
            <span style="color:var(--text2);font-size:13px">Max: ${p.stock}</span>
          </div>

          <button class="btn btn-primary" onclick="addToCartDetail(${JSON.stringify(p).replace(/"/g,'&quot;')})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Add to Cart
          </button>
          ` : `<button class="btn" style="background:var(--bg3);color:var(--text3);cursor:not-allowed" disabled>Out of Stock</button>`}
        </div>
      </div>
    `;

    // Store max stock for qty control
    window._detailProduct = p;
    window._detailQty = 1;

  } catch (e) {
    document.getElementById("app").innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Product not found</h3><button class="btn btn-secondary" onclick="navigate('products')">Back to Shop</button></div>`;
  }
}

function changeDetailQty(delta) {
  const max = window._detailProduct?.stock || 99;
  window._detailQty = Math.min(max, Math.max(1, (window._detailQty || 1) + delta));
  document.getElementById("detailQty").textContent = window._detailQty;
}

function addToCartDetail(product) {
  const qty = window._detailQty || 1;
  for (let i = 0; i < qty; i++) addToCart(product);
  // De-duplicate after bulk add
  STATE.cart = STATE.cart.reduce((acc, item) => {
    const found = acc.find(i => i.product === item.product);
    if (found) { found.quantity += item.quantity; return acc; }
    return [...acc, item];
  }, []);
  // Correct quantity
  const item = STATE.cart.find(i => i.product === (product._id || product.id));
  if (item) item.quantity = qty + (item.quantity - qty);
  saveCart();
  updateCartCount();
}

// ─── CART ─────────────────────────────────────────────────────────────────────
function renderCart() {
  if (STATE.cart.length === 0) {
    document.getElementById("app").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some products to get started</p>
        <button class="btn btn-primary" onclick="navigate('products')">Shop Now</button>
      </div>`;
    return;
  }

  const subtotal = cartSubtotal();
  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;

  document.getElementById("app").innerHTML = `
    <div class="section-header">
      <div class="section-title">Shopping Cart</div>
      <button class="btn btn-secondary btn-sm" onclick="navigate('products')">← Continue Shopping</button>
    </div>

    <div class="cart-layout">
      <div class="cart-items">
        ${STATE.cart.map(item => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price">${fmt(item.price)}</div>
              <div class="cart-item-controls">
                <button class="cart-qty-btn" onclick="updateCartQty('${item.product}',-1)">−</button>
                <span class="cart-qty">${item.quantity}</span>
                <button class="cart-qty-btn" onclick="updateCartQty('${item.product}',1)">+</button>
                <button class="cart-remove" onclick="removeFromCart('${item.product}')" title="Remove">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px;text-align:right;flex-shrink:0">
              ${fmt(item.price * item.quantity)}
            </div>
          </div>
        `).join("")}
      </div>

      <div class="order-summary">
        <h3>Order Summary</h3>
        <div class="summary-row"><span>Subtotal (${STATE.cart.reduce((s,i)=>s+i.quantity,0)} items)</span><span>${fmt(subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span class="${shipping === 0 ? 'free' : ''}">${shipping === 0 ? "FREE" : fmt(shipping)}</span></div>
        ${shipping > 0 ? `<div style="font-size:12px;color:var(--text2);margin-top:-6px;margin-bottom:6px">Add ${fmt(999-subtotal)} more for free shipping</div>` : ""}
        <div class="summary-row total"><span>Total</span><span>${fmt(total)}</span></div>
        <button class="btn btn-primary" style="width:100%;margin-top:16px;justify-content:center" onclick="goToCheckout()">
          Proceed to Checkout →
        </button>
        <div style="font-size:12px;color:var(--text2);text-align:center;margin-top:12px">🔒 Secure checkout</div>
      </div>
    </div>
  `;
}

function goToCheckout() {
  if (!STATE.user) {
    showToast("Please login to checkout", "error");
    navigate("auth");
    return;
  }
  navigate("checkout");
}

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────
function renderCheckout() {
  if (STATE.cart.length === 0) { navigate("cart"); return; }

  const subtotal = cartSubtotal();
  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;
  const u = STATE.user;

  document.getElementById("app").innerHTML = `
    <div class="breadcrumb">
      <a onclick="navigate('cart')">Cart</a>
      <span>›</span> Checkout
    </div>

    <div class="cart-layout">
      <div>
        <div class="form-section-title">Shipping Address</div>
        <div class="form-grid" id="checkoutForm">
          <div class="form-group form-full">
            <label>Full Name *</label>
            <input id="sh_name" type="text" value="${u?.name || ''}" placeholder="Your full name" />
          </div>
          <div class="form-group form-full">
            <label>Street Address *</label>
            <input id="sh_street" type="text" placeholder="House no., street name" />
          </div>
          <div class="form-group">
            <label>City *</label>
            <input id="sh_city" type="text" placeholder="City" />
          </div>
          <div class="form-group">
            <label>State *</label>
            <input id="sh_state" type="text" placeholder="State" />
          </div>
          <div class="form-group">
            <label>Pincode *</label>
            <input id="sh_pincode" type="text" placeholder="6-digit pincode" />
          </div>
          <div class="form-group">
            <label>Phone *</label>
            <input id="sh_phone" type="tel" placeholder="10-digit number" />
          </div>
        </div>

        <div class="form-section-title">Payment Method</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${["COD","UPI","Card"].map((m,i) => `
            <label style="flex:1;min-width:100px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:14px">
              <input type="radio" name="payment" value="${m}" ${i===0?"checked":""} style="accent-color:var(--accent)"/>
              ${m === "COD" ? "💵 Cash on Delivery" : m === "UPI" ? "📲 UPI" : "💳 Card"}
            </label>
          `).join("")}
        </div>

        <div class="form-group" style="margin-top:16px">
          <label>Order Notes (optional)</label>
          <textarea id="sh_notes" rows="2" placeholder="Special delivery instructions…"></textarea>
        </div>

        <button class="btn btn-primary" style="margin-top:24px;width:100%;justify-content:center" onclick="placeOrder()">
          Place Order — ${fmt(total)}
        </button>
        <div id="checkoutError" style="color:var(--danger);font-size:13px;margin-top:10px"></div>
      </div>

      <div class="order-summary">
        <h3>Your Order</h3>
        ${STATE.cart.map(i => `
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
            <span style="color:var(--text2)">${i.name} × ${i.quantity}</span>
            <span>${fmt(i.price * i.quantity)}</span>
          </div>`).join("")}
        <hr class="divider" />
        <div class="summary-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span class="${shipping === 0 ? 'free' : ''}">${shipping === 0 ? "FREE" : fmt(shipping)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${fmt(total)}</span></div>
      </div>
    </div>
  `;
}

async function placeOrder() {
  const g = id => document.getElementById(id)?.value?.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || "COD";

  const shippingAddress = {
    name: g("sh_name"),
    street: g("sh_street"),
    city: g("sh_city"),
    state: g("sh_state"),
    pincode: g("sh_pincode"),
    phone: g("sh_phone")
  };

  const missing = Object.entries(shippingAddress).filter(([,v]) => !v).map(([k]) => k);
  if (missing.length) {
    document.getElementById("checkoutError").textContent = "Please fill all required fields.";
    return;
  }

  const btn = document.querySelector("#app .btn-primary:last-of-type");
  btn.disabled = true;
  btn.textContent = "Placing order…";

  try {
    const items = STATE.cart.map(i => ({ product: i.product, quantity: i.quantity }));
    const data = await api("/orders", {
      method: "POST",
      body: JSON.stringify({ items, shippingAddress, paymentMethod, notes: g("sh_notes") })
    });

    STATE.cart = [];
    saveCart();
    updateCartCount();
    showToast("Order placed successfully! 🎉", "success");
    navigate("order", { id: data.order._id });
  } catch (e) {
    document.getElementById("checkoutError").textContent = e.message;
    btn.disabled = false;
    btn.textContent = "Try Again";
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function renderAuth(defaultTab = "login") {
  document.getElementById("app").innerHTML = `
    <div class="auth-container">
      <div class="auth-header">
        <h2>Welcome to <span style="color:var(--accent)">NEXMART</span></h2>
        <p>Sign in to track orders and checkout faster</p>
      </div>

      <div class="auth-tabs">
        <div class="auth-tab ${defaultTab==='login'?'active':''}" onclick="switchAuthTab('login')" id="tab-login">Login</div>
        <div class="auth-tab ${defaultTab==='register'?'active':''}" onclick="switchAuthTab('register')" id="tab-register">Register</div>
      </div>

      <div id="authFormWrap"></div>
    </div>
  `;
  switchAuthTab(defaultTab);
}

function switchAuthTab(tab) {
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");

  document.getElementById("authFormWrap").innerHTML = tab === "login"
    ? `
      <form class="auth-form" onsubmit="handleLogin(event)">
        <div class="form-group"><label>Email</label><input id="l_email" type="email" placeholder="you@example.com" required /></div>
        <div class="form-group"><label>Password</label><input id="l_pass" type="password" placeholder="••••••••" required /></div>
        <div id="authError" style="color:var(--danger);font-size:13px"></div>
        <button class="btn btn-primary" type="submit" style="justify-content:center;width:100%">Login</button>
        <div class="auth-divider">Don't have an account? <a onclick="switchAuthTab('register')" style="color:var(--accent);cursor:pointer">Register</a></div>
      </form>`
    : `
      <form class="auth-form" onsubmit="handleRegister(event)">
        <div class="form-group"><label>Full Name</label><input id="r_name" type="text" placeholder="Your name" required minlength="2" /></div>
        <div class="form-group"><label>Email</label><input id="r_email" type="email" placeholder="you@example.com" required /></div>
        <div class="form-group"><label>Password</label><input id="r_pass" type="password" placeholder="Min. 6 characters" required minlength="6" /></div>
        <div id="authError" style="color:var(--danger);font-size:13px"></div>
        <button class="btn btn-primary" type="submit" style="justify-content:center;width:100%">Create Account</button>
        <div class="auth-divider">Already have an account? <a onclick="switchAuthTab('login')" style="color:var(--accent);cursor:pointer">Login</a></div>
      </form>`;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Logging in…";
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.getElementById("l_email").value,
        password: document.getElementById("l_pass").value
      })
    });
    STATE.token = data.token;
    STATE.user = data.user;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    updateNavUI();
    showToast(`Welcome back, ${data.user.name}! 👋`, "success");
    navigate("home");
  } catch (e) {
    document.getElementById("authError").textContent = e.message;
    btn.disabled = false; btn.textContent = "Login";
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Creating account…";
  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("r_name").value,
        email: document.getElementById("r_email").value,
        password: document.getElementById("r_pass").value
      })
    });
    STATE.token = data.token;
    STATE.user = data.user;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    updateNavUI();
    showToast(`Welcome to NEXMART, ${data.user.name}! 🎉`, "success");
    navigate("home");
  } catch (e) {
    document.getElementById("authError").textContent = e.message;
    btn.disabled = false; btn.textContent = "Create Account";
  }
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────
async function renderOrders() {
  if (!STATE.user) { navigate("auth"); return; }

  try {
    const data = await api("/orders/my");
    const orders = data.orders || [];

    document.getElementById("app").innerHTML = `
      <div class="section-header">
        <div class="section-title">My Orders</div>
        <button class="btn btn-secondary btn-sm" onclick="navigate('products')">Continue Shopping</button>
      </div>
      ${orders.length === 0
        ? `<div class="empty-state">
            <div class="empty-icon">📦</div>
            <h3>No orders yet</h3>
            <p>Your orders will appear here</p>
            <button class="btn btn-primary" onclick="navigate('products')">Start Shopping</button>
           </div>`
        : orders.map(order => `
          <div class="order-card" onclick="navigate('order',{id:'${order._id}'})">
            <div class="order-header">
              <div>
                <div class="order-id">Order #${order._id.toString().slice(-8).toUpperCase()}</div>
                <div class="order-date">${new Date(order.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div>
              </div>
              ${statusBadge(order.orderStatus)}
            </div>
            <div class="order-items-preview">
              ${order.items.slice(0,4).map(i => `
                <img src="${i.image}" alt="${i.name}" class="order-thumb" />
              `).join("")}
              ${order.items.length > 4 ? `<div style="width:52px;height:52px;border-radius:6px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text2)">+${order.items.length-4}</div>` : ""}
            </div>
            <div class="order-footer">
              <span style="color:var(--text2);font-size:13px">${order.items.length} item${order.items.length>1?'s':''} · ${order.paymentMethod}</span>
              <div class="order-total">${fmt(order.total)}</div>
            </div>
          </div>
        `).join("")
      }
    `;
  } catch (e) {
    document.getElementById("app").innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

async function renderOrderDetail(id) {
  if (!STATE.user) { navigate("auth"); return; }

  try {
    const data = await api(`/orders/${id}`);
    const o = data.order;

    document.getElementById("app").innerHTML = `
      <div class="breadcrumb">
        <a onclick="navigate('orders')">My Orders</a>
        <span>›</span>
        Order #${o._id.toString().slice(-8).toUpperCase()}
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px">
        <div>
          <h2 style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800">Order Details</h2>
          <div style="color:var(--text2);font-size:13px;margin-top:4px">
            Placed on ${new Date(o.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})}
          </div>
        </div>
        ${statusBadge(o.orderStatus)}
      </div>

      <div class="cart-layout">
        <div>
          <div class="form-section-title">Items Ordered</div>
          ${o.items.map(item => `
            <div class="cart-item">
              <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
              <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${fmt(item.price)} × ${item.quantity}</div>
              </div>
              <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px">${fmt(item.price*item.quantity)}</div>
            </div>
          `).join("")}

          <div class="form-section-title">Shipping Address</div>
          <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;font-size:14px;line-height:1.8">
            <strong>${o.shippingAddress.name}</strong><br/>
            ${o.shippingAddress.street}<br/>
            ${o.shippingAddress.city}, ${o.shippingAddress.state} — ${o.shippingAddress.pincode}<br/>
            📞 ${o.shippingAddress.phone}
          </div>

          ${["processing","confirmed"].includes(o.orderStatus) ? `
          <button class="btn btn-danger" style="margin-top:16px" onclick="cancelOrder('${o._id}')">Cancel Order</button>
          ` : ""}
        </div>

        <div class="order-summary">
          <h3>Payment Summary</h3>
          <div class="summary-row"><span>Subtotal</span><span>${fmt(o.subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span class="${o.shippingCost===0?'free':''}">${o.shippingCost===0?"FREE":fmt(o.shippingCost)}</span></div>
          ${o.discount ? `<div class="summary-row"><span>Discount</span><span style="color:var(--accent3)">−${fmt(o.discount)}</span></div>` : ""}
          <div class="summary-row total"><span>Total Paid</span><span>${fmt(o.total)}</span></div>
          <hr class="divider" />
          <div class="summary-row"><span>Payment</span><span>${o.paymentMethod}</span></div>
          <div class="summary-row"><span>Status</span>${statusBadge(o.paymentStatus)}</div>
          ${o.trackingNumber ? `<div class="summary-row"><span>Tracking</span><span style="color:var(--accent)">${o.trackingNumber}</span></div>` : ""}
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById("app").innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Order not found</h3><button class="btn btn-secondary" onclick="navigate('orders')">My Orders</button></div>`;
  }
}

async function cancelOrder(id) {
  if (!confirm("Are you sure you want to cancel this order?")) return;
  try {
    await api(`/orders/${id}/cancel`, { method: "PATCH" });
    showToast("Order cancelled successfully", "success");
    renderOrderDetail(id);
  } catch (e) {
    showToast(e.message, "error");
  }
}
