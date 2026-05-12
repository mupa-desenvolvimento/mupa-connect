
async function test() {
  const internalId = '670';
  const storeId = '53';
  const url = `https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${storeId}`;
  
  console.log('Testing with User-Agent and x-basicauthorization:');
  const res1 = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'x-basicauthorization': 'Basic QXNzYWlBcHA6QXNzYWlBcHA='
    }
  });
  console.log('Status:', res1.status);
  if (res1.ok) {
    const data = await res1.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

test();
