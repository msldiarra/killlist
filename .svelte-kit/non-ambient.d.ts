
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/morgue" | "/registry";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/morgue": Record<string, never>;
			"/registry": Record<string, never>
		};
		Pathname(): "/" | "/morgue" | "/morgue/" | "/registry" | "/registry/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.svg" | "/icons/apple-touch-icon.png" | "/icons/icon-192.png" | "/icons/icon-512.png" | "/logo.png" | "/manifest.json" | "/sound/execute.mp3" | "/sound/execute.mp3:Zone.Identifier" | "/sound/load.mp3" | "/sound/load.mp3:Zone.Identifier" | "/sound/upload.mp3" | "/sound/upload.mp3:Zone.Identifier" | "/theorder.png:Zone.Identifier" | string & {};
	}
}