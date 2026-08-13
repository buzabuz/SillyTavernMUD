# UI Kit 选型记录

> 决策日期：2026-08-02
> 结论：采用 Web Awesome 3.11，渐进式接入

## 候选

### Web Awesome

- 框架无关 Web Components，可直接用于原生 HTML/JavaScript。
- 50+ 组件、主题 Token、CSS Parts、无障碍和本地化。
- 提供稳定的 Dropdown、Tooltip、Dialog、Tabs、Select 等基础组件。
- 支持 CDN 原型和 npm/webpack 正式集成。
- Shoelace 的后继项目，当前持续维护。

来源：

- [Web Awesome 官网](https://webawesome.com/)
- [Dropdown](https://webawesome.com/docs/components/dropdown)
- [Tooltip](https://webawesome.com/docs/components/tooltip)
- [Shoelace 迁移说明](https://webawesome.com/docs/resources/migrating-from-shoelace)

### Shoelace

- 技术形态适合当前项目。
- 官方已声明 sunset，不再主动开发。

结论：不用于新代码。

来源：[Shoelace 官网](https://shoelace.style/)

### Adobe Spectrum Web Components

- 组件成熟、无障碍质量高。
- 视觉语言强烈偏向 Adobe 工具产品。
- Dialog 仍需额外 Overlay 管理，局部渐进接入成本更高。

结论：不选。

来源：[Spectrum Tabs](https://opensource.adobe.com/spectrum-web-components/components/tabs/api/)

### Lion

- 无障碍和白标能力很好。
- 更接近搭建设计系统的底层基础，默认视觉和上层完整组件较少。
- 当前原型更需要可直接使用的产品组件。

结论：不选。

来源：[Lion](https://lion.js.org/)

## 接入原则

Web Awesome 不接管品牌视觉，只承担复杂基础行为：

- Dropdown 与菜单定位。
- Tooltip 的焦点、悬停和无障碍关联。
- 后续可迁移的 Dialog、Drawer、Tabs、Select。

以下组件继续自研：

- 长篇叙事回合。
- 判定卡与 3D 骰盘。
- 场景地图。
- 多维关系卡。
- 混合回合编辑器。

这些组件包含产品独有语义，套用通用 UI Kit 反而会削弱体验。

## 当前原型应用

```html
<link
  rel="stylesheet"
  href="https://ka-f.webawesome.com/webawesome@3.11.0/styles/themes/default.css"
>
<script type="module">
  import 'https://ka-f.webawesome.com/webawesome@3.11.0/components/button/button.js';
  import 'https://ka-f.webawesome.com/webawesome@3.11.0/components/dropdown/dropdown.js';
  import 'https://ka-f.webawesome.com/webawesome@3.11.0/components/dropdown-item/dropdown-item.js';
  import 'https://ka-f.webawesome.com/webawesome@3.11.0/components/tooltip/tooltip.js';
</script>
```

原型也使用按需导入，不使用全组件 autoloader。

已应用：

- `<wa-dropdown>`：混合回合编辑器中的“插入表达”菜单。
- `<wa-dropdown-item>`：台词、动作和内心模板。
- `<wa-button>`：表达菜单触发器。
- `<wa-tooltip>`：长篇角色回合操作说明。

正式并入 SillyTavern 时应改为 npm 固定版本和 webpack 按需打包，避免运行时依赖外部 CDN。
