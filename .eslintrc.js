module.exports = {
  "rules": {
    "ban": true,
    "class-name": true,
    "eofline": true,
    "indent": [true, "spaces"],
    "comment-format": [true, "check-space"],
    "curly": true,
    "forin": true,
    "label-position": true,
    "no-arg": true,
    "no-any": false,
    "jsdoc-format": true,
    "semicolon": [true, "always"],
    "no-duplicate-variable": true,
    "no-consecutive-blank-lines": [false, 2],
    "no-console": true,
    "no-debugger": true,
    "no-eval": true,
    "no-inferrable-types": [true, "ignore-params"],
    "no-shadowed-variable": true,
    "no-string-literal": false,
    "no-trailing-whitespace": true,
    "no-unused-expression": true,
    "one-line": [true, "check-open-brace", "check-catch", "check-else", "check-whitespace"],
    "typedef-whitespace": [
      true,
      {
        "call-signature": "nospace",
        "index-signature": "nospace",
        "parameter": "nospace",
        "property-declaration": "nospace",
        "variable-declaration": "nospace"
      }
    ],
    "no-switch-case-fall-through": true,
    "quotemark": [true, "double", "avoid-escape"],
    "triple-equals": [true, "allow-null-check"],
    "variable-name": [true, "check-format", "allow-leading-underscore", "ban-keywords"],
    "object-literal-key-quotes": [true, "as-needed"]
  }
}
