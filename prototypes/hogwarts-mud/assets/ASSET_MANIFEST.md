# 原型素材清单

生成日期：2026-08-02
生成工具：Crate CLI v0.5.1
生成模型：GPT Image 1.5

## archive-texture

- 原图：`raw/archive-texture.png`
- 优化图：`processed/archive-texture.jpg`
- 尺寸：1536 × 1024
- 用途：暗色学院档案风格的低对比背景材质
- 限制：不包含官方纹章、影视角色、Logo 或文字

Prompt：

> Seamless dark academic magical archive background texture for a dense desktop role-playing game interface, nearly black walnut wood and charcoal bookbinding leather, subtle aged parchment fibers, sparse antique brass filigree lines and tiny diamond corner ornaments, extremely low contrast center area for readable text overlays, handcrafted scholarly atmosphere, no recognizable franchise symbols, no crests, no characters, no objects, no text, no letters, no watermark, no frame, flat front-facing material study, realistic premium game UI texture

## icon-sheet-green

- 原图：`raw/icon-sheet-green.png`
- 尺寸：1024 × 1024
- 布局：2 × 2
- 色键：绿色

Prompt：

> Four separate premium dark-academia game UI icons arranged in a precise 2 by 2 grid with wide empty spacing: top left a twenty-sided die D20 without any numerals, top right a slender carved magic wand, bottom left an antique glass memory vial with a tiny brass stopper, bottom right a folded enchanted map with no writing. Consistent 2.5D antique brass and dark walnut material, centered isolated objects, front three-quarter view, crisp silhouettes, no cast shadows, no glow, no text, no letters, no watermark. Every background pixel must be one perfectly uniform flat chroma key green color RGB 0 255 0, no gradient, no texture, no green reflections on objects.

## 透明图标

由 `process_icons.swift` 分区并去除绿色溢色：

- `processed/icon-d20.png`
- `processed/icon-wand.png`
- `processed/icon-memory-vial.png`
- `processed/icon-map.png`

统一尺寸：512 × 512，RGBA PNG。

复现命令：

```bash
swift ../process_icons.swift \
  raw/icon-sheet-green.png \
  processed
```

## 检查记录

- 四个图标均检测到 Alpha 通道。
- 魔杖图标已在白色和 `#0b0d10` 深色背景下复查。
- 首轮阈值存在轻微绿色轮廓，已提高色键灵敏度并增加全边缘去绿处理。
- 背景纹理由约 3.4MB PNG 转为约 698KB JPEG。
