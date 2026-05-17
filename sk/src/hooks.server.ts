import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event, {
		transformPageChunk: ({ html }) => {
			if(dev) {
				// Replace
				// Promise.all([
				// 	 import(".../entry.js"),
				// 	 import(".../app.js")
				// ]).then(([entry, app]) => { ...
				// with a sequential version:
				// import(".../entry.js").then(entry => {
				//    import(".../app.js").then(app => { ...
				// This is a workaround for a bug in SvelteKit that causes a race condition
				return html.replace(
					/Promise\.all\(\[\s*import\("([^"]+)"\),\s*import\("([^"]+)"\)\s*\]\)\.then\(\(\[(.*?),(.*?)\]\) => \{([\s\S]*?)\}\)/g,
					'import("$1").then($3 => { import("$2").then($4 => {$5}) })'
				);
			}
			return html;
		}
	});
};
