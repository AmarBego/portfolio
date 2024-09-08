import { translations } from './i18n.js';

export function translate(key, lang) {
    const keys = key.split('.');
    let value = translations[lang];
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return key; 
        }
    }
    return value || key;
}

export function getLanguage() {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('language') || 'en';
    }
    return 'en';
}

export function setLanguage(lang) {
    if (typeof window !== 'undefined') {
        document.documentElement.lang = lang;
        localStorage.setItem('language', lang);
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }
}

export function updatePageContent(lang) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = translate(key, lang);
    });
}

export function setupClientTranslation() {
    const langEN = document.getElementById('lang-en');
    const langDE = document.getElementById('lang-de');

    function setLanguageAndUpdate(lang) {
        setLanguage(lang);
        updatePageContent(lang);
        if (langEN && langDE) {
            langEN.classList.toggle('active', lang === 'en');
            langDE.classList.toggle('active', lang === 'de');
        }
    }

    if (langEN && langDE) {
        langEN.addEventListener('click', () => setLanguageAndUpdate('en'));
        langDE.addEventListener('click', () => setLanguageAndUpdate('de'));
    }

    document.addEventListener('languageChanged', (event) => {
        updatePageContent(event.detail.language);
    });

    // Initial update
    const initialLang = getLanguage();
    setLanguageAndUpdate(initialLang);
}