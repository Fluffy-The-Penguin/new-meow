(function () {
  var themeKey = "meow-bot-theme";
  var themeToggle = document.getElementById("themeToggle");
  var menuToggle = document.getElementById("menuToggle");
  var nav = document.getElementById("siteNav");
  var themeChannel = null;
  try {
    themeChannel = "BroadcastChannel" in window ? new BroadcastChannel("meow-bot-theme") : null;
  } catch (_) {}

  function normalizeTheme(theme) {
    return ["light", "dark", "pure-dark"].indexOf(theme) === -1 ? "dark" : theme;
  }

  function nextTheme(theme) {
    var currentTheme = normalizeTheme(theme);
    if (currentTheme === "light") return "dark";
    if (currentTheme === "dark") return "pure-dark";
    return "light";
  }

  function themeLabel(theme) {
    var next = nextTheme(theme);
    return next === "pure-dark" ? "Pure dark" : next.charAt(0).toUpperCase() + next.slice(1);
  }

  function setTheme(theme, options) {
    var config = options || {};
    var nextTheme = normalizeTheme(theme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (localStorage.getItem(themeKey) !== nextTheme) localStorage.setItem(themeKey, nextTheme);
    if (themeToggle) themeToggle.textContent = themeLabel(nextTheme);
    if (config.broadcast !== false && themeChannel) themeChannel.postMessage(nextTheme);
  }

  function syncStoredTheme() {
    setTheme(localStorage.getItem(themeKey), { broadcast: false });
  }

  setTheme(document.documentElement.getAttribute("data-theme"));
  if (themeToggle) themeToggle.addEventListener("click", function () {
    setTheme(nextTheme(document.documentElement.getAttribute("data-theme")));
  });
  window.addEventListener("storage", function (event) {
    if (event.key === themeKey) setTheme(event.newValue, { broadcast: false });
  });
  if (themeChannel) themeChannel.addEventListener("message", function (event) {
    setTheme(event.data, { broadcast: false });
  });
  window.addEventListener("focus", syncStoredTheme);
  window.addEventListener("pageshow", syncStoredTheme);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) syncStoredTheme();
  });
  if (menuToggle && nav) menuToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  function endpointList(pathname) {
    var endpoints = [];
    function add(url) { if (url && endpoints.indexOf(url) === -1) endpoints.push(url); }
    if (window.MEOW_STATS_API_BASE) add(String(window.MEOW_STATS_API_BASE).replace(/\/$/, "") + pathname);
    if (window.location.protocol !== "file:") add(window.location.origin.replace(/\/$/, "") + pathname);
    if (window.location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) add("http://127.0.0.1:3001" + pathname);
    return endpoints;
  }

  async function fetchFirstJson(pathname) {
    var endpoints = endpointList(pathname);
    for (var i = 0; i < endpoints.length; i += 1) {
      try {
        var response = await fetch(endpoints[i], { headers: { "Accept": "application/json" } });
        if (!response.ok) continue;
        return await response.json();
      } catch (_) {}
    }
    return null;
  }

  function applyLinks(appLinks) {
    if (!appLinks || typeof appLinks !== "object") return;
    document.querySelectorAll("[data-app-link]").forEach(function (element) {
      var key = element.getAttribute("data-app-link");
      if (key && appLinks[key]) element.setAttribute("href", String(appLinks[key]));
    });
  }

  async function hydrateLinks() {
    var data = await fetchFirstJson("/api/links?t=" + Date.now());
    if (data) applyLinks(data.appLinks || data.links);
  }

  hydrateLinks();
}());
