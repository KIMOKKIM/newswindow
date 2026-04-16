/**
 * Shared primary image resolution for main hero, lists, cards, and article detail.
 * image1 is always the first choice; other fields only when image1 is missing/invalid.
 */
(function () {
    function thumbBaseChain() {
        var parts = [];
        try {
            if (typeof NW_PUBLIC_UPLOAD_ORIGIN !== 'undefined' && NW_PUBLIC_UPLOAD_ORIGIN) {
                parts.push(NW_PUBLIC_UPLOAD_ORIGIN);
            }
            if (typeof NW_CONFIG_API_ORIGIN !== 'undefined' && NW_CONFIG_API_ORIGIN) {
                parts.push(NW_CONFIG_API_ORIGIN);
            }
            if (typeof ADS_API !== 'undefined' && ADS_API) parts.push(ADS_API);
            if (typeof ARTICLES_API !== 'undefined' && ARTICLES_API) parts.push(ARTICLES_API);
        } catch (e) {}
        var s = parts[0] || '';
        return String(s).replace(/\/+$/, '');
    }

    function normalizeThumbString(src) {
        var v = String(src || '').trim();
        if (!v) return '';
        if (v.indexOf('data:') === 0) return v;
        if (v.indexOf('//') === 0) {
            var proto =
                typeof window !== 'undefined' && window.location && window.location.protocol
                    ? window.location.protocol
                    : 'https:';
            v = proto + v;
        }
        if (/^https?:\/\//i.test(v)) return v;
        if (/^[a-z0-9][-a-z0-9.]*\.supabase\.co\/storage\//i.test(v)) {
            return 'https://' + v.replace(/^\/+/, '');
        }
        var baseChain = thumbBaseChain();
        if (v.charAt(0) === '/') {
            if (v.indexOf('/uploads/') === 0) {
                return baseChain ? baseChain + v : v;
            }
            if (/^\/storage\/v1\//i.test(v) || /^\/object\/(public|sign)\//i.test(v)) {
                var sb = '';
                try {
                    if (typeof window !== 'undefined' && window.NW_SUPABASE_URL != null) {
                        sb = String(window.NW_SUPABASE_URL).trim().replace(/\/+$/, '');
                    }
                } catch (eSb) {}
                if (sb) return sb + v;
            }
            if (typeof window !== 'undefined' && window.location && window.location.origin) {
                return String(window.location.origin).replace(/\/+$/, '') + v;
            }
            return v;
        }
        if (/^uploads\//i.test(v)) {
            var p = '/' + v.replace(/^\/+/, '');
            return baseChain ? baseChain + p : p;
        }
        return v;
    }

    /**
     * Normalize a raw image URL string, or when given an article object, return the same URL as resolveArticlePrimaryImage(article).
     */
    function resolveArticleListThumb(srcOrArticle) {
        if (srcOrArticle != null && typeof srcOrArticle === 'object' && !Array.isArray(srcOrArticle)) {
            return resolveArticlePrimaryImage(srcOrArticle);
        }
        return normalizeThumbString(srcOrArticle);
    }

    function extractFirstImgSrcFromHtml(html) {
        if (html == null || html === '') return '';
        var m = String(html).match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
        return m && m[1] ? m[1].trim() : '';
    }

    function normalizedImage1(article) {
        if (!article || typeof article !== 'object') return '';
        // Prefer explicit canonical primaryImage (set by server) first,
        // then explicit coverImageKey selection (article.coverImageKey -> article[coverKey]),
        // then legacy image1.
        if (article.primaryImage != null && String(article.primaryImage).trim()) {
            return normalizeThumbString(article.primaryImage);
        }
        var coverKey = article.coverImageKey || article.cover_image_key;
        if (coverKey && typeof coverKey === 'string' && article[coverKey]) {
            var cv = article[coverKey];
            if (cv != null && String(cv).trim()) return normalizeThumbString(cv);
        }
        var v = article.image1;
        if (v == null || String(v).trim() === '') return '';
        return normalizeThumbString(v);
    }

    /**
     * Representative image: image1 first; then hero/thumb/url fields; then image2–4; then first <img> in body fields.
     */
    function resolveArticlePrimaryImage(article) {
        if (!article || typeof article !== 'object') return '';
        var r = normalizedImage1(article);
        if (r) return r;
        var keyOrder = [
            'primaryImage',
            'hero_image',
            'heroImage',
            'heroImageUrl',
            'hero_image_url',
            'thumbnail_url',
            'thumbnailUrl',
            'image_url',
            'imageUrl',
            'image2',
            'image3',
            'image4',
            'thumb',
        ];
        var k, v, t;
        for (k = 0; k < keyOrder.length; k++) {
            v = article[keyOrder[k]];
            if (v == null || String(v).trim() === '') continue;
            t = normalizeThumbString(v);
            if (t) return t;
        }
        var bodyKeys = ['content', 'body', 'html', 'content1', 'content2', 'content3', 'content4'];
        for (var b = 0; b < bodyKeys.length; b++) {
            var src = extractFirstImgSrcFromHtml(article[bodyKeys[b]]);
            if (src) {
                t = normalizeThumbString(src);
                if (t) return t;
            }
        }
        return '';
    }

    var g = typeof window !== 'undefined' ? window : this;
    g.resolveArticleListThumb = resolveArticleListThumb;
    g.extractFirstImgSrcFromHtml = extractFirstImgSrcFromHtml;
    g.resolveArticlePrimaryImage = resolveArticlePrimaryImage;
})();
