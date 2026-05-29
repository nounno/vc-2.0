# ValueCube Design System

> 基于 VI Standard V1.0 (2026-05-19)
> Category: B2B Data Infrastructure / Home Appliance

## 1. Visual Theme & Atmosphere

ValueCube 的视觉语言建立在**深海军蓝 + 活力橙**的双色宇宙上——这是一个温暖而自信的品牌，专为家电 B2B 数据基础设施而生。

深海军蓝（`#1a1a2e`）是品牌的主画布，不同于科技行业常见的纯黑或浅灰，这个深蓝带着微微的暖调，传达"数据有温度"的品牌感受。橙色（`#FF6B35`）作为唯一的品牌强调色，像火焰一样在深色背景上燃烧，用于 CTA、数据指标、品牌关键时刻。

整体调性：**专业、可信、数据驱动、温暖而不冰冷**。

**关键特征：**
- 深海军蓝为主画布，橙色为唯一强调色
- 数据统计用橙色大字号，制造视觉冲击
- 卡片化信息布局，间距宽裕，呼吸感强
- 边框用得克制，主要靠背景色区分层级
- 无梯度、无拟物，扁平干净

## 2. Color Palette & Roles

### Primary
- **ValueCube Orange** (`#FF6B35`): 品牌核心色——CTA按钮、品牌标记、关键数据。HSL(21, 100%, 60%)，高饱和度暖橙。
- **Orange Hover** (`#e55a2b`): 悬停状态，按下时进一步加深至 `#d14f22`

### Secondary
- **Deep Navy** (`#1a1a2e`): 主背景色，深邃而不压抑，带着微暖的蓝调
- **Navy Surface** (`#232338`): 深色卡片背景，与主背景区分
- **Cool Gray** (`#f4f4f5`): 浅色区块背景，微微偏冷，区别于纯白

### Neutral
| Token | Hex | 用途 |
|-------|-----|------|
| foreground | `#171717` | 主文字（浅色背景上） |
| fg-2 | `#404040` | 次要文字 |
| muted | `#737373` | 辅助说明、元数据 |
| border | `#E5E5E5` | 边框、分割线 |

### Functional
| Token | Hex | 用途 |
|-------|-----|------|
| success | `#16a34a` | 成功状态 |
| warn | `#D97706` | 警告状态 |
| danger | `#DC2626` | 错误/危险操作 |
| info | `#2563EB` | 信息提示 |

### Gradient System
**无持久性渐变。** 视觉丰富度来自橙色强调色在深蓝背景上的对比，而非渐变。

## 3. Typography Rules

### Font Family
- **Display/Body**: `Inter, "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif`
- **Mono**: `JetBrains Mono, "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace`
- 英文优先 Inter（Google Fonts），中文备选苹方和微软雅黑，Pan-CJK 覆盖

### Type Hierarchy

| Role | Desktop | Mobile | Weight | Line Height | Tracking | Notes |
|------|---------|--------|--------|-------------|----------|-------|
| H1 / Hero Display | 60px | 36px | 700 | 1.1 | -0.02em | 页面主标题 |
| H2 / Section | 36px | 30px | 700 | 1.2 | -0.01em | 区块标题 |
| H3 / Card Title | 18px | 18px | 700 | 1.4 | 0 | 卡片标题 |
| Body | 16px | 16px | 400 | 1.6 | 0 | 正文内容 |
| Small | 14px | 14px | 400 | 1.5 | 0 | 辅助说明 |
| Caption | 12px | 12px | 400 | 1.4 | 0.02em | 标签、元数据 |
| Statistic | 48px | 36px | 700 | 1.0 | -0.02em | 数据统计数字，橙色 |

### Statistics Display
数据统计（50+、94% 等）使用 48px 橙色（`#FF6B35`）700 字重，是页面最强烈的视觉焦点，每个页面限用 2-3 处。

## 4. Component Rules

### Buttons

