
/**
 * XSUS AI Core — Memory Backup Storage Worker
 * Version: 1.0.0
 *
 * Qëllimi:
 * Teston ruajtjen e backup-eve nga procese të pavarura Node.js.
 */

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import { createMemoryBackupStorage } from "../../src/core/memory-backup-storage.js";

async function main() {
  const [, , filePath, backupId, sessionId] = process.argv;

  if (!filePath || !backupId || !sessionId) {
    throw new Error(
      "Argumentet e kërkuara: filePath, backupId, sessionId."
    );
  }

  const storage = createMemoryBackupStorage({ filePath });

  const backup = createMemoryBackup(
    {
      sessionId,
      messages: [
        {
          role: "user",
          content: `Backup nga procesi ${sessionId}`,
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant",
          content: `XSUS AI — ruajtja u kërkua nga ${sessionId}`,
          timestamp: new Date().toISOString(),
        },
      ],
    },
    { sessionId }
  );

  const result = await storage.save(backupId, backup);

  if (result?.saved !== true) {
    throw new Error(`Backup-i ${backupId} nuk u konfirmua si i ruajtur.`);
  }

  process.stdout.write(
    JSON.stringify({
      success: true,
      backupId,
      sessionId,
    }) + "\n"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
