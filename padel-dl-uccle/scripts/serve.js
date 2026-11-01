#!/usr/bin/env node
// Petit serveur local pour la démo : http://localhost:8080 (aucune dépendance).
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path');
const file = path.join(__dirname, '..', 'dist', 'demo', 'index.html');
const port = +process.env.PORT || 8080;
http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res); })
  .listen(port, '127.0.0.1', () => console.log('Démo : http://localhost:' + port + ' (données fictives)'));
