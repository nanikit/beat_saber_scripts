import { downloadAll } from "../src/downloader.ts";

const main = async () => {
  const paths = Deno.args;

  if (paths.length === 0) {
    console.log(`usage: deno run -A ${Deno.mainModule} <ids.txt>`);
  }

  const idText = await Deno.readTextFile(Deno.args[0]);

  for await (const errorOrFile of downloadAll(idText, { fetch })) {
    if (errorOrFile instanceof Error) {
      console.error(errorOrFile);
    } else {
      const { name, arrayBuffer } = errorOrFile;
      await Deno.writeFile(name, new Uint8Array(arrayBuffer));
      console.log(`${name} save success`);
    }
  }
};

main().catch(console.error);
