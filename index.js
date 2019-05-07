/*

MIT License

Copyright (c) 2019 Viachaslau Tratsiak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

"use strict";

const fs = require("fs");
const util = require("util");
const xmlJs = require("xml-js");

fs.readFileAsync = util.promisify(fs.readFile);
fs.writeFileAsync = util.promisify(fs.writeFile);

function stripCommentNodes(elements) {
    return elements.filter(node => node.type !== "comment");
}

function requireElement(node, name) {
    if (node.type !== "element") {
        throw new Error(`Element expected: ${util.inspect(node)}`);
    }

    if (typeof name !== "undefined" && node.name !== name) {
        throw new Error(`"${name}" element expected: ${util.inspect(node)}`);
    }

    return node;
}

function requireSingleChild(node, name) {
    const elements = stripCommentNodes(node.elements || []);

    if (elements.length !== 1) {
        throw new Error(`Single element expected: ${util.inspect(node)}`);
    }

    return requireElement(elements[0], name);
}

function requireAttribute(element, name) {
    if (typeof element.attributes[name] === "undefined") {
        throw new Error(`Failed to get "${name}" attribute: ${util.inspect(element)}`);
    }

    return element.attributes[name];
}

function optAttribute(element, name) {
    return ((typeof element.attributes === "undefined" || typeof element.attributes[name] === "undefined") ? null : element.attributes[name]);
}

function transformNotNull(element, transformer) {
    return (element === null ? null : transformer(element));
}

function defValue(value, defValue) {
    return (value === null ? defValue : value);
}

function transformVectorDrawableColor(color) {
    return {
        type: "color",
        value: color
    };
}

function parseVectorDrawableGradient(element) {
    const result = {
        type: requireAttribute(element, "android:type"),
        startColor: optAttribute(element, "android:startColor"),
        centerColor: optAttribute(element, "android:centerColor"),
        endColor: optAttribute(element, "android:endColor"),
        tileMode: optAttribute(element, "android:tileMode")
    };

    if (result.type === "linear") {
        result.startX = optAttribute(element, "android:startX");
        result.startY = optAttribute(element, "android:startY");
        result.endX = optAttribute(element, "android:endX");
        result.endY = optAttribute(element, "android:endY");
    } else if (type === "radial") {
        result.centerX = optAttribute(element, "android:centerX");
        result.centerY = optAttribute(element, "android:centerY");
        result.gradientRadius = optAttribute(element, "android:gradientRadius");
    } else if (type === "sweep") {
        result.centerX = optAttribute(element, "android:centerX");
        result.centerY = optAttribute(element, "android:centerY");
    } else {
        throw new Error(`Unknown gradient type: ${util.inspect(element)}`);
    }

    result.items = stripCommentNodes(element.elements || []).map(node => {
        const itemElement = requireElement(node, "item");

        return {
            offset: optAttribute(itemElement, "android:offset"),
            color: optAttribute(itemElement, "android:color")
        };
    });

    return result;
}

function parseVectorDrawableChild(node) {
    const element = requireElement(node);

    if (element.name === "group") {
        return {
            type: "group",
            name: optAttribute(element, "android:name"), // String
            rotation: optAttribute(element, "android:rotation"), // Float
            pivotX: optAttribute(element, "android:pivotX"), // Float
            pivotY: optAttribute(element, "android:pivotY"), // Float
            scaleX: optAttribute(element, "android:scaleX"), // Float
            scaleY: optAttribute(element, "android:scaleY"), // Float
            translateX: optAttribute(element, "android:translateX"), // Float
            translateY: optAttribute(element, "android:translateY"), // Float
            children: stripCommentNodes(element.elements || []).map(parseVectorDrawableChild)
        };
    }

    if (element.name === "path") {
        const result = {
            type: "path",
            name: optAttribute(element, "android:name"), // String
            pathData: optAttribute(element, "android:pathData"), // String
            fillColor: transformNotNull(optAttribute(element, "android:fillColor"), transformVectorDrawableColor),
            fillAlpha: optAttribute(element, "android:fillAlpha"), // Float
            strokeColor: transformNotNull(optAttribute(element, "android:strokeColor"), transformVectorDrawableColor),
            strokeAlpha: optAttribute(element, "android:strokeAlpha"), // Float
            strokeWidth: optAttribute(element, "android:strokeWidth"), // Float
            trimPathStart: optAttribute(element, "android:trimPathStart"), // Float
            trimPathEnd: optAttribute(element, "android:trimPathEnd"), // Float
            trimPathOffset: optAttribute(element, "android:trimPathOffset"), // Float
            strokeLineCap: optAttribute(element, "android:strokeLineCap"), // "butt", "round", "square"
            strokeLineJoin: optAttribute(element, "android:strokeLineJoin"), // "miter", "round", "bevel"
            strokeMiterLimit: optAttribute(element, "android:strokeMiterLimit"), // Float
            fillType: optAttribute(element, "android:fillType") // "nonZero", "evenOdd"
        };

        stripCommentNodes(element.elements || []).forEach(node => {
            const aaptElement = requireElement(node, "aapt:attr");
            const name = requireAttribute(aaptElement, "name");

            let attribute;

            if (name === "android:fillColor") {
                attribute = "fillColor";
            } else if (name === "android:strokeColor") {
                attribute = "strokeColor";
            } else {
                throw new Error(`Unsupported aapt attribute: ${util.inspect(node)}`);
            }

            result[attribute] = parseVectorDrawableGradient(requireSingleChild(node, "gradient"));
        });

        return result;
    }

    if (element.name === "clip-path") {
        return {
            type: "clipPath",
            name: optAttribute(element, "android:name"), // String
            pathData: optAttribute(element, "android:pathData") // String
        };
    }

    throw new Error(`"group", "path" or "clip-path" element expected: ${util.inspect(element)}`);
}

function parseVectorDrawable(xml) {
    const element = requireSingleChild(xml, "vector");

    return {
        name: optAttribute(element, "android:name"), // String
        viewportWidth: requireAttribute(element, "android:viewportWidth"), // Float
        viewportHeight: requireAttribute(element, "android:viewportHeight"), // Float
        tint: optAttribute(element, "android:tint"), // String
        tintMode: optAttribute(element, "android:tintMode"), // "add", "multiply", "screen", "src_atop", "src_in", "src_over"
        alpha: optAttribute(element, "android:alpha"), // Float
        children: stripCommentNodes(element.elements || []).map(parseVectorDrawableChild)
    };
}

function convertVectorDrawablePlainColor(colorValue, alpha, attributes, colorName, opacityName) {
    if (colorValue.startsWith("@")) {
        throw new Error(`Colors from resources are not supported: "${color}"`);
    }

    if (colorValue.length === 9) {
        attributes[colorName] = "#" + colorValue.substr(3);

        if (alpha !== null) {
            attributes[opacityName] = String(parseInt(colorValue.substr(1, 2), 16) / 255.0 * parseFloat(alpha));
        } else {
            attributes[opacityName] = String(parseInt(colorValue.substr(1, 2), 16) / 255.0);
        }
    } else {
        attributes[colorName] = colorValue;

        if (alpha !== null) {
            attributes[opacityName] = alpha;
        }
    }

    return attributes;
}

function convertVectorDrawableColor(color, alpha, attributes, colorName, opacityName, context) {
    if (color.type === "color") {
        convertVectorDrawablePlainColor(color.value, alpha, attributes, colorName, opacityName);
        return;
    }

    const id = `gradient_${context.defsElements.length + 1}`;

    const result = {
        type: "element",
        attributes: {
            id: id,
            gradientUnits: "userSpaceOnUse"
        }
    };

    if (color.type === "linear") {
        result.name = "linearGradient";

        if (color.startX !== null) {
            result.attributes.x1 = color.startX;
        }

        if (color.startY !== null) {
            result.attributes.y1 = color.startY;
        }

        if (color.endX !== null) {
            result.attributes.x2 = color.endX;
        }

        if (color.endY !== null) {
            result.attributes.y2 = color.endY;
        }
    } else if (color.type === "radial") {
        result.name = "radialGradient";

        if (color.centerX !== null) {
            result.attributes.cx = color.centerX;
        }

        if (color.centerY !== null) {
            result.attributes.cy = color.centerY;
        }

        if (color.gradientRadius !== null) {
            result.attributes.fr = color.gradientRadius;
        }
    } else {
        // "sweep" is not supported
        throw new Error(`Unsupported gradient type: ${util.inspect(color)}`);
    }

    if (color.items.length !== 0) {
        result.elements = color.items.map(item => {
            const itemResult = {
                type: "element",
                name: "stop",
                attributes: {}
            };

            if (item.offset !== null) {
                itemResult.attributes.offset = item.offset;
            }

            if (item.color !== null) {
                convertVectorDrawablePlainColor(item.color, null, itemResult.attributes, "stop-color", "stop-opacity");
            }

            return itemResult;
        });
    } else {
        result.elements = [];

        if (item.startColor !== null) {
            result.elements.push(
                {
                    type: "element",
                    name: "stop",
                    attributes: convertVectorDrawablePlainColor(item.startColor, null, {offset: "0%"}, "stop-color", "stop-opacity")
                }
            );
        }

        if (item.centerColor !== null) {
            result.elements.push(
                {
                    type: "element",
                    name: "stop",
                    attributes: convertVectorDrawablePlainColor(item.centerColor, null, {offset: "50%"}, "stop-color", "stop-opacity")
                }
            );
        }

        if (item.endColor !== null) {
            result.elements.push(
                {
                    type: "element",
                    name: "stop",
                    attributes: convertVectorDrawablePlainColor(item.endColor, null, {offset: "100%"}, "stop-color", "stop-opacity")
                }
            );
        }
    }

    // TODO: tileMode

    context.defsElements.push(result);
    attributes[colorName] = `url(#${id})`

    if (alpha !== null) {
        attributes[opacityName] = alpha;
    }
}

function convertVectorDrawableChild(child, context) {
    if (child.type === "group") {
        const childContext = Object.assign({}, context, { clipPathId: null });
        const elements = child.children.flatMap(groupChild => convertVectorDrawableChild(groupChild, childContext));

        if (elements.length === 0) {
            return [];
        }

        const result = {
            type: "element",
            name: "g",
            attributes: {},
            elements: elements
        };

        if (context.clipPathId !== null) {
            result.attributes["clip-path"] = `url(#${context.clipPathId})`;
        }

        const translate = [];

        if (child.translateX !== null || child.translateY !== null) {
            translate.push(`translate(${defValue(child.translateX, "0")}, ${defValue(child.translateY, "0")})`);
        }

        if (child.rotation !== null) {
            if (child.pivotX !== null || child.pivotY !== null) {
                translate.push(`rotation(${child.rotation}, ${defValue(child.pivotX, "0")}, ${defValue(child.pivotY, "0")})`);
            } else {
                translate.push(`rotation(${child.rotation})`);
            }
        }

        if (child.scaleX !== null || child.scaleY !== null) {
            translate.push(`scale(${defValue(child.scaleX, "1")}, ${defValue(child.scaleY, "1")})`);
        }

        if (translate.length !== 0) {
            result.attributes.transform = translate.join(" ");
        }

        return [result];
    }

    if (child.type === "path") {
        if (child.pathData === null) {
            return [];
        }

        const result = {
            type: "element",
            name: "path",
            attributes: {
                d: child.pathData
            }
        };

        if (context.clipPathId !== null) {
            result.attributes["clip-path"] = `url(#${context.clipPathId})`;
        }

        if (child.fillColor !== null) {
            convertVectorDrawableColor(child.fillColor, child.fillAlpha, result.attributes, "fill", "fill-opacity", context);
        }

        if (child.fillType !== null) {
            result.attributes["fill-rule"] = child.fillType.toLowerCase();
        }

        if (child.strokeColor !== null) {
            convertVectorDrawableColor(child.strokeColor, child.strokeAlpha, result.attributes, "stroke", "stroke-opacity", context);
        }

        if (child.strokeWidth !== null) {
            result.attributes["stroke-width"] = child.strokeWidth;
        }

        if (child.strokeLineCap !== null) {
            result.attributes["stoke-linecap"] = child.strokeLineCap;
        }

        if (child.strokeLineJoin !== null) {
            result.attributes["stoke-linejoin"] = child.strokeLineJoin;
        }

        if (child.strokeMiterLimit !== null) {
            result.attributes["stoke-miterlimit"] = child.strokeMiterLimit;
        }

        if (child.trimPathStart !== null || child.trimPathEnd !== null) {
            const trimPathStart = (child.trimPathStart === null ? 0.0 : parseFloat(child.trimPathStart));
            const trimPathEnd = (child.trimPathEnd === null ? 1.0 : parseFloat(child.trimPathEnd));

            if (trimPathStart <= trimPathEnd) {
                result.attributes["pathLength"] = "1";
                result.attributes["stroke-dasharray"] = `0 ${trimPathStart} ${trimPathEnd - trimPathStart} ${1.0 - trimPathEnd}`;

                if (child.trimPathOffset !== null) {
                    result.attributes["stroke-dashoffset"] = child.trimPathOffset;
                }
            }
        }

        return [result];
    }

    if (child.type === "clipPath") {
        if (child.pathData === null) {
            return [];
        }

        let id = (child.name === null ? ('clip_' + (++context.clipPathIndex)) : child.name);
        let append = 0;

        while (typeof context.usedClipPathIdMap[id + (append === 0 ? '' : `_${append}`)] !== "undefined") {
            append++;
        }

        context.usedClipPathIdMap[id] = true;
        context.clipPathId = id;

        return [
            {
                type: "element",
                name: "clipPath",
                attributes: {
                    id: id
                },
                elements: [
                    {
                        type: "element",
                        name: "path",
                        attributes: {
                            d: child.pathData
                        }
                    }
                ]
            }
        ];
    }

    throw new Error(`Unsupported drawable child: ${util.inspect(child)}`);
}

function convertVectorDrawable(drawable) {
    const context = {
        clipPathId: null,
        clipPathIndex: 0,
        usedClipPathIdMap: Object.create(null),
        defsElements: []
    };

    const elements = drawable.children.flatMap(child => convertVectorDrawableChild(child, context));

    if (context.defsElements.length !== 0) {
        elements.push(
            {
                type: "element",
                name: "defs",
                elements: context.defsElements
            }
        );
    }

    const result =  {
        type: "element",
        name: "svg",
        attributes: {
            xmlns: "http://www.w3.org/2000/svg",
            width: drawable.viewportWidth,
            height: drawable.viewportHeight,
            viewBox: `0 0 ${drawable.viewportWidth} ${drawable.viewportHeight}`
        },
        elements: elements
    };

    if (drawable.name !== null) {
        result.attributes.id = drawable.name;
    }

    if (drawable.alpha !== null) {
        result.attributes.opacity = drawable.alpha;
    }

    // TODO: tint, tintMode

    return {
        elements: [result]
    };
}

async function performConversionAsync(fromPath, toPath) {
    const vectorXml = xmlJs.xml2js(await fs.readFileAsync(fromPath));
    const drawable = parseVectorDrawable(vectorXml);
    const svgXml = convertVectorDrawable(drawable);
    await fs.writeFileAsync(toPath, xmlJs.js2xml(svgXml, {spaces: 4}));
}

if (process.argv.length !== 4) {
    console.log(`Usage: ${process.argv[1]} <input.xml> <output.svg>`);
} else {
    performConversionAsync(process.argv[2], process.argv[3]).catch(e => {
        console.log(e);
    });
}
