// These are important and needed before anything else
import 'zone.js/dist/zone-node';
import 'reflect-metadata';

import { renderModuleFactory } from '@angular/platform-server';
import { enableProdMode } from '@angular/core';
import * as express from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { RenderOptions } from '@nguniversal/express-engine';
import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require('../../../dist/samvloeberghs/server/main');
const { provideModuleMap } = require('@nguniversal/module-map-ngfactory-loader');

// Faster server renders w/ prod mode
enableProdMode();

// Express server
const app = express();
const PORT = 8443;
const DIST_FOLDER = join(process.cwd(), 'server', 'samvloeberghs');

app.set('view engine', 'html');
app.set('views', join(DIST_FOLDER, 'browser'));

// serve static files from /browser
app.get('*.*', express.static(join(DIST_FOLDER, 'browser')));

// Our index.html we'll use as our template
const template = readFileSync(join(DIST_FOLDER, 'browser', 'index.html')).toString();

app.engine('html', (_, options: RenderOptions, callback) => {
  renderModuleFactory(AppServerModuleNgFactory, {
    document: template,
    url: options.req.url,
    extraProviders: [
      provideModuleMap(LAZY_MODULE_MAP),
      {
        provide: REQUEST,
        useValue: options.req,
      },
      {
        provide: RESPONSE,
        useValue: options.req.res,
      },
    ],
  }).then(html => {
    callback(null, html);
  });
});

const cache = require('memory-cache');

const ngApp = (req, res) => {
  const config = {
    req,
    res,
    preboot: true,
    baseUrl: '/',
    requestUrl: req.originalUrl,
    originUrl: 'http://localhost:80',
  };

  const allowedPages = ['/', '/about', '/contact'];

  if (allowedPages.includes(req.originalUrl)) {
    const entry = cache.get(req.originalUrl); // check if we have a cache entry
    if (entry) {
      res.send(entry);                        // send the cache entry
    } else {
      res.render('index', config, (err, html) => {
        cache.put(req.originalUrl, html);     // save the rendered HTML in the cache
        res.send(html);
      });
    }
  } else {
    res.render('index', config);        // just render with no cache
  }
};

app.get('*', ngApp);

// Start up the Node server
app.listen(PORT, () => {
  console.log(`Node server listening on port ${PORT}`);
});
