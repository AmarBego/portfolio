import { useState, useEffect } from 'react';
import { translate, getLanguage } from '../utils/translate.js';

export function useTranslation() {
    const [language, setLanguage] = useState(getLanguage());

    useEffect(() => {
        const handleLanguageChange = (event) => {
            setLanguage(event.detail.language);
        };

        document.addEventListener('languageChanged', handleLanguageChange);

        return () => {
            document.removeEventListener('languageChanged', handleLanguageChange);
        };
    }, []);

    const t = (key) => translate(key, language);

    return { t, language };
}