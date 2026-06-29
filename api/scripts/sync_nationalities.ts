import fs from "fs"
import path from "path"
import prisma from "../src/lib/prisma"
import * as countries from "i18n-iso-countries"
import enLocale from "i18n-iso-countries/langs/en.json"

countries.registerLocale(enLocale)

async function main() {
  const mdPath = path.resolve(__dirname, "../../business/Danh_sach_cac_quoc_gia_tren_the_gioi_clean.md")
  const mdContent = fs.readFileSync(mdPath, "utf-8")

  const lines = mdContent.split("\n")
  const tableLines = lines.filter((line) => line.trim().startsWith("|") && !line.includes("|:---"))
  
  // Skip header
  tableLines.shift()

  const groupedCountries = {
    GOOD: [] as string[],
    NORMAL: [] as string[],
    BLACKLIST: [] as string[],
  }

  for (const line of tableLines) {
    const parts = line.split("|").map((p) => p.trim())
    if (parts.length >= 4) {
      if (parts[1] && parts[1] !== "_") groupedCountries.GOOD.push(parts[1])
      if (parts[2] && parts[2] !== "_") groupedCountries.NORMAL.push(parts[2])
      if (parts[3] && parts[3] !== "_") groupedCountries.BLACKLIST.push(parts[3])
    }
  }

  const customMapping: Record<string, string> = {
    "Congo, The Democratic Republic of the": "CD",
    "Côte d'Ivoire": "CI",
    "Korea, Democratic People's Republic of": "KP",
    "Korea, Republic of": "KR",
    "Holy See (Vatican City State)": "VA",
    "Moldova, Republic of": "MD",
    "Macedonia (the former Yugoslav Republic of)": "MK",
    "Micronesia, Federated States of": "FM",
    "Palestine, State of": "PS",
    "Tanzania, United Republic of": "TZ",
    "Bolivia, Plurinational State of": "BO",
    "Eswatini": "SZ",
    "Cabo Verde": "CV",
    "Curaçao": "CW",
    "Bonaire, Sint Eustatius and Saba": "BQ",
    "Falkland Islands (Malvinas)": "FK",
    "Venezuela, Bolivarian Republic of": "VE",
    "Iran, Islamic Republic of": "IR"
  }

  const resolveCountryCode = (name: string) => {
    if (customMapping[name]) return customMapping[name]
    const code = countries.getAlpha2Code(name, "en")
    return code || null
  }

  const targetMapping: Array<{ name: string, code: string, targetGroup: string }> = []
  const seenCodes = new Set<string>()
  
  for (const [group, list] of Object.entries(groupedCountries)) {
    for (const name of list) {
      const code = resolveCountryCode(name)
      if (code && !seenCodes.has(code)) {
        seenCodes.add(code)
        targetMapping.push({ name, code, targetGroup: group })
      }
    }
  }

  const dbNationalities = await prisma.nationality.findMany()
  const dbMap = new Map(dbNationalities.map((n) => [n.countryCode, n]))

  const inserts = []
  const updates = []

  for (const target of targetMapping) {
    const dbItem = dbMap.get(target.code)
    if (!dbItem) {
      inserts.push(target)
    } else {
      if (dbItem.group !== "POPULAR" && dbItem.group !== target.targetGroup) {
        updates.push(target)
      }
    }
  }

  console.log(`Tiến hành thêm mới: ${inserts.length} quốc gia.`)
  if (inserts.length > 0) {
    await prisma.nationality.createMany({
      data: inserts.map(target => ({
        countryCode: target.code,
        countryName: target.name,
        group: target.targetGroup as any,
        exemptionDays: 0
      }))
    })
    console.log(`Đã thêm mới ${inserts.length} quốc gia thành công.`)
  }

  console.log(`Tiến hành cập nhật: ${updates.length} quốc gia (bỏ qua nhóm POPULAR).`)
  for (const target of updates) {
    await prisma.nationality.update({
      where: { countryCode: target.code },
      data: { group: target.targetGroup as any }
    })
  }
  if (updates.length > 0) {
    console.log(`Đã cập nhật ${updates.length} quốc gia thành công.`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
