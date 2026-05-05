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
    "revision": "832a1f4150722576db32279bb5ed48c3"
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
    "url": "assets/vendor-tanstack-2N3wgl_x.js",
    "revision": null
  }, {
    "url": "assets/vendor-recharts-CrSg0OCH.js",
    "revision": null
  }, {
    "url": "assets/vendor-jspdf-B5dCyAFS.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-CoOiyuKI.js",
    "revision": null
  }, {
    "url": "assets/vendor-framer-DskMyHn2.js",
    "revision": null
  }, {
    "url": "assets/useExportData-CXDVL_sF.js",
    "revision": null
  }, {
    "url": "assets/use-cap-bac-DPXfXtFS.js",
    "revision": null
  }, {
    "url": "assets/use-can-CqQd7T7Y.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bzr520pe.js",
    "revision": null
  }, {
    "url": "assets/phong-ban-form-B2FZFs3p.js",
    "revision": null
  }, {
    "url": "assets/phong-ban-detail-BnXsHb4j.js",
    "revision": null
  }, {
    "url": "assets/nhan-vien-form--N6hk7yj.js",
    "revision": null
  }, {
    "url": "assets/nhan-vien-detail-BLGUoIoR.js",
    "revision": null
  }, {
    "url": "assets/index.es-CSSlUGGR.js",
    "revision": null
  }, {
    "url": "assets/index-vF5m7mNA.css",
    "revision": null
  }, {
    "url": "assets/index-UPtwYJMS.js",
    "revision": null
  }, {
    "url": "assets/index-DQRFEEb2.js",
    "revision": null
  }, {
    "url": "assets/index-D2GLaj69.js",
    "revision": null
  }, {
    "url": "assets/index-Brz6hyfG.js",
    "revision": null
  }, {
    "url": "assets/index-BCw2CEoS.js",
    "revision": null
  }, {
    "url": "assets/index-B5DPxHge.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-DXEQVQnt.js",
    "revision": null
  }, {
    "url": "assets/employee-field-meta-pwhTVctk.js",
    "revision": null
  }, {
    "url": "assets/chuc-vu-form-CTRnkHwc.js",
    "revision": null
  }, {
    "url": "assets/chuc-vu-detail-CGUu7Q_l.js",
    "revision": null
  }, {
    "url": "assets/Textarea-Do9Nvupk.js",
    "revision": null
  }, {
    "url": "assets/MobileListCard-CGH_LPW3.js",
    "revision": null
  }, {
    "url": "assets/LoadingSpinnerWithText-BreHIzFl.js",
    "revision": null
  }, {
    "url": "assets/GenericTable-Cvt0llbf.js",
    "revision": null
  }, {
    "url": "assets/GenericDrawer-DU8HepRK.js",
    "revision": null
  }, {
    "url": "assets/FormSection-6bynbxxH.js",
    "revision": null
  }, {
    "url": "assets/FormDrawerFooter-Dfn_6H2D.js",
    "revision": null
  }, {
    "url": "assets/EmployeeProfilePreviewPage-A1cm_Frb.js",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "0c103376318df03758d733bc377b28ca"
  }, {
    "url": "manifest.webmanifest",
    "revision": "61137d2b65cf2826da4327ced1d2a328"
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
