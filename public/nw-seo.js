/**
 * Shared SEO: canonical, meta, OG, JSON-LD. Uses shared/seo.json when available.
 */
(function (global) {
  var PROD_SITE = 'https://www.newswindow.kr';

  function nwIsProductionSiteHost() {
    try {
      var h = String(location.hostname || '').toLowerCase();
      return h === 'www.newswindow.kr' || h === 'newswindow.kr';
    } catch (e) {
      return false;
    }
  }

  function nwSeoSiteOrigin() {
    if (nwIsProductionSiteHost()) return PROD_SITE;
    try {
      return String(location.origin || '').replace(/\/+$/, '') || PROD_SITE;
    } catch (e) {
      return PROD_SITE;
    }
  }

  function nwSeoAbsUrl(pathOrFull) {
    var p = String(pathOrFull || '/');
    if (/^https?:\/\//i.test(p)) return p.replace(/\/+$/, '') === p ? p : p.replace(/\/+$/, '');
    if (!p.startsWith('/')) p = '/' + p;
    return nwSeoSiteOrigin().replace(/\/+$/, '') + p;
  }

  function setMeta(attr, key, val) {
    if (val == null || String(val) === '') return;
    var sel = attr === 'property' ? 'meta[property="' + key + '"]' : 'meta[name="' + key + '"]';
    var el = document.head.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      if (attr === 'property') el.setAttribute('property', key);
      else el.setAttribute('name', key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', String(val));
  }

  function setCanonical(href) {
    if (!href) return;
    var el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function injectJsonLdById(id, data) {
    var sid = id || 'nw-jsonld-dynamic';
    var el = document.getElementById(sid);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = sid;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  function fetchSeoJson(cb) {
    var url;
    try {
      url = new URL('shared/seo.json', location.href).href;
    } catch (e) {
      url = 'shared/seo.json';
    }
    fetch(url, { cache: 'force-cache' })
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      })
      .then(cb)
      .catch(function () {
        cb(null);
      });
  }

  function nwSeoInitHome() {
    fetchSeoJson(function (seo) {
      var siteUrl = (seo && seo.siteUrl) || PROD_SITE;
      var name = (seo && seo.siteName) || '\ub274\uc2a4\uc758 \ucc3d';
      var metaDesc = '';
      try {
        var m0 = document.querySelector('meta[name="description"]');
        if (m0) metaDesc = m0.getAttribute('content') || '';
      } catch (e0) {}
      var desc = (seo && seo.defaultDescription) || metaDesc;
      var canon = nwIsProductionSiteHost() ? siteUrl.replace(/\/+$/, '') + '/' : nwSeoAbsUrl('/index.html');
      setCanonical(canon);
      if (desc) setMeta('name', 'description', desc);
      setMeta('property', 'og:type', 'website');
      setMeta('property', 'og:site_name', name);
      setMeta('property', 'og:title', name + ((seo && seo.siteTitleSuffix) || ''));
      if (desc) setMeta('property', 'og:description', desc);
      setMeta('property', 'og:url', canon);
      var logo =
        (seo && seo.logoPath && siteUrl.replace(/\/+$/, '') + seo.logoPath) ||
        nwSeoAbsUrl('/images/logo-header-tight.png');
      setMeta('property', 'og:image', logo);
      var org = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: name,
        url: siteUrl.replace(/\/+$/, '/'),
        logo: logo,
      };
      if (seo && seo.publisherLegalName) org.legalName = seo.publisherLegalName;
      if (seo && Array.isArray(seo.sameAs) && seo.sameAs.length) org.sameAs = seo.sameAs;
      if (seo && seo.contactPhone) {
        org.contactPoint = [
          {
            '@type': 'ContactPoint',
            telephone: seo.contactPhone,
            contactType: 'customer service',
            areaServed: 'KR',
            availableLanguage: ['Korean'],
          },
        ];
      }
      injectJsonLdById('nw-org-jsonld', org);
      document.title = name + ((seo && seo.siteTitleSuffix) || '');
    });
  }

  function nwSeoArticleUrl(id) {
    return nwSeoAbsUrl('/article.html?id=' + encodeURIComponent(String(id)));
  }

  function articleIsoDate(raw) {
    if (raw == null || String(raw).trim() === '') return '';
    var s = String(raw).trim().replace(' ', 'T');
    if (s.length >= 10 && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
    var d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(raw).slice(0, 19);
    return d.toISOString();
  }

  function nwSeoApplyArticlePage(a, id, apiOrigin, uploadOrigin) {
    fetchSeoJson(function (seo) {
      var siteUrl = (seo && seo.siteUrl) || PROD_SITE;
      var pubName = (seo && seo.siteName) || '\ub274\uc2a4\uc758 \ucc3d';
      var logo =
        (seo && seo.logoPath && siteUrl.replace(/\/+$/, '') + seo.logoPath) ||
        nwSeoAbsUrl('/images/logo-header-tight.png');
      var pageUrl = nwSeoArticleUrl(id);
      var title = (a.title || '\uae30\uc0ac') + ' | ' + pubName;
      var desc =
        (a.summary && String(a.summary).trim()) ||
        (a.subtitle && String(a.subtitle).trim()) ||
        (a.content1 && String(a.content1).trim().replace(/\s+/g, ' ').slice(0, 160)) ||
        (seo && seo.defaultDescription) ||
        '';
      document.title = title;
      setCanonical(pageUrl);
      setMeta('name', 'description', desc);
      setMeta('property', 'og:type', 'article');
      setMeta('property', 'og:title', a.title || title);
      setMeta('property', 'og:description', desc);
      setMeta('property', 'og:url', pageUrl);
      var img = '';
      if (global.NW_ARTICLE_RENDER && NW_ARTICLE_RENDER.articleMainImageSrc) {
        img = NW_ARTICLE_RENDER.articleMainImageSrc(a.image1, uploadOrigin, apiOrigin);
      }
      if (img && /^https?:\/\//i.test(img)) setMeta('property', 'og:image', img);
      else if (img && img.indexOf('data:') !== 0) setMeta('property', 'og:image', img);
      var authorName = String(a.author_name || '').trim();
      var article = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: a.title || '',
        description: desc,
        datePublished: articleIsoDate(a.published_at || a.created_at),
        dateModified: articleIsoDate(a.updated_at || a.published_at || a.created_at),
        author: authorName
          ? { '@type': 'Person', name: authorName }
          : { '@type': 'Organization', name: pubName },
        publisher: {
          '@type': 'Organization',
          name: pubName,
          logo: { '@type': 'ImageObject', url: logo },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
        url: pageUrl,
      };
      if (a.category && String(a.category).trim()) article.articleSection = String(a.category).trim();
      if (img && /^https?:\/\//i.test(img)) article.image = [img];
      injectJsonLdById('nw-article-jsonld', article);
      var crumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: '\ud648',
            item: siteUrl.replace(/\/+$/, '/') + 'index.html',
          },
        ],
      };
      if (a.category && String(a.category).trim()) {
        crumbs.itemListElement.push({
          '@type': 'ListItem',
          position: 2,
          name: String(a.category).trim(),
          item: nwSeoAbsUrl(
            '/section.html?category=' + encodeURIComponent(String(a.category).trim())
          ),
        });
      }
      crumbs.itemListElement.push({
        '@type': 'ListItem',
        position: crumbs.itemListElement.length + 1,
        name: a.title || '\uae30\uc0ac',
        item: pageUrl,
      });
      injectJsonLdById('nw-breadcrumb-jsonld', crumbs);
    });
  }

  function nwSeoApplySectionPage(categoryValue, displayLabel, introText) {
    fetchSeoJson(function (seo) {
      var siteUrl = (seo && seo.siteUrl) || PROD_SITE;
      var pubName = (seo && seo.siteName) || '\ub274\uc2a4\uc758 \ucc3d';
      var path =
        '/section.html?category=' + encodeURIComponent(String(categoryValue || '').trim());
      var pageUrl = nwIsProductionSiteHost()
        ? siteUrl.replace(/\/+$/, '') + path
        : nwSeoAbsUrl(path);
      var title = (displayLabel || categoryValue) + ' \uae30\uc0ac | ' + pubName;
      var desc =
        (introText && String(introText).trim()) ||
        (seo && seo.defaultDescription) ||
        '';
      document.title = title;
      setCanonical(pageUrl);
      setMeta('name', 'description', desc);
      setMeta('property', 'og:type', 'website');
      setMeta('property', 'og:title', title);
      setMeta('property', 'og:description', desc);
      setMeta('property', 'og:url', pageUrl);
      var crumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: '\ud648',
            item: siteUrl.replace(/\/+$/, '/') + 'index.html',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: displayLabel || categoryValue,
            item: pageUrl,
          },
        ],
      };
      injectJsonLdById('nw-breadcrumb-jsonld', crumbs);
    });
  }

  function nwSeoApplyAllArticlesPage(page, q) {
    fetchSeoJson(function (seo) {
      var pubName = (seo && seo.siteName) || '\ub274\uc2a4\uc758 \ucc3d';
      var siteUrl = (seo && seo.siteUrl) || PROD_SITE;
      var params = new URLSearchParams();
      var p = Math.max(1, Number(page) || 1);
      if (p > 1) params.set('page', String(p));
      if (q && String(q).trim()) params.set('q', String(q).trim());
      var qs = params.toString();
      var path = '/all-articles.html' + (qs ? '?' + qs : '');
      var pageUrl = nwIsProductionSiteHost()
        ? siteUrl.replace(/\/+$/, '') + path
        : nwSeoAbsUrl(path);
      var title = '\uc804\uccb4\uae30\uc0ac | ' + pubName;
      var desc =
        (seo && seo.defaultDescription) ||
        '';
      document.title = title;
      setCanonical(pageUrl);
      if (desc) setMeta('name', 'description', desc);
      setMeta('property', 'og:type', 'website');
      setMeta('property', 'og:title', title);
      if (desc) setMeta('property', 'og:description', desc);
      setMeta('property', 'og:url', pageUrl);
    });
  }

  function nwSeoApplyAuthorPage(displayName, introLine, articleCount) {
    fetchSeoJson(function (seo) {
      var pubName = (seo && seo.siteName) || '\ub274\uc2a4\uc758 \ucc3d';
      var siteUrl = (seo && seo.siteUrl) || PROD_SITE;
      var path = '/author.html?name=' + encodeURIComponent(String(displayName || '').trim());
      var pageUrl = nwIsProductionSiteHost()
        ? siteUrl.replace(/\/+$/, '') + path
        : nwSeoAbsUrl(path);
      var title = (displayName || '\uae30\uc790') + ' | ' + pubName;
      var desc =
        (introLine && String(introLine).trim()) ||
        (displayName
          ? displayName + ' \uae30\uc790\uac00 \uc791\uc131\ud55c \uae30\uc0ac\ub97c \ubaa8\uc544 \ubcf4\uc2ed\uc2dc\uc624.'
          : '') ||
        (seo && seo.defaultDescription) ||
        '';
      document.title = title;
      setCanonical(pageUrl);
      setMeta('name', 'description', desc);
      setMeta('property', 'og:type', 'profile');
      setMeta('property', 'og:title', title);
      setMeta('property', 'og:description', desc);
      setMeta('property', 'og:url', pageUrl);
      var person = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: displayName || '',
        url: pageUrl,
        worksFor: { '@type': 'NewsMediaOrganization', name: pubName, url: siteUrl.replace(/\/+$/, '/') },
      };
      if (articleCount != null && Number.isFinite(Number(articleCount)))
        person.description =
          '\uacf5\uac1c \uae30\uc0ac ' + String(articleCount) + '\uac74';
      injectJsonLdById('nw-author-jsonld', person);
      var crumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: '\ud648',
            item: siteUrl.replace(/\/+$/, '/') + 'index.html',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: displayName || '\uae30\uc790',
            item: pageUrl,
          },
        ],
      };
      injectJsonLdById('nw-breadcrumb-jsonld', crumbs);
    });
  }

  global.nwSeoInitHome = nwSeoInitHome;
  global.nwSeoApplyArticlePage = nwSeoApplyArticlePage;
  global.nwSeoApplySectionPage = nwSeoApplySectionPage;
  global.nwSeoApplyAllArticlesPage = nwSeoApplyAllArticlesPage;
  global.nwSeoApplyAuthorPage = nwSeoApplyAuthorPage;
  global.nwSeoAbsUrl = nwSeoAbsUrl;
  global.nwSeoArticleUrl = nwSeoArticleUrl;

  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (document.body && document.body.classList.contains('nw-home')) nwSeoInitHome();
    } catch (e) {}
  });
})(typeof window !== 'undefined' ? window : this);
