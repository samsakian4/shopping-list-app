// ============================================================
// تنظیمات Supabase — بعد از ساخته‌شدن پروژه، این دو مقدار جایگزین می‌شوند
// ============================================================
const SUPABASE_URL = "https://pdwqzizeudrxjnsqlkdr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkd3F6aXpldWRyeGpuc3Fsa2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MTAzOTMsImV4cCI6MjEwMTE4NjM5M30.mBMdELJ096XTd3M47LvPI4o-TLLAcW9D8c7U_En6PuA";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// وضعیت کلی برنامه
// ============================================================
const state = {
  user: null,
  profile: null,
  household: null,
  members: {},           // id -> {full_name}
  items: [],              // همه‌ی آیتم‌های لیست خرید (خریده‌شده و نشده)
  customProducts: [],     // آیتم‌های سفارشی که قبلاً به کاتالوگ اضافه شده (از Supabase)
  priceHistory: {},       // item_key -> [قیمت‌های ثبت‌شده]
  activeTab: "list",
  activeCategory: "همه",
  channel: null,
};

const AVATAR_COLORS = ["green", "pink", "blue", "purple", "peach"];

// ============================================================
// ابزارهای کمکی
// ============================================================
function normalize(str) {
  return (str || "")
    .toString()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F]/g, "")
    .trim()
    .toLowerCase();
}

function itemKey(name, brand, size) {
  return normalize(`${name}|${brand || ""}|${size || ""}`);
}

function formatToman(n) {
  const v = Math.round(n || 0);
  return v.toLocaleString("fa-IR") + " تومان";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" }) +
    " - " + d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

function avatarColorFor(id) {
  if (!id) return "green";
  let h = 0;
  for (const c of id) h = (h + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function categoryColor(catName) {
  const found = CATEGORIES.find((c) => c.name === catName);
  return found ? found.color : "green";
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function show(id) {
  document.getElementById(id).classList.remove("hidden");
}
function hide(id) {
  document.getElementById(id).classList.add("hidden");
}

function genInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ============================================================
// احراز هویت
// ============================================================
async function initAuth() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    await onAuthed(data.session.user);
  } else {
    hide("boot-screen");
    show("auth-screen");
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      state.user = null;
      state.profile = null;
      state.household = null;
      if (state.channel) sb.removeChannel(state.channel);
      hide("app-screen");
      hide("household-screen");
      show("auth-screen");
    }
  });
}

async function onAuthed(user) {
  state.user = user;
  hide("boot-screen");
  hide("auth-screen");

  const { data: profile, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    show("household-screen");
    return;
  }
  state.profile = profile;

  if (!profile.household_id) {
    show("household-screen");
    return;
  }

  await enterApp(profile.household_id);
}

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("su-name").value.trim();
  const email = document.getElementById("su-email").value.trim();
  const password = document.getElementById("su-password").value;
  const errEl = document.getElementById("su-error");
  errEl.textContent = "";

  const { data, error } = await sb.auth.signUp({
    email, password, options: { data: { full_name: name } },
  });
  if (error) { errEl.textContent = error.message; return; }

  if (data.session) {
    await onAuthed(data.session.user);
  } else {
    errEl.style.color = "var(--green-deep)";
    errEl.textContent = "ثبت‌نام شد! ایمیلت رو برای تایید چک کن، بعد وارد شو.";
  }
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("li-email").value.trim();
  const password = document.getElementById("li-password").value;
  const errEl = document.getElementById("li-error");
  errEl.textContent = "";

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = "ایمیل یا رمز اشتباهه."; return; }
  await onAuthed(data.session.user);
});

document.getElementById("show-login").addEventListener("click", () => {
  hide("signup-card"); show("login-card");
});
document.getElementById("show-signup").addEventListener("click", () => {
  hide("login-card"); show("signup-card");
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await sb.auth.signOut();
});

