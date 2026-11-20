import React from "react";
import { Composition, Still } from "remotion";
import { Compilation, getTotalDuration } from "./Compilation";
import { Thumbnail } from "./Thumbnail";
import { LiveLinkStill } from "./components/LiveLink";
import { FPS } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Compilation"
      component={Compilation}
      durationInFrames={getTotalDuration()}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
    <Still id="LiveLink" component={LiveLinkStill} width={1920} height={1080} defaultProps={{ index: 0 }} />
  </>
);
