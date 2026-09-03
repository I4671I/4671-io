# 4671.io

## 新增文章

在`content/posts/[年份]/`新建md文件，模板位于根目录。其中`date`如果不填写会在部署时自动补全。

如果相邻段落间有空行则会增加段落行间距。

注意文章开头信息部分里的`title`算作一级标题，建议文章内部的标题从二级标题开始。

在标准图片语法后紧跟`{width=宽度}`可以调整图片宽度，范围为0到1：

```md
![图片说明](/assets/images/example.jpg){width=0.5}
<!-- 这两条等价 -->
![图片说明](/assets/images/example.jpg){width=50%}
```

## 本地运行测试

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

## 评论区称号

评论区称号配置位于`_data/commentTitles.json`，key为GitHub用户名。单个称号可以直接写成字符串，多个称号使用数组，并按数组顺序显示：

```json
{
  "I4671I": "站长",
  "another-user": ["作者", "摄影师"]
}
```

## 致谢

本站使用了以下开源项目：

- [Eleventy](https://github.com/11ty/eleventy)：静态网站生成器
- [KaTeX](https://github.com/KaTeX/KaTeX)：数学公式排版
- [markdown-it-texmath](https://github.com/goessner/markdown-it-texmath)：Markdown 数学公式解析
- [giscus](https://github.com/giscus/giscus)：基于 GitHub Discussions 的评论系统

使用的字体：

中文：[朱雀仿宋](https://github.com/TrionesType/zhuque)、`宋体`（代码块）
英文：[Source Serif 4](https://github.com/adobe-fonts/source-serif)、`Consolas`（代码块）

参考主题配色：`One Monokai`
