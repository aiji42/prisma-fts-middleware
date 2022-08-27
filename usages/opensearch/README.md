```bash
docker-compose --profile opensearch up
```

---

http://localhost:5602/app/dev_tools#/console
```
PUT post_index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "my_ja_analyzer": {
          "type": "custom",
          "char_filter":[
            "icu_normalizer"
          ],
          "tokenizer": "kuromoji_tokenizer",
          "filter": [
            "kuromoji_baseform",
            "kuromoji_part_of_speech",
            "kuromoji_readingform",
            "ja_stop",
            "kuromoji_number",
            "kuromoji_stemmer"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "my_ja_analyzer"
      },
      "content": {
        "type": "text",
        "analyzer": "my_ja_analyzer"
      }
    }
  }
}
```