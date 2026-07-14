/**
 * Elmoorx E-Commerce Example
 * ============================================
 * Full shopping cart with product catalog, cart management,
 * and checkout flow. Demonstrates $store for complex state.
 *
 * Run: npx tsx examples/ecommerce/Store.elmoorx.tsx
 */

import { $store, $state, $computed, island, h, mount } from "@elmoorx/runtime";

// ─── Types ────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Product Catalog ──────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { id: "p1", name: "Wireless Headphones", price: 99.99, image: "🎧", category: "Electronics", inStock: true },
  { id: "p2", name: "Mechanical Keyboard", price: 149.99, image: "⌨️", category: "Electronics", inStock: true },
  { id: "p3", name: "Coffee Mug", price: 12.99, image: "☕", category: "Home", inStock: true },
  { id: "p4", name: "Notebook", price: 8.99, image: "📓", category: "Stationery", inStock: true },
  { id: "p5", name: "Desk Lamp", price: 45.00, image: "💡", category: "Home", inStock: false },
  { id: "p6", name: "USB-C Cable", price: 19.99, image: "🔌", category: "Electronics", inStock: true },
];

// ─── Cart Store ───────────────────────────────────────────────────────

const cart = $store<{
  items: CartItem[];
  discount: number;
}>({
  items: [],
  discount: 0,
});

const selectedCategory = $state<string>("All");

const filteredProducts = $computed(() => {
  const cat = selectedCategory();
  return cat === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);
});

const cartTotal = $computed(() => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return subtotal * (1 - cart.discount);
});

