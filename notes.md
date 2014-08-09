## notes

the basic idea is to present a HTTP endpoint that replicates the Docker API

most docker commands are targeted at a specific container/image - the exceptions are:

 * docker run
 * docker ps

run needs to target a specific server
ps needs to run across all servers

the job of flocker is to do the HTTP proxying with custom routing so you can use standard docker clients to speak to a mesh

## docker run

this involves a few steps after routing:

 * emit 'allocate' event
 * check if image exists
 * pull if not exists or update=true
 * stream pull response into main response without ending main response
 * inspect image to get auto ports
 * emit 'container' event
 * run /containers/create

## PROBLEM!

the aim of this module is to provide a docker cli client compatable router for a backend network of dockers.

There is one problem that arises with this when the user does a docker run:

 * /containers/create?name=stub1
 * routing applied (serverA)
 * 404 response
 * client gets 404
 * /images/create?fromImage=binocarlos/bring-a-ping&tag=apples
 * routing applied (serverB)
 * image downloads
 * client gets 200
 * /containers/create?name=stub1
 * routing applied (serverC)

You can see the problem is that the docker client is stateless and yet docker run requires multiple steps

We shall log requests to /containers/create - if 404 then save the allocation temporarily

Then - the next /images/create + /containers/create get sent to that location