
async function test() {
  const internalId = '670';
  const storeId = '53';
  const url = `https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${storeId}`;
  
  const tokens = [
    'Basic QXNzYWlBcHA6QXNzYWlBcHA=', // AssaiApp:AssaiApp
    'Basic QXNzYWk6QXNzYWk=',        // Assai:Assai
    'Basic YXNzYWk6YXNzYWk=',        // assai:assai
    'Basic QXNzYWlBcHA6QXNzYWkyMDIz', // AssaiApp:Assai2023
  ];
  
  for (const token of tokens) {
    console.log(`Testing with ${token}:`);
    const res = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-basicauthorization': token
      }
    });
    console.log('Status:', res.status);
    if (res.ok) {
      console.log('SUCCESS with token:', token);
      break;
    }
  }
}

test();
