#!/usr/bin/env node

import { load_config, success, get_auth } from "./_utils.js";
import { program } from "commander/esm.mjs";
import { sheets } from "@googleapis/sheets";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { csvFormat } from "d3-dsv";

const parse = (res) => {
  const csv = Array();

  const data = res.data.values;
  const headers = data.shift().map((h) => h.trim());

  const headerToValue = (d, i) => [headers[i], d];

  data.forEach((row) => {
    csv.push(Object.fromEntries(row.map(headerToValue)));
  });

  return csvFormat(csv, headers);
};

export const fetchSheet = async ({ id, sheetId, output, auth }) => {
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  const authObject = get_auth(auth, scopes);

  const sheet = sheets({ version: "v4", auth: authObject });
  const gidQ = await sheet.spreadsheets.getByDataFilter({
    spreadsheetId: id,
    fields: "sheets(properties(title))",
    requestBody: { dataFilters: [{ gridRange: { sheetId: sheetId } }] },
  });

  const nameQ = await sheet.spreadsheets.values.get({
    spreadsheetId: id,
    range: `'${gidQ.data.sheets.pop().properties.title}'`,
  });

  const csv = parse(nameQ);

  const dir = output.substring(0, output.lastIndexOf("/"));
  !existsSync((dir.length > 0) ? dir : ".") && mkdirSync(dir, { recursive: true });
  writeFileSync(output, csv);
  success(`Wrote output to ${output}`);
};

async function main(opts) {
  const { config } = await load_config(opts.config);
  const files = config.fetch.filter(d => d.sheetId !== undefined)
  files.forEach(fetchSheet)
}

program
  .version("1.0.0")
  .option("-c, --config <path>", "path to config file")
  .parse();

main(program.opts());
