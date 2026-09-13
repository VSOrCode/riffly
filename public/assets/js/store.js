/* =========================================================================
   Riffly — shared storefront logic
   Loaded on every page BEFORE the page-specific script.
   Global: window.Riffly
   ========================================================================= */
(function () {
  "use strict";

  var CART_KEY = "riffly.cart.v1";
  var CATALOG_URL = "/assets/data/products.json";

  var Riffly = {
    config: { currency: "usd" },
    catalog: null,
    auth: { user: null, csrf: "", googleEnabled: false, loaded: false }
  };
  window.Riffly = Riffly;

  /* ---------------- formatting ---------------- */
  function money(cents, currency) {
    var code = (currency || Riffly.config.currency || "usd").toUpperCase();
    var value = (Number(cents) || 0) / 100;
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(value); }
    catch (e) { return "$" + value.toFixed(2); }
  }
  Riffly.money = money;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  Riffly.escapeHtml = escapeHtml;

  function conditionClass(cond) {
    return "badge--" + String(cond || "good").toLowerCase().replace(/[^a-z]+/g, "-");
  }
  Riffly.conditionClass = conditionClass;

  /* ---------------- API helper ---------------- */
  function api(path, opts) {
    opts = opts || {};
    var headers = { "Accept": "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.method && opts.method !== "GET") headers["X-CSRF-Token"] = Riffly.auth.csrf || "";
    return fetch(path, {
      method: opts.method || "GET",
      headers: headers,
      credentials: "same-origin",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) {}
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }
  Riffly.api = api;

  /* ---------------- auth ---------------- */
  var _authPromise = null;
  function loadAuth(force) {
    if (_authPromise && !force) return _authPromise;
    _authPromise = api("/api/auth/me.php").then(function (res) {
      var d = res.data || {};
      Riffly.auth = {
        user: d.user || null,
        csrf: d.csrf || "",
        googleEnabled: !!d.googleEnabled,
        recaptchaSiteKey: d.recaptchaSiteKey || null,
        loaded: true
      };
      renderAccount();
      return Riffly.auth;
    }).catch(function () {
      Riffly.auth.loaded = true;
      return Riffly.auth;
    });
    return _authPromise;
  }
  Riffly.loadAuth = loadAuth;

  Riffly.setAuthFromResponse = function (data) {
    if (!data) return;
    if (data.user !== undefined) Riffly.auth.user = data.user;
    if (data.csrf) Riffly.auth.csrf = data.csrf;
    renderAccount();
  };

  Riffly.logout = function () {
    return api("/api/auth/logout.php", { method: "POST" }).then(function () {
      return loadAuth(true);
    });
  };

  function resumeUrl(next) {
    if (next === "checkout") return "/checkout.html";
    if (next && next.indexOf("buy:") === 0) {
      var id = next.slice(4).replace(/[^A-Za-z0-9_-]/g, "");
      return id ? "/checkout.html?buy=" + encodeURIComponent(id) : "/checkout.html";
    }
    return "/index.html";
  }
  Riffly.resumeUrl = resumeUrl;

  function renderAccount() {
    var u = Riffly.auth.user;
    document.querySelectorAll("[data-acct-label]").forEach(function (el) {
      el.textContent = u ? u.username : "Log in";
      el.setAttribute("href", u ? "/account.html" : "/signin.html");
      el.classList.toggle("is-authed", !!u);
    });
  }

  /* ---------------- checkout entry points ---------------- */
  Riffly.goToCheckout = function () {
    window.location.href = Riffly.auth.user ? "/checkout.html" : "/signin.html?next=checkout";
  };
  Riffly.buyNow = function (id) {
    id = String(id);
    window.location.href = Riffly.auth.user
      ? "/checkout.html?buy=" + encodeURIComponent(id)
      : "/signin.html?next=buy:" + encodeURIComponent(id);
  };

  /* ---------------- catalog ---------------- */
  var _catalogPromise = null;
  function loadCatalog() {
    if (!_catalogPromise) {
      _catalogPromise = fetch(CATALOG_URL, { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("Could not load catalog (" + r.status + ")"); return r.json(); })
        .then(function (data) {
          (data.products || []).forEach(function (p) { p.id = String(p.id); });
          Riffly.catalog = data;
          return data;
        });
    }
    return _catalogPromise;
  }
  Riffly.loadCatalog = loadCatalog;

  function productById(id) {
    if (!Riffly.catalog) return null;
    id = String(id);
    var list = Riffly.catalog.products || [];
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === id) return list[i];
    return null;
  }
  Riffly.productById = productById;

  function isAvailable(p) { return p && (p.status || "available") === "available"; }
  Riffly.isAvailable = isAvailable;

  /* ---------------- placeholder images ---------------- */
  var CAT_HUE = {
    "Tools": 20, "Electronics": 205, "Furniture": 34, "Kitchen & Home": 150,
    "Media": 285, "Outdoors": 128, "Collectibles": 340, "Auto": 212, "Gaming": 258
  };
  function wrapText(text, max) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) {
      if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; }
      else { cur = (cur + " " + w).trim(); }
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function placeholderImage(product, variant) {
    variant = variant || 0;
    var hue = CAT_HUE[product.category] != null ? CAT_HUE[product.category] : 30;
    var bg = "hsl(" + hue + ",30%," + (93 - variant * 7) + "%)";
    var fg = "hsl(" + hue + ",38%,30%)";
    var lines = wrapText(product.name || "Item", 18).slice(0, 3);
    var startY = 300 - (lines.length - 1) * 24;
    var tspans = lines.map(function (ln, i) {
      return '<tspan x="400" y="' + (startY + i * 48) + '">' + escapeHtml(ln) + "</tspan>";
    }).join("");
    var cat = escapeHtml((product.category || "Riffly").toUpperCase());
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
        '<rect width="800" height="600" fill="' + bg + '"/>' +
        '<g fill="none" stroke="' + fg + '" stroke-opacity="0.22" stroke-width="2.5">' +
          '<path d="M312 200 l88 -40 88 40 v128 l-88 40 -88 -40 z"/>' +
          '<path d="M312 200 l88 40 88 -40 M400 240 v128"/>' +
        "</g>" +
        '<text font-family="Georgia,\'Times New Roman\',serif" font-size="40" fill="' + fg + '" text-anchor="middle">' + tspans + "</text>" +
        '<text x="400" y="' + (startY + lines.length * 48 + 20) + '" font-family="system-ui,sans-serif" font-size="17" letter-spacing="3.5" fill="' + fg + '" fill-opacity="0.75" text-anchor="middle">' + cat + "</text>" +
        '<text x="400" y="556" font-family="system-ui,sans-serif" font-size="13" fill="' + fg + '" fill-opacity="0.5" text-anchor="middle">photo coming soon</text>' +
      "</svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  Riffly.productImage = function (product, variant) {
    variant = variant || 0;
    if (product.images && product.images.length) return product.images[Math.min(variant, product.images.length - 1)];
    return placeholderImage(product, variant);
  };

  /* ---------------- cart ---------------- */
  function readCart() {
    try { var v = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(v) ? v.map(String) : []; }
    catch (e) { return []; }
  }
  function writeCart(ids) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(ids)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("riffly:cartchange", { detail: { ids: ids.slice() } }));
  }
  Riffly.getCart = readCart;
  Riffly.cartCount = function () { return readCart().length; };
  Riffly.inCart = function (id) { return readCart().indexOf(String(id)) !== -1; };
  Riffly.addToCart = function (id) {
    id = String(id);
    var ids = readCart();
    if (ids.indexOf(id) === -1) ids.push(id);
    writeCart(ids);
    openDrawer();
  };
  Riffly.removeFromCart = function (id) {
    writeCart(readCart().filter(function (x) { return x !== String(id); }));
  };
  Riffly.clearCart = function () { writeCart([]); };

  /* ---------------- drawer ---------------- */
  var drawerEl, lastFocus;

  var DRAWER_HTML =
    '<div class="drawer__scrim" data-cart-close></div>' +
    '<div class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="riffly-drawer-title">' +
      '<div class="drawer__head">' +
        '<h2 id="riffly-drawer-title">Your cart</h2>' +
        '<button class="drawer__close" data-cart-close aria-label="Close cart">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        "</button>" +
      "</div>" +
      '<div class="drawer__body" id="riffly-drawer-body"></div>' +
      '<div class="drawer__foot" id="riffly-drawer-foot" hidden>' +
        '<div class="drawer__msg" id="riffly-drawer-msg" role="status"></div>' +
        '<div class="drawer__row drawer__row--total"><span>Subtotal</span><span id="riffly-subtotal">$0.00</span></div>' +
        '<p class="drawer__note"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> Secure checkout by Stripe. Shipping calculated at checkout.</p>' +
        '<button class="btn btn--primary btn--block" id="riffly-checkout">Checkout</button>' +
      "</div>" +
    "</div>";

  function ensureDrawer() {
    if (drawerEl) return;
    drawerEl = document.createElement("div");
    drawerEl.className = "drawer";
    drawerEl.id = "riffly-drawer";
    drawerEl.innerHTML = DRAWER_HTML;
    document.body.appendChild(drawerEl);

    drawerEl.addEventListener("click", function (e) {
      if (e.target.closest("[data-cart-close]")) closeDrawer();
      var rm = e.target.closest("[data-remove]");
      if (rm) Riffly.removeFromCart(rm.getAttribute("data-remove"));
    });
    drawerEl.querySelector("#riffly-checkout").addEventListener("click", function () {
      Riffly.goToCheckout();
    });
    document.addEventListener("keydown", function (e) {
      if (!drawerEl.classList.contains("is-open")) return;
      if (e.key === "Escape") closeDrawer();
      if (e.key === "Tab") trapFocus(e);
    });
  }

  function trapFocus(e) {
    var f = drawerEl.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openDrawer() {
    ensureDrawer();
    renderDrawer();
    lastFocus = document.activeElement;
    drawerEl.classList.add("is-open");
    document.body.style.overflow = "hidden";
    var c = drawerEl.querySelector(".drawer__close");
    if (c) c.focus();
  }
  function closeDrawer() {
    if (!drawerEl) return;
    drawerEl.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  Riffly.openCart = openDrawer;
  Riffly.closeCart = closeDrawer;

  function showDrawerMsg(text) {
    ensureDrawer();
    var m = drawerEl.querySelector("#riffly-drawer-msg");
    m.textContent = text; m.classList.add("is-shown");
  }

  function renderDrawer() {
    ensureDrawer();
    var body = drawerEl.querySelector("#riffly-drawer-body");
    var foot = drawerEl.querySelector("#riffly-drawer-foot");

    function paint() {
      var ids = readCart(), known = [], dropped = 0, subtotal = 0;
      ids.forEach(function (id) {
        var p = productById(id);
        if (!p || !isAvailable(p)) { dropped++; return; }
        known.push(p); subtotal += Number(p.price) || 0;
      });
      if (dropped > 0) {
        writeCart(known.map(function (p) { return p.id; }));
        showDrawerMsg(dropped === 1
          ? "One item in your cart just sold and was removed."
          : dropped + " items were no longer available and were removed.");
      }
      if (!known.length) {
        body.innerHTML =
          '<div class="drawer__empty">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/></svg>' +
            "<p>Your cart is empty.</p></div>";
        foot.hidden = true;
        return;
      }
      body.innerHTML = known.map(function (p) {
        return (
          '<div class="line-item" data-id="' + p.id + '">' +
            '<a class="line-item__media" href="/item.html?id=' + p.id + '"><img src="' + Riffly.productImage(p, 0) + '" alt="" loading="lazy"></a>' +
            "<div>" +
              '<div class="line-item__name"><a href="/item.html?id=' + p.id + '">' + escapeHtml(p.name) + "</a></div>" +
              '<div class="line-item__meta">' + escapeHtml(p.category) + " &middot; " + escapeHtml(p.condition) +
                (p.pickupOnly ? " &middot; pickup only" : "") + "</div>" +
              '<button class="line-item__remove" data-remove="' + p.id + '">Remove</button>' +
            "</div>" +
            '<div class="line-item__price">' + money(p.price) + "</div>" +
          "</div>"
        );
      }).join("");
      drawerEl.querySelector("#riffly-subtotal").textContent = money(subtotal);
      foot.hidden = false;
    }

    if (Riffly.catalog) paint();
    else loadCatalog().then(paint).catch(function () {
      body.innerHTML = '<div class="drawer__empty"><p>Could not load your cart. Try refreshing.</p></div>';
      foot.hidden = true;
    });
  }
  Riffly.renderCart = renderDrawer;

  /* ---------------- header wiring ---------------- */
  function updateCount() {
    var n = readCart().length;
    document.querySelectorAll(".cart-btn__count").forEach(function (b) {
      b.textContent = n; b.setAttribute("data-count", n);
    });
  }

  function init() {
    ensureDrawer();
    updateCount();

    var yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-cart-open], .cart-btn")) { e.preventDefault(); openDrawer(); }
      var lo = e.target.closest("[data-logout]");
      if (lo) {
        e.preventDefault();
        Riffly.logout().then(function () { window.location.href = "/index.html"; });
      }
    });
    document.addEventListener("riffly:cartchange", function () {
      updateCount();
      if (drawerEl && drawerEl.classList.contains("is-open")) renderDrawer();
    });

    loadCatalog().catch(function () {});
    loadAuth().catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