// ============================================================
// خانواده (ساخت / پیوستن با کد دعوت)
// ============================================================
document.getElementById("create-household-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("hh-name").value.trim() || "خانواده";
  const errEl = document.getElementById("hh-create-error");
  errEl.textContent = "";

  const code = genInviteCode();
  const { data: hh, error } = await sb
    .from("households")
    .insert({ name, invite_code: code })
    .select()
    .single();

  if (error) { errEl.textContent = "خطا: " + error.message; return; }

  const { error: pErr } = await sb
    .from("profiles")
    .update({ household_id: hh.id })
    .eq("id", state.user.id);

  if (pErr) { errEl.textContent = "خطا: " + pErr.message; return; }

  await enterApp(hh.id);
});

document.getElementById("join-household-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("hh-code").value.trim().toUpperCase();
  const errEl = document.getElementById("hh-join-error");
  errEl.textContent = "";

  const { data: hh, error } = await sb
    .from("households")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (error || !hh) { errEl.textContent = "کدی با این مشخصات پیدا نشد."; return; }

  const { error: pErr } = await sb
    .from("profiles")
    .update({ household_id: hh.id })
    .eq("id", state.user.id);

  if (pErr) { errEl.textContent = "خطا: " + pErr.message; return; }

  await enterApp(hh.id);
});

document.getElementById("hh-tab-create").addEventListener("click", () => {
  document.getElementById("hh-tab-create").classList.add("active");
  document.getElementById("hh-tab-join").classList.remove("active");
  show("create-household-form"); hide("join-household-form");
});
document.getElementById("hh-tab-join").addEventListener("click", () => {
  document.getElementById("hh-tab-join").classList.add("active");
  document.getElementById("hh-tab-create").classList.remove("active");
  show("join-household-form"); hide("create-household-form");
});

// ============================================================
// ورود به اپ اصلی
// ============================================================
async function enterApp(householdId) {
  hide("household-screen");
  hide("auth-screen");

  const { data: hh } = await sb.from("households").select("*").eq("id", householdId).single();
  state.household = hh;

  const { data: members } = await sb.from("profiles").select("id, full_name").eq("household_id", householdId);
  state.members = {};
  (members || []).forEach((m) => (state.members[m.id] = m));

  document.getElementById("household-name-pill").textContent = hh.name + " · " + hh.invite_code;

  await loadCustomProducts();
  await loadPriceHistory();
  await loadItems();
  subscribeRealtime();

  renderCategoryChips();
  show("app-screen");
}

async function loadCustomProducts() {
  const { data } = await sb.from("products").select("*").eq("household_id", state.household?.id ?? state.profile.household_id);
  state.customProducts = data || [];
}

async function loadPriceHistory() {
  const { data } = await sb
    .from("price_history")
    .select("item_key, price")
    .eq("household_id", state.profile.household_id);
  const map = {};
  (data || []).forEach((r) => {
    if (!map[r.item_key]) map[r.item_key] = [];
    map[r.item_key].push(Number(r.price));
  });
  state.priceHistory = map;
}

async function loadItems() {
  const { data, error } = await sb
    .from("shopping_items")
    .select("*")
    .eq("household_id", state.profile.household_id)
    .order("created_at", { ascending: true });
  if (error) { toast("خطا در بارگذاری لیست"); return; }
  state.items = data || [];
  renderAll();
}

function subscribeRealtime() {
  if (state.channel) sb.removeChannel(state.channel);
  state.channel = sb
    .channel("shopping-" + state.profile.household_id)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "shopping_items",
      filter: `household_id=eq.${state.profile.household_id}`,
    }, () => loadItems())
    .subscribe();
}

// ============================================================
// جست‌وجو و پیشنهاد هوشمند
// ============================================================
function allSearchable() {
  const seed = PRODUCTS_SEED.map((p) => ({ ...p, isCustom: false }));
  const custom = state.customProducts.map((p) => ({
    id: p.id, name: p.name, brand: p.brand, size: p.package_size,
    unit: p.unit, category: p.category, price: p.base_price, isCustom: true,
  }));
  return [...custom, ...seed];
}

