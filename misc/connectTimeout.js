const connectTimeout = function(defaultTimeout = 15000, defaultResponse) {
  const defaultResponder = defaultResponse instanceof Function ? defaultResponse : function() { return defaultResponse }
  return function(req, res) {
    const startTime = Date.now();
    let id = -1;
    let timeout = defaultTimeout;
    let finished = false;
    const onTimeout = function() {
      if (finished) return;
      res.send(res.onTimeout() || {
        err: 'timeout'
      });
      res.timedOut = true;
    }
    req.on('response', function() {
      clearTimeout(id);
      finished = true;
    })
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
  }
}
module.exports = connectTimeout;