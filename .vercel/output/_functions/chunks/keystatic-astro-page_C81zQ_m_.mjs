import { c as createComponent } from './astro-component_DeVkBMv4.mjs';
import 'piccolore';
import { l as renderComponent, r as renderTemplate } from './entrypoint_CNggLSW2.mjs';

const prerender = false;
const $$KeystaticAstroPage = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Keystatic", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "/Users/dylandibona/dylan@dylandibona.com/_Code Projects/dylandibona.com/dylandibona.com/node_modules/@keystatic/astro/internal/keystatic-page.js", "client:component-export": "Keystatic" })}`;
}, "/Users/dylandibona/dylan@dylandibona.com/_Code Projects/dylandibona.com/dylandibona.com/node_modules/@keystatic/astro/internal/keystatic-astro-page.astro", void 0);

const $$file = "/Users/dylandibona/dylan@dylandibona.com/_Code Projects/dylandibona.com/dylandibona.com/node_modules/@keystatic/astro/internal/keystatic-astro-page.astro";
const $$url = undefined;

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$KeystaticAstroPage,
	file: $$file,
	prerender,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
