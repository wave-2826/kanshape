/**
 * Simple (bad) URL polyfill. Created because none of the existing polyfills are any good for simple use cases like this.
 * Unfortunately, PocketBase doesn't expose url.URL for users to create even though it's on certain objects lik Request.
 */

function encode(str) {
    return encodeURIComponent(str);
}

function decode(str) {
    return decodeURIComponent(str.replace(/\+/g, " "));
}

function URLSearchParams(init, owner) {
    this._owner = owner;
    this._params = [];
    
    if (typeof init === "string" && init.length) {
        if (init.charAt(0) === "?") {
            init = init.slice(1);
        }

        var pairs = init.split("&");

        for (var i = 0; i < pairs.length; i++) {
            if (!pairs[i]) continue;

            var eq = pairs[i].indexOf("=");
            var key, value;

            if (eq === -1) {
                key = decode(pairs[i]);
                value = "";
            } else {
                key = decode(pairs[i].slice(0, eq));
                value = decode(pairs[i].slice(eq + 1));
            }

            this._params.push([key, value]);
        }
    } else if (init && typeof init === "object") {
        // we can't use iterators in this environment :pensive:
        // just assume it's an object with string keys and values

        for (var key in init) {
            if (init.hasOwnProperty(key)) {
                this._params.push([String(key), String(init[key])]);
            }
        }
    }
}

URLSearchParams.prototype._sync = function () {
    if (this._owner) {
        this._owner._search =
            this.toString() ? "?" + this.toString() : "";
    }
};

URLSearchParams.prototype.get = function (name) {
    for (var i = 0; i < this._params.length; i++) {
        if (this._params[i][0] === name) {
            return this._params[i][1];
        }
    }
    return null;
};

URLSearchParams.prototype.set = function (name, value) {
    var found = false;

    for (var i = this._params.length - 1; i >= 0; i--) {
        if (this._params[i][0] === name) {
            if (!found) {
                this._params[i][1] = String(value);
                found = true;
            } else {
                this._params.splice(i, 1);
            }
        }
    }

    if (!found) {
        this._params.push([name, String(value)]);
    }

    this._sync();
};

URLSearchParams.prototype.append = function (name, value) {
    this._params.push([name, String(value)]);
    this._sync();
};

URLSearchParams.prototype.delete = function (name) {
    for (var i = this._params.length - 1; i >= 0; i--) {
        if (this._params[i][0] === name) {
            this._params.splice(i, 1);
        }
    }
    this._sync();
};

URLSearchParams.prototype.toString = function () {
    var out = [];

    for (var i = 0; i < this._params.length; i++) {
        out.push(
            encode(this._params[i][0]) +
            "=" +
            encode(this._params[i][1])
        );
    }

    return out.join("&");
};

function URL(input) {
    var match = String(input).match(
        /^([a-zA-Z][a-zA-Z0-9+.-]*:)?\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/
    );

    if (!match) {
        throw new Error("Invalid URL " + input);
    }

    this.protocol = match[1] || "";
    this.host = match[2] || "";
    this._pathname = match[3] || "/";
    this._search = match[4] || "";
    this.hash = match[5] || "";

    this.searchParams = new URLSearchParams(
        this._search.slice(1),
        this
    );
}

Object.defineProperty(URL.prototype, "pathname", {
    get: function () {
        return this._pathname;
    },
    set: function (value) {
        value = String(value);
        if (value.charAt(0) !== "/") {
            value = "/" + value;
        }
        this._pathname = value;
    }
});

Object.defineProperty(URL.prototype, "search", {
    get: function () {
        return this._search;
    },
    set: function (value) {
        value = String(value || "");

        if (value && value.charAt(0) !== "?") {
            value = "?" + value;
        }

        this._search = value;
        this.searchParams = new URLSearchParams(
            value.slice(1),
            this
        );
    }
});

Object.defineProperty(URL.prototype, "href", {
    get: function () {
        return (
            this.protocol +
            "//" +
            this.host +
            this._pathname +
            this._search +
            this.hash
        );
    }
});

URL.prototype.toString = function () {
    return this.href;
};

module.exports = { URL, URLSearchParams };