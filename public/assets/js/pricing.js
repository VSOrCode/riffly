/* Riffly — pricing / subscription page */
(function () {
  "use strict";

  var root = document.getElementById("pricing-root");
  var E = Riffly.escapeHtml;
  var params = new URLSearchParams(location.search);
  var interval = params.get("interval") === "year" ? "year" : "month";

  var PLANS = [
    {
      key: "basic", name: "Basic", monthly: 799, yearly: 7900,
      blurb: "For casual browsers who check in now and then.",
      features: ["Free standard shipping on every order", "Basic member badge on your account"]
    },
    {
      key: "plus", name: "Plus", monthly: 1999, yearly: 19900,
      blurb: "For regulars who don't want to miss a good pull.",
      features: ["Everything in Basic", "10% off every purchase", "Priority email support"]
    },
    {
      key: "pro", name: "Pro", monthly: 9999, yearly: 99900,
      blurb: "For serious resellers and collectors.",
      features: ["Everything in Plus", "20% off every purchase", "Free local delivery — no pickup required", "Pro badge on your account"]
    }
  ];

  var pending = false;

  Riffly.loadAuth(true).then(function (auth) {
    render(auth);
    var autoPlan = params.get("plan");
    if (params.get("auto") === "1" && auth.user && autoPlan) {
      subscribe(autoPlan, interval);
    }
  });

  function render(auth) {
    var current = auth.plan ? auth.plan.plan : null;

    root.innerHTML =
      '<div class="pricing-msg" id="pricing-msg" hidden></div>' +
      '<div class="pricing-toggle">' +
        '<button class="toggle-btn' + (interval === "month" ? " is-active" : "") + '" data-interval="month">Monthly</button>' +
        '<button class="toggle-btn' + (interval === "year" ? " is-active" : "") + '" data-interval="year">Yearly <span class="toggle-save">2 months free</span></button>' +
      '</div>' +
      '<div class="pricing-grid">' +
        PLANS.map(function (p) { return planCard(p, auth, current); }).join("") +
      '</div>';

    Array.prototype.forEach.call(root.querySelectorAll("[data-interval]"), function (b) {
      b.addEventListener("click", function () {
        interval = b.getAttribute("data-interval");
        var u = new URLSearchParams(location.search);
        u.set("interval", interval); u.delete("auto"); u.delete("plan");
        history.replaceState(null, "", "?" + u.toString());
        render(auth);
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-subscribe]"), function (b) {
      b.addEventListener("click", function () { subscribe(b.getAttribute("data-subscribe"), interval); });
    });
    var portalBtn = root.querySelector("[data-portal]");
    if (portalBtn) portalBtn.addEventListener("click", openPortal);
  }

  function planCard(p, auth, current) {
    var price = interval === "year" ? p.yearly : p.monthly;
    var per = interval === "year" ? "/year" : "/month";
    var isCurrent = current === p.key;

    var cta;
    if (isCurrent) {
      cta = '<button class="btn btn--ghost btn--block" data-portal>Manage subscription</button>';
    } else if (current) {
      cta = '<button class="btn btn--primary btn--block" data-subscribe="' + p.key + '">Switch to ' + E(p.name) + '</button>';
    } else {
      cta = '<button class="btn btn--primary btn--block" data-subscribe="' + p.key + '">Subscribe</button>';
    }

    return (
      '<article class="plan-card' + (isCurrent ? " is-current" : "") + '">' +
        (isCurrent ? '<div class="plan-card__badge">Your plan</div>' : "") +
        '<h3>' + E(p.name) + '</h3>' +
        '<p class="plan-card__blurb">' + E(p.blurb) + '</p>' +
        '<div class="plan-card__price">' + Riffly.money(price) + '<span>' + per + '</span></div>' +
        '<ul class="plan-card__features">' +
          p.features.map(function (f) { return '<li>' + E(f) + '</li>'; }).join("") +
        '</ul>' +
        cta +
      '</article>'
    );
  }

  function showMsg(text, kind) {
    var el = root.querySelector("#pricing-msg");
    if (!el) return;
    el.className = "pricing-msg form-note form-note--" + (kind || "error");
    el.textContent = text;
    el.hidden = false;
  }

  function subscribe(plan, interval) {
    if (pending) return;
    if (!Riffly.auth.user) {
      window.location.href = "/signin.html?next=" + encodeURIComponent("subscribe:" + plan + ":" + interval);
      return;
    }
    pending = true;
    Riffly.api("/api/billing/create-session.php", { method: "POST", body: { plan: plan, interval: interval } })
      .then(function (res) {
        pending = false;
        if (res.data && res.data.url) { window.location.href = res.data.url; return; }
        var d = res.data || {};
        if (d.code === "not_configured" || d.code === "plan_not_configured" || d.code === "library_missing") {
          showMsg("Subscriptions aren't switched on yet — this is a demo build. Once Stripe is fully configured, this button goes straight to secure checkout.", "info");
        } else if (d.code === "already_subscribed") {
          showMsg("You're already on this plan.", "info");
        } else {
          showMsg(d.error || "Could not start checkout. Please try again.", "error");
        }
      })
      .catch(function () {
        pending = false;
        showMsg("Could not reach the server. Please try again.", "error");
      });
  }

  function openPortal() {
    if (pending) return;
    pending = true;
    Riffly.api("/api/billing/portal.php", { method: "POST" }).then(function (res) {
      pending = false;
      if (res.data && res.data.url) { window.location.href = res.data.url; return; }
      var d = res.data || {};
      showMsg(d.error || "Could not open the billing portal. Please try again.", "error");
    }).catch(function () {
      pending = false;
      showMsg("Could not reach the server. Please try again.", "error");
    });
  }
})();
