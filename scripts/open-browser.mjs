import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const config=JSON.parse(await readFile(new URL('../.local/config.json',import.meta.url),'utf8'));
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=resolve(config.browserProfile ?? '.local/x-profile');
const endpoint=new URL(config.cdpEndpoint);
const child=spawn(chrome,['--no-first-run','--no-default-browser-check',`--remote-debugging-port=${endpoint.port}`,`--user-data-dir=${profile}`,`https://x.com/i/lists/${config.listId}`],{detached:true,stdio:'ignore'});
child.unref();
console.log(`Opened the dedicated Chrome profile with CDP on ${endpoint.origin}`);
