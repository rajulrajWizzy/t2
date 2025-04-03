module.exports = {
  presets: [
    ["next/babel", {
      "preset-env": {},
      "transform-runtime": {},
      "styled-jsx": {},
      "class-properties": {}
    }]
  ],
  plugins: [
    ["@babel/plugin-transform-typescript", {
      "allowDeclareFields": true
    }],
    "@babel/plugin-transform-private-methods",
    "@babel/plugin-transform-class-properties"
  ]
};
