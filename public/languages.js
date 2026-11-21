(() => {
 const supported = ['en', 'de', 'es'];
 const select = document.getElementById('language-select');
 // Static hosting canonicalizes /de.html and /es.html to /de and /es.
 const pageLanguage = document.documentElement.lang;
 const labels = {en:'Language',de:'Sprache',es:'Idioma'};
 let catalogue;
 function updateCountdown(lang) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const remaining = Math.round((Date.UTC(2027,4,29) - Date.UTC(Number(date.year), Number(date.month)-1, Number(date.day))) / 86400000);
  const number = document.getElementById('countdown-number');
  const label = document.getElementById('countdown-label');
  number.textContent = remaining > 0 ? new Intl.NumberFormat(lang).format(remaining) : '';
  const keys = [110, 111, 112, 113];
  label.textContent = catalogue[lang][remaining > 1 ? keys[0] : remaining === 1 ? keys[1] : remaining === 0 ? keys[2] : keys[3]];
 }
 function savedLanguage() { try { return localStorage.getItem('wedding-language'); } catch { return null; } }
 function apply(language, updateUrl) {
  const lang = supported.includes(language) ? language : 'en';
  const pathLanguage = pageLanguage;
  if (lang !== pathLanguage) {
   const target = new URL(location.href);
   target.pathname = lang === 'en' ? '/' : '/' + lang;
   target.searchParams.set('lang', lang);
   location.href = target.href;
   return;
  }
  document.querySelectorAll('[data-i18n]').forEach(element => {
   element.textContent = catalogue[lang][Number(element.dataset.i18n)];
  });
  document.querySelectorAll('[data-i18n-alt]').forEach(element => { element.alt = catalogue[lang][Number(element.dataset.i18nAlt)]; });
  document.documentElement.lang = lang;
  document.title = ({en:'Our Wedding',de:'Unsere Hochzeit',es:'Nuestra boda'})[lang] + ' · Bad Gastein';
  document.querySelector('nav').setAttribute('aria-label',({en:'Main navigation',de:'Hauptnavigation',es:'Navegación principal'})[lang]);
  document.getElementById('language-label').textContent = labels[lang];
  select.value = lang;
  updateCountdown(lang);
  try { localStorage.setItem('wedding-language', lang); } catch {}
  if (updateUrl) {
   const url = new URL(location.href); url.searchParams.set('lang',lang);
   history.replaceState(null,'',url);
  }
 }
 fetch('/translations.json').then(response => {if(!response.ok) throw new Error('Unable to load translations'); return response.json();}).then(data => {
  catalogue = data;
  setInterval(() => updateCountdown(document.documentElement.lang), 60000);
  const requested = new URL(location.href).searchParams.get('lang');
  // Render the loaded page without redirecting during initialization.
  // A language change is an explicit navigation from the selector.
  apply(pageLanguage, false);
  select.addEventListener('change', () => apply(select.value, true));
  window.addEventListener('popstate', () => apply(new URL(location.href).searchParams.get('lang') || 'en', false));
 }).catch(() => { select.disabled = true; });
})();
