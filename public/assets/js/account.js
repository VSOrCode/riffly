/* Riffly — account dashboard: signed-in status + choose-username (new Google accounts) */
(function () {
  "use strict";

  var root = document.getElementById("account-root");
  var E = Riffly.escapeHtml;
  var params = new URLSearchParams(location.search);
  var next = params.get("next") || "";
  var setupUsername = params.get("setup") === "username";

  Riffly.loadAuth(true).then(function (auth) {
    if (!auth.user) {
      window.location.replace("/signin.html" + (next ? "?next=" + encodeURIComponent(next) : ""));
      return;
    }
    if (auth.user.pendingUsername || setupUsername) return renderChooseUsername();
    renderSignedIn(auth);
  });

  function continueTarget() { return Riffly.resumeUrl(next); }

  function renderSignedIn(auth) {
    var u = auth.user;
    document.title = "Your account — Riffly";
    root.innerHTML =
      '<div class="auth-card">' +
        "<h1>You&rsquo;re signed in</h1>" +
        '<p class="auth-sub">Signed in as <strong>' + E(u.username) + "</strong> &middot; " + E(u.email) + "</p>" +
        (next
          ? '<a class="btn btn--primary btn--block" href="' + E(continueTarget()) + '">Continue to checkout</a>'
          : '<a class="btn btn--primary btn--block" href="/index.html">Continue shopping</a>') +
        '<button class="btn btn--ghost btn--block" data-logout style="margin-top:.6rem">Sign out</button>' +
      "</div>";
  }

  function renderChooseUsername() {
    document.title = "Choose a username — Riffly";
    root.innerHTML =
      '<div class="auth-card">' +
        "<h1>Pick a username</h1>" +
        '<p class="auth-sub">This is how you&rsquo;ll show up on Riffly. You can change it later.</p>' +
        '<div class="form-note form-note--error" data-page-error hidden></div>' +
        '<form id="uname-form" novalidate>' +
          '<label class="field">' +
            "<span>Username</span>" +
            '<input name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required>' +
            '<small class="field__hint" data-uname-hint></small>' +
          "</label>" +
          '<button class="btn btn--primary btn--block" type="submit">Save and continue</button>' +
        "</form>" +
      "</div>";

    wireUsernameCheck(root.querySelector('[name="username"]'), root.querySelector("[data-uname-hint]"));
    root.querySelector("#uname-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = this.querySelector("button");
      var username = this.username.value.trim();
      var err = root.querySelector("[data-page-error]");
      err.hidden = true;
      setBusy(btn, "Saving…");
      Riffly.api("/api/auth/set-username.php", { method: "POST", body: { username: username } }).then(function (res) {
        if (res.ok && res.data && res.data.user) {
          Riffly.setAuthFromResponse(res.data);
          window.location.href = continueTarget();
        } else {
          unBusy(btn, "Save and continue");
          err.textContent = (res.data && res.data.error) || "Could not save that username.";
          err.hidden = false;
        }
      });
    });
  }

  /* ---------------- live username check ---------------- */
  function wireUsernameCheck(input, hint) {
    if (!input || !hint) return;
    var t = null, last = "";
    input.addEventListener("input", function () {
      var v = input.value.trim();
      input.classList.remove("is-ok", "is-bad");
      hint.textContent = "";
      if (t) clearTimeout(t);
      if (!v) return;
      t = setTimeout(function () {
        if (v === last) return;
        last = v;
        fetch("/api/auth/check-username.php?u=" + encodeURIComponent(v), { credentials: "same-origin" })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (input.value.trim() !== v) return;
            hint.textContent = d.message || "";
            input.classList.toggle("is-ok", !!d.available);
            input.classList.toggle("is-bad", !d.available);
            hint.classList.toggle("field__hint--ok", !!d.available);
            hint.classList.toggle("field__hint--bad", !d.available);
          }).catch(function () {});
      }, 350);
    });
  }

  function setBusy(btn, text) { btn.dataset.label = btn.textContent; btn.textContent = text; btn.setAttribute("aria-disabled", "true"); }
  function unBusy(btn, text) { btn.textContent = text; btn.removeAttribute("aria-disabled"); }
})();
