/**
 * Hayek - A lightweight HTTP client wrapper around the native fetch API.
 */

export function nanoRequest(url, options) {
    options = options || {};
    var timeout = options.timeout || 30000;
    var parseJson = options.parseJson !== false;
    var userSignal = options.signal;
    var fetchOpts = {};

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
            if (ct.includes('application/json')) return res.json();
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

export function nanoGet(url, opts) { 
    return nanoRequest(url, Object.assign({}, opts, { method: 'GET' })); 
}

export function nanoPost(url, opts) { 
    return nanoRequest(url, Object.assign({}, opts, { method: 'POST' })); 
}
