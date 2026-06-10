import{j as a}from"./index-iXV9uLP7.js";const i=["Комментарии не найдены","Подпишитесь на рассылку","Оставить комментарий","Читать оригинал"];function c(r){if(!r)return"";let e=r.replace(/\r\n?/g,`
`).replace(/\u00a0/g," ");for(const n of i){const t=e.indexOf(n);t>0&&(e=e.slice(0,t))}return e=e.replace(/[ \t]+\n/g,`
`),e=e.replace(/\n[ \t]+/g,`
`),e=e.replace(/\n{3,}/g,`

`),!e.includes(`

`)&&e.length>280&&(e=e.replace(new RegExp('(?<=[.!?…])\\s+(?=[А-ЯA-Z«""])',"g"),`

`)),e.trim()}function s(r){return c(r).split(/\n{2,}/).map(e=>e.replace(/\n/g," ").trim()).filter(e=>e.length>0)}const o=({text:r,className:e=""})=>{const n=s(r);return n.length===0?a.jsx("p",{className:`text-gray-400 ${e}`,children:"Текст недоступен."}):a.jsx("div",{className:`space-y-5 ${e}`,children:n.map((t,l)=>a.jsx("p",{className:"text-gray-300 leading-relaxed text-base",children:t},l))})};export{o as A};
