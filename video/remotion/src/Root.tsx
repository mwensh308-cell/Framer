import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { LottieDemo } from "./LottieDemo";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="HelloWorld"
    component={HelloWorld}
    durationInFrames={150}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ title: "Hello from Remotion" }}
  />
  <Composition
    id="LottieDemo"
    component={LottieDemo}
    durationInFrames={60}
    fps={30}
    width={512}
    height={512}
    defaultProps={{ src: "pulse.lottie.json" }}
  />
  </>
);