const cartCount = $computed(() => {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ─── Actions ──────────────────────────────────────────────────────────

function addToCart(product: Product) {
  const existing = cart.items.find((item) => item.product.id === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.items.push({ product, quantity: 1 });
  }
}

function removeFromCart(productId: string) {
  const idx = cart.items.findIndex((item) => item.product.id === productId);
  if (idx >= 0) cart.items.splice(idx, 1);
}

function updateQuantity(productId: string, delta: number) {
  const item = cart.items.find((i) => i.product.id === productId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) removeFromCart(productId);
  }
}

function applyDiscount(code: string) {
  const codes: Record<string, number> = {
    "SAVE10": 0.1,
    "SAVE20": 0.2,
    "BLACKFRIDAY": 0.3,
  };
  cart.discount = codes[code.toUpperCase()] || 0;
}

// ─── Components ───────────────────────────────────────────────────────

function ProductCard(product: Product): any {
  return h("div", {
    class: "product-card",
    style: "border:1px solid #ddd; border-radius:8px; padding:16px; text-align:center;",
  },
    h("div", { style: "font-size:48px; margin-bottom:8px;" }, product.image),
    h("h3", { style: "margin:8px 0;" }, product.name),
    h("p", { style: "color:#666; margin:4px 0;" }, product.category),
    h("p", { style: "font-size:20px; font-weight:bold; margin:8px 0;" }, `$${product.price.toFixed(2)}`),
    h("button", {
      onClick: () => addToCart(product),
      disabled: !product.inStock,
      style: `padding:8px 16px; background:${product.inStock ? "#6366f1" : "#ccc"}; color:white; border:none; border-radius:4px; cursor:${product.inStock ? "pointer" : "not-allowed"};`,
    }, product.inStock ? "Add to Cart" : "Out of Stock")
  );
}

function CartItemRow(item: CartItem): any {
  return h("div", {
    style: "display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;",
  },
    h("span", null, `${item.product.image} ${item.product.name}`),
    h("div", { style: "display:flex; gap:8px; align-items:center;" },
      h("button", { onClick: () => updateQuantity(item.product.id, -1), style: "padding:4px 8px;" }, "−"),
      h("span", { style: "min-width:30px; text-align:center;" }, () => String(item.quantity)),
      h("button", { onClick: () => updateQuantity(item.product.id, 1), style: "padding:4px 8px;" }, "+"),
      h("span", { style: "min-width:80px; text-align:right;" }, () => `$${(item.product.price * item.quantity).toFixed(2)}`),
      h("button", { onClick: () => removeFromCart(item.product.id), style: "color:red; padding:4px 8px; background:none; border:none; cursor:pointer;" }, "✕")
    )
  );
}

function Cart(): any {
  return h("div", {
    style: "background:#f9f9f9; padding:16px; border-radius:8px;",
  },
    h("h2", { style: "margin:0 0 16px;" }, () => `🛒 Cart (${cartCount()})`),
    () => cart.items.length === 0
      ? h("p", { style: "color:#999; text-align:center; padding:32px;" }, "Your cart is empty")
      : h("div", null,
          ...cart.items.map((item) => h(CartItemRow, { item })),
          h("div", { style: "margin-top:16px; padding-top:16px; border-top:2px solid #ddd;" },
            h("div", { style: "display:flex; justify-content:space-between; margin-bottom:8px;" },
              h("span", null, "Subtotal:"),
              h("span", null, () => `$${cart.items.reduce((s, i) => s + i.product.price * i.quantity, 0).toFixed(2)}`)
            ),
            () => cart.discount > 0
              ? h("div", { style: "display:flex; justify-content:space-between; color:green; margin-bottom:8px;" },
                  h("span", null, `Discount (${(cart.discount * 100)}%):`),
                  h("span", null, () => `−$${(cart.items.reduce((s, i) => s + i.product.price * i.quantity, 0) * cart.discount).toFixed(2)}`)
                )
              : null,
            h("div", { style: "display:flex; justify-content:space-between; font-size:20px; font-weight:bold;" },
              h("span", null, "Total:"),
              h("span", null, () => `$${cartTotal().toFixed(2)}`)
            ),
            h("button", {
              style: "width:100%; padding:12px; background:#10b981; color:white; border:none; border-radius:4px; font-size:16px; cursor:pointer; margin-top:16px;",
              onClick: () => alert(`Checkout: $${cartTotal().toFixed(2)}`),
            }, "Checkout")
          )
        )
  );
}

function Store(): any {
  return h("div", { style: "max-width:1200px; margin:0 auto; padding:24px; font-family:sans-serif;" },
    h("h1", { style: "text-align:center; margin-bottom:32px;" }, "🛍️ Elmoorx Store"),
    // Category filter
    h("div", { style: "display:flex; gap:8px; justify-content:center; margin-bottom:32px;" },
      ["All", "Electronics", "Home", "Stationery"].map((cat) =>
        h("button", {
          onClick: () => selectedCategory.set(cat),
          style: `padding:8px 16px; border:1px solid #ddd; border-radius:4px; cursor:pointer; background:${selectedCategory() === cat ? "#6366f1" : "white"}; color:${selectedCategory() === cat ? "white" : "black"};`,
        }, cat)
      )
    ),
    // Products grid
    h("div", {
      style: "display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:32px;",
    },
      ...filteredProducts().map((p) => h(ProductCard, { product: p }))
    ),
    // Cart
    h(Cart, {}),
    // Discount code
    h("div", { style: "margin-top:16px; display:flex; gap:8px;" },
      h("input", {
        type: "text",
        placeholder: "Discount code (SAVE10, SAVE20, BLACKFRIDAY)",
        style: "flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;",
        id: "discount-input",
      }),
      h("button", {
        onClick: () => {
          const input = document.getElementById("discount-input") as HTMLInputElement;
          applyDiscount(input.value);
        },
        style: "padding:8px 16px; background:#6366f1; color:white; border:none; border-radius:4px; cursor:pointer;",
      }, "Apply")
    )
  );
}

// ─── Mount ────────────────────────────────────────────────────────────

if (typeof document !== "undefined") {
  mount(Store(), document.body);
}
