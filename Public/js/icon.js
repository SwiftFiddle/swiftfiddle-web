"use strict";

import { config, library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCodeBranch,
  faPlay,
  faStop,
  faEraser,
  faAlignLeft,
  faShareNodes,
  faCog,
  faQuestion,
  faCheckCircle as faCheckCircleSolid,
  faExclamationTriangle,
  faHeart,
} from "@fortawesome/pro-solid-svg-icons";
import {
  faCheck,
  faClipboard,
  faFileImport,
  faKeyboard,
  faToolbox,
  faMessageSmile,
  faCheckCircle,
  faAt,
  faDonate,
} from "@fortawesome/pro-regular-svg-icons";
import { faMonitorHeartRate } from "@fortawesome/pro-light-svg-icons";
import { faSpinnerThird, faRobot } from "@fortawesome/pro-duotone-svg-icons";
import {
  faSwift,
  faGithub,
  faTwitter,
  faFacebookSquare,
} from "@fortawesome/free-brands-svg-icons";

config.searchPseudoElements = true;
library.add(
  faCodeBranch,
  faPlay,
  faStop,
  faEraser,
  faAlignLeft,
  faShareNodes,
  faCog,
  faQuestion,
  faCheckCircleSolid,
  faExclamationTriangle,
  faHeart,

  faCheck,
  faClipboard,
  faFileImport,
  faKeyboard,
  faToolbox,
  faMessageSmile,
  faCheckCircle,
  faAt,
  faDonate,

  faMonitorHeartRate,

  faSpinnerThird,
  faRobot,

  faSwift,
  faGithub,
  faTwitter,
  faFacebookSquare
);
dom.watch();
