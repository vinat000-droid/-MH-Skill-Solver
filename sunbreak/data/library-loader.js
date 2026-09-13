window.MHRSBLibrary = (() => {
  // Sunbreak local DB loader
  // All CSV files are loaded from the same /sunbreak/data/ directory
  // as this library-loader.js file. No external network source is used.

  const DATA_BASE = new URL('./', document.currentScript?.src || location.href);

  const files = {
    skill: 'skills.csv',
    decorations: 'decorations.csv',
    head: 'armor_head.csv',
    chest: 'armor_body.csv',
    arms: 'armor_arm.csv',
    waist: 'armor_waist.csv',
    legs: 'armor_leg.csv'
  };

  function parse(text) {
    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter(x => x.trim() && !x.startsWith('//'));

    if (!lines.length) return [];

    const csv = (line) => {
      const a = [];
      let cur = '';
      let quoted = false;

      for (let i = 0; i < line.length; i++) {
        const c = line[i];

        if (c === '"') {
          if (quoted && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            quoted = !quoted;
          }
        } else if (c === ',' && !quoted) {
          a.push(cur);
          cur = '';
        } else {
          cur += c;
        }
      }

      a.push(cur);
      return a;
    };

    const headers = csv(lines[0]).map(x =>
      x.replace(/^"|"$/g, '').replace(/^#/, '')
    );

    return lines.slice(1).map(line => {
      const values = csv(line);
      const row = {};

      headers.forEach((header, i) => {
        row[header] = values[i] ?? '';
      });

      return row;
    });
  }

  async function get(name) {
    const url = new URL(files[name], DATA_BASE);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url.href, {
        cache: 'no-cache',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`${name} CSV ${response.status}`);
      }

      const text = await response.text();
      return parse(text);

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`${name} CSV 読み込みタイムアウト`);
      }

      throw new Error(
        `${name} CSV 読み込み失敗: ${error.message}`
      );

    } finally {
      clearTimeout(timer);
    }
  }

  async function all(cb) {
    const keys = Object.keys(files);
    const out = {};

    const pairs = await Promise.all(
      keys.map(async key => [key, await get(key)])
    );

    for (const [key, value] of pairs) {
      out[key] = value;
      cb?.(key, value.length);
    }

    return out;
  }

  return { all };
})();
