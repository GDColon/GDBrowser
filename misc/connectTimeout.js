const connectTimeout = function(defaultTimeout = 15000, defaultResponse) {
  const defaultResponder = defaultResponse instanceof Function ? defaultResponse : function() { return defaultResponse }
  return function(req, res) {
    const startTime = Date.now();
    let id = -1;
    let timeout = defaultTimeout;
    const onTimeout = function() {
      res.send(res.onTimeout() || {
        err: 'timeout'
      });
    }
    req.on('response', function() {
      clearTimeout(id);
    })
    const createTimeout = function() {
      clearTimeout(id);
      if (Date.now() - startTime >= timeout) {
        onTimeout();
      } else {
        id = setTimeout(onTimeout, timeout);
      }
    }
    res.onTimeout = defaultResponder;
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