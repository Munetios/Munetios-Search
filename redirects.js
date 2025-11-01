// redirects.js — Munetios Router + Smart Redirect System 💜

const routes = {
  "/": "pages/home.html",
  "/index": "pages/home.html",
  "/search": "pages/search.html",
  "/maze": "pages/maze.html",
  "/about": "pages/about.html"
};

// Auto redirect rules (from .html to clean routes)
const htmlRedirects = {
  "/index.html": "/",
  "/search.html": "/search",
  "/maze.html": "/maze",
  "/about.html": "/about"
};

// 🔁 Auto redirect if current path ends with .html
function checkHtmlRedirect() {
  const path = location.pathname.toLowerCase();
  if (htmlRedirects[path]) {
    history.replaceState(null, null, htmlRedirects[path]);
  }
}

async function loadRoute(path) {
  const app = document.getElementById("app");
  const cleanPath = path.replace(/\/$/, ""); // remove trailing slash
  const target = routes[cleanPath] || "pages/404.html";

  try {
    const res = await fetch(target);
    if (!res.ok) throw new Error("Page not found");
    const html = await res.text();
    app.innerHTML = html;
    document.title = `Munetios — ${cleanPath === "/" ? "Home" : cleanPath.slice(1).toUpperCase()}`;
  } catch {
    app.innerHTML = `<h2>404 Not Found</h2><p>This page doesn’t exist. <a href="/" data-link>Return home</a>.</p>`;
  }

  window.scrollTo(0, 0);
}

// Navigation system
function navigateTo(url) {
  history.pushState(null, null, url);
  loadRoute(url);
}

// Handle link clicks
document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-link]");
  if (link) {
    e.preventDefault();
    navigateTo(link.getAttribute("href"));
  }
});

// Handle browser back/forward
window.addEventListener("popstate", () => loadRoute(location.pathname));

// Initial load
window.addEventListener("DOMContentLoaded", () => {
  const app = document.createElement("main");
  app.id = "app";
  document.body.appendChild(app);
  checkHtmlRedirect(); // check for .html URLs first
  loadRoute(location.pathname);
});
