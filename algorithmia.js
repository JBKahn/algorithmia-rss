(function() {
  var AlgorithmError, Proxy, algoPattern, api_hostname, handleApiResponse, native_url, protocol, proxy, proxy_url, query, queryNative;

  protocol = window.location.protocol === "https:" ? "https:" : "http:";

  api_hostname = (function() {
    switch (window.location.host) {
      case "localhost":
      case "localhost:9000":
      case "dev.algorithmia.com":
        return window.location.host;
      default:
        return "algorithmia.com";
    }
  })();

  native_url = "" + protocol + "//" + api_hostname + "/api";

  proxy_url = "" + protocol + "//" + api_hostname + "/api/proxy";

  proxy = null;

  algoPattern = /^\/(\w+)\/(\w+)(?:\/(\w+))?$/;

  query = function(algo_uri, api_key, data, cb) {
    if (!(typeof algo_uri === "string" && algo_uri.match(algoPattern))) {
      return cb("Invalid Algorithm URI (expected /user/algo)");
    }
    if (proxy === null) {
      proxy = new Proxy();
    }
    proxy.query(algo_uri, api_key, data, cb);
  };

  queryNative = function(algo_uri, api_key, data, cb) {
    var endpoint_url, xhr;
    if (!(typeof algo_uri === "string" && algo_uri.match(algoPattern))) {
      return cb("Invalid Algorithm URI (expected /user/algo)");
    }
    endpoint_url = native_url + algo_uri;
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      var error, responseJson;
      if (xhr.readyState === 4) {
        try {
          responseJson = JSON.parse(xhr.responseText);
          handleApiResponse(responseJson, cb);
        } catch (_error) {
          error = _error;
          cb("API error (status " + xhr.status + "): " + error);
        }
      }
    };
    xhr.open("POST", endpoint_url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json, text/javascript");
    xhr.setRequestHeader("Authorization", api_key);
    xhr.send(JSON.stringify(data));
  };

  handleApiResponse = function(response, cb) {
    if (response.error) {
      cb(new AlgorithmError(response.error, response.stacktrace));
    } else {
      cb(response.error, response.result);
    }
  };

  AlgorithmError = function(message, stacktrace) {
    this.message = message;
    this.stacktrace = stacktrace;
  };

  AlgorithmError.prototype.toString = function() {
    return this.message;
  };

  Proxy = function() {
    var div, windowOnLoad;
    this.connected = false;
    this.queue = [];
    this.pending = {};
    div = document.createElement("div");
    div.innerHTML = "<iframe id=\"aiFrame\" src=\"" + proxy_url + "\" height=\"0\" width=\"0\" tabindex=\"-1\" style=\"display: none;\">";
    this.iframe = div.firstChild;
    if (document.readyState === "complete") {
      document.body.appendChild(this.iframe);
    } else {
      windowOnLoad = window.onload;
      window.onload = (function(_this) {
        return function() {
          document.body.appendChild(_this.iframe);
          if (windowOnLoad) {
            return windowOnLoad();
          }
        };
      })(this);
    }
    window.addEventListener("message", (function(_this) {
      return function(event) {
        var cb;
        if (event.origin === protocol + "//" + api_hostname) {
          if (event.data.proxy === "ready") {
            _this.connected = true;
            _this.onReady();
          } else if (event.data.queryId && _this.pending[event.data.queryId]) {
            cb = _this.pending[event.data.queryId];
            delete _this.pending[event.data.queryId];
            handleApiResponse(event.data, cb);
          }
        }
      };
    })(this));
    this.query = function(algo_uri, api_key, data, cb) {
      var algo, queryId, request, user, version, _, _ref;
      if (typeof data === 'function') {
        data = data.toString();
      }
      _ref = algo_uri.match(algoPattern), _ = _ref[0], user = _ref[1], algo = _ref[2], version = _ref[3];
      queryId = Math.floor(Math.random() * 0x10000000);
      this.pending[queryId] = cb;
      request = {
        username: user,
        algoname: algo,
        version: version,
        api_key: api_key,
        input: data,
        queryId: queryId
      };
      if (this.connected) {
        this.sendRequest(request);
      } else {
        this.queue.push(request);
      }
    };
    this.sendRequest = function(request) {
      var iwindow;
      iwindow = this.iframe.contentWindow || this.iframe.contentDocument;
      iwindow.postMessage(request, "*");
    };
    this.onReady = function() {
      this.queue.forEach((function(_this) {
        return function(request) {
          return _this.sendRequest(request);
        };
      })(this));
    };
  };

  if (!window.Algorithmia) {
    window.Algorithmia = {};
  }

  window.Algorithmia.query = query;

  window.Algorithmia.queryNative = queryNative;

}).call(this);

//# sourceMappingURL=algorithmia.js.map
