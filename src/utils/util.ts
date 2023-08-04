import * as fs from "fs";

export interface PfxData {
  buffer: Buffer;
  passphrase: string;
}

/**
 * Converts a comma seperated string to a map.
 * The format of each value should be `"key,pathToPfx,passphrase"` seperated by `;`
 *
 * Given an string like the following: `"cert1,C:\\path\\to\\cert.pxf,certpass";cert2,C:\\alt\\to\\cert.pfx,certpazz"`
 * would be converted into the following map:
 * ```
 * cert1 => {buffer: <Buffer>, passphrase: "sopass"},
 * cert2 => {buffer: <Buffer>, passphrase: "sopazz"}
 * ```
 * If a value in the csv does not contain two commas (`,`) it will be ignored.
 *
 * @param csv The comma seperated string
 */
export function csvToMap(csv: string): Map<string, PfxData> {
  if (csv === "" || !csv.includes(",")) {
    return new Map();
  }

  return csv.split(";").reduce((map, currentValue) => {
    const [key, pathToPfx, passphrase] = currentValue.split(",");

    if (!key || !pathToPfx || !passphrase) {
      return map; // current value not in correct format so we ignore it and move on.
    }

    return map.set(key, { buffer: fs.readFileSync(pathToPfx), passphrase });
  }, new Map<string, PfxData>());
}
