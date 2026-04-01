const { runProxy } = require('../_sharedProxy.js');
module.exports = async (req, res) => runProxy(req, res, 'auth/signup');
