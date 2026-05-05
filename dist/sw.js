/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-ca84f546'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "index.html",
    "revision": "774d9b02c19566fad22c917876afb8e2"
  }, {
    "url": "favicon.svg",
    "revision": "0c103376318df03758d733bc377b28ca"
  }, {
    "url": "assets/xlsx-CNerDvZX.js",
    "revision": null
  }, {
    "url": "assets/workbox-window.prod.es5-BIl4cyR9.js",
    "revision": null
  }, {
    "url": "assets/vendor-tanstack-0HEaS6QX.js",
    "revision": null
  }, {
    "url": "assets/vendor-jspdf-CGsmjyrN.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-097PiHmJ.js",
    "revision": null
  }, {
    "url": "assets/vendor-framer-DoU9xMD0.js",
    "revision": null
  }, {
    "url": "assets/useExportData-BQDOHVef.js",
    "revision": null
  }, {
    "url": "assets/use-can-C1gvNNho.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bzr520pe.js",
    "revision": null
  }, {
    "url": "assets/phong-ban-form-Qqg-Hjui.js",
    "revision": null
  }, {
    "url": "assets/phong-ban-detail-B84u35OW.js",
    "revision": null
  }, {
    "url": "assets/nhan-vien-form-Dg-1hcCP.js",
    "revision": null
  }, {
    "url": "assets/nhan-vien-detail-CmARfEAy.js",
    "revision": null
  }, {
    "url": "assets/index.es-CxTiknO2.js",
    "revision": null
  }, {
    "url": "assets/index-ZFa56PEJ.js",
    "revision": null
  }, {
    "url": "assets/index-DR35X0Rp.css",
    "revision": null
  }, {
    "url": "assets/index-D3_tnGEe.js",
    "revision": null
  }, {
    "url": "assets/index-CzLyvyZE.js",
    "revision": null
  }, {
    "url": "assets/index-CU_MfCsX.js",
    "revision": null
  }, {
    "url": "assets/index-Bs2TOXNq.js",
    "revision": null
  }, {
    "url": "assets/index-BRZwa-M4.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-DXEQVQnt.js",
    "revision": null
  }, {
    "url": "assets/hooks-DavczCA_.js",
    "revision": null
  }, {
    "url": "assets/chuc-vu-form-DPPBHsuA.js",
    "revision": null
  }, {
    "url": "assets/chuc-vu-detail-B1SK1nyL.js",
    "revision": null
  }, {
    "url": "assets/StatusToggle-DAed4BAo.js",
    "revision": null
  }, {
    "url": "assets/MobileListCard-CqBDWu1R.js",
    "revision": null
  }, {
    "url": "assets/LoadingSpinnerWithText-BQ-lG9yB.js",
    "revision": null
  }, {
    "url": "assets/GenericTable-BZY3WYxC.js",
    "revision": null
  }, {
    "url": "assets/GenericDrawer-hNtBC-Iz.js",
    "revision": null
  }, {
    "url": "assets/FormGrid-D84opkyj.js",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "0c103376318df03758d733bc377b28ca"
  }, {
    "url": "manifest.webmanifest",
    "revision": "2d744ef407f762851cd053947b8b3826"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
