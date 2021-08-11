---
title: Dockerizing a React+Django app using docker-compose
description: "
Dockerizing a React/Django/MySQL application using docker-compose so that it can be easily run/shared on various machines without worrying about dependencies.
"
date: 2020-07-20T08:47:11+01:00
# tldr: "tldr goes here"
# draft: true
tags: [docker-compose,django]
---


Recently I had built a Django-React app and wanted to share it with a friend at which point I realized the need for dockerizing my app. We'll use docker-compose to run and manage our docker containers. Docker is a tool that helps to create, deploy and run containers. Containers are self-sufficient software executables that contain everything that is needed to run it (code, runtime, system tools, system libraries and settings), meaning you can run containerized apps without any dependency on your system.

Before starting we'll need to break my app into smaller independent services that can function on their own in their separate containers and then connect those containers so that our app can function again.We'll break our app into 3 smaller services: Django server, MySQL server and React website

This is my file structure (minus the docker related files).
```
├── server
│   ├── Dockerfile
|   ├── requirements.txt
|   ├── manage.py
|   └── (Other files)
├── website
|   ├── Dockerfile
|   ├── yarn.lock
|   ├── package.json
|   └── (Other files)
├── .env
└── docker-compose.yml
```


## Building your containers

Let's start creating a container for our services. We will be packaging the runtime, and system libraries that are needed for running our applications.

### Add Runtime
Let's start with the runtime that is needed for our applications. Luckily Docker provides us a base image for our required runtime. We need [python](https://hub.docker.com/_/python) for our Django server and [node](https://hub.docker.com/_/node) for our react service.

### Install Dependencies
We will install the required packages that are needed to run our services. We can copy `requirements.txt`, `yarn.lock` & `package.json` inside our container and use pip/npm to download our dependencies.

### Additional configuration
We can add any additional configuration that might be needed to run our service. 

We will set the __`PYTHONUNBUFFERED`__ flag to turn off buffering for logging in our server. 
For react we'll add the installed __`node_modules`__ to our path so that it can be accessed from anywhere inside the container.

we'll also set our default working directory to be used later.

This is what our final Dockerfiles should look like 



{{<code file="server/Dockerfile" codeLang="Dockerfile">}}
FROM python:latest
ENV PYTHONUNBUFFERED 1
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
WORKDIR /app
{{</code>}}

{{<code file="website/Dockerfile" codeLang="Dockerfile">}}
FROM node:latest
COPY yarn.lock package.json ./
RUN yarn install
ENV PATH "/node_modules/.bin:${PATH}"
WORKDIR /app
{{</code>}}

## Running your Application

Now that we have our containers ready, we need to organize and connect our services to create back our app. We'll use docker-compose to manage our services. 

### Adding our services
Let's add our services in the `docker-compose.yml` file.

For MySQL we'll specify the corresponding [image](https://hub.docker.com/_/mysql) that can be used. For Django and React we'll be using the containers that we have created. We’ll specify the context for services that is the path from which those containers are to be built. In our case it's the folder containing the Dockerfile

```yml
version: '3'

services:
  mysql:
    image: mysql:5.7

  server:
    build: ./server
  
  website:
    build: ./website
```

### Adding our code
Next we are going to mount our code folders into the containers so that we can run it inside the container. Unlike earlier where we baked our dependencies into the container we are only mounting our local folders inside the container which means changing our code locally will update it within the container without needing to restart or rebuild the container.
{{< highlight yml "linenos=false,hl_lines=4 5 9 10" >}}
....
  server:
    build: ./server
    volumes:
      - ./server:/app
  
  website:
    build: ./website
    volumes:
      - ./website:/app
{{< / highlight >}}
### Adding Runtime Environment Variables
We'll add some environment variables that our services need using .env files. This is different from the environment variables specified while building our containers since these values can change between runs analogous to command-line arguments
```shell
#Environment variables used by MySQL container.
MySQL_DATABASE=MY_DB
MySQL_USER=ABC
MySQL_PASSWORD=PASSWORD
MySQL_ROOT_PASSWORD=ROOT_PASSWORD
```
{{< highlight yml "linenos=false,hl_lines=4 5 9 10" >}}
....
  mysql:
  ......
    env_file:
      - .env

  server:
  ......
    env_file:
      - .env
............
{{< / highlight >}}
### Services networking
Each service in docker is isolated for security purposes, which means we will have to expose our services so that they can communicate within them as well can be accessed on the host machine. 

Also since each service is its own container we need to pass the appropriate addresses to their containers. Fortunately, Docker has got our back here and we don't need to worry about ip addresses, we can simply pass container names as urls which docker then resolves to the corresponding ip.
{{< highlight yml "linenos=false,hl_lines=4 5 9 10 14 15" >}}
....
  mysql:
  ......
    ports:
      - '3306'

  server:
  ......
    ports:
      - "8000:8000"

  website:
  ......
    ports:
      - "3000:3000"
............
{{< / highlight >}}
### Start commands
Now that our services are all setup we can add a startup command that will be executed each time we start the container. we can use this to start the service inside the container.

{{< highlight yml "linenos=false,hl_lines=4 5 9 10 14 15" >}}
....
  server:
    command: python manage.py runserver 0:8000
  ......

  website:
    command: yarn start
............
{{< / highlight >}}

### Wrapping up
We have finally setup our docker app.
Our compose file should look like
{{<code file="docker-compose.yml" codeLang="yml">}}
version: '3'

services:
  mysql:
    image: mysql:5.7
    ports:
      - '3306'
    
    env_file:
     - .env

  server:
    build: .
    command: python manage.py runserver 0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - mysql
    env_file:
      - .env
  
  website:
    build: ./website
    command: yarn start
    volumes:
        - ./website:/app
    ports:
      - "3000:3000"
{{</code>}}

let's go ahead and start it using

```shell
docker-compose up -d
```
We should be able to see our app running locally on [localhost:3000](localhost:3000).


**Running Django migrations**

On your first run you might encounter an error since we have yet to run django migrations, we can do so by running

```shell
docker-compose exec server python manage.py makemigrations
docker-compose exec server python manage.py migrate
```

## Summary

Dockerizing your app might be complicated especially if you have multiple services. It might be a little hard to visualize how docker works and how each container interacts with each other but once you get the hang of it is the default option for development because of the immense benefits it provides. In the end we
- split our app into its component services
- created docker containers using docker file
- used docker-compose to orchestrate these containers and run our app
