const siteTheme = window.MunetiosUI.theme;
const themeToggle = document.querySelector('.dark-mode-toggle');
const themeIcon = themeToggle.querySelector('.mu-icon');

function syncTheme(activeTheme) {
  const dark = activeTheme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeIcon.textContent = dark ? 'light_mode' : 'dark_mode';
}

try {
  const legacyTheme = localStorage.getItem('darkMode');
  if (legacyTheme === 'true' || legacyTheme === 'false') {
    siteTheme.set(legacyTheme === 'true' ? 'dark' : 'light');
  }
} catch {}

syncTheme(document.documentElement.dataset.muTheme);
document.addEventListener('mu-theme', (event) => syncTheme(event.detail.theme));

themeToggle.addEventListener('click', () => {
  const dark = document.documentElement.dataset.muTheme !== 'dark';
  siteTheme.set(dark ? 'dark' : 'light');
  try { localStorage.setItem('darkMode', String(dark)); } catch {}
});

const menuToggle = document.querySelector('.menu-toggle');
const siteMenu = document.getElementById('siteMenu');
const siteHeader = menuToggle.closest('.site-header');

function setMenuOpen(open) {
  siteMenu.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.querySelector('.mu-icon').textContent = open ? 'close' : 'menu';
}

menuToggle.addEventListener('click', () => setMenuOpen(siteMenu.hidden));
document.addEventListener('click', (event) => {
  if (!siteMenu.hidden && (!siteHeader.contains(event.target) || event.target.closest('#siteMenu a'))) {
    setMenuOpen(false);
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !siteMenu.hidden) {
    setMenuOpen(false);
    menuToggle.focus();
  }
});
window.matchMedia('(min-width: 900px)').addEventListener('change', () => setMenuOpen(false));
