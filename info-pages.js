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

menuToggle.addEventListener('click', () => {
  const open = siteMenu.hidden;
  setMenuOpen(open);
  if (open) siteMenu.querySelector('a').focus();
});
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

const mailTranslations = {
  es: {
    mailTitle: 'Conoce Munetios Mail',
    mailDescription: 'Obtén una dirección @munetios.com, un buzón de 20 GB y herramientas para escribir y organizar correos.',
    mailCompose: 'Escribe en texto enriquecido o HTML, o usa el editor visual de correos.',
    mailOrganize: 'Organiza los mensajes con carpetas, etiquetas y reglas.',
    mailPrivacy: 'Las imágenes externas se bloquean de forma predeterminada para reducir el rastreo.',
    openMail: 'Abrir correo',
  },
  fr: {
    mailTitle: 'Découvrez Munetios Mail',
    mailDescription: 'Obtenez une adresse @munetios.com, une boîte de 20 Go et des outils pour rédiger et organiser vos e-mails.',
    mailCompose: 'Rédigez en texte enrichi ou en HTML, ou utilisez l’éditeur visuel.',
    mailOrganize: 'Organisez vos messages avec des dossiers, des libellés et des règles.',
    mailPrivacy: 'Les images distantes sont bloquées par défaut pour limiter le suivi.',
    openMail: 'Ouvrir la messagerie',
  },
  de: {
    mailTitle: 'Lerne Munetios Mail kennen',
    mailDescription: 'Hol dir eine @munetios.com-Adresse, ein Postfach mit 20 GB und Werkzeuge zum Schreiben und Organisieren von E-Mails.',
    mailCompose: 'Schreibe im Rich-Text- oder HTML-Format oder nutze den visuellen E-Mail-Editor.',
    mailOrganize: 'Ordne Nachrichten mit Ordnern, Labels und Regeln.',
    mailPrivacy: 'Externe Bilder werden standardmäßig blockiert, um Tracking zu begrenzen.',
    openMail: 'Postfach öffnen',
  },
  pt: {
    mailTitle: 'Conheça o Munetios Mail',
    mailDescription: 'Tenha um endereço @munetios.com, uma caixa de 20 GB e ferramentas para escrever e organizar e-mails.',
    mailCompose: 'Escreva em texto formatado ou HTML, ou use o editor visual de e-mails.',
    mailOrganize: 'Organize as mensagens com pastas, marcadores e regras.',
    mailPrivacy: 'As imagens externas são bloqueadas por padrão para limitar o rastreamento.',
    openMail: 'Abrir e-mail',
  },
};

let mailLanguage = 'en';
try {
  mailLanguage = localStorage.getItem('munetiosLanguage') || 'en';
} catch {}

if (Object.hasOwn(mailTranslations, mailLanguage)) {
  const translations = mailTranslations[mailLanguage];
  document.querySelectorAll('[data-info-i18n]').forEach((element) => {
    element.textContent = translations[element.dataset.infoI18n];
    element.lang = mailLanguage;
  });
}
