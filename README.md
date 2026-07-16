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
description: 一句话摘要。
tags:
  - 日常
  - 建站
---

从这里开始写正文。
```

`date` 可以手工填写：

```yaml
date: 2026-07-16
```

如果省略，在本地执行 `npm start`、`npm run build`，或推送到 GitHub 后触发自动部署时，系统会按照 Asia/Shanghai 时区将当天日期写入 Markdown 文件。GitHub Actions 会把自动生成的日期提交回 `main` 分支；写入后日期不会随以后构建而变化。

以下字段通常不需要填写，但可以按篇覆盖自动设置：

```yaml
layout: layouts/post.njk
permalink: posts/2026/custom-address.html
readingTime: 5
```

文件名会自动成为文章地址。例如：

```text
content/posts/2026/article-name.md
→ /posts/2026/article-name.html
```

保存后，缺省的日期、文章布局、阅读时间、永久链接，以及首页最新文章、文章归档、文章页左侧导航和标签页面都会自动生成。

全站公共样式位于 `assets/css/main.css`，文章正文与侧栏样式位于 `assets/css/post.css`。主要字体仍为 `Source Serif 4`，中文回退字体为 `LXGW Zhuque Fangsong`。
