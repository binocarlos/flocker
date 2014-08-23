var from = require('from2')

function collectionKey(st, isName){
	return 'container:' + (isName ? '/' : '') + st
}

// make a readable stream from a string
function fromString(string) {
  return from(function(size, next) {
    if (string.length <= 0) return this.push(null)
    var chunk = string.slice(0, size)
    string = string.slice(size)
    next(null, chunk)
  })
}

// make a clone of a HTTP request but with a new body ready to stream
function cloneReq(req, newContent){
	var newReq = fromString(newContent)
	newReq.url = req.url
	newReq.method = req.method
	newReq.headers = req.headers || {}
	newReq.headers['content-length'] = newContent.length
	return newReq
}

module.exports = {
	collectionKey:collectionKey,
	cloneReq:cloneReq,
	fromString:fromString
}