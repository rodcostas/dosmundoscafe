const CART_KEY = "dosmundos_cart_v1";
let CONFIG = null;
let PRODUCTS = [];

const money = (n, cur="USD") =>
  new Intl.NumberFormat("en-US",{style:"currency",currency:cur}).format(n);

const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || "[]");
const setCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

function cartCount(){
  return getCart().reduce((sum,i)=>sum+i.qty,0);
}

function updateCartBadge(){
  const btn = document.getElementById("cartBtn");
  if(btn) btn.textContent = `Carrito (${cartCount()})`;
}

function addToCart(id){
  const cart = getCart();
  const item = cart.find(x=>x.id===id);
  if(item) item.qty += 1;
  else cart.push({id, qty:1});
  setCart(cart);
  updateCartBadge();
}

async function loadData(){
  const [cfg, prods] = await Promise.all([
    fetch("./data/config.json").then(r=>r.json()),
    fetch("./data/products.json").then(r=>r.json())
  ]);
  CONFIG = cfg;
  PRODUCTS = prods;
}

function renderGrid(){
  const grid = document.getElementById("grid");
  if(!grid) return;

  const filter = document.getElementById("statusFilter");
  const draw = () => {
    const v = filter?.value || "all";
    const list = PRODUCTS.filter(p => v==="all" ? true : p.status===v);

    grid.innerHTML = list.map(p => {
      const img = (p.images && p.images[0]) ? p.images[0] : "";
      return `
        <article class="card">
          <div class="thumb">${img ? `<img src="${img}" alt="${p.name}">` : ""}</div>
          <div class="body">
            <h4 class="name">${p.name}</h4>
            <div class="sub">${p.subtitle || ""}</div>
            <div class="meta">
              <strong>${money(p.price, p.currency || CONFIG.currency)}</strong>
              <button class="btn primary" data-add="${p.id}">Agregar</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll("[data-add]").forEach(btn=>{
      btn.addEventListener("click", () => addToCart(btn.dataset.add));
    });
  };

  filter?.addEventListener("change", draw);
  draw();
}

function hydrateBrand(){
  const bn = document.getElementById("brandName");
  const tl = document.getElementById("tagline");
  const note = document.getElementById("payNote");
  const hero = document.getElementById("heroImg");

  if(bn) bn.textContent = CONFIG.brandName || "Dos Mundos";
  if(tl) tl.textContent = CONFIG.tagline || "";
  if(note) note.textContent = CONFIG.payNote || "";
  if(hero && CONFIG.heroImage){
    hero.src = CONFIG.heroImage;
  }
}

function renderCartPage(){
  const listEl = document.getElementById("cartList");
  const totalEl = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  if(!listEl || !totalEl || !checkoutBtn) return;

  const cart = getCart();
  const items = cart.map(ci=>{
    const p = PRODUCTS.find(x=>x.id===ci.id);
    return p ? { ...p, qty: ci.qty } : null;
  }).filter(Boolean);

  const total = items.reduce((s,i)=>s + i.price*i.qty, 0);

  listEl.innerHTML = items.length ? items.map(i=>`
    <div class="cart-item">
      <div>
        <strong>${i.name}</strong><div class="small muted">${i.subtitle||""}</div>
        <div class="small muted">Qty: ${i.qty}</div>
      </div>
      <div><strong>${money(i.price*i.qty, i.currency || CONFIG.currency)}</strong></div>
    </div>
  `).join("") : `<div class="muted">Tu carrito está vacío.</div>`;

  totalEl.textContent = money(total, CONFIG.currency);

  checkoutBtn.addEventListener("click", ()=>{
    const lines = items.map(i=>`- ${i.qty} x ${i.name} (${money(i.price, i.currency || CONFIG.currency)})`);
    const msg =
`Hola Dos Mundos 👋
Quiero hacer este pedido:

${lines.join("\n")}

Total estimado: ${money(total, CONFIG.currency)}
Pago: ${CONFIG.payNote || "Efectivo o Bitcoin"}

Nombre:
Dirección (si es envío):
`;
    const wa = CONFIG.whatsapp || "";
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  });
}

(async function init(){
  await loadData();
  hydrateBrand();
  updateCartBadge();
  renderGrid();
  renderCartPage();
})();
