import { downloadAll } from "../src/downloader.ts";

const main = async () => {
  const idPath = Deno.args[0];

  if (!idPath) {
    console.log(`usage: deno run -A ${Deno.mainModule} <ids.txt>`);
    return;
  }

  const idText = await Deno.readTextFile(idPath);

  for await (const errorOrFile of downloadAll(idText)) {
    if (errorOrFile instanceof Error) {
      console.error(errorOrFile);
    } else {
      const { name, blob } = errorOrFile;
      await Deno.writeFile(name, new Uint8Array(await blob.arrayBuffer()));
      console.log(`${name} save success`);
    }
  }
};

main().catch(console.error);
