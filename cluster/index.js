var EventEmitter = require('events').EventEmitter
var hyperquest = require('hyperquest')
var async = require('async')
var util = require('util')
var multireq = require('./multireq')

function Cluster(){
	EventEmitter.call(this)

}

util.inherits(Cluster, EventEmitter)

module.exports = Cluster

Cluster.prototype.find = function(id, done){
	this.emit('list', function(err, servers){
		if(err) return done(err)
		servers = (servers || '').split(',')
	})
}		

module.exports = function(){

	return new Cluster()

}