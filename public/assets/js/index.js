/* Riffly — storefront home: category filter, sort, product grid */
(function () {
  "use strict";

  var grid = document.getElementById("grid");
  var pills = document.getElementById("pills");
  var sortSel = document.getElementById("sort");
  var countEl = document.getElementById("result-count");
  var E = Riffly.escapeHtml;

  var state = { category: "All", sort: "newest" };
  var params = new URLSearchParams(location.search);
  if (params.get("category")) state.category = params.get("category");

  Riffly.loadCatalog()
    .then(function (data) {
      buildPills(data.categories || []);
      if (sortSel) {
        sortSel.value = state.sort;
        sortSel.addEventListener("change", function () { state.sort = sortSel.value; render(); });
      }
      render();
    })
    .catch(function (err) {
      grid.innerHTML = '<p class="grid-empty">The catalog failed to load. ' +
        E(err.message || "") + ' <br><a href="/index.html">Try again</a></p>';
      if (countEl) countEl.textContent = "";
    });

  function buildPills(categories) {
    var cats = ["All"].concat(categories);
    pills.innerHTML = cats.map(function (c) {
      return '<button class="pill" data-cat="' + E(c) + '" aria-pressed="' +
        (c === state.category ? "true" : "false") + '">' + E(c) + "</button>";
    }).join("");
    pills.addEventListener("click", function (e) {
      var b = e.target.closest(".pill");
      if (!b) return;
      state.category = b.getAttribute("data-cat");
      Array.prototype.forEach.call(pills.children, function (p) {
        p.setAttribute("aria-pressed", p === b ? "true" : "false");
      });
      syncUrl();
      render();
    });
  }

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.category !== "All") p.set("category", state.category);
    var qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }

  function currentProducts() {
    var list = (Riffly.catalog.products || []).slice();
    if (state.category !== "All") {
      list = list.filter(function (p) { return p.category === state.category; });
    }
    var avail = list.filter(function (p) { return Riffly.isAvailable(p); });
    var sold = list.filter(function (p) { return !Riffly.isAvailable(p); });

    var cmp = ({
      "newest": function (a, b) { return String(b.addedAt || "").localeCompare(String(a.addedAt || "")); },
      "price-asc": function (a, b) { return (a.price || 0) - (b.price || 0); },
      "price-desc": function (a, b) { return (b.price || 0) - (a.price || 0); }
    })[state.sort];

    if (cmp) { avail.sort(cmp); sold.sort(cmp); }
    return avail.concat(sold);
  }

  function render() {
    var list = currentProducts();
    if (countEl) countEl.textContent = list.length === 1 ? "1 item" : list.length + " items";
    grid.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : '<p class="grid-empty">Nothing in this category right now &mdash; new units get listed most weeks.</p>';
  }

  function cardHtml(p) {
    var sold = !Riffly.isAvailable(p);
    var inCart = Riffly.inCart(p.id);
    var cta = sold
      ? '<button class="btn btn--ghost btn--block card__cta" disabled>Sold</button>'
      : '<div class="card__cta card__cta--row">' +
          '<button class="btn btn--primary btn--sm" data-buy="' + p.id + '">Buy now</button>' +
          '<button class="btn btn--ghost btn--sm' + (inCart ? " is-added" : "") + '" data-add="' + p.id + '">' +
            (inCart ? "In cart ✓" : "Add") + "</button>" +
        "</div>";

    return (
      '<article class="card' + (sold ? " is-sold" : "") + '">' +
        (sold ? '<div class="ribbon">Sold</div>' : "") +
        '<div class="card__media">' +
          '<img src="' + Riffly.productImage(p, 0) + '" alt="' + E(p.name) + '" loading="lazy">' +
          (sold ? "" : '<a class="card__link" href="/item.html?id=' + p.id + '" aria-label="' + E(p.name) + '"></a>') +
        "</div>" +
        '<div class="card__body">' +
          '<span class="card__eyebrow">' + E(p.category) + "</span>" +
          '<h3 class="card__title"><a href="/item.html?id=' + p.id + '">' + E(p.name) + "</a></h3>" +
          '<div class="card__spacer"></div>' +
          '<div class="card__row">' +
            '<span class="card__price">' + Riffly.money(p.price) + "</span>" +
            '<span class="badge ' + Riffly.conditionClass(p.condition) + '">' + E(p.condition) + "</span>" +
          "</div>" +
          '<span class="card__ship">' +
            (p.pickupOnly ? "Local pickup only" : "+ " + Riffly.money(p.shipping) + " shipping") +
          "</span>" +
          cta +
        "</div>" +
      "</article>"
    );
  }

  grid.addEventListener("click", function (e) {
    var buy = e.target.closest("[data-buy]");
    if (buy) { Riffly.buyNow(buy.getAttribute("data-buy")); return; }
    var add = e.target.closest("[data-add]");
    if (add) {
      if (Riffly.inCart(add.getAttribute("data-add"))) Riffly.openCart();
      else Riffly.addToCart(add.getAttribute("data-add"));
    }
  });

  document.addEventListener("riffly:cartchange", function () {
    Array.prototype.forEach.call(grid.querySelectorAll("[data-add]"), function (b) {
      var inc = Riffly.inCart(b.getAttribute("data-add"));
      b.classList.toggle("is-added", inc);
      b.textContent = inc ? "In cart ✓" : "Add";
    });
  });
})();
