const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dbNationalities = await prisma.nationality.findMany();
  
  const mdPath = path.join(__dirname, '..', 'business', 'Danh_sach_cac_quoc_gia_tren_the_gioi_clean.md');
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

  // Find missing and matched
  const missing = [];
  const matched = [];
  const mismatchedNames = [];
  
  for (const item of parsed) {
    const dbMatch = dbNationalities.find(d => 
      d.countryName.toLowerCase() === item.name.toLowerCase()
    );
    
    if (dbMatch) {
      matched.push({
        ...item,
        dbCode: dbMatch.countryCode,
        currentGroup: dbMatch.group
      });
    } else {
      missing.push(item);
    }
  }

  console.log(`Total parsed from MD: ${parsed.length}`);
  console.log(`Total matched in DB: ${matched.length}`);
  console.log(`Total missing in DB: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('\nMissing in DB:');
    missing.forEach(m => console.log(`- ${m.name} (${m.group})`));
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
