import React from "react";
import { Img, staticFile } from "remotion";
import { colors } from "../theme";

export const Logo: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <Img
    src={staticFile("brand/logo.webp")}
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      boxShadow: `0 0 ${size / 6}px ${colors.pink}`,
      ...style,
    }}
  />
);
