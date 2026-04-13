/**
 * Shared primary image resolution for main hero, lists, and article detail.
 * Loads before script.js / nw-article-render.js. Uses globals at call time:
 * NW_PUBLIC_UPLOAD_ORIGIN, NW_CONFIG_API_ORIGIN, ADS_API, ARTICLES_API, NW_SUPABASE_URL.
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

    function resolveArticleListThumb(src) {
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

    function extractFirstImgSrcFromHtml(html) {
        if (html == null || html === '') return '';
        var m = String(html).match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
        return m && m[1] ? m[1].trim() : '';
    }

    /**
     * Canonical primary image URL (after resolveArticleListThumb).
     * Priority: hero_image → heroImage → thumbnails → image_url → image1… → first <img> in body fields.
     */
    function resolveArticlePrimaryImage(article) {
        if (!article || typeof article !== 'object') return '';
        var keyOrder = [
            'hero_image',
            'heroImage',
            'heroImageUrl',
            'hero_image_url',
            'thumbnail_url',
            'thumbnailUrl',
            'image_url',
            'imageUrl',
            'image1',
            'image2',
            'image3',
            'image4',
            'thumb',
        ];
        var k, v, r;
        for (k = 0; k < keyOrder.length; k++) {
            v = article[keyOrder[k]];
            if (v == null || String(v).trim() === '') continue;
            r = resolveArticleListThumb(v);
            if (r) return r;
        }
        var bodyKeys = ['content', 'body', 'html', 'content1', 'content2', 'content3', 'content4'];
        for (var b = 0; b < bodyKeys.length; b++) {
            var src = extractFirstImgSrcFromHtml(article[bodyKeys[b]]);
            if (src) {
                r = resolveArticleListThumb(src);
                if (r) return r;
            }
        }
        return '';
    }

    var g = typeof window !== 'undefined' ? window : this;
    g.resolveArticleListThumb = resolveArticleListThumb;
    g.extractFirstImgSrcFromHtml = extractFirstImgSrcFromHtml;
    g.resolveArticlePrimaryImage = resolveArticlePrimaryImage;
})();
