var hyperquest = require('hyperquest')
var async = require('async')

module.exports = function(req, addresses, done){

	var fns = {}
	addresses.forEach(function(address){
		fns[address] = function(next){
			hyperquest
		}
	})

	async.parallel(fns, function(err, results){
		
	})

}