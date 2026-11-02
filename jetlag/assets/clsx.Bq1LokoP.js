var x={exports:{}},i={};/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var f;function R(){if(f)return i;f=1;var r=Symbol.for("react.transitional.element"),u=Symbol.for("react.fragment");function n(t,e,s){var o=null;if(s!==void 0&&(o=""+s),e.key!==void 0&&(o=""+e.key),"key"in e){s={};for(var a in e)a!=="key"&&(s[a]=e[a])}else s=e;return e=s.ref,{$$typeof:r,type:t,key:o,ref:e!==void 0?e:null,props:s}}return i.Fragment=u,i.jsx=n,i.jsxs=n,i}var l;function p(){return l||(l=1,x.exports=R()),x.exports}var d=p();function v(r){var u,n,t="";if(typeof r=="string"||typeof r=="number")t+=r;else if(typeof r=="object")if(Array.isArray(r)){var e=r.length;for(u=0;u<e;u++)r[u]&&(n=v(r[u]))&&(t&&(t+=" "),t+=n)}else for(n in r)r[n]&&(t&&(t+=" "),t+=n);return t}function E(){for(var r,u,n=0,t="",e=arguments.length;n<e;n++)(r=arguments[n])&&(u=v(r))&&(t&&(t+=" "),t+=u);return t}export{E as c,d as j};
