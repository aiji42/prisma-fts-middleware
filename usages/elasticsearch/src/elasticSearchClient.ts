import { Client } from "@elastic/elasticsearch";
export const elasticSearchClient = new Client({
  node: "http://localhost:9200",
});
