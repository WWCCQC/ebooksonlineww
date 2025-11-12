import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  html?: string;
  error?: string;
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildInjectedScript(originalUrl: string, externalOrigin: string | null | undefined, logPrefix: string) {
  const safeOriginalUrl = JSON.stringify(originalUrl);
  const safeFallbackOrigin = externalOrigin ? JSON.stringify(externalOrigin) : 'null';
  const safeLogPrefix = JSON.stringify(logPrefix);

  return `
    <script>
      (function() {
        var LOG_PREFIX = ${safeLogPrefix};
        console.log(LOG_PREFIX + ': injecting navigation guard');

        var ORIGINAL_URL = ${safeOriginalUrl};
        var FALLBACK_EXTERNAL_ORIGIN = ${safeFallbackOrigin};
        var PROXY_ORIGIN = window.location.origin;

        var ORIGINAL_URL_OBJECT = null;
        try {
          ORIGINAL_URL_OBJECT = new URL(ORIGINAL_URL);
        } catch (err) {
          console.warn(LOG_PREFIX + ': unable to parse ORIGINAL_URL', ORIGINAL_URL, err);
        }

        var EXTERNAL_ORIGIN = ORIGINAL_URL_OBJECT ? ORIGINAL_URL_OBJECT.origin : (FALLBACK_EXTERNAL_ORIGIN || window.location.origin);

        var EXTERNAL_BASE_DOMAIN = (function() {
          try {
            var host = new URL(EXTERNAL_ORIGIN).hostname;
            var parts = host.split('.');
            return parts.length >= 2 ? parts.slice(-2).join('.') : host;
          } catch (err) {
            console.warn(LOG_PREFIX + ': unable to derive base domain', err);
            return '';
          }
        })();

        function overrideLocationValue(property, value) {
          if (value === undefined || value === null) {
            return;
          }
          try {
            Object.defineProperty(window.location, property, {
              configurable: true,
              enumerable: false,
              get: function() {
                return value;
              }
            });
          } catch (err) {
            console.warn(LOG_PREFIX + ': unable to override location.' + property, err);
          }
        }

        if (ORIGINAL_URL_OBJECT) {
          overrideLocationValue('origin', ORIGINAL_URL_OBJECT.origin);
          overrideLocationValue('protocol', ORIGINAL_URL_OBJECT.protocol);
          overrideLocationValue('host', ORIGINAL_URL_OBJECT.host);
          overrideLocationValue('hostname', ORIGINAL_URL_OBJECT.hostname);
          overrideLocationValue('port', ORIGINAL_URL_OBJECT.port);
          overrideLocationValue('pathname', ORIGINAL_URL_OBJECT.pathname);
          overrideLocationValue('search', ORIGINAL_URL_OBJECT.search);
          overrideLocationValue('hash', ORIGINAL_URL_OBJECT.hash);
        }

        function resolveAgainstExternal(href) {
          if (!href) return '';
          try {
            return new URL(href, EXTERNAL_ORIGIN).toString();
          } catch (err) {
            try {
              return new URL(href, PROXY_ORIGIN).toString();
            } catch (innerErr) {
              console.warn(LOG_PREFIX + ': unable to resolve href', href, innerErr);
              return href;
            }
          }
        }

        function extractCandidateUrl(candidate) {
          if (!candidate) return '';
          if (typeof candidate === 'string') return candidate;
          if (typeof URL !== 'undefined' && candidate instanceof URL) return candidate.toString();
          if (typeof Request !== 'undefined' && candidate instanceof Request) return candidate.url;
          return String(candidate);
        }

        function isProxyInternalUrl(candidate) {
          var value = extractCandidateUrl(candidate);
          if (!value) return false;
          try {
            var parsed = new URL(value, PROXY_ORIGIN);
            if (parsed.origin !== PROXY_ORIGIN) {
              return false;
            }
            return parsed.pathname.indexOf('/api/link-proxy') === 0 || parsed.pathname.indexOf('/api/resource-proxy') === 0;
          } catch (err) {
            return false;
          }
        }

        function isWithinAllowedSite(resolvedUrl) {
          if (!resolvedUrl) return false;
          try {
            var parsed = new URL(resolvedUrl);
            if (parsed.origin === EXTERNAL_ORIGIN) {
              return true;
            }
            if (!EXTERNAL_BASE_DOMAIN) {
              return false;
            }
            var host = parsed.hostname;
            if (host === EXTERNAL_BASE_DOMAIN) {
              return true;
            }
            return host.endsWith('.' + EXTERNAL_BASE_DOMAIN);
          } catch (err) {
            console.warn(LOG_PREFIX + ': unable to compare origin for', resolvedUrl, err);
            return false;
          }
        }

        function buildLinkProxyUrl(resolvedUrl) {
          var proxied = '/api/link-proxy?url=' + encodeURIComponent(resolvedUrl);
          if (EXTERNAL_ORIGIN) {
            proxied += '&sourceOrigin=' + encodeURIComponent(EXTERNAL_ORIGIN);
          }
          return proxied;
        }

        function buildResourceProxyUrl(resolvedUrl) {
          var proxied = '/api/resource-proxy?url=' + encodeURIComponent(resolvedUrl);
          if (EXTERNAL_ORIGIN) {
            proxied += '&origin=' + encodeURIComponent(EXTERNAL_ORIGIN);
          }
          return proxied;
        }

        function notifyParent(resolvedUrl) {
          if (!resolvedUrl) return;
          window.parent.postMessage({
            type: 'linkClicked',
            url: resolvedUrl,
            origin: EXTERNAL_ORIGIN
          }, '*');
        }

        var originalAssign = window.location.assign.bind(window.location);
        var originalReplace = window.location.replace.bind(window.location);
        var originalHrefDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href');
        var originalOpen = window.open;
        var originalFetch = window.fetch.bind(window);
        var originalXHROpen = XMLHttpRequest.prototype.open;

        function navigateWithinProxy(resolvedUrl) {
          var proxiedUrl = buildLinkProxyUrl(resolvedUrl);
          originalAssign(proxiedUrl);
        }

        window.fetch = function(resource, init) {
          try {
            if (isProxyInternalUrl(resource)) {
              return originalFetch(resource, init);
            }
            var requestUrl = extractCandidateUrl(resource);
            if (!requestUrl) {
              return originalFetch(resource, init);
            }
            var resolved = resolveAgainstExternal(requestUrl);
            var method = (init && init.method) || (resource instanceof Request ? resource.method : 'GET');
            if (resolved && isWithinAllowedSite(resolved) && (!method || method.toUpperCase() === 'GET')) {
              var proxiedUrl = buildResourceProxyUrl(resolved);
              var proxiedOptions = init ? Object.assign({}, init) : {};
              proxiedOptions.method = 'GET';
              proxiedOptions.body = undefined;
              proxiedOptions.cache = init && init.cache ? init.cache : 'no-store';
              proxiedOptions.credentials = 'omit';
              proxiedOptions.mode = 'cors';
              proxiedOptions.headers = init && init.headers ? init.headers : (resource instanceof Request ? resource.headers : undefined);
              return originalFetch(proxiedUrl, proxiedOptions);
            }
          } catch (err) {
            console.warn(LOG_PREFIX + ': fetch override failed, falling back', err);
          }
          return originalFetch(resource, init);
        };

        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
          try {
            if (isProxyInternalUrl(url)) {
              return originalXHROpen.call(this, method, url, async, user, password);
            }
            var resolved = resolveAgainstExternal(url);
            if (resolved && isWithinAllowedSite(resolved) && method && method.toUpperCase() === 'GET') {
              var proxiedUrl = buildResourceProxyUrl(resolved);
              return originalXHROpen.call(this, method, proxiedUrl, async, user, password);
            }
          } catch (err) {
            console.warn(LOG_PREFIX + ': XHR override failed, falling back', err);
          }
          return originalXHROpen.call(this, method, url, async, user, password);
        };

        window.location.assign = function(nextUrl) {
          console.log(LOG_PREFIX + ': location.assign intercepted', nextUrl);
          if (isProxyInternalUrl(nextUrl)) {
            return originalAssign(nextUrl);
          }
          var resolved = resolveAgainstExternal(nextUrl);
          if (!resolved) {
            return undefined;
          }
          if (isWithinAllowedSite(resolved)) {
            navigateWithinProxy(resolved);
            return undefined;
          }
          notifyParent(resolved);
          return undefined;
        };

        window.location.replace = function(nextUrl) {
          console.log(LOG_PREFIX + ': location.replace intercepted', nextUrl);
          if (isProxyInternalUrl(nextUrl)) {
            return originalReplace(nextUrl);
          }
          var resolved = resolveAgainstExternal(nextUrl);
          if (!resolved) {
            return undefined;
          }
          if (isWithinAllowedSite(resolved)) {
            var proxiedUrl = buildLinkProxyUrl(resolved);
            originalReplace(proxiedUrl);
            return undefined;
          }
          notifyParent(resolved);
          return undefined;
        };

        try {
          Object.defineProperty(window.location, 'href', {
            configurable: true,
            enumerable: false,
            set: function(nextUrl) {
              console.log(LOG_PREFIX + ': location.href assignment intercepted', nextUrl);
              if (isProxyInternalUrl(nextUrl)) {
                if (originalHrefDescriptor && originalHrefDescriptor.set) {
                  originalHrefDescriptor.set.call(window.location, nextUrl);
                } else {
                  originalAssign(nextUrl);
                }
                return;
              }
              var resolved = resolveAgainstExternal(nextUrl);
              if (!resolved) {
                return;
              }
              if (isWithinAllowedSite(resolved)) {
                navigateWithinProxy(resolved);
                return;
              }
              notifyParent(resolved);
            },
            get: function() {
              if (ORIGINAL_URL_OBJECT) {
                return ORIGINAL_URL_OBJECT.toString();
              }
              if (originalHrefDescriptor && originalHrefDescriptor.get) {
                return originalHrefDescriptor.get.call(this);
              }
              return window.location.toString();
            }
          });
        } catch (err) {
          console.warn(LOG_PREFIX + ': unable to redefine location.href', err);
        }

        if (ORIGINAL_URL_OBJECT) {
          try {
            var originalToString = window.location.toString.bind(window.location);
            window.location.toString = function() {
              return ORIGINAL_URL_OBJECT.toString();
            };
          } catch (err) {
            console.warn(LOG_PREFIX + ': unable to override location.toString', err);
          }
        }

        function interceptNavigation() {
          document.addEventListener('click', function(e) {
            var link = e.target && e.target.closest ? e.target.closest('a') : null;
            if (!link) return;
            var rawHref = link.getAttribute('href') || link.href;
            if (isProxyInternalUrl(rawHref)) {
              return;
            }
            var resolved = resolveAgainstExternal(rawHref);
            if (!resolved) return;
            if (isWithinAllowedSite(resolved)) {
              e.preventDefault();
              e.stopPropagation();
              navigateWithinProxy(resolved);
              return false;
            }
            console.log(LOG_PREFIX + ': link clicked (external)', resolved);
            e.preventDefault();
            e.stopPropagation();
            notifyParent(resolved);
            return false;
          }, true);

          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || !form.action) return;
            if (isProxyInternalUrl(form.action)) {
              return;
            }
            var resolved = resolveAgainstExternal(form.action);
            if (!resolved) return;
            if (isWithinAllowedSite(resolved)) {
              e.preventDefault();
              navigateWithinProxy(resolved);
              return false;
            }
            console.log(LOG_PREFIX + ': form submission intercepted', resolved);
            e.preventDefault();
            notifyParent(resolved);
            return false;
          }, true);

          window.open = function(nextUrl, target, features) {
            console.log(LOG_PREFIX + ': window.open intercepted', nextUrl);
            if (isProxyInternalUrl(nextUrl)) {
              return originalOpen ? originalOpen.call(window, nextUrl, target, features) : null;
            }
            var resolved = resolveAgainstExternal(nextUrl);
            if (!resolved) {
              return originalOpen ? originalOpen.call(window, nextUrl, target, features) : null;
            }
            if (isWithinAllowedSite(resolved)) {
              var proxiedUrl = buildLinkProxyUrl(resolved);
              return originalOpen ? originalOpen.call(window, proxiedUrl, target, features) : null;
            }
            notifyParent(resolved);
            return null;
          };

          var stripTargets = function(root) {
            var scope = root || document;
            if (!scope.querySelectorAll) return;
            var anchors = scope.querySelectorAll('a[target="_blank"]');
            Array.prototype.forEach.call(anchors, function(anchor) {
              anchor.removeAttribute('target');
            });
          };

          stripTargets();

          if (typeof MutationObserver !== 'undefined') {
            var observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                  mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                      stripTargets(node);
                    }
                  });
                } else if (mutation.type === 'attributes' && mutation.target instanceof Element) {
                  stripTargets(mutation.target);
                }
              });
            });

            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['target', 'href']
            });
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', interceptNavigation, { once: true });
        } else {
          interceptNavigation();
        }
      })();
    </script>
  `;
}

