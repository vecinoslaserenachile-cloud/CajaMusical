const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://tripo-data.rg1.data.tripo3d.com/tripo-studio/20260329/e03db2d9-6b41-472c-b37d-6468ddc751eb/tripo_pbr_model_e03db2d9-6b41-472c-b37d-6468ddc751eb_meshopt.glb?Key-Pair-Id=K1676C64NMVM2J&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly90cmlwby1kYXRhLnJnMS5kYXRhLnRyaXBvM2QuY29tL3RyaXBvLXN0dWRpby8yMDI2MDMyOS9lMDNkYjJkOS02YjQxLTQ3MmMtYjM3ZC02NDY4ZGRjNzUxZWIvdHJpcG9fcGJyX21vZGVsX2UwM2RiMmQ5LTZiNDEtNDcyYy1iMzdkLTY0NjhkZGM3NTFlYl9tZXNob3B0LmdsYiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc3NDc0MjQwMH19fV19&Signature=k4TCvUhYMRPWb93jrakA7VvYv9Q0UPlOjB8OQj5QLJc3qzdRzwK-WwWTQnSTevDWxYDQc8SjGfakhJPQhnBcvuV7yJawVmecQnMTv5mRodYhWs5kxoDAfTFRJgGUofgp1Zz1UdnVAeICrCW4iEO7IEiARxV0Dwh7oRpnu2DtrBwnF1mdW-A8j9cnN2XczA6CiqwSj~XmE~D5y788NmzM8pkKCNSyKHlIZWj3fbakz7BL0~Pcwb9WHaI4tQayo2CPbqU2r3C5nMX1Ul38If92tZpWqhphw-oVOufOxavJzAU5MTe69RvBK-AHX5mbtK9NyCcrK~G2ZomPa1Ntj0TuGQ__';
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

const file = fs.createWriteStream(path.join(publicDir, 'faro.glb'));

https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download completed');
  });
}).on('error', (err) => {
  fs.unlink(path.join(publicDir, 'faro.glb'), () => {});
  console.error('Error downloading:', err.message);
});
