import { JSX, useEffect, useState } from "react";
import clsx from "clsx";
import Input from "../utils/Input";
import { useSystemStore } from "../../store/useSystemStore";
import Button from "../utils/Button";
import Toggle from "../utils/Toggle";
import { useUIOptionsStore } from "../../store/useUIOptionsStore";
import WithTooltip from "../utils/WithTooltip";

interface NetworkInformation {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

const settingsSections = [
  { id: "appearance", label: "Appearance" },
  { id: "network", label: "Network" },
  { id: "kernel", label: "Kernel" },
];

const contentMap: Record<string, JSX.Element> = {
  appearance: <Appearance />,
  network: <Network />,
  kernel: <Kernel />,
};

export function Network() {
  const { networkConnected, setNetworkConnected, setModule } = useSystemStore();

  const [ip, setIp] = useState("fetching...");
  const conn = (navigator as unknown as { connection: NetworkInformation })
    .connection as NetworkInformation;

  useEffect(() => {
    if (networkConnected)
      fetch("https://api.ipify.org?format=json")
        .then((res) => res.json())
        .then(({ ip }) => setIp(ip));
  }, []);

  return (
    <div className="flex flex-col items-start text-start">
      <h2 className="text-xl font-medium mb-4 text-white">Network</h2>
      <div className="text-gray-300">
        IP Address: <b>{ip}</b>
      </div>
      <div>
        <span className="font-medium text-white">Connection type:</span>{" "}
        {networkConnected ? conn?.type ?? "unknown" : "disconnected"}
      </div>
      <div>
        <span className="font-medium text-white">Effective type:</span>{" "}
        {networkConnected ? conn?.effectiveType ?? "unknown" : "disconnected"}
      </div>
      <div>
        <span className="font-medium text-white">Downlink:</span>{" "}
        {networkConnected
          ? conn?.downlink
            ? `${conn.downlink} Mbps`
            : "unknown"
          : "disconnected"}
      </div>
      <div>
        <span className="font-medium text-white">RTT:</span>{" "}
        {networkConnected
          ? conn?.rtt
            ? `${conn.rtt} ms`
            : "unknown"
          : "disconnected"}
      </div>
      <div>
        <span className="font-medium text-white">Save Data:</span>{" "}
        {networkConnected ? (conn?.saveData ? "Yes" : "No") : "disconnected"}
      </div>
      <div>
        <span className="font-medium text-white">User Agent:</span>{" "}
        <span>{networkConnected ? navigator.userAgent : "disconnected"}</span>
      </div>
      <div className="w-full mt-3 flex flex-col items-center">
        <b
          style={{
            color: networkConnected ? "green" : "red",
          }}
        >
          {networkConnected ? "You are connected!" : "Disconnected"}
        </b>
        <Button
          onClick={() =>
            setTimeout(() => {
              setNetworkConnected(!networkConnected);
              setModule({
                name: "network",
                status: networkConnected ? "unloaded" : "loaded",
              });
            }, 100)
          }
        >
          {networkConnected ? "Disconnect" : "Connect"}
        </Button>
      </div>
    </div>
  );
}

export function Appearance() {
  const { background, setBackground } = useSystemStore();
  const { optimizeUI, setOptimizeUI, renderMath, setRenderMath } =
    useUIOptionsStore();

  return (
    <div>
      <h2 className="text-xl font-medium mb-4 text-white">Appearance</h2>
      <div className="flex flex-col gap-2">
        <Input
          label="Background: "
          value={background}
          onChange={setBackground}
        />
        <WithTooltip tooltipContent="Enables/disables UI elements off-screen for performance.">
          <Toggle
            label="Optimize UI"
            isOn={optimizeUI}
            onToggle={setOptimizeUI}
          />
        </WithTooltip>

        <WithTooltip tooltipContent="Enables/disables rendering of LaTeX math formulas.">
          <Toggle
            label="Render math"
            isOn={renderMath}
            onToggle={setRenderMath}
          />
        </WithTooltip>
      </div>
    </div>
  );
}

export function Kernel() {
  const { modules } = useSystemStore();

  return (
    <div>
      <h2 className="text-xl font-medium mb-4 text-white">Kernel & System</h2>

      <div className=" text-gray-300 text-md text-start">
        <div>
          <span className="font-medium text-white">Platform:</span>{" "}
          {navigator.platform}
        </div>
        <div>
          <span className="font-medium text-white">Hardware Concurrency:</span>{" "}
          {navigator.hardwareConcurrency ?? "unknown"} logical cores
        </div>
        <div>
          <span className="font-medium text-white">Memory:</span>{" "}
          {/* @ts-ignore */}
          {navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "unknown"}
        </div>
        <div>
          <span className="font-medium text-white">Architecture:</span>{" "}
          {/* @ts-ignore */}
          {navigator.userAgentData?.platform ?? "unknown"}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-white mb-2">Modules</h3>
        <table className="w-full text-sm text-gray-300 border border-white/10 rounded-md overflow-hidden text-start">
          <thead className="bg-white/5 text-left">
            <tr>
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {modules.map((mod, i) => (
              <tr key={i}>
                <td className="py-2 px-3">{mod.name}</td>
                <td
                  className={clsx(
                    "py-2 px-3",
                    mod.status === "loaded"
                      ? "text-green-400"
                      : "text-yellow-400"
                  )}
                >
                  {mod.status}
                </td>
                <td className="py-2 px-3">{mod.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsWindow() {
  const [selected, setSelected] = useState("appearance");

  return (
    <div className="flex w-full h-full bg-[#1e1e1e]/80 overflow-hidden text-white font-code">
      <div className="w-52 bg-[#2a2a2a]/50 border-r border-[#333] p-4">
        <h1 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wide">
          Settings
        </h1>
        <ul className="space-y-1">
          {settingsSections.map((section) => (
            <li
              key={section.id}
              onClick={() => setSelected(section.id)}
              className={clsx(
                "cursor-pointer px-3 py-2 rounded text-gray-300 hover:bg-gray-600 hover:text-white transition-colors",
                selected === section.id && "bg-gray-700 text-white font-medium"
              )}
            >
              {section.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 p-6 overflow-auto">{contentMap[selected]}</div>
    </div>
  );
}