function estimatedPriceFor(name, brand, size, fallback) {
  const key = itemKey(name, brand, size);
  const hist = state.priceHistory[key];
  if (hist && hist.length) {
    const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
    return Math.round(avg);
  }
  return fallback || 0;
}

const searchInput = document.getElementById("search-input");
const suggestionsBox = document.getElementById("suggestions");

searchInput.addEventListener("input", () => renderSuggestions(searchInput.value));
searchInput.addEventListener("focus", () => renderSuggestions(searchInput.value));
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) suggestionsBox.classList.add("hidden");
});

function renderSuggestions(rawQuery) {
  const q = normalize(rawQuery);
  if (!q) { suggestionsBox.classList.add("hidden"); return; }

  const pool = allSearchable();
  const scored = pool
    .map((p) => {
      const n = normalize(p.name);
      const b = normalize(p.brand || "");
      let score = -1;
      if (n.startsWith(q)) score = 3;
      else if (n.includes(q)) score = 2;
      else if (b.includes(q)) score = 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map((x) => x.p);

  suggestionsBox.innerHTML = "";
  scored.forEach((p) => {
    const est = estimatedPriceFor(p.name, p.brand, p.size, p.price);
    const row = document.createElement("div");
    row.className = "suggestion-item";
    row.innerHTML = `
      <div class="sugg-main">
        <span class="sugg-dot" style="background:var(--${categoryColor(p.category)})"></span>
        <div>
          <div class="sugg-name">${p.name}</div>
          <div class="sugg-meta">${[p.brand, p.size].filter(Boolean).join(" · ") || p.category}</div>
        </div>
      </div>
      <div class="sugg-price">${formatToman(est)}</div>
    `;
    row.addEventListener("click", () => addItem(p, est));
    suggestionsBox.appendChild(row);
  });

  const customRow = document.createElement("div");
  customRow.className = "suggestion-custom";
  customRow.innerHTML = `➕ افزودن «<b>${rawQuery.trim()}</b>» به‌عنوان مورد جدید`;
  customRow.addEventListener("click", () => openCustomAdd(rawQuery.trim()));
  suggestionsBox.appendChild(customRow);

  suggestionsBox.classList.remove("hidden");
}

async function addItem(product, estimatedPrice) {
  suggestionsBox.classList.add("hidden");
  searchInput.value = "";

  const payload = {
    household_id: state.profile.household_id,
    product_id: product.isCustom ? product.id : null,
    custom_name: product.name,
    brand: product.brand || null,
    package_size: product.size || null,
    unit: product.unit || "عدد",
    category: product.category || "سایر",
    quantity: 1,
    estimated_price: estimatedPrice,
    added_by: state.user.id,
  };
  const { error } = await sb.from("shopping_items").insert(payload);
  if (error) { toast("خطا در افزودن"); return; }
  toast(`«${product.name}» اضافه شد`);
}

// ---- افزودن مورد کاملاً سفارشی (خارج از کاتالوگ) ----
function openCustomAdd(name) {
  suggestionsBox.classList.add("hidden");
  document.getElementById("custom-add-name").textContent = name || "مورد جدید";
  document.getElementById("custom-add-price").value = "";
  document.getElementById("custom-add-modal").dataset.name = name;
  show("custom-add-modal");
}
document.getElementById("custom-add-cancel").addEventListener("click", () => hide("custom-add-modal"));
document.getElementById("custom-add-confirm").addEventListener("click", async () => {
  const modal = document.getElementById("custom-add-modal");
  const name = modal.dataset.name;
  const price = Number(document.getElementById("custom-add-price").value) || 0;
  hide("custom-add-modal");
  searchInput.value = "";

  const { data: prod, error: prodErr } = await sb
    .from("products")
    .insert({ name, household_id: state.profile.household_id, base_price: price, category: "سایر", unit: "عدد" })
    .select()
    .single();

  if (prodErr) { toast("خطا در ذخیره محصول"); return; }
  state.customProducts.push(prod);

  await sb.from("shopping_items").insert({
    household_id: state.profile.household_id,
    product_id: prod.id,
    custom_name: name,
    unit: "عدد",
    category: "سایر",
    quantity: 1,
    estimated_price: price,
    added_by: state.user.id,
  });
  toast(`«${name}» اضافه شد`);
});

// ============================================================
// دسته‌بندی‌ها
// ============================================================
function renderCategoryChips() {
  const row = document.getElementById("chip-row");
  row.innerHTML = "";
  const all = ["همه", ...CATEGORIES.map((c) => c.name)];
  all.forEach((cat) => {
    const color = cat === "همه" ? "green" : categoryColor(cat);
    const chip = document.createElement("button");
    chip.className = "chip" + (state.activeCategory === cat ? " active" : "");
    chip.style.background = `var(--${color}-soft, var(--green-soft))`;
    chip.style.color = `var(--${color}-deep, var(--green-deep))`;
    chip.textContent = cat;
    chip.addEventListener("click", () => {
      state.activeCategory = cat;
      renderCategoryChips();
      renderAll();
    });
    row.appendChild(chip);
  });
}

// ============================================================
// رندر لیست‌ها
// ============================================================
function renderAll() {
  renderSummary();
  renderActiveList();
  renderHistoryList();
}

function renderSummary() {
  const active = state.items.filter((i) => !i.is_purchased);
  const total = active.reduce((sum, i) => sum + (Number(i.estimated_price) || 0) * (Number(i.quantity) || 1), 0);
  document.getElementById("summary-amount").textContent = formatToman(total);
  document.getElementById("summary-count").textContent = `${active.length} قلم باقی‌مانده`;
}

function memberInitial(id) {
  const m = state.members[id];
  return m && m.full_name ? m.full_name.trim()[0] : "؟";
}

function renderActiveList() {
  const wrap = document.getElementById("active-list");
  wrap.innerHTML = "";
  let items = state.items.filter((i) => !i.is_purchased);
  if (state.activeCategory !== "همه") items = items.filter((i) => i.category === state.activeCategory);

  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="emoji">🛒</div>
      <p>لیست خالیه. از نوار بالا شروع کن به تایپ کردن<br>و از پیشنهادها انتخاب کن.</p></div>`;
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item-card";
    el.innerHTML = `
      <div class="toggle" data-id="${item.id}"></div>
      <span class="item-cat-dot" style="background:var(--${categoryColor(item.category)})"></span>
      <div class="item-body">
        <div class="item-name-row">
          <span class="item-name">${item.custom_name}</span>
        </div>
        <div class="item-sub">
          <span>${[item.brand, item.package_size].filter(Boolean).join(" · ")}</span>
          <span class="avatar-chip" style="background:var(--${avatarColorFor(item.added_by)})" title="اضافه شده توسط">${memberInitial(item.added_by)}</span>
        </div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" data-act="minus" data-id="${item.id}">−</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn" data-act="plus" data-id="${item.id}">+</button>
      </div>
      <div class="item-price">${formatToman(item.estimated_price * item.quantity)}</div>
      <button class="item-remove" data-id="${item.id}">✕</button>
    `;
    wrap.appendChild(el);
  });

  wrap.querySelectorAll(".toggle").forEach((t) => t.addEventListener("click", () => openPurchaseModal(t.dataset.id)));
  wrap.querySelectorAll(".qty-btn").forEach((b) => b.addEventListener("click", () => changeQty(b.dataset.id, b.dataset.act)));
  wrap.querySelectorAll(".item-remove").forEach((b) => b.addEventListener("click", () => removeItem(b.dataset.id)));
}

function renderHistoryList() {
  const wrap = document.getElementById("history-list");
  wrap.innerHTML = "";
  const items = state.items
    .filter((i) => i.is_purchased)
    .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));

  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="emoji">🧾</div>
      <p>هنوز چیزی خریداری‌شده ثبت نشده.</p></div>`;
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "history-item";
    el.innerHTML = `
      <div class="toggle checked" data-id="${item.id}"></div>
      <div class="item-body">
        <div class="item-name">${item.custom_name}</div>
        <div class="history-date">${formatDate(item.purchased_at)} ·
          <span class="avatar-chip" style="display:inline-flex;background:var(--${avatarColorFor(item.purchased_by)});vertical-align:middle;" title="خریداری‌شده توسط">${memberInitial(item.purchased_by)}</span>
        </div>
      </div>
      <div class="item-price">${formatToman(item.actual_price ?? item.estimated_price)}</div>
    `;
    wrap.appendChild(el);
  });

  wrap.querySelectorAll(".toggle").forEach((t) => t.addEventListener("click", () => unpurchaseItem(t.dataset.id)));
}

