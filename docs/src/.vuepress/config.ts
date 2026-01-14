import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";

import theme from "./theme.js";
import { VERSION } from "./version.js";

export default defineUserConfig({
  base: "/projects/sftool/",

  locales: {
    "/en/": {
      lang: "en-US",
      title: "sftool-gui",
      description: "sftool-gui",
    },
    "/": {
      lang: "zh-CN",
      title: "sftool-gui",
      description: "sftool-gui",
    },
  },

  theme,

  bundler: viteBundler({
    viteOptions: {
      define: {
        __VERSION__: JSON.stringify(VERSION),
      },
    },
  }),

  head: [
    [
      'script',
      {},
      `
      var _hmt = _hmt || [];
      (function() {
        var hm = document.createElement(\"script\");
        hm.src = \"https://hm.baidu.com/hm.js?b12a52eecef6bedee8b8e2d510346a6e\";
        var s = document.getElementsByTagName(\"script\")[0]; 
        s.parentNode.insertBefore(hm, s);
      })();
      `
    ]
  ],
  // Enable it with pwa
  // shouldPrefetch: false,
});
