#!/usr/bin/env node
/**
 * build-address-index.js
 * ──────────────────────
 * Reads ALL CSV files from the "ALL ADDRESSES" directory and builds
 * a single JSON index at public/data/address-index.json.
 *
 * CSV schema: entity_name, entity_slug, address, label
 * Output:     [ { name, slug, address, label, category, hasIcon }, ... ]
 *
 * Usage:
 *   node scripts/build-address-index.js
 *   node scripts/build-address-index.js --source "C:/path/to/ALL ADDRESSES"
 */

const fs = require("fs");
const path = require("path");

/* ──── Config ──── */
const DEFAULT_SOURCE = path.resolve(__dirname, "../../ALL ADDRESSES");
const OUTPUT = path.resolve(__dirname, "../public/data/address-index.json");
const ICONS_DIR = path.resolve(__dirname, "../public/icons/entities");

/* ──── Proper CSV parser (handles quoted fields & escaped quotes) ──── */
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  // Skip header
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length >= 4) {
      rows.push({
        entity_name: fields[0],
        entity_slug: fields[1],
        address: fields[2],
        label: fields[3],
      });
    }
  }
  return rows;
}

/* ──── Build icon lookup set ──── */
function buildIconSet() {
  const set = new Set();
  if (!fs.existsSync(ICONS_DIR)) return set;
  for (const file of fs.readdirSync(ICONS_DIR)) {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".png" || ext === ".svg" || ext === ".jpg" || ext === ".webp") {
      set.add(path.basename(file, ext));
    }
  }
  return set;
}

/* ──── Recursively walk directories ──── */
function walkCSVs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkCSVs(fullPath));
    } else if (
      entry.name.endsWith(".csv") &&
      !entry.name.startsWith("_")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

/* ──── Truncate address for display (first 5 chars after prefix) ──── */
function truncateAddress(addr) {
  if (!addr) return "";
  const trimmed = addr.trim();

  // EVM: 0x + first 3 hex chars
  if (/^0x[a-fA-F0-9]+$/i.test(trimmed)) {
    return "0x" + trimmed.slice(2, 5);
  }

  // Bitcoin bech32: bc1q + first 2 chars
  if (/^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i.test(trimmed)) {
    return trimmed.slice(0, 5);
  }

  // Tron: T + first 4 chars
  if (/^T[A-Za-z1-9]{33}$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }

  // Solana / other: first 5 chars
  return trimmed.slice(0, 5);
}

/* ──── Main ──── */
function main() {
  const sourceArg = process.argv.find((a) => a.startsWith("--source="));
  const sourceDir = sourceArg
    ? sourceArg.split("=")[1]
    : DEFAULT_SOURCE;

  console.log(`\n📂 Source:  ${sourceDir}`);
  console.log(`📄 Output:  ${OUTPUT}`);

  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const iconSet = buildIconSet();
  console.log(`🎨 Icons:   ${iconSet.size} entity icons found\n`);

  const csvFiles = walkCSVs(sourceDir);
  console.log(`📋 Found ${csvFiles.length} CSV files\n`);

  const dedup = new Map(); // address (lowercase) → entry
  let totalParsed = 0;
  let totalSkipped = 0;
  const categoryCounts = {};

  for (const csvPath of csvFiles) {
    // Derive category from parent folder name
    const relToSource = path.relative(sourceDir, csvPath);
    const parts = relToSource.split(path.sep);
    const category = parts.length > 1 ? parts[0] : "Other";
    const tagName = path.basename(csvPath, ".csv");

    const content = fs.readFileSync(csvPath, "utf8");
    const rows = parseCSV(content);

    for (const row of rows) {
      if (!row.address || row.address.length < 6) {
        totalSkipped++;
        continue;
      }

      const addrKey = row.address.toLowerCase();

      // Normalize entity name: title-case the first letter of each word
      const name = row.entity_name || "";
      const slug = row.entity_slug || "";
      const label = row.label || "";
      const hasIcon = iconSet.has(slug);

      // Generate display text: "Name (trunc)" format
      const addrTrunc = truncateAddress(row.address);
      const displayLabel = label || (addrTrunc ? `(${addrTrunc})` : "");

      const entry = {
        n: name,                    // entity name
        s: slug,                    // entity slug
        a: row.address,             // full address
        l: displayLabel,            // label
        c: category,                // category (DeFi, CeFi, etc.)
        t: tagName,                 // tag / source file name
        i: hasIcon ? 1 : 0,        // has icon (1/0 to save space)
      };

      // Dedup: keep entry with richest label
      if (!dedup.has(addrKey)) {
        dedup.set(addrKey, entry);
      } else {
        const existing = dedup.get(addrKey);
        // Prefer entry with icon, then longer label
        if (
          (entry.i && !existing.i) ||
          (entry.l.length > existing.l.length && entry.i >= existing.i)
        ) {
          dedup.set(addrKey, entry);
        }
      }

      totalParsed++;
    }

    categoryCounts[category] = (categoryCounts[category] || 0) + rows.length;
  }

  const index = Array.from(dedup.values());

  // Sort: entities with icons first, then alphabetically by name
  index.sort((a, b) => {
    if (a.i !== b.i) return b.i - a.i; // icons first
    return a.n.localeCompare(b.n, "en", { sensitivity: "base" });
  });

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(index), "utf8");

  const sizeKB = (fs.statSync(OUTPUT).size / 1024).toFixed(1);

  console.log("─".repeat(50));
  console.log(`✅ Index built successfully!`);
  console.log(`   Entries:    ${index.length} unique addresses`);
  console.log(`   Parsed:     ${totalParsed} rows total`);
  console.log(`   Skipped:    ${totalSkipped} invalid`);
  console.log(`   With icon:  ${index.filter((e) => e.i).length}`);
  console.log(`   File size:  ${sizeKB} KB`);
  console.log("\n📊 By category:");
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(20)} ${count} rows`);
    });
  console.log("");
}

main();
