var EventEmitter = require('events').EventEmitter
var hyperquest = require('hyperquest')
var async = require('async')
var util = require('util')
var ps = require('./ps')

function Cluster(){
	EventEmitter.call(this)

}

util.inherits(Cluster, EventEmitter)

module.exports = Cluster

/*

	this could do with some kind of cache innit
	
*/
Cluster.prototype.find = function(id, done){
	this.emit('list', function(err, servers){
		if(err) return done(err)
		servers = (servers || '').split(',')
		ps
	})
}		

module.exports = function(){

	return new Cluster()

}