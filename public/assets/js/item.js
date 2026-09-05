/* Riffly — single item page */
(function () {
  "use strict";

  var root = document.getElementById("item-root");
  var id = new URLSearchParams(location.search).get("id");
  var E = Riffly.escapeHtml;

  Riffly.loadCatalog()
    .then(function () {
      var p = Riffly.productById(id);
      if (!p) { renderNotFound(); return; }
      render(p);
    })
    .catch(function () {
      root.innerHTML = '<div class="wrap"><p class="grid-empty">Could not load this item. <a href="/index.html">Back to the shop</a></p></div>';
    });

  function renderNotFound() {
    document.title = "Item not found — Riffly";
    root.innerHTML =
      '<div class="wrap"><div class="notice-page"><div class="notice-page__inner">' +
        '<h1>We couldn&rsquo;t find that item</h1>' +
        "<p>It may have sold and come down off the shelf. Take a look at what&rsquo;s in stock now.</p>" +
        '<a class="btn btn--primary" href="/index.html">Browse the finds</a>' +
      "</div></div></div>";
  }

  function render(p) {
    var sold = !Riffly.isAvailable(p);
    document.title = p.name + " — Riffly";
    setMeta("description", String(p.description || "").slice(0, 155));

    var variants = [0, 1, 2];
    var specs = [
      ["Condition", p.condition],
      ["Category", p.category],
      p.dimensions ? ["Dimensions", p.dimensions] : null,
      p.weight ? ["Weight", p.weight] : null,
      ["Item ID", "RIF-" + p.id],
      p.pickupOnly
        ? ["Fulfilment", "Local pickup only (" + (Riffly.catalog.pickupLocation || "local") + ")"]
        : ["Shipping", Riffly.money(p.shipping) + " flat rate"]
    ].filter(Boolean);

    root.innerHTML =
      '<div class="wrap">' +
        '<nav class="crumbs" aria-label="Breadcrumb">' +
          '<a href="/index.html">Shop</a><span aria-hidden="true">/</span>' +
          '<a href="/index.html?category=' + encodeURIComponent(p.category) + '">' + E(p.category) + "</a>" +
          '<span aria-hidden="true">/</span><span>' + E(p.name) + "</span>" +
        "</nav>" +

        '<div class="item">' +
          '<div class="gallery">' +
            '<div class="gallery__main"><img id="gallery-main" src="' + Riffly.productImage(p, 0) + '" alt="' + E(p.name) + '"></div>' +
            '<div class="gallery__thumbs" id="thumbs">' +
              variants.map(function (v, i) {
                return '<button class="gallery__thumb" data-variant="' + v + '" aria-current="' + (i === 0 ? "true" : "false") +
                  '" aria-label="View ' + (i + 1) + '"><img src="' + Riffly.productImage(p, v) + '" alt=""></button>';
              }).join("") +
            "</div>" +
          "</div>" +

          '<div class="item__info">' +
            '<span class="item__eyebrow">' + E(p.category) + "</span>" +
            '<h1 class="item__title">' + E(p.name) + "</h1>" +
            '<div class="item__price-row">' +
              '<span class="item__price">' + Riffly.money(p.price) + "</span>" +
              '<span class="badge ' + Riffly.conditionClass(p.condition) + '">' + E(p.condition) + "</span>" +
              (sold ? '<span class="badge">Sold</span>' : "") +
            "</div>" +

            '<p class="secure-note">' +
              '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' +
              "Secure checkout &mdash; payment handled by Stripe" +
            "</p>" +

            '<p class="item__desc">' + E(p.description) + "</p>" +

            '<div class="item__cond">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" style="flex:none;color:var(--pine)"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>' +
              "<span><strong>Condition notes.</strong> " + E(p.conditionNote || "See photos.") + "</span>" +
            "</div>" +

            '<div class="item__cta-row">' +
              (sold
                ? '<button class="btn btn--ghost" disabled>This item has sold</button>'
                : '<button class="btn btn--primary" id="buy-btn" data-buy="' + p.id + '">Buy now</button>' +
                  '<button class="btn btn--ghost" id="add-btn" data-add="' + p.id + '">Add to cart</button>') +
            "</div>" +

            (p.lot
              ? '<span class="item__lot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>From ' + E(p.lot) + "</span>"
              : "") +

            '<dl class="spec-list">' +
              specs.map(function (s) {
                return "<div><dt>" + E(s[0]) + "</dt><dd>" + E(s[1]) + "</dd></div>";
              }).join("") +
            "</dl>" +

            '<p class="fineprint">Sold as described and photographed as-is. Because these are one-of-a-kind secondhand goods, sales are final unless an item arrives materially different from its listing. Questions first? Email hello@riffly.com.</p>' +
          "</div>" +
        "</div>" +

        moreFinds(p) +
      "</div>";

    var main = document.getElementById("gallery-main");
    var thumbs = document.getElementById("thumbs");
    thumbs.addEventListener("click", function (e) {
      var b = e.target.closest(".gallery__thumb");
      if (!b) return;
      main.src = Riffly.productImage(p, Number(b.getAttribute("data-variant")));
      Array.prototype.forEach.call(thumbs.children, function (t) {
        t.setAttribute("aria-current", t === b ? "true" : "false");
      });
    });

    var buyBtn = document.getElementById("buy-btn");
    if (buyBtn) buyBtn.addEventListener("click", function () { Riffly.buyNow(p.id); });

    var addBtn = document.getElementById("add-btn");
    if (addBtn) {
      var sync = function () {
        var inc = Riffly.inCart(p.id);
        addBtn.classList.toggle("is-added", inc);
        addBtn.textContent = inc ? "In cart ✓ — view" : "Add to cart";
      };
      sync();
      addBtn.addEventListener("click", function () {
        if (Riffly.inCart(p.id)) Riffly.openCart();
        else Riffly.addToCart(p.id);
      });
      document.addEventListener("riffly:cartchange", sync);
    }
  }

  function moreFinds(current) {
    var others = (Riffly.catalog.products || []).filter(function (p) {
      return p.id !== current.id && Riffly.isAvailable(p);
    });
    for (var i = others.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = others[i]; others[i] = others[j]; others[j] = t;
    }
    others = others.slice(0, 3);
    if (!others.length) return "";

    return (
      '<section class="section" style="border-top:1px solid var(--line);margin-top:1rem">' +
        '<div class="section__head"><h2>More finds</h2></div>' +
        '<div class="grid">' +
          others.map(function (p) {
            return (
              '<article class="card">' +
                '<div class="card__media">' +
                  '<img src="' + Riffly.productImage(p, 0) + '" alt="' + E(p.name) + '" loading="lazy">' +
                  '<a class="card__link" href="/item.html?id=' + p.id + '" aria-label="' + E(p.name) + '"></a>' +
                "</div>" +
                '<div class="card__body">' +
                  '<span class="card__eyebrow">' + E(p.category) + "</span>" +
                  '<h3 class="card__title"><a href="/item.html?id=' + p.id + '">' + E(p.name) + "</a></h3>" +
                  '<div class="card__spacer"></div>' +
                  '<div class="card__row">' +
                    '<span class="card__price">' + Riffly.money(p.price) + "</span>" +
                    '<span class="badge ' + Riffly.conditionClass(p.condition) + '">' + E(p.condition) + "</span>" +
                  "</div>" +
                "</div>" +
              "</article>"
            );
          }).join("") +
        "</div>" +
      "</section>"
    );
  }

  function setMeta(name, content) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", name); document.head.appendChild(m); }
    m.setAttribute("content", content);
  }
})();
