import type {NextConfig} from 'next';

/* PERF-01: the fonts never change under the same name, the images of /assets rarely do; without these headers a repeat visit revalidated them (max-age=0). */
const config: NextConfig = {
 devIndicators:false,
 images:{formats:['image/avif','image/webp'],minimumCacheTTL:2592000},
 async headers(){return [
  {source:'/fonts/:file*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},
  {source:'/assets/:file*',headers:[{key:'Cache-Control',value:'public, max-age=604800, stale-while-revalidate=86400'}]},
 ]},
};
export default config;
