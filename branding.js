(function(global) {
    global.SharedSupabase = Object.freeze({
        url: 'https://akgnwipwauwdvmfpfttv.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZ253aXB3YXV3ZHZtZnBmdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzI5MDYsImV4cCI6MjEwNjcwODkwNn0.As2LL92UeHKRlVU7QQWj0xDzH92bJ3Doc6y6Gz8JE5k'
    });

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
        return {
            title: source.title || DEFAULT_BRANDING.title,
            subtitle: source.subtitle ?? DEFAULT_BRANDING.subtitle,
            color: source.color || DEFAULT_BRANDING.color,
            textColor: source.textColor || source.text_color || DEFAULT_BRANDING.textColor,
            logoUrl: source.logoUrl ?? source.logo_url ?? '',
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

    function dataUrlFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Could not read the branding image.'));
            reader.readAsDataURL(blob);
        });
    }

    async function loadLogoDataUrl(branding) {
        if (!branding.logoUrl) return '';
        if (branding.logoUrl.startsWith('data:image/')) return branding.logoUrl;
        try {
            const response = await fetch(branding.logoUrl);
            if (!response.ok) throw new Error('Logo request failed: ' + response.status);
            return await dataUrlFromBlob(await response.blob());
        } catch (error) {
            console.warn('Could not load shared branding logo for PDF output:', error);
            return '';
        }
    }

    async function load(client, fallback) {
        let branding = readLocalBranding(fallback);
        if (client) {
            try {
                const { data, error } = await client.from('app_branding')
                    .select('id, title, subtitle, color, text_color, logo_url, footer_text')
                    .eq('id', 'default')
                    .maybeSingle();
                if (error) throw error;
                if (data) branding = normalizeBranding(data);
            } catch (error) {
                console.warn('Could not load shared Supabase branding; using this device cache:', error.message || error);
            }
        }
        branding.logoDataUrl = await loadLogoDataUrl(branding);
        const { logoDataUrl, ...cachedBranding } = branding;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedBranding)); } catch (error) {}
        return branding;
    }

    async function uploadLogo(client, dataUrl) {
        if (!client) throw new Error('Connect to Supabase before saving a shared logo.');
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error('Could not prepare the branding logo for upload.');
        const blob = await response.blob();
        const contentType = blob.type || 'image/png';
        const extension = contentType === 'image/jpeg' ? 'jpg' : 'png';
        const objectPath = 'default/company-logo.' + extension;
        const { error } = await client.storage.from('branding-assets').upload(objectPath, blob, {
            contentType,
            upsert: true
        });
        if (error) throw error;
        const { data } = client.storage.from('branding-assets').getPublicUrl(objectPath);
        if (!data || !data.publicUrl) throw new Error('Supabase did not return the uploaded logo URL.');
        const separator = data.publicUrl.includes('?') ? '&' : '?';
        return data.publicUrl + separator + 'v=' + Date.now();
    }

    async function save(client, value) {
        if (!client) throw new Error('Connect to Supabase to share branding across devices.');
        const branding = normalizeBranding(value);
        const row = {
            id: 'default',
            title: branding.title,
            subtitle: branding.subtitle,
            color: branding.color,
            text_color: branding.textColor,
            logo_url: branding.logoUrl,
            footer_text: branding.footerText,
            updated_at: new Date().toISOString()
        };
        const { error } = await client.from('app_branding').upsert(row, { onConflict: 'id' });
        if (error) throw error;
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
        save,
        uploadLogo
    };
})(window);