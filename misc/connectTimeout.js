const connectTimeout = function(defaultTimeout = 15000, defaultResponse) {
  const defaultResponder = defaultResponse instanceof Function ? defaultResponse : function() { return defaultResponse }
  return function(req, res, next) {
    const startTime = Date.now();
    let id = -1;
    let timeout = defaultTimeout;
    const onTimeout = function() {
      if (res.headersSent) return;
      res.send(res.onTimeout() || {
        err: 'timeout'
      });
      for (const k in res) {
        if (res[k] instanceof Function) res[k] = () => {}; // basically disable the response
      }
      res.timedOut = true;
    }
    const createTimeout = function() {
      clearTimeout(id);
      const diff = Date.now() - startTime;
      if (diff >= timeout) {
        onTimeout();
      } else {
        id = setTimeout(onTimeout, timeout - diff);
      }
    }
    res.onTimeout = defaultResponder;
    res.timedOut = false;
    Object.defineProperty(res, 'timeout', {
      get: function() {
        return timeout;
      },
      set: function(newTimeout) {
        timeout = newTimeout;
        createTimeout();
      }
    });
    createTimeout();
    next();
  }
}
module.exports = connectTimeout;