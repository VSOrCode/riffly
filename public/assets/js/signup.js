/* Riffly — create account page */
(function () {
  "use strict";

  var root = document.getElementById("signup-root");
  var E = Riffly.escapeHtml;
  var params = new URLSearchParams(location.search);
  var next = params.get("next") || "";
  var errorMsg = params.get("error") || "";
  var recaptchaWidgetId = null;

  function continueTarget() { return Riffly.resumeUrl(next); }
  function switchQs() { return next ? "?next=" + encodeURIComponent(next) : ""; }

  Riffly.loadAuth(true).then(function (auth) {
    if (auth.user) { window.location.replace(continueTarget()); return; }
    render(auth);
  });

  function render(auth) {
    document.title = "Create your account — Riffly";
    var googleBtn = auth.googleEnabled
      ? '<a class="btn btn--google btn--block" href="/api/auth/google-start.php' + (next ? "?next=" + encodeURIComponent(next) : "") + '">' +
          googleIcon() + "Continue with Google</a>" +
        '<div class="auth-or"><span>or</span></div>'
      : "";

    root.innerHTML =
      '<div class="auth-card">' +
        "<h1>Create your account</h1>" +
        (next ? '<p class="auth-sub">You need an account to check out.</p>' : "") +
        (errorMsg ? '<div class="form-note form-note--error">' + E(errorMsg) + "</div>" : "") +
        googleBtn +
        '<form id="signup-form" class="auth-form" novalidate>' +
          '<label class="field"><span>Username</span>' +
            '<input name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required>' +
            '<small class="field__hint" data-uname-hint></small></label>' +
          '<label class="field"><span>Email</span>' +
            '<input name="email" type="email" autocomplete="email" required></label>' +
          '<label class="field"><span>Password</span>' +
            '<input name="password" type="password" autocomplete="new-password" minlength="8" required>' +
            '<small class="field__hint">At least 8 characters.</small></label>' +
          (auth.recaptchaSiteKey ? '<div class="field recaptcha-field" id="recaptcha-slot"></div>' : "") +
          '<div class="form-note form-note--error" data-form-error hidden></div>' +
          '<button class="btn btn--primary btn--block" type="submit">Create account</button>' +
        "</form>" +
        '<p class="auth-switch">Already have an account? <a href="/signin.html' + switchQs() + '">Sign in</a></p>' +
      "</div>";

    var form = root.querySelector("#signup-form");
    wireUsernameCheck(form.querySelector('[name="username"]'), form.querySelector("[data-uname-hint]"));
    if (auth.recaptchaSiteKey) wireRecaptcha(auth.recaptchaSiteKey);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (auth.recaptchaSiteKey && !recaptchaToken()) {
        showFormError(form, "Please complete the reCAPTCHA check.");
        return;
      }
      var btn = form.querySelector("button[type=submit]");
      hideFormError(form);
      setBusy(btn, "One moment…");
      Riffly.api("/api/auth/signup.php", {
        method: "POST",
        body: {
          username: form.username.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value,
          recaptchaToken: recaptchaToken()
        }
      }).then(function (res) {
        if (res.ok && res.data && res.data.user) {
          Riffly.setAuthFromResponse(res.data);
          window.location.href = continueTarget();
          return;
        }
        unBusy(btn, "Create account");
        showFormError(form, (res.data && res.data.error) || "Something went wrong. Please try again.");
        resetRecaptcha();
      }).catch(function () {
        unBusy(btn, "Create account");
        showFormError(form, "Could not reach the server. Please try again.");
        resetRecaptcha();
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

  /* ---------------- reCAPTCHA (v2 checkbox / invisible) ---------------- */
  function loadRecaptchaScript(cb) {
    if (window.grecaptcha && window.grecaptcha.render) { window.grecaptcha.ready(cb); return; }
    var existing = document.getElementById("recaptcha-api-script");
    if (existing) {
      var iv = setInterval(function () {
        if (window.grecaptcha && window.grecaptcha.ready) { clearInterval(iv); window.grecaptcha.ready(cb); }
      }, 100);
      return;
    }
    var s = document.createElement("script");
    s.id = "recaptcha-api-script";
    s.src = "https://www.google.com/recaptcha/api.js";
    s.async = true;
    s.defer = true;
    s.addEventListener("load", function () {
      if (window.grecaptcha && window.grecaptcha.ready) window.grecaptcha.ready(cb);
      else cb();
    }, { once: true });
    document.head.appendChild(s);
  }
  function wireRecaptcha(siteKey) {
    var slot = document.getElementById("recaptcha-slot");
    if (!slot) return;
    loadRecaptchaScript(function () {
      try {
        recaptchaWidgetId = window.grecaptcha.render(slot, { sitekey: siteKey });
      } catch (e) {
        slot.innerHTML = '<p class="form-note form-note--info">Could not load the human-check widget. Refresh the page to try again.</p>';
      }
    });
  }
  function recaptchaToken() {
    try { return (window.grecaptcha && recaptchaWidgetId !== null) ? window.grecaptcha.getResponse(recaptchaWidgetId) : ""; }
    catch (e) { return ""; }
  }
  function resetRecaptcha() {
    try { if (window.grecaptcha && recaptchaWidgetId !== null) window.grecaptcha.reset(recaptchaWidgetId); } catch (e) {}
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
