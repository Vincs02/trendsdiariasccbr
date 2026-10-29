import fs from 'node:fs';
const endpoint = "https://piaruvygwvfnyzlyplmp.supabase.co";
const key = "sb_publishable_hdYHma1B2OJr0pQXQ57Zdg_RQw8UaI6";
const response = await fetch(endpoint + '/rest/v1/trend_editions?select=payload', {headers:{apikey:key}, signal:AbortSignal.timeout(20000)});
if (!response.ok) throw new Error('Cannot load editions');
const editions = await response.json();
const manifest = fs.existsSync('covers.json') ? JSON.parse(fs.readFileSync('covers.json','utf8')) : {};
fs.mkdirSync('covers',{recursive:true});
for (const edition of editions) for (const trend of edition.payload.trends || []) {
 try {
  const url = new URL(trend.link);
  if (url.protocol !== 'https:' || !(url.hostname === 'capcut.com' || url.hostname.endsWith('.capcut.com'))) continue;
  const id = url.pathname.match(/template-detail\/(\d+)/)?.[1] || url.searchParams.get('template_id');
  if (!id || !/^\d+$/.test(id) || manifest[id]) continue;
  const page = await fetch(url,{signal:AbortSignal.timeout(20000)});
  if (!page.ok) continue;
  const html = await page.text();
  const tag = html.match(/<meta[^>]+property="og:image"[^>]*>/i)?.[0];
  const imageUrl = tag?.match(/content="([^"]+)"/)?.[1]?.replaceAll('&amp;','&');
  if (!imageUrl || !imageUrl.startsWith('https://')) continue;
  const image = await fetch(imageUrl,{signal:AbortSignal.timeout(20000)});
  if (!image.ok || !image.headers.get('content-type')?.startsWith('image/')) continue;
  const bytes = Buffer.from(await image.arrayBuffer());
  if (bytes.length > 10000000) continue;
  fs.writeFileSync('covers/' + id + '.jpg',bytes);
  manifest[id] = '/covers/' + id + '.jpg';
  console.log('Saved cover',id);
 } catch (error) { console.error('Cover unavailable:',trend.title,error.message); }
}
fs.writeFileSync('covers.json', JSON.stringify(manifest,null,2)+'\n');
