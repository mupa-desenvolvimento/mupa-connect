
async function test() {
  const internalId = 670; // Number
  const storeId = 53;    // Number
  const url = `https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${storeId}`;
  
  console.log('Testing with Numbers:');
  const res = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'x-basicauthorization': 'Basic QXNzYWlBcHA6QXNzYWlBcHA='
    }
  });
  console.log('Status:', res.status);
}

test();
