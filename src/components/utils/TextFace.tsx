import { useEffect, useState } from "react";

const faces = [
  "( -_- )",
  "( o_o )",
  "( ^_^ )",
  "( >_< )",
  "( -__- )",
  "( -‿- )",
  "( *_* )",
  "( -.- )",
];

export default function TextFace() {
  const [face, setFace] = useState(0);

  useEffect(() => {
    const changeInterval = setInterval(() => {
      setFace(Math.floor(Math.random() * (faces.length - 1)));
    }, 12000);

    return () => clearInterval(changeInterval);
  }, []);

  return <>{faces[face]}</>;
}