// ============================================================
// عملیات آیتم‌ها
// ============================================================
async function changeQty(id, act) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  const newQty = Math.max(1, Number(item.quantity) + (act === "plus" ? 1 : -1));
  item.quantity = newQty; // خوش‌بینانه رندر کن
  renderActiveList(); renderSummary();
  await sb.from("shopping_items").update({ quantity: newQty }).eq("id", id);
}

async function removeItem(id) {
  state.items = state.items.filter((i) => i.id !== id);
  renderAll();
  await sb.from("shopping_items").delete().eq("id", id);
}

let purchaseTargetId = null;
function openPurchaseModal(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  purchaseTargetId = id;
  document.getElementById("purchase-item-name").textContent = item.custom_name;
  document.getElementById("purchase-price-input").value = Math.round(item.estimated_price * item.quantity);
  show("purchase-modal");
}
document.getElementById("purchase-skip").addEventListener("click", () => confirmPurchase(false));
document.getElementById("purchase-confirm").addEventListener("click", () => confirmPurchase(true));

async function confirmPurchase(withPrice) {
  const id = purchaseTargetId;
  hide("purchase-modal");
  if (!id) return;
  const item = state.items.find((i) => i.id === id);
  if (!item) return;

  let actualTotal = item.estimated_price * item.quantity;
  if (withPrice) {
    const v = Number(document.getElementById("purchase-price-input").value);
    if (v > 0) actualTotal = v;
  }
  const actualUnit = actualTotal / (item.quantity || 1);

  item.is_purchased = true;
  item.purchased_at = new Date().toISOString();
  item.purchased_by = state.user.id;
  item.actual_price = actualUnit;
  renderAll();

  await sb.from("shopping_items").update({
    is_purchased: true, purchased_at: item.purchased_at,
    purchased_by: state.user.id, actual_price: actualUnit,
  }).eq("id", id);

  if (withPrice) {
    const key = itemKey(item.custom_name, item.brand, item.package_size);
    await sb.from("price_history").insert({
      household_id: state.profile.household_id, item_key: key, price: actualUnit,
    });
    if (!state.priceHistory[key]) state.priceHistory[key] = [];
    state.priceHistory[key].push(actualUnit);
  }
  purchaseTargetId = null;
}

async function unpurchaseItem(id) {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  item.is_purchased = false;
  item.purchased_at = null;
  item.purchased_by = null;
  renderAll();
  await sb.from("shopping_items").update({
    is_purchased: false, purchased_at: null, purchased_by: null,
  }).eq("id", id);
}

// ============================================================
// تب‌ها
// ============================================================
document.getElementById("tab-list").addEventListener("click", () => switchTab("list"));
document.getElementById("tab-history").addEventListener("click", () => switchTab("history"));
function switchTab(tab) {
  state.activeTab = tab;
  document.getElementById("tab-list").classList.toggle("active", tab === "list");
  document.getElementById("tab-history").classList.toggle("active", tab === "history");
  document.getElementById("active-list").classList.toggle("hidden", tab !== "list");
  document.getElementById("chip-row").classList.toggle("hidden", tab !== "list");
  document.getElementById("history-list").classList.toggle("hidden", tab !== "history");
}

// ============================================================
// شروع برنامه
// ============================================================
initAuth();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
