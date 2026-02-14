import { useEffect, useState, useRef } from "react";

const bootLogs = [
  { text: "Detected 8 logical cores. Enabling SMP.", delay: 20 },
  { text: "ACPI: Early table checksum verification disabled", delay: 10 },
  { text: "Probing EDD (edd=off to disable)... ok", delay: 10 },
  { text: "Loading initial ramdisk...", delay: 30 },
  { text: "Decompressing... Parsing ELF... done.", delay: 20 },
  { text: "Booting the kernel.", delay: 50 },
  { text: "Initializing kernel...", delay: 50 },
  { text: "Loading specific drivers...", delay: 100 },
  { text: "Memory: 8154624K/8388608K available (12344K kernel code, 546K rwdata, 2460K bss)", delay: 60 },
  { text: "[    0.000000] Postix version 0.11.0-generic (buildd@0.11.0-ofdm.tech-production)", delay: 10 },
  {
    text: "[    0.002000] Command line: BOOT_IMAGE=web:http://ofdm.tech root=UUID=xxxx ro quiet splash",
    delay: 10,
  },
  { text: "[    0.054123] Dentry cache hash table entries: 1048576 (order: 11, 8388608 bytes)", delay: 50 },
  { text: "[    0.056000] Inode-cache hash table entries: 524288 (order: 10, 4194304 bytes)", delay: 20 },
  {
    text: "[    0.080000] Memory: 8060232K/8267236K available (8192K kernel code, 1224K rwdata, 2908K bss, 2048K init, 856K data)",
    delay: 80,
  },
  { text: "Mounting file system...", delay: 200 },
  { text: "[  OK  ] Mounted /", delay: 40 },
  { text: "[  OK  ] Started Rebuild Hardware Database.", delay: 20 },
  { text: "[  OK  ] Reached target Local File Systems.", delay: 10 },
  { text: "[  OK  ] Started Network Manager.", delay: 100 },
  { text: "Loading graphics driver...", delay: 400 },
  { text: "[    2.451233] gpu: module license 'uidrw' taints kernel.", delay: 150 },
  { text: "[    2.452000] Disabling lock debugging due to kernel taint", delay: 20 },
  { text: "Verifying system integrity...", delay: 300 },
  { text: "System check passed.", delay: 100 },
  { text: "Starting user interface...", delay: 100 },
  { text: "[  OK  ] Started uidrw Display Server.", delay: 50 },
  { text: "[  OK  ] Reached target Graphical Interface.", delay: 50 },
  { text: "Initializing Window Manager...", delay: 300 },
  { text: "Loading user configuration (.config/session)...", delay: 150 },
  { text: "Hydrating view components...", delay: 100 },
  { text: "Allocating main viewport buffer...", delay: 50 },
  { text: "Cleaning up temporary files...", delay: 50 },
  { text: "Welcome!", delay: 1000 },
];

export default function LoadingOverlay({ onComplete }: { onComplete?: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const runBootSequence = async () => {
      setLines([]);

      for (const log of bootLogs) {
        await wait(log.delay);
        setLines((prev) => [...prev, log.text]);
      }

      if (onComplete) {
        await wait(500);
        onComplete();
      }
    };

    runBootSequence();
  }, [onComplete]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="fixed inset-0 bg-black z-50 font-mono text-xs md:text-sm overflow-hidden flex flex-col">
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto text-green-400">
        {lines.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {line.includes("[  OK  ]") ? (
              <>
                <span className="text-green-600 font-bold">[ OK ]</span>
                <span>{line.replace("[  OK  ]", "")}</span>
              </>
            ) : (
              line
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
