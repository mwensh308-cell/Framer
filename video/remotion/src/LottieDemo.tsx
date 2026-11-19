import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";

// Plays a Lottie JSON (e.g. exported from After Effects with Bodymovin) from public/.
export const LottieDemo: React.FC<{ src: string }> = ({ src }) => {
  const [handle] = useState(() => delayRender("Loading Lottie"));
  const [data, setData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    fetch(staticFile(src))
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, src]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0618" }}>
      {data ? <Lottie animationData={data} /> : null}
    </AbsoluteFill>
  );
};
