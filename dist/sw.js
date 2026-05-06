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
    "revision": "3b8a7c0183c44ee8827ee67be42a42bd"
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
    "url": "assets/vendor-tanstack-ljurUkit.js",
    "revision": null
  }, {
    "url": "assets/vendor-jspdf-C_JYak0-.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-vdXCJOmt.js",
    "revision": null
  }, {
    "url": "assets/vendor-framer-BUBGjcc-.js",
    "revision": null
  }, {
    "url": "assets/use-thiet-lap-khac-CT5uRHk4.js",
    "revision": null
  }, {
    "url": "assets/use-chuc-vu-DOPVV9vx.js",
    "revision": null
  }, {
    "url": "assets/use-can-DVNhgCAQ.js",
    "revision": null
  }, {
    "url": "assets/the-loai-form-DTXSMgWi.js",
    "revision": null
  }, {
    "url": "assets/schema-Bn49RtKi.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bzr520pe.js",
    "revision": null
  }, {
    "url": "assets/phong-ban-form-PMT-88Tq.js",
    "revision": null
  }, {
    "url": "assets/phong-ban-detail-CG_Zsfsl.js",
    "revision": null
  }, {
    "url": "assets/nhan-vien-form-Djvpe9h-.js",
    "revision": null
  }, {
    "url": "assets/nhan-vien-detail-DzhUfLR_.js",
    "revision": null
  }, {
    "url": "assets/khac-form-BAxeySl9.js",
    "revision": null
  }, {
    "url": "assets/index.es-B5-c_5fm.js",
    "revision": null
  }, {
    "url": "assets/index-lcyvk-CS.css",
    "revision": null
  }, {
    "url": "assets/index-RRqRnGMn.js",
    "revision": null
  }, {
    "url": "assets/index-Dgmb-R37.js",
    "revision": null
  }, {
    "url": "assets/index-DXNRBZlc.js",
    "revision": null
  }, {
    "url": "assets/index-DDqg2NMQ.js",
    "revision": null
  }, {
    "url": "assets/index-D7oiL2BC.js",
    "revision": null
  }, {
    "url": "assets/index-D1l5Xo4b.js",
    "revision": null
  }, {
    "url": "assets/index-Cvac-BHz.js",
    "revision": null
  }, {
    "url": "assets/index-C15aTJTn.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-DXEQVQnt.js",
    "revision": null
  }, {
    "url": "assets/chuc-vu-form-F_fCxJwB.js",
    "revision": null
  }, {
    "url": "assets/chuc-vu-detail-D5L5Rzwx.js",
    "revision": null
  }, {
    "url": "assets/bai-viet-form-BwNCB6g1.js",
    "revision": null
  }, {
    "url": "assets/bai-viet-detail-VJrIqMQS.js",
    "revision": null
  }, {
    "url": "assets/article-the-loai-detail-DP3PwLo6.js",
    "revision": null
  }, {
    "url": "assets/article-khac-detail-yZOPFjxr.js",
    "revision": null
  }, {
    "url": "assets/Textarea-Coc_tzPg.js",
    "revision": null
  }, {
    "url": "assets/TabGroup-14epodQC.js",
    "revision": null
  }, {
    "url": "assets/StatusToggle-DCDvUylO.js",
    "revision": null
  }, {
    "url": "assets/MobileListCard-CtdRCn1K.js",
    "revision": null
  }, {
    "url": "assets/LoadingSpinnerWithText-D4jGwQOC.js",
    "revision": null
  }, {
    "url": "assets/ImportDialog-CI5wJseR.js",
    "revision": null
  }, {
    "url": "assets/GenericTable-pUbHry04.js",
    "revision": null
  }, {
    "url": "assets/GenericDrawer-BhwtQAxk.js",
    "revision": null
  }, {
    "url": "assets/FormGrid-BnPSS1_Y.js",
    "revision": null
  }, {
    "url": "assets/ExportDialog-BFQKezl9.js",
    "revision": null
  }, {
    "url": "assets/EmployeeColumnHeaderSearch-CbwVE4ez.js",
    "revision": null
  }, {
    "url": "assets/EmployeeColumnHeaderFilter-CxNATP7G.js",
    "revision": null
  }, {
    "url": "assets/DataTableRowActions-B7rJxVM2.js",
    "revision": null
  }, {
    "url": "assets/CurrencyInput-BwxPxYoi.js",
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
