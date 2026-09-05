/* Riffly — account page: login, signup, choose-username */
(function () {
  "use strict";

  var root = document.getElementById("account-root");
  var E = Riffly.escapeHtml;
  var params = new URLSearchParams(location.search);
  var next = params.get("next") || "";
  var wantSignup = params.get("mode") === "signup";
  var setupUsername = params.get("setup") === "username";
  var errorMsg = params.get("error") || "";

  var nextField = next ? '<input type="hidden" name="next" value="' + E(next) + '">' : "";

  Riffly.loadAuth(true).then(function (auth) {
    if (auth.user && (auth.user.pendingUsername || setupUsername)) return renderChooseUsername(auth);
    if (auth.user) return renderSignedIn(auth);
    return renderAuthForms(auth);
  });

  function continueTarget() {
    return Riffly.resumeUrl(next);
  }

  function banner(msg, kind) {
    return msg ? '<div class="form-note form-note--' + (kind || "error") + '">' + E(msg) + "</div>" : "";
  }

  /* ---------------- signed in ---------------- */
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

  /* ---------------- choose username (new Google users) ---------------- */
  function renderChooseUsername() {
    document.title = "Choose a username — Riffly";
    root.innerHTML =
      '<div class="auth-card">' +
        "<h1>Pick a username</h1>" +
        '<p class="auth-sub">This is how you&rsquo;ll show up on Riffly. You can change it later.</p>' +
        banner(errorMsg) +
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
      setBusy(btn, "Saving…");
      Riffly.api("/api/auth/set-username.php", { method: "POST", body: { username: username } }).then(function (res) {
        if (res.ok && res.data && res.data.user) {
          Riffly.setAuthFromResponse(res.data);
          window.location.href = continueTarget();
        } else {
          unBusy(btn, "Save and continue");
          showFormError(root.querySelector("#uname-form"), (res.data && res.data.error) || "Could not save that username.");
        }
      });
    });
  }

  /* ---------------- login + signup ---------------- */
  function renderAuthForms(auth) {
    document.title = (wantSignup ? "Create your account" : "Sign in") + " — Riffly";
    var googleBtn = auth.googleEnabled
      ? '<a class="btn btn--google btn--block" href="/api/auth/google-start.php' + (next ? "?next=" + encodeURIComponent(next) : "") + '">' +
          googleIcon() + "Continue with Google</a>" +
        '<div class="auth-or"><span>or</span></div>'
      : "";

    root.innerHTML =
      '<div class="auth-card">' +
        '<div class="auth-tabs" role="tablist">' +
          '<button class="auth-tab" data-tab="login" role="tab">Sign in</button>' +
          '<button class="auth-tab" data-tab="signup" role="tab">Sign up</button>' +
        "</div>" +
        (next ? '<p class="auth-sub">You need an account to check out.</p>' : "") +
        banner(errorMsg) +
        googleBtn +

        '<form id="login-form" class="auth-form" novalidate>' +
          '<label class="field"><span>Username or email</span>' +
            '<input name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>' +
          '<label class="field"><span>Password</span>' +
            '<input name="password" type="password" autocomplete="current-password" required></label>' +
          '<div class="form-note form-note--error" data-form-error hidden></div>' +
          '<button class="btn btn--primary btn--block" type="submit">Sign in</button>' +
        "</form>" +

        '<form id="signup-form" class="auth-form" novalidate hidden>' +
          '<label class="field"><span>Username</span>' +
            '<input name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required>' +
            '<small class="field__hint" data-uname-hint></small></label>' +
          '<label class="field"><span>Email</span>' +
            '<input name="email" type="email" autocomplete="email" required></label>' +
          '<label class="field"><span>Password</span>' +
            '<input name="password" type="password" autocomplete="new-password" minlength="8" required>' +
            '<small class="field__hint">At least 8 characters.</small></label>' +
          '<div class="form-note form-note--error" data-form-error hidden></div>' +
          '<button class="btn btn--primary btn--block" type="submit">Create account</button>' +
        "</form>" +
      "</div>";

    var tabs = root.querySelectorAll(".auth-tab");
    var loginForm = root.querySelector("#login-form");
    var signupForm = root.querySelector("#signup-form");

    function select(which) {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", t.getAttribute("data-tab") === which ? "true" : "false"); });
      loginForm.hidden = which !== "login";
      signupForm.hidden = which !== "signup";
    }
    tabs.forEach(function (t) { t.addEventListener("click", function () { select(t.getAttribute("data-tab")); }); });
    select(wantSignup ? "signup" : "login");

    wireUsernameCheck(signupForm.querySelector('[name="username"]'), signupForm.querySelector("[data-uname-hint]"));

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      submit(loginForm, "/api/auth/login.php", "Sign in", {
        username: loginForm.username.value.trim(),
        password: loginForm.password.value
      });
    });
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      submit(signupForm, "/api/auth/signup.php", "Create account", {
        username: signupForm.username.value.trim(),
        email: signupForm.email.value.trim(),
        password: signupForm.password.value
      });
    });
  }

  function submit(form, url, label, body) {
    var btn = form.querySelector("button[type=submit]");
    hideFormError(form);
    setBusy(btn, "One moment…");
    Riffly.api(url, { method: "POST", body: body }).then(function (res) {
      if (res.ok && res.data && res.data.user) {
        Riffly.setAuthFromResponse(res.data);
        if (res.data.user.pendingUsername) { window.location.href = "/account.html?setup=username" + (next ? "&next=" + encodeURIComponent(next) : ""); return; }
        window.location.href = continueTarget();
        return;
      }
      unBusy(btn, label);
      showFormError(form, (res.data && res.data.error) || "Something went wrong. Please try again.");
    }).catch(function () {
      unBusy(btn, label);
      showFormError(form, "Could not reach the server. Please try again.");
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

  /* ---------------- helpers ---------------- */
  function setBusy(btn, text) { btn.dataset.label = btn.textContent; btn.textContent = text; btn.setAttribute("aria-disabled", "true"); }
  function unBusy(btn, text) { btn.textContent = text; btn.removeAttribute("aria-disabled"); }
  function showFormError(form, msg) {
    var el = form.querySelector("[data-form-error]");
    if (el) { el.textContent = msg; el.hidden = false; }
  }
  function hideFormError(form) {
    var el = form.querySelector("[data-form-error]");
    if (el) { el.hidden = true; el.textContent = ""; }
  }
  function googleIcon() {
    return '<svg viewBox="0 0 18 18" width="17" height="17" aria-hidden="true">' +
      '<path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/>' +
      '<path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.3c-.8.5-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.8v2.4A9 9 0 0 0 9 18z"/>' +
      '<path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V4.9H.8a9 9 0 0 0 0 8.1l3.1-2.3z"/>' +
      '<path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .8 4.9l3.1 2.4C4.6 5.1 6.6 3.6 9 3.6z"/>' +
      "</svg>";
  }
})();
