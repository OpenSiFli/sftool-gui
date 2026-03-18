import { navbar } from "vuepress-theme-hope";

export const zhNavbar = navbar([
  "/zh_CN/",
  {
    text: "快速入门",
    icon: "lightbulb",
    link: "/zh_CN/get-started/",
  },
  {
    text: "进阶功能",
    icon: "fa-solid fa-sitemap",
    link: "/zh_CN/Feature/",
  },
  {
    text: "常见问题",
    icon: "fa-solid fa-comment-dots",
    link: "/zh_CN/FAQs/",
  },
]);
