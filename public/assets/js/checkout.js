/* Riffly — checkout review page (login required) */
(function () {
  "use strict";

  var root = document.getElementById("checkout-root");
  var E = Riffly.escapeHtml;
  var buyId = new URLSearchParams(location.search).get("buy");

  Promise.all([Riffly.loadAuth(true), Riffly.loadCatalog().catch(function () { return null; })])
    .then(function (r) {
      var auth = r[0];
      if (!auth.user) {
        var next = buyId ? "buy:" + buyId : "checkout";
        window.location.replace("/account.html?next=" + encodeURIComponent(next));
        return;
      }
      if (!Riffly.catalog) return fail("We couldn't load the catalog. Please refresh.");
      render(auth.user);
    });

  function itemsForOrder() {
    var ids = buyId ? [String(buyId)] : Riffly.getCart();
    var seen = {}, out = [];
    ids.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = 1;
      var p = Riffly.productById(id);
      if (p && Riffly.isAvailable(p)) out.push(p);
    });
    return out;
  }

  function render(user) {
    var items = itemsForOrder();
    if (!items.length) {
      root.innerHTML =
        '<div class="wrap checkout"><div class="checkout__empty">' +
          "<h1>Nothing to check out</h1>" +
          "<p>" + (buyId ? "That item isn&rsquo;t available anymore." : "Your cart is empty.") + "</p>" +
          '<a class="btn btn--primary" href="/index.html">Browse the finds</a>' +
        "</div></div>";
      return;
    }

    var subtotal = 0, shipping = 0, anyShip = false, anyPickup = false;
    items.forEach(function (p) {
      subtotal += Number(p.price) || 0;
      if (p.pickupOnly) anyPickup = true;
      else { anyShip = true; shipping += Number(p.shipping) || 0; }
    });

    root.innerHTML =
      '<div class="wrap checkout">' +
        '<h1 class="checkout__title">Review your order</h1>' +
        '<p class="checkout__who">Signed in as <strong>' + E(user.username) + "</strong> &middot; " + E(user.email) +
          ' &middot; <a href="#" data-logout>not you?</a></p>' +

        '<div class="checkout__grid">' +
          '<div class="checkout__items">' +
            items.map(lineRow).join("") +
          "</div>" +

          '<aside class="checkout__summary">' +
            '<div class="sum-row"><span>Subtotal</span><span>' + Riffly.money(subtotal) + "</span></div>" +
            (anyShip
              ? '<div class="sum-row"><span>Shipping</span><span>' + (shipping > 0 ? Riffly.money(shipping) : "Calculated at checkout") + "</span></div>"
              : "") +
            (anyPickup ? '<div class="sum-row sum-row--muted"><span>Local pickup items</span><span>Free</span></div>' : "") +
            '<div class="sum-row sum-row--total"><span>Estimated total</span><span>' + Riffly.money(subtotal + shipping) + "</span></div>" +
            '<p class="sum-tax">Taxes, if any, are shown on the secure payment page.</p>' +

            '<div class="form-note form-note--error" data-err hidden></div>' +

            '<button class="btn btn--primary btn--block" id="pay-btn">' +
              '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> ' +
              "Pay securely with Stripe</button>" +
            '<p class="sum-fine">You&rsquo;ll enter payment details on Stripe&rsquo;s secure page. Riffly never sees your card.</p>' +
            '<a class="checkout__back" href="/index.html">&larr; Keep shopping</a>' +
          "</aside>" +
        "</div>" +
      "</div>";

    root.querySelector("#pay-btn").addEventListener("click", pay);
  }

  function lineRow(p) {
    return (
      '<div class="co-item">' +
        '<a class="co-item__media" href="/item.html?id=' + p.id + '"><img src="' + Riffly.productImage(p, 0) + '" alt=""></a>' +
        '<div class="co-item__info">' +
          '<a class="co-item__name" href="/item.html?id=' + p.id + '">' + E(p.name) + "</a>" +
          '<div class="co-item__meta">' + E(p.category) + " &middot; " + E(p.condition) +
            (p.pickupOnly ? " &middot; local pickup" : " &middot; + " + Riffly.money(p.shipping) + " shipping") + "</div>" +
        "</div>" +
        '<div class="co-item__price">' + Riffly.money(p.price) + "</div>" +
      "</div>"
    );
  }

  function pay() {
    var btn = root.querySelector("#pay-btn");
    var errEl = root.querySelector("[data-err]");
    errEl.hidden = true;
    btn.setAttribute("aria-disabled", "true");
    var label = btn.innerHTML;
    btn.textContent = "Starting secure checkout…";

    var body = buyId ? { buy: String(buyId) } : { ids: Riffly.getCart() };

    Riffly.api("/api/create-checkout-session.php", { method: "POST", body: body }).then(function (res) {
      if (res.data && res.data.url) { window.location.href = res.data.url; return; }
      btn.removeAttribute("aria-disabled");
      btn.innerHTML = label;

      var d = res.data || {};
      if (d.code === "auth_required") { window.location.href = "/account.html?next=" + encodeURIComponent(buyId ? "buy:" + buyId : "checkout"); return; }
      if (d.code === "not_configured") {
        showErr(errEl, "Payments aren’t switched on yet — this is a demo build. Everything up to the payment step works. Once the Stripe keys are added on the server, this button goes straight to Stripe.");
        return;
      }
      if (d.code === "sold" || d.code === "gone") {
        showErr(errEl, d.error || "An item just became unavailable.");
        setTimeout(function () { location.reload(); }, 1800);
        return;
      }
      showErr(errEl, d.error || "We couldn’t start checkout (error " + res.status + "). Please try again.");
    }).catch(function () {
      btn.removeAttribute("aria-disabled");
      btn.innerHTML = label;
      showErr(errEl, "Could not reach the server. If you’re previewing locally without PHP, that’s expected.");
    });
  }

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }
  function fail(msg) {
    root.innerHTML = '<div class="wrap checkout"><div class="checkout__empty"><h1>Hmm.</h1><p>' + E(msg) + '</p><a class="btn btn--primary" href="/index.html">Back to the shop</a></div></div>';
  }
})();
