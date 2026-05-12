
async function test() {
  const internalId = '670';
  const storeId = '53';
  const url = `https://marketplace.assai.com.br/stock?id_product=${internalId}&id_store=${storeId}`;
  
  console.log('Testing with x-basicauthorization:');
  const res1 = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'x-basicauthorization': 'Basic QXNzYWlBcHA6QXNzYWlBcHA='
    }
  });
  console.log('Status:', res1.status);
  
  console.log('Testing with Authorization:');
  const res2 = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'Authorization': 'Basic QXNzYWlBcHA6QXNzYWlBcHA='
    }
  });
  console.log('Status:', res2.status);
}

test();