**Primary Button**
- Background: `#FF6B35`
- Hover: `#e55a2b`
- Active: `#d14f22`
- Text: white
- Radius: `12px` (radius-lg)
- Padding: 12px 24px
- Transition: 200ms ease
- Font: 600 weight

**Secondary Button**
- Background: transparent
- Border: 1px solid rgba(255,255,255,0.2)
- Hover: background rgba(255,255,255,0.1)
- Text: white (on dark) / foreground (on light)
- Radius: `12px`

**Text Button**
- Color: `#FF6B35`
- Hover: underline
- Font weight: 500

### Cards
- Radius: `16px` (radius-xl)
- Padding: 24px
- Background: white (light section) / `#232338` (dark section)
- Shadow (default): `0 1px 3px rgba(0,0,0,0.1)`
- Shadow (hover): `0 4px 12px rgba(0,0,0,0.15)`
- Transition: box-shadow 200ms ease, transform 200ms ease
- Hover lift: translateY(-2px)

### Navigation
- Height: 64px
- Position: sticky, top-0, z-50
- Background: `rgba(26, 26, 46, 0.92)`
- Backdrop-filter: blur(12px)
- Gap between items: 32px
- Shadow: `0 2px 8px rgba(0,0,0,0.2)`

### Input Fields
- Border: 1px solid `#E5E5E5`
- Border (focus): `#FF6B35` + focus ring
- Radius: `8px` (radius-md)
- Padding: 12px 16px
- Transition: 200ms ease

### Badges
- Padding: 4px 12px
- Radius: full (pill)
- Font size: 12px
- Font weight: 500
- Background (accent): `rgba(255, 107, 53, 0.12)`
- Text color (accent): `#FF6B35`

## 5. Layout & Spacing

### Page Structure
- Max width: 1280px
- Gutter: 64px desktop / 32px tablet / 16px mobile
- Section spacing: 96px desktop / 64px mobile

### Grid
- Desktop: 3 columns, gap 24px
- Tablet: 2 columns, gap 24px
- Mobile: 1 column

### Responsive Breakpoints
| Name | Width | Device |
|------|-------|--------|
| xs | < 640px | 手机竖屏 |
| sm | 640-768px | 手机横屏/大手机 |
| md | 768-1024px | 平板 |
| lg | 1024-1280px | 笔记本 |
| xl | ≥ 1280px | 桌面 |

## 6. Motion

### Transitions
- Default duration: 200ms
- Easing: ease (cubic-bezier(0.4, 0, 0.2, 1))
- Fast interactions: 150ms (hover states, small UI)
- Slow transitions: 300ms (page transitions, modals)

### Skeleton Loading
```css
background: linear-gradient(
  90deg,
  #E5E5E5 25%,
  #f4f4f5 50%,
  #E5E5E5 75%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```

### Counter Animation
- Duration: 2s
- Easing: ease-out
- Trigger: Intersection Observer

### Hover Effects
- Cards: translateY(-2px) + deeper shadow
- Buttons: background shift to hover color
- Links: subtle underline or color shift

## 7. Logo

### Composition
- 32×32px orange square with white Zap icon
- Followed by "ValueCube" text
- Minimum clearance: icon height / 2 on all sides

### Background Rules
| Background | Icon | Text |
|------------|------|------|
| Dark (`#1a1a2e`) | Orange | White |
| Image | Orange | White |
| Light | Orange | Dark |

### Prohibited
1. Stretch or distort
2. Change colors
3. Add shadows
4. Rotate
5. Crop
6. Separate icon from wordmark

## 8. Implementation

### CSS Variables
All tokens are defined in `tokens.css` and must be referenced via CSS variables, never hardcoded.

### Tailwind Config
See `VI-STANDARD.md` appendix for complete Tailwind configuration snippet.

### Component Library
Built on shadcn/ui with VC design tokens overlaid. See `components.html` for live component preview.
