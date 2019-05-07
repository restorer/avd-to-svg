# Android VectorDrawable to SVG

There are several converters for converting vector drawables to svg (I know 3 of them, including ShapeShifter), but no one supports gradients. This converter tries to support almost everything from vector drawable:

- Paths;
- Groups;
- Clip-paths;
- Gradients;
- Trim path emulation via `stroke-dasharray`.

Currently not supported:

- `tint`, `tintMode`;
- `tileMode`.

## Usage

```bash
node <path-to-avd-to-svg>/index.js <source-vector-drawable.xml> <output.svg>
```
