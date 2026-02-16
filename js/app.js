const CART_KEY = "dosmundos_cart_v1";
let CONFIG = { brandName:"Dos Mundos", tagline:"Specialty Coffee Roasters & Co-Lab", currency:"USD", payNote:"Pagos: efectivo o Bitcoin (Lightning).", whatsapp:"" };
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

function showFatal(msg){
  const grid = document.getElementById("grid");
  if(grid){
    grid.innerHTML = `<div class="panel"><strong>Error:</strong> <span class="muted">${msg}</span></div>`;
  }
}

async function safeJson(url){
  const r = await fetch(url, { cache: "no-store" });
  if(!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

async function loadData(){
  // Config is optional
  try{
    const cfg = await safeJson("./data/config.json");
    CONFIG = { ...CONFIG, ...cfg };
  }catch(e){
    console.warn("Config missing/invalid, using defaults:", e);
  }

  // Products are required
  try{
    PRODUCTS = await safeJson("./data/products.json");
  }catch(e){
    console.error("Products failed to load:", e);
    showFatal("No se pudo cargar el catálogo (products.json). Revisa que exista en /data y que sea JSON válido.");
    throw e;
  }
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

function renderGrid(){
  const grid = document.getElementById("grid");
  if(!grid) return;

  const statusFilter = document.getElementById("statusFilter");

  // Series submenu (shop.html)
  const seriesBtns = Array.from(document.querySelectorAll("[data-series]"));
  let activeSeries = "all";

  const setActiveSeries = (series) => {
    activeSeries = series;
    seriesBtns.forEach(b => b.classList.toggle("active", b.dataset.series === series));
  };

  const draw = () => {
    const status = statusFilter?.value || "all";

    const list = PRODUCTS.filter(p => {
      const okStatus = (status === "all") ? true : p.status === status;
      const okSeries = (activeSeries === "all") ? true : (p.series === activeSeries);
      return okStatus && okSeries;
    });

    if(!list.length){
      grid.innerHTML = `<div class="panel"><span class="muted">No hay productos para este filtro.</span></div>`;
      return;
    }

    grid.innerHTML = list.map(p => {
      const img = (p.images && p.images[0]) ? p.images[0] : "";
      const soldout = p.status === "soldout";
      return `
        <article class="card">
          <div class="thumb">${img ? `<img src="${img}" alt="${p.name}">` : ""}</div>
          <div class="body">
            <h4 class="name">${p.name}</h4>
            <div class="sub">${p.subtitle || ""}</div>
            <div class="meta">
              <strong>${money(p.price, p.currency || CONFIG.currency)}</strong>
              <button class="btn primary" data-add="${p.id}" ${soldout ? "disabled" : ""}>
                ${soldout ? "Agotado" : "Agregar"}
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll("[data-add]").forEach(btn=>{
      btn.addEventListener("click", () => addToCart(btn.dataset.add));
    });
  };

  // Hook up filters
  statusFilter?.addEventListener("change", draw);

  // Series buttons exist only on shop.html; safe on other pages
  seriesBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      setActiveSeries(btn.dataset.series);
      draw();
    });
  });

  // Initial state
  if(seriesBtns.length) setActiveSeries("all");
  draw();
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
    const wa = (CONFIG.whatsapp || "").replace(/[^\d]/g,"");
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  });
}

(async function init(){
  try{
    await loadData();
    hydrateBrand();
    updateCartBadge();
    renderGrid();
    renderCartPage();
  }catch(e){
    // already surfaced in UI for products
  }
})();
