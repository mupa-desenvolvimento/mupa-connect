
async function test() {
  const internalId = '670';
  const storeId = '53';
  const url = `https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${storeId}`;
  
  const headers = {
    'accept': 'application/json',
    'x-basicauthorization': 'Basic QXNzYWlBcHA6QXNzYWlBcHA=',
    'Authorization': 'Basic QXNzYWlBcHA6QXNzYWlBcHA=',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  
  console.log('Testing with both headers and User-Agent:');
  const res = await fetch(url, { headers });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

test();
