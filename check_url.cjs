const fs = require('fs');

async function check() {
  const r = await fetch('https://mamapayslip.vercel.app/');
  const html = await r.text();
  const match = html.match(/src="(\/assets\/index-.*?\.js)"/);
  if (match) {
    const jsUrl = 'https://mamapayslip.vercel.app' + match[1];
    const jsR = await fetch(jsUrl);
    const js = await jsR.text();
    const urls = js.match(/(https:\/\/[A-Za-z0-9]+\.supabase\.co)/g);
    console.log('URLs in bundle:', [...new Set(urls)]);
  } else {
    console.log('Could not find index file');
  }
}
check();
