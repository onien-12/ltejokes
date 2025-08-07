import { CommandHandler } from "./types";

export const ipCommand: CommandHandler = (args, { addOutput, systemStore }) => {
  // ip
  // ip addr (show)
  // ip route (show)

  const subcommand = args[1]?.toLowerCase();
  const action = args[2]?.toLowerCase();

  console.log(systemStore);

  if (!subcommand) {
    addOutput("Usage: ip [OPTIONS] OBJECT { COMMAND | help }");
    addOutput("       ip [ -force ] -batch filename");
    addOutput("where OBJECT := { addr | route }");
    addOutput(
      "OBJECTS and their options, as well as COMMANDS are described in ip(8)."
    );
    return;
  }

  switch (subcommand) {
    case "a":
    case "addr":
    case "address":
      if (action && action !== "show") {
        addOutput(`ip addr: unknown command "${action}"`);
        break;
      }
      const state = systemStore.networkConnected
        ? "<b style='color: green'>UP</b>"
        : "<b style='color: red'>DOWN</b>";

      addOutput(
        "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000"
      );
      addOutput("    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00");
      addOutput("    inet 127.0.0.1/8 scope host lo");
      addOutput("       valid_lft forever preferred_lft forever");
      addOutput("    inet6 ::1/128 scope host");
      addOutput("       valid_lft forever preferred_lft forever");
      addOutput(
        <span
          dangerouslySetInnerHTML={{
            __html: `2: eth0: &lt;BROADCAST,MULTICAST,${state}&gt; mtu 1500 qdisc pfifo_fast state ${state} group default qlen 1000`,
          }}
        ></span>
      );
      addOutput("    link/ether 24:4b:fe:d0:04:31 brd ff:ff:ff:ff:ff:ff");
      addOutput(
        "    inet 192.168.1.100/24 brd 192.168.1.255 scope global dynamic eth0"
      );
      addOutput("       valid_lft 86299sec preferred_lft 86299sec");
      break;

    case "r":
    case "route":
      if (action && action !== "show") {
        addOutput(`ip route: unknown command "${action}"`);
        break;
      }
      addOutput("default via 192.168.1.1 dev eth0 proto dhcp metric 100");
      addOutput(
        "192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100 metric 100"
      );
      break;

    default:
      addOutput(`ip: unknown object "${subcommand}"`);
      break;
  }
};
