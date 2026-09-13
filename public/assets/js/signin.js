/* Riffly — sign in page */
(function () {
  "use strict";

  var root = document.getElementById("signin-root");
  var E = Riffly.escapeHtml;
  var params = new URLSearchParams(location.search);
  var next = params.get("next") || "";
  var errorMsg = params.get("error") || "";

  function continueTarget() { return Riffly.resumeUrl(next); }
  function switchQs() { return next ? "?next=" + encodeURIComponent(next) : ""; }

  Riffly.loadAuth(true).then(function (auth) {
    if (auth.user) { window.location.replace(continueTarget()); return; }
    render(auth);
  });

  function render(auth) {
    document.title = "Sign in — Riffly";
    var googleBtn = auth.googleEnabled
      ? '<a class="btn btn--google btn--block" href="/api/auth/google-start.php' + (next ? "?next=" + encodeURIComponent(next) : "") + '">' +
          googleIcon() + "Continue with Google</a>" +
        '<div class="auth-or"><span>or</span></div>'
      : "";

    root.innerHTML =
      '<div class="auth-card">' +
        "<h1>Sign in</h1>" +
        (next ? '<p class="auth-sub">You need an account to check out.</p>' : "") +
        (errorMsg ? '<div class="form-note form-note--error">' + E(errorMsg) + "</div>" : "") +
        googleBtn +
        '<form id="login-form" class="auth-form" novalidate>' +
          '<label class="field"><span>Username or email</span>' +
            '<input name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>' +
          '<label class="field"><span>Password</span>' +
            '<input name="password" type="password" autocomplete="current-password" required></label>' +
          '<div class="form-note form-note--error" data-form-error hidden></div>' +
          '<button class="btn btn--primary btn--block" type="submit">Sign in</button>' +
        "</form>" +
        '<p class="auth-switch">New here? <a href="/signup.html' + switchQs() + '">Create an account</a></p>' +
      "</div>";

    var form = root.querySelector("#login-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      hideFormError(form);
      setBusy(btn, "One moment…");
      Riffly.api("/api/auth/login.php", {
        method: "POST",
        body: { username: form.username.value.trim(), password: form.password.value }
      }).then(function (res) {
        if (res.ok && res.data && res.data.user) {
          Riffly.setAuthFromResponse(res.data);
          window.location.href = continueTarget();
          return;
        }
        unBusy(btn, "Sign in");
        showFormError(form, (res.data && res.data.error) || "Something went wrong. Please try again.");
      }).catch(function () {
        unBusy(btn, "Sign in");
        showFormError(form, "Could not reach the server. Please try again.");
      });
    });
  }

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
