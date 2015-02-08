---
title: Article 1
date: 2013-07-16
---

Normally I use [bourbon mixin library](http://bourbon.io/) in my projects. It's a nice set of base mixins, but the `transition` mixin it's a bit tricky when you need to transition vendor-prefixed properties like `transform`.

So, I wrote a **transition mixin** that *handles vendor-prefixed* properties by default.

If you write:

```scss
.foo {
   @include transition(transform 0.2s ease-in 0.2s, opacity 0.2s ease);
}
```

You get:

```scss
.foo {
  -webkit-transition: -webkit-transform 0.2s ease-in 0.2s, opacity 0.2s ease;
  -moz-transition: -moz-transform 0.2s ease-in 0.2s, opacity 0.2s ease;
  -o-transition: -o-transform 0.2s ease-in 0.2s, opacity 0.2s ease;
  transition: transform 0.2s ease-in 0.2s, opacity 0.2s ease;
}
```

And the SCSS code in question is:

```scss
@function prefix($property, $prefixes: (webkit moz o ms)) {
    $vendor-prefixed-properties: transform background-clip background-size;
    $result: ();
    @each $prefix in $prefixes {
       @if index($vendor-prefixed-properties, $property) {
         $property: -#{$prefix}-#{$property}
       }
       $result: append($result, $property);
    }
    @return $result;
}

@function trans-prefix($transition, $prefix: moz) {
    $prefixed: ();
    @each $trans in $transition {
        $prop-name: nth($trans, 1);
        $vendor-prop-name: prefix($prop-name, $prefix);
        $prop-vals: nth($trans, 2);
        $prefixed: append($prefixed, ($vendor-prop-name $prop-vals), comma);
    }

    @return $prefixed;
}


@mixin transition($values...) {
    $transitions: ();
    @each $declaration in $values {
        $prop: nth($declaration, 1);
        $prop-opts: ();
        $length: length($declaration);
        @for $i from 2 through $length {
            $prop-opts: append($prop-opts, nth($declaration, $i));
        }
        $trans: ($prop, $prop-opts);
        $transitions: append($transitions, $trans, comma);
    }

    -webkit-transition: trans-prefix($transitions, webkit);
    -moz-transition: trans-prefix($transitions, moz);
    -o-transition: trans-prefix($transitions, o);
    transition: $values;
}
```

You can change `$vendor-prefixed-properties` var inside `@function prefix` to set the CSS properties you want to vendor-prefix.