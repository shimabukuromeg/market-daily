import { createHash } from 'node:crypto';
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function files(root, current = root) {
  const result = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Knowledge backup cannot contain symlinks: ${path}`);
    if (entry.isDirectory()) result.push(...(await files(root, path)));
    else if (entry.isFile()) result.push(relative(root, path));
  }
  return result.sort((a, b) => a.localeCompare(b));
}

export async function exportKnowledge(source, destination) {
  source = resolve(source);
  destination = resolve(destination);
  if (destination === source || destination.startsWith(`${source}${sep}`))
    throw new Error(
      'Backup destination must be outside the knowledge directory',
    );
  const entries = await files(source);
  if (
    !entries.includes('CURRENT') ||
    !entries.includes('staging/backfill.json')
  )
    throw new Error('Knowledge store is not initialized');
  try {
    await lstat(destination);
    throw new Error('Backup destination already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  const manifest = {
    schema_version: 1,
    files: Object.fromEntries(
      await Promise.all(
        entries.map(async (entry) => [
          entry,
          hash(await readFile(resolve(destination, entry))),
        ]),
      ),
    ),
  };
  await writeFile(
    resolve(destination, 'BACKUP-MANIFEST.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o600 },
  );
  return { destination, file_count: entries.length };
}

export async function verifyKnowledgeBackup(directory) {
  directory = resolve(directory);
  const manifest = JSON.parse(
    await readFile(resolve(directory, 'BACKUP-MANIFEST.json'), 'utf8'),
  );
  if (manifest.schema_version !== 1 || !manifest.files)
    throw new Error('Unsupported backup manifest');
  const actual = (await files(directory)).filter(
    (entry) => entry !== 'BACKUP-MANIFEST.json',
  );
  const expected = Object.keys(manifest.files).sort((a, b) =>
    a.localeCompare(b),
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error('Backup file list mismatch');
  for (const entry of expected)
    if (
      hash(await readFile(resolve(directory, entry))) !== manifest.files[entry]
    )
      throw new Error(`Backup checksum mismatch: ${entry}`);
  return { directory, file_count: expected.length, verified: true };
}

export async function restoreKnowledgeBackup(backup, destination) {
  const verified = await verifyKnowledgeBackup(backup);
  destination = resolve(destination);
  try {
    await lstat(destination);
    throw new Error('Restore destination already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = `${destination}.restore-tmp`;
  try {
    await lstat(temporary);
    throw new Error('Incomplete restore directory already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(temporary, { recursive: true, mode: 0o700 });
  const manifest = JSON.parse(
    await readFile(resolve(backup, 'BACKUP-MANIFEST.json'), 'utf8'),
  );
  for (const entry of Object.keys(manifest.files)) {
    const output = resolve(temporary, entry);
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    await cp(resolve(backup, entry), output);
  }
  await rename(temporary, destination);
  return { destination, file_count: verified.file_count };
}
