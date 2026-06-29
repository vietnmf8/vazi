const https = require('https');
const fs = require('fs');
const path = require('path');

const downloads = [
  { url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80', file: 'public/images/about-us/sapa.jpg' },
  { url: 'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1200&q=80', file: 'public/images/about-us/hoian.jpg' },
  { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', file: 'public/images/about-us/halong.jpg' },
  { url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80', file: 'public/images/about-us/danang.jpg' },
  { url: 'https://images.unsplash.com/photo-1557750255-c76072a7aad1?auto=format&fit=crop&w=1200&q=80', file: 'public/images/about-us/ninhbinh.jpg' },
  { url: 'https://images.unsplash.com/photo-1545172538-171a802bd867?auto=format&fit=crop&w=1200&q=80', file: 'public/images/about-us/phuquoc.jpg' },
  { url: 'https://images.unsplash.com/photo-1531737212413-667205e1cda7?q=80&w=1920&auto=format&fit=crop', file: 'public/images/about-us/mission-sapa.jpg' },
  { url: 'https://images.unsplash.com/photo-1609412058473-c199497c3c5d?q=80&w=1920&auto=format&fit=crop', file: 'public/images/about-us/mission-hoian.jpg' },
  { url: 'https://images.unsplash.com/photo-1603852452378-a4e8d84324a2?q=80&w=1920&auto=format&fit=crop', file: 'public/images/about-us/mission-journey.jpg' },
  { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1920&q=90', file: 'public/images/guide/ready-to-apply-hero.jpg' },
  { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80', file: 'public/images/guide/guide-1.jpg' },
  { url: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1600&q=80', file: 'public/images/guide/guide-2.jpg' },
  { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80', file: 'public/images/guide/guide-3.jpg' },
  { url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80', file: 'public/images/guide/guide-4.jpg' },
  { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1600&q=80', file: 'public/images/guide/guide-5.jpg' },
  { url: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=1200&q=80', file: 'public/images/guide/req-docs-1.jpg' },
  { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80', file: 'public/images/guide/req-docs-2.jpg' },
  { url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=1200&q=80', file: 'public/images/guide/req-docs-3.jpg' }
];

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

(async () => {
  for (const item of downloads) {
    const fullPath = path.join(__dirname, '..', item.file);
    try {
      await download(item.url, fullPath);
      console.log(`Downloaded ${item.file}`);
    } catch (e) {
      console.error(`Failed ${item.file}`, e);
    }
  }
})();
