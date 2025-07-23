# SimpleChat

This is a simple real-time chatting platform made using Node JS.

## How to run

install the required modules:

`npm install`

change the "PORT" variable to a port you like in server.js. default is 3000

run the server:

`npm run start`

now the app is available at [this url](http://localhost:3000) ( The port can change if you change it in the server.js file )

## Hosting to the public

if you want to open this to the public internet, install 'cloudflared' on your system and run:

`cloudflared tunnel --url http://localhost:3000` 

you will get a public link you can share
