import { Client } from "@opensearch-project/opensearch";
export const openSearchClient = new Client({
  node: "http://localhost:9201",
});
