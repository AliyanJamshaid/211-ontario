import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchAndSave() {
  try {
    console.log('Fetching data from 211ontario.ca...');

    const response = await fetch(
      "https://211ontario.ca/results/?latitude=43.5890452&longitude=-79.6441198&searchLocation=Mississauga&searchTerms=&exct=0&sd=25&ss=Distance&topicPath=17",
      {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9",
          priority: "u=0, i",
          "sec-ch-ua":
            '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          cookie:
            "cookies=1; sa-user-id=s%253A0-b4d867bb-8e38-5c7e-7a8c-639240d53492.6VpqDgPPLG9eyNSx%252FxQiMmvpX8PfwvZGHB2ww5UgAqA; sa-user-id-v2=s%253AtNhnu444XH56jGOSQNU0kicuguY.dprDY%252Bdzx1bfJn4zn0xsI90HT4sfXnsINLtakNHW%252FnI; sa-user-id-v3=s%253AAQAKIB4ipPcs2ySijDwd_fk6za_g4yO9M2zAuiQYJW8dJHa7EAMYAyC42YnIBjABOgQCHjA2QgRb7v6V.7%252B1NEM8DaKu5pdNer33nqf%252FGf7zlUaWwCG4k%252FeLMkQc; _gid=GA1.2.1947963925.1763929156; _gat_UA-46245516-2=1; _ga=GA1.2.1526436543.1763494292; _ga_KQP2DWT3QC=GS2.2.s1763929157$o6$g1$t1763930135$j24$l0$h0; _ga_8KNSBF8S2Q=GS2.1.s1763929157$o9$g1$t1763930135$j18$l0$h0",
          Referer:
            "https://211ontario.ca/search/?searchLocation=Karachi&topicPath=60&latitude=24.882999420166&longitude=67.057998657227&sd=25&ss=Distance",
        },
        body: null,
        method: "GET",
      }
    );

    console.log('Response status:', response.status);

    const data = await response.text();

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    const outputPath = path.join(dataDir, 'fetched-response.html');
    fs.writeFileSync(outputPath, data);

    console.log(`Data saved to: ${outputPath}`);
    console.log(`Response length: ${data.length} characters`);

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchAndSave();
