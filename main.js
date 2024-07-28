const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const geo = require('./geo');  // 
const usersModule = require('./users');  // 
const blacklist = require('./blacklist');  // 
const api = require('./api');  // 

const app = express();
const port = 8080;

const start = Date.now();
const dataPath = '/storage/data';

const mUsers = usersModule.load(path.join(dataPath, 'users.jsonl'));

if (!mUsers.register({ login: 'user_login', password: 'password' })) {
  console.error('Error registering user');
  process.exit(1);
}

console.log(`Users loaded in ${(Date.now() - start) / 1000} seconds`);

const mGeo = new geo(path.join(dataPath, 'GeoLite2-City-CSV'));
const mBlacklistSubnets = new blacklist.Subnets();

console.log(`Ready in ${(Date.now() - start) / 1000} seconds`);

app.use(cors({
  origin: '*',
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-API-Key'
}));

app.options('*', (req, res) => {
  res.sendStatus(200);
});

api.init(app, mUsers, mGeo, mBlacklistSubnets);

http.createServer(app).listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
