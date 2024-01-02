# Android VectorDrawable to SVG

![](https://img.shields.io/github/tag/restorer/avd-to-svg.svg) [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE.txt)

There are several converters for converting vector drawables to svg (I know 3 of them, including ShapeShifter), but no one supports gradients.

This tool tries to support almost everything.

## Usage

```bash
node <path-to-avd-to-svg>/index.js <source-vector-drawable.xml> <output.svg>
```

## Mappings

- `<vector>` → `<svg>`
    - `name` → `id`
    - `viewportWidth`, `viewportHeight` → `width`, `height`, `viewBox`
    - `alpha` → `opacity`
    - `tint`, `tintMode` → **not supported, ignored**

- `<group>` → `<g>`
    - `name` → `id`
    - `translateX`, `translateY`, `pivotX`, `pivotY`, `rotation`, `scaleX`, `scaleY` → `transform`

- `<path>` → `<path>`
    - `name` → `id`
    - `pathData` → `d`
    - `fillColor` → `fill`, `fill-opacity`
    - `fillType` → `fill-rule`
    - `strokeColor` → `stroke`, `stroke-opacity`
    - `strokeWidth` → `stroke-width`
    - `strokeLineCap` → `stoke-linecap`
    - `strokeLineJoin` → `stoke-linejoin`
    - `strokeMiterLimit` → `stoke-miterlimit`
    - `trimPathStart`, `trimPathEnd`, `trimPathOffset` → `stroke-dasharray`, `stroke-dashoffset`

- `<clip-path>` → `<clipPath>` + `<path>`
    - `name` → `id`
    - `pathData` → `d` in `<path>`

- `<aapt:attr>` + `<gradient>` - supported in `<path>` for `fillColor` and `strokeColor`
    - `type` → maps to `<linearGradient>` or `<radialGradient>`
    - `startColor` → `<stop offset="0%" stop-color="..." stop-opacity="...">`
    - `centerColor` → `<stop offset="50%" stop-color="..." stop-opacity="...">`
    - `endColor` → `<stop offset="100%" stop-color="..." stop-opacity="...">`
    - `tileMode` → **not supported, ignored**

- `<item>` inside `<gradient>` → `<stop>`
    - `offset` → `offset`
    - `color` → `stop-color`, `stop-opacity`

- `<gradient android:type="linear">` → `linearGradient`
    - `startX` → `x1`
    - `startY` → `y1`
    - `endX` → `x2`
    - `endY` → `y2`

- `<gradient android:type="radial">` → `radialGradient`
    - `centerX` → `cx`
    - `centerY` → `cy`
    - `gradientRadius` → `r`

- `<gradient android:type="sweep">` → **no direct mapping in svg, converted to radialGradient**

## TODO

- [ ] Resource references (eg. `@color/some_color`)
