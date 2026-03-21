import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function upload() {
  const fileStream = fs.createReadStream('./public/logo.png');
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fileStream);

  try {
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
    });
    const url = await response.text();
    console.log('Uploaded to:', url);
  } catch (e) {
    console.error('Error uploading:', e);
  }
}

upload();