type ResolveResult = {
  finalUrl: string;
  sourceOrigin?: string;
};

function resolveFinalUrl(rawUrl: string, targetParam?: string, sourceOrigin?: string): ResolveResult | null {
  let candidateUrl = rawUrl;

  if (!candidateUrl && targetParam) {
    candidateUrl = decodeURIComponent(targetParam);
  }

  if (!candidateUrl) {
    return null;
  }

  let finalUrl: string | null = null;

  try {
    const parsed = new URL(candidateUrl);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      if (sourceOrigin) {
        const base = new URL(sourceOrigin);
        finalUrl = new URL(parsed.pathname + parsed.search + parsed.hash, base).toString();
      }
    } else {
      finalUrl = parsed.toString();
    }
  } catch (err) {
    // ignore and try to resolve relative to source origin
  }

  if (!finalUrl && sourceOrigin) {
    try {
      finalUrl = new URL(candidateUrl, sourceOrigin).toString();
    } catch (err) {
      console.warn('Link proxy: unable to resolve URL with sourceOrigin', candidateUrl, sourceOrigin, err);
    }
  }

  if (!finalUrl) {
    try {
      finalUrl = new URL(candidateUrl).toString();
    } catch (err) {
      return null;
    }
  }

  if (!finalUrl) {
    return null;
  }

  try {
    const parsed = new URL(finalUrl);
    if (parsed.hostname.endsWith('canva.com') && parsed.pathname === '/link') {
      const target = parsed.searchParams.get('target');
      if (target) {
        const decoded = decodeURIComponent(target);
        try {
          const absoluteTarget = new URL(decoded);
          return { finalUrl: absoluteTarget.toString(), sourceOrigin: parsed.origin };
        } catch (inner) {
          try {
            const absoluteTarget = new URL(decoded, parsed.origin);
            return { finalUrl: absoluteTarget.toString(), sourceOrigin: parsed.origin };
          } catch (innerErr) {
            console.warn('Link proxy: unable to resolve Canva target parameter', decoded, innerErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Link proxy: unable to parse final URL for redirect handling', finalUrl, err);
  }

  return { finalUrl, sourceOrigin };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  let { url, target, sourceOrigin } = req.query;
  let sourceOriginStr = typeof sourceOrigin === 'string' ? sourceOrigin : undefined;

  if (!url && typeof target === 'string') {
    url = decodeURIComponent(target);
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  const resolved = resolveFinalUrl(url, typeof target === 'string' ? target : undefined, sourceOriginStr);

  if (!resolved) {
    return res.status(400).json({ error: 'Unable to resolve final URL' });
  }

  let finalUrl = resolved.finalUrl;
  if (!sourceOriginStr && resolved.sourceOrigin) {
    sourceOriginStr = resolved.sourceOrigin;
  }

  console.log('Link proxy: Resolved URL ->', finalUrl, '(source origin:', sourceOriginStr, ')');

  let externalOrigin: string | undefined;
  try {
    externalOrigin = new URL(finalUrl).origin;
  } catch (err) {
    console.warn('Link proxy: unable to parse origin before fetch:', finalUrl, err);
  }

  const refererHeader = sourceOriginStr || externalOrigin;

  const requestHeaders: Record<string, string> = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1'
  };

  if (refererHeader) {
    requestHeaders['Referer'] = refererHeader;
  }

  let response;

  try {
    console.log('Link proxy: Fetching:', finalUrl);
    response = await fetch(finalUrl, {
      redirect: 'follow',
      headers: requestHeaders
    });
  } catch (error) {
    console.error('Link proxy: fetch failed', error);
    return res.status(502).json({ error: 'Failed to fetch content: ' + String(error) });
  }

  if (!response.ok) {
    return res
      .status(response.status)
      .json({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` });
  }

  let modifiedHtml = await response.text();

  if (!externalOrigin) {
    try {
      externalOrigin = new URL(finalUrl).origin;
    } catch (err) {
      console.warn('Link proxy: unable to parse origin from URL:', finalUrl, err);
    }
  }

  const baseHref = externalOrigin || finalUrl;
  const baseTag = `<base href="${baseHref.replace(/"/g, '&quot;')}">`;
  if (!/<base\s/i.test(modifiedHtml)) {
    if (/<head[^>]*>/i.test(modifiedHtml)) {
      modifiedHtml = modifiedHtml.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    } else {
      modifiedHtml = `${baseTag}${modifiedHtml}`;
    }
  }

  const injectedScript = buildInjectedScript(finalUrl, externalOrigin || sourceOriginStr, 'Link proxy');

  if (modifiedHtml.includes('</body>')) {
    modifiedHtml = modifiedHtml.replace('</body>', injectedScript + '</body>');
  } else if (modifiedHtml.includes('</html>')) {
    modifiedHtml = modifiedHtml.replace('</html>', injectedScript + '</html>');
  } else {
    modifiedHtml = modifiedHtml + injectedScript;
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  console.log('Link proxy: Returning content with injected script, length:', modifiedHtml.length);
  res.status(200).write(modifiedHtml);
  res.end();
}
