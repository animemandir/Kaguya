import classNames from "classnames";
import {
  BackwardButton,
  ForwardButton,
  FullscreenButton,
  PlayPauseButton,
  ProgressSlider,
  SettingsButton,
  SubtitleButton,
  TimeIndicator,
  useInteract,
  useVideo,
  VolumeButton,
} from "netplayer";
import * as React from "react";
import SkipButton from "./SkipButton";

interface ControlsProps {
  rightControlsSlot?: React.ReactNode;
  leftControlsSlot?: React.ReactNode;
}

const Controls: React.FC<ControlsProps> = ({
  leftControlsSlot,
  rightControlsSlot,
}) => {
  const { isInteracting } = useInteract();
  const { videoState } = useVideo();

  return (
    <div
      className={classNames(
        "controls-container w-full p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-300",
        !videoState.seeking && !isInteracting && !videoState.buffering
          ? "opacity-0 invisible"
          : "opacity-100 visible"
      )}
    >
      <div className="mb-4">
        <ProgressSlider />
      </div>

      <div className="w-full flex justify-between items-center text-white">
        <div className="flex items-center space-x-4">
          <PlayPauseButton />
          <BackwardButton />
          <ForwardButton />
          <VolumeButton />
          <TimeIndicator />
          {leftControlsSlot}
        </div>
        <div className="flex items-center space-x-4">
          {rightControlsSlot}
          <SkipButton />
          <SubtitleButton />
          <SettingsButton />
          <FullscreenButton />
        </div>
      </div>
    </div>
  );
};

export default Controls;
