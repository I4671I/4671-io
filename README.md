# 4671.io

## 新增文章

在`content/posts/[年份]/`新建md文件，模板位于根目录。其中`date`如果不填写会在部署时自动补全。

## 本地运行

需要安装 Node.js。第一次运行：

```sh
npm install
```

打开本地预览：

```sh
npm start
```

生成正式文件：

```sh
npm run build
```

## 致谢

本站使用了以下开源项目：

- [Eleventy](https://github.com/11ty/eleventy)：静态网站生成器
- [KaTeX](https://github.com/KaTeX/KaTeX)：数学公式排版
- [markdown-it-texmath](https://github.com/goessner/markdown-it-texmath)：Markdown 数学公式解析
- [giscus](https://github.com/giscus/giscus)：基于 GitHub Discussions 的评论系统

使用的字体：

中文：`LXGW Zhuque Fangsong`、`宋体`（仅限代码块）

英文：`Source Serif 4`、`Consolas`（仅限代码块）

[Source Serif](https://github.com/adobe-fonts/source-serif)

[朱雀仿宋](https://github.com/TrionesType/zhuque)