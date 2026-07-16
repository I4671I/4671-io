# 4671's page

一个使用 [Eleventy](https://www.11ty.dev/) 生成的 Markdown 静态个人网站。

## 本地运行

需要安装 Node.js。第一次运行：

```sh
npm install
npm start
```

浏览器访问终端显示的本地地址。生成正式文件：

```sh
npm run build
```

构建结果位于 `_site/`。

## 新增文章

在 `content/posts/年份/` 中新建 Markdown 文件：

```md
---
title: 文章标题
date: 2026-07-16
description: 一句话摘要。
readingTime: 3
tags:
  - 日常
  - 建站
layout: layouts/post.njk
permalink: posts/2026/article-name.html
---

从这里开始写正文。
```

保存后，首页最新文章、文章归档、文章页左侧导航和标签页面都会自动更新。

全站公共样式位于 `assets/css/main.css`，文章正文与侧栏样式位于 `assets/css/post.css`。主要字体仍为 `Source Serif 4`，中文回退字体为 `LXGW Zhuque Fangsong`。
