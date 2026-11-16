const https = require('https');

https.get('https://studio.tripo3d.ai/3d-model/f13bc6ad-5d70-4aec-8268-ae16a47e2141?invite_code=8L3IPG', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 1000));
    const matches = data.match(/https:\/\/[^"']*\.glb[^"']*/g);
    if (matches) {
      matches.forEach(m => console.log('Found GLB:', m));
    } else {
      console.log('No GLB found in HTML.');
    }
  });
}).on('error', (err) => {
  console.log('Error: ', err.message);
});
