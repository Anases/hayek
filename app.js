// NanoFetch Documentation - Main Application
(function() {
    'use strict';

    var state = {
        nanoGet: null,
        nanoPost: null,
        nanoRequest: null,
        initialized: false
    };

    // NanoFetch implementation (built-in, no CDN needed)
    function createNanoFetch() {
        function nanoRequest(url, options) {
            options = options || {};
            var timeout = options.timeout || 30000;
            var parseJson = options.parseJson !== false;
            var userSignal = options.signal;
            var fetchOpts = {};

            // Copy other options
            for (var key in options) {
                if (key !== 'timeout' && key !== 'parseJson' && key !== 'signal') {
                    fetchOpts[key] = options[key];
                }
            }

            var controller = new AbortController();
            var timer = setTimeout(function() { controller.abort(); }, timeout);

            if (userSignal) {
                if (userSignal.aborted) {
                    controller.abort();
                } else {
                    userSignal.addEventListener('abort', function() {
                        controller.abort();
                    }, { once: true });
                }
            }

            return fetch(url, fetchOpts).then(function(res) {
                clearTimeout(timer);

                if (!res.ok) {
                    var contentType = res.headers.get('content-type') || '';
                    var parser = contentType.includes('application/json') ? res.json() : res.text();
                    return parser.then(function(data) {
                        var err = new Error('HTTP ' + res.status);
                        err.status = res.status;
                        err.statusText = res.statusText;
                        err.data = data;
                        err.isNetworkError = false;
                        err.isTimeout = false;
                        err.isAborted = false;
                        throw err;
                    });
                }

                if (parseJson) {
                    var ct = res.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        return res.json();
                    }
                }
                return res.text();
            }).catch(function(e) {
                clearTimeout(timer);
                if (e.name === 'AbortError') {
                    var err = new Error(userSignal && userSignal.aborted ? 'Aborted' : 'Timeout');
                    err.isAborted = !!(userSignal && userSignal.aborted);
                    err.isTimeout = !(userSignal && userSignal.aborted);
                    err.isNetworkError = false;
                    err.status = null;
                    throw err;
                }
                if (!e.status) e.isNetworkError = true;
                throw e;
            });
        }

        return {
            nanoRequest: nanoRequest,
            nanoGet: function(url, opts) { return nanoRequest(url, Object.assign({}, opts, { method: 'GET' })); },
            nanoPost: function(url, opts) { return nanoRequest(url, Object.assign({}, opts, { method: 'POST' })); }
        };
    }

    // Initialize
    function initLibrary() {
        var lib = createNanoFetch();
        state.nanoGet = lib.nanoGet;
        state.nanoPost = lib.nanoPost;
        state.nanoRequest = lib.nanoRequest;
        state.initialized = true;
        console.log('[App] NanoFetch initialized (built-in)');
    }

    // Toast notifications
    function toast(message, type) {
        var container = document.getElementById('toastContainer');
        if (!container) return;

        var el = document.createElement('div');
        el.className = 'toast';
        var color = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent)';
        el.style.borderLeft = '4px solid ' + color;
        el.textContent = message;
        container.appendChild(el);

        setTimeout(function() {
            el.style.opacity = '0';
            el.style.transform = 'translateX(100%)';
            el.style.transition = 'all 0.3s ease';
            setTimeout(function() { el.remove(); }, 300);
        }, 3500);
    }

    // Exercise 1: Fetch GitHub repo
    function runExercise1(btn) {
        if (!state.initialized) {
            toast('Loading...', 'info');
            return;
        }

        var output = document.getElementById('ex1Output');
        btn.disabled = true;
        output.textContent = 'Fetching...';

        state.nanoGet('https://api.github.com/repos/facebook/react', { timeout: 10000 })
            .then(function(data) {
                output.textContent = 'Repository: ' + data.full_name + '\nStars: ' + data.stargazers_count.toLocaleString() + '\nDescription: ' + data.description;
            })
            .catch(function(err) {
                output.textContent = 'Error: ' + err.message + '\nStatus: ' + (err.status || 'N/A') + '\nNetwork Error: ' + (err.isNetworkError || false);
            })
            .finally(function() {
                btn.disabled = false;
            });
    }

    // Exercise 2: Trigger 404
    function runExercise2(btn) {
        if (!state.initialized) {
            toast('Loading...', 'info');
            return;
        }

        var output = document.getElementById('ex2Output');
        btn.disabled = true;
        output.textContent = 'Fetching...';

        state.nanoGet('https://api.github.com/repos/invalid/repo-xyz-123', { timeout: 5000 })
            .then(function() {
                output.textContent = 'Unexpected success';
            })
            .catch(function(err) {
                output.textContent = 'Error caught:\nMessage: ' + err.message + '\nStatus: ' + err.status + '\nIs Timeout: ' + (err.isTimeout || false) + '\nIs Aborted: ' + (err.isAborted || false);
            })
            .finally(function() {
                btn.disabled = false;
            });
    }

    // Tailwind CSS loader (Updated with tailwindcss-cdn package)
    function loadTailwind(btn) {
        if (!state.initialized) {
            toast('Loading...', 'info');
            return;
        }

        var status = document.getElementById('tailwindStatus');
        var bakery = document.getElementById('twBakery');
        var viewer = document.getElementById('twCodeViewer');

        btn.disabled = true;
        var originalContent = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Loading...';
        status.textContent = 'Fetching Tailwind CSS v3...';
        status.style.color = 'var(--warning)';

        // Fetching from the official prebuilt tailwindcss-cdn distribution
        fetch('https://cdn.jsdelivr.net/npm/tailwindcss-cdn@3.4.10/tailwindcss.js', {
            signal: AbortSignal.timeout(20000)
        })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function(css) {
            var sizeKb = (new Blob([css]).size / 1024).toFixed(1);
            var lines = css.split('\n').length;

            // Display in viewer
            viewer.textContent = css;
            viewer.dataset.fullcss = css;

            // Inject CSS
            if (typeof CSSStyleSheet !== 'undefined' && CSSStyleSheet.prototype.replaceSync) {
                var sheet = new CSSStyleSheet();
                sheet.replaceSync(css);
                document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
            } else {
                var style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
            }

            // Show bakery
            bakery.classList.add('visible');
            status.textContent = 'Loaded v3 ' + sizeKb + 'KB (' + lines.toLocaleString() + ' lines)';
            status.style.color = 'var(--success)';
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Loaded';
            btn.style.backgroundColor = 'var(--success)';

            toast('Tailwind v3 loaded successfully', 'success');
            console.log('[Tailwind v3] Size: ' + sizeKb + 'KB, Lines: ' + lines);
        })
        .catch(function(err) {
            console.error('[Tailwind v3] Error:', err);
            status.textContent = 'Failed: ' + err.message;
            status.style.color = 'var(--danger)';
            toast('Error: ' + err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
        });
    }

            

    // Tab switching
    function setupTabs() {
        document.querySelectorAll('.tabs-nav').forEach(function(nav) {
            nav.addEventListener('click', function(e) {
                var btn = e.target.closest('.tab-btn');
                if (!btn) return;

                var container = btn.closest('.tabs-container');
                var tabId = btn.dataset.tab;
                if (!container || !tabId) return;

                container.querySelectorAll('.tab-btn').forEach(function(b) {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                container.querySelectorAll('.tab-panel').forEach(function(p) {
                    p.classList.remove('active');
                });

                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                var panel = document.getElementById(tabId);
                if (panel) panel.classList.add('active');
            });
        });
    }

    // Copy to clipboard
    function setupCopyButtons() {
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('.copy-btn');
            if (!btn) return;

            var text = btn.dataset.copy;
            if (!text) {
                var codeBlock = btn.closest('.code-block');
                if (codeBlock) {
                    var code = codeBlock.querySelector('code');
                    if (code) text = code.innerText;
                }
            }
            if (!text) return;

            navigator.clipboard.writeText(text).then(function() {
                var orig = btn.textContent;
                btn.textContent = 'Copied';
                btn.classList.add('copied');
                setTimeout(function() {
                    btn.textContent = orig;
                    btn.classList.remove('copied');
                }, 1500);
            }).catch(function() {
                toast('Copy failed', 'error');
            });
        });
    }

    // Mobile menu
    function setupMobileMenu() {
        var menuBtn = document.getElementById('menuBtn');
        var sidebar = document.getElementById('sidebar');
        var backdrop = document.getElementById('backdrop');

        if (!menuBtn || !sidebar || !backdrop) return;

        menuBtn.addEventListener('click', function() {
            var isOpen = sidebar.classList.toggle('open');
            backdrop.classList.toggle('active', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
            menuBtn.setAttribute('aria-expanded', isOpen);
        });

        backdrop.addEventListener('click', function() {
            sidebar.classList.remove('open');
            backdrop.classList.remove('active');
            document.body.style.overflow = '';
            menuBtn.setAttribute('aria-expanded', 'false');
        });
    }

    // Theme and glass toggles
    function setupPreferences() {
        var root = document.documentElement;
        var themeToggle = document.getElementById('themeToggle');
        var glassToggle = document.getElementById('glassToggle');

        var savedTheme = localStorage.getItem('nf-theme') || 'light';
        var savedGlass = localStorage.getItem('nf-glass') === 'true';

        root.setAttribute('data-theme', savedTheme);
        root.setAttribute('data-glass', savedGlass);

        if (themeToggle) themeToggle.checked = savedTheme === 'dark';
        if (glassToggle) glassToggle.checked = savedGlass;

        if (themeToggle) {
            themeToggle.addEventListener('change', function() {
                var theme = themeToggle.checked ? 'dark' : 'light';
                root.setAttribute('data-theme', theme);
                localStorage.setItem('nf-theme', theme);
            });
        }

        if (glassToggle) {
            glassToggle.addEventListener('change', function() {
                root.setAttribute('data-glass', glassToggle.checked);
                localStorage.setItem('nf-glass', glassToggle.checked);
            });
        }
    }

    // Scroll spy
    function setupScrollSpy() {
        var sections = document.querySelectorAll('section[id]');
        var navItems = document.querySelectorAll('.nav-item[href^="#"]');

        if (!sections.length || !navItems.length) return;

        var observer = new IntersectionObserver(
            function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var id = entry.target.getAttribute('id');
                        navItems.forEach(function(link) {
                            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                        });
                    }
                });
            },
            { rootMargin: '-20% 0px -75% 0px' }
        );

        sections.forEach(function(section) { observer.observe(section); });
    }

    // Smooth scroll
    function setupSmoothScroll() {
        document.addEventListener('click', function(e) {
            var anchor = e.target.closest('a[href^="#"]');
            if (!anchor) return;

            var href = anchor.getAttribute('href');
            if (href === '#') return;

            var target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.pushState(null, '', href);

            var sidebar = document.getElementById('sidebar');
            var backdrop = document.getElementById('backdrop');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                if (backdrop) backdrop.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Tailwind search and preview
    function setupTailwindTools() {
        var searchInput = document.getElementById('twSearchInput');
        var viewer = document.getElementById('twCodeViewer');

        if (searchInput && viewer) {
            searchInput.addEventListener('input', function() {
                var query = searchInput.value.toLowerCase();
                var fullCss = viewer.dataset.fullcss || '';

                if (!query) {
                    viewer.textContent = fullCss;
                    return;
                }

                var lines = fullCss.split('\n');
                var filtered = lines.filter(function(line) {
                    return line.toLowerCase().includes(query);
                });
                viewer.textContent = filtered.length
                    ? '/* Found ' + filtered.length + ' matches */\n\n' + filtered.join('\n')
                    : '/* No matches */';
            });
        }

        var liveInput = document.getElementById('twLiveInput');
        var preview = document.getElementById('twPreviewBox');

        if (liveInput && preview) {
            liveInput.addEventListener('input', function() {
                var classes = liveInput.value.trim();
                preview.className = 'tw-preview-box ' + classes;
                preview.textContent = classes || 'Preview';
            });
        }
    }

    // Action buttons
    function setupActionButtons() {
        document.addEventListener('click', function(e) {
            if (e.target.closest('#ex1Btn')) {
                runExercise1(e.target.closest('#ex1Btn'));
                return;
            }

            if (e.target.closest('#ex2Btn')) {
                runExercise2(e.target.closest('#ex2Btn'));
                return;
            }

            if (e.target.closest('#fetchTailwindBtn')) {
                loadTailwind(e.target.closest('#fetchTailwindBtn'));
                return;
            }
        });
    }

    // Set year
    function setYear() {
        var el = document.getElementById('year-el');
        if (el) el.textContent = new Date().getFullYear();
    }

    // Initialize
    function init() {
        setYear();
        initLibrary();
        setupTabs();
        setupCopyButtons();
        setupMobileMenu();
        setupPreferences();
        setupScrollSpy();
        setupSmoothScroll();
        setupTailwindTools();
        setupActionButtons();

        console.log('[App] Initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();