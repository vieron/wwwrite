---
title: Article 2
date: 2013-10-21
---

If you use Fonts.com, you'll know that they implement one different `font-family` name per weight or style of the same font. This means you need to explicitly declare in your elements that use a `font-weight` different to `normal`, the new `font-family` corresponding to that weight.

I wrote a small [Javascript Font Loader for Fonts.com](https://gist.github.com/vieron/6842774) that allows multiple weights per font-family.

Basically it loads the CSS from fonts.com, is modified according to the specified settings and is appended to the <head> of your document.

## Usage

```js
FontsComLoader.load('HelveticaNeueFontsCom', 'https://fast.fonts.net/cssapi/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX.css', {
    'W02-55Roma': '400',
    'W02-75Bold': '700'
});
```

In the snippet above, `HelveticaNeueFontsCom` is the name you want to use later in CSS `font-family` declarations.

The keys in the object should match `font-family` names provided by fonts.com for each font weight or style, they will be replaced by `HelveticaNeueFontsCom` in this case. Object values can be a string indicating the desired `font-weight` or an object specifying `font-weight` and `font-style`:

```js
FontsComLoader.load('HelveticaNeueFontsCom', 'https://fast.fonts.net/cssapi/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX.css', {
    'W02-55Roma': {
        weight: '400',
        style: 'normal'
    },
    'W02-75Bold': {
        weight: '700',
        style: 'normal'
    }
});
```

Then in your CSS, you can use it like so:

```css
body {
    font-family: 'HelveticaNeueFontsCom'
    font-weight: 400;
}

.foo {
    font-weight: 700;
}
```