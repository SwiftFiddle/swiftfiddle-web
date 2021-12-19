"use strict";

import { config, library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCodeBranch,
  faPlay,
  faCircleNotch,
  faStop,
  faEraser,
  faAlignLeft,
  faShareAlt,
  faCog,
  faQuestion,
  faExclamationTriangle,
} from "@fortawesome/pro-solid-svg-icons";
import {
  faCheck,
  faClipboard,
  faFileImport,
  faKeyboard,
  faToolbox,
  faCommentAltSmile,
  faCheckCircle,
  faAt,
  faDonate,
} from "@fortawesome/pro-regular-svg-icons";
import { faMonitorHeartRate } from "@fortawesome/pro-light-svg-icons";
import { faRobot } from "@fortawesome/pro-duotone-svg-icons";
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
  faCircleNotch,
  faStop,
  faEraser,
  faAlignLeft,
  faShareAlt,
  faCog,
  faQuestion,
  faExclamationTriangle,

  faCheck,
  faClipboard,
  faFileImport,
  faKeyboard,
  faToolbox,
  faCommentAltSmile,
  faCheckCircle,
  faAt,
  faDonate,

  faMonitorHeartRate,

  faRobot,

  faSwift,
  faGithub,
  faTwitter,
  faFacebookSquare
);
dom.watch();
