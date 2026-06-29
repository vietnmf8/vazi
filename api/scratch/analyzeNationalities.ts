import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/prisma';
import countries from 'i18n-iso-countries';

countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

async function main() {
  const dbNationalities = await prisma.nationality.findMany();
  
  const mdPath = path.join(__dirname, '..', '..', 'business', 'Danh_sach_cac_quoc_gia_tren_the_gioi_clean.md');
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  
  const lines = mdContent.split('\n');
  const parsed = [];
  
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) continue;
    
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 4) continue;
    
    const c1 = parts[1] !== '_' ? parts[1] : null;
    const c2 = parts[2] !== '_' ? parts[2] : null;
    const c3 = parts[3] !== '_' ? parts[3] : null;
    
    if (c1) parsed.push({ name: c1, group: 'GOOD' });
    if (c2) parsed.push({ name: c2, group: 'NORMAL' });
    if (c3) parsed.push({ name: c3, group: 'BLACKLIST' });
  }

  const missing = [];
  const matched = [];
  
  for (const item of parsed) {
    // try exact match
    let dbMatch = dbNationalities.find(d => 
      d.countryName.toLowerCase() === item.name.toLowerCase()
    );
    
    // try iso code match
    if (!dbMatch) {
      const isoCode = countries.getAlpha2Code(item.name, 'en');
      if (isoCode) {
        dbMatch = dbNationalities.find(d => d.countryCode === isoCode);
      }
    }
    
    if (dbMatch) {
      matched.push({
        ...item,
        dbCode: dbMatch.countryCode,
        currentGroup: dbMatch.group
      });
    } else {
      missing.push({
        ...item,
        isoCode: countries.getAlpha2Code(item.name, 'en') || 'UNKNOWN'
      });
    }
  }

  console.log(`Total parsed from MD: ${parsed.length}`);
  console.log(`Total matched in DB: ${matched.length}`);
  console.log(`Total missing in DB: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('\nMissing in DB (Name | ISO Code | Intended Group):');
    missing.forEach(m => console.log(`- ${m.name} | ${m.isoCode} | ${m.group}`));
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
