const request = require('request')

// Needed to bypass "Hotlinking is Disabled" from newgrounds.
module.exports = async (app, req, res, api, analyze) => {
  if (!validURL(req.params.audio))
    return res.send('Invalid URL!');
  request
    .get(req.params.audio)
    .on('error', (err) => {
      return res.send('An error occured! ' + err);
    })
    .pipe(res);
}

function validURL(str) {
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}