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