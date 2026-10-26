(function(global) {
    const STORAGE_KEY = 'tw_branding';
    const DEFAULT_BRANDING = {
        title: 'Temporary Works UK',
        subtitle: 'BS 5975 & CDM 2015 Compliance System',
        color: '#075E54',
        textColor: '#ffffff',
        logoUrl: '',
        footerText: 'Official Inspection Certificate.'
    };

    function normalizeBranding(value) {
        const source = value || {};
        const logoUrl = source.logoUrl ?? source.logo_url ?? '';
        return {
            title: source.title || DEFAULT_BRANDING.title,
            subtitle: source.subtitle ?? DEFAULT_BRANDING.subtitle,
            color: source.color || DEFAULT_BRANDING.color,
            textColor: source.textColor || source.text_color || DEFAULT_BRANDING.textColor,
            logoUrl: typeof logoUrl === 'string' && logoUrl.startsWith('data:image/') ? logoUrl : '',
            footerText: source.footerText ?? source.footer_text ?? DEFAULT_BRANDING.footerText
        };
    }

    function readLocalBranding(fallback) {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            return normalizeBranding(saved || fallback || DEFAULT_BRANDING);
        } catch (error) {
            return normalizeBranding(fallback || DEFAULT_BRANDING);
        }
    }

    async function loadLogoDataUrl(branding) {
        return branding.logoUrl || '';
    }

    async function load(fallback) {
        const branding = readLocalBranding(fallback);
        branding.logoDataUrl = await loadLogoDataUrl(branding);
        const { logoDataUrl, ...cachedBranding } = branding;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedBranding)); } catch (error) {}
        return branding;
    }

    async function save(value) {
        const branding = normalizeBranding(value);
        branding.logoDataUrl = await loadLogoDataUrl(branding);
        const { logoDataUrl, ...cachedBranding } = branding;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedBranding));
        return branding;
    }

    global.SharedBranding = {
        defaults: DEFAULT_BRANDING,
        normalize: normalizeBranding,
        readLocal: readLocalBranding,
        load,
        save
    };
})(window);