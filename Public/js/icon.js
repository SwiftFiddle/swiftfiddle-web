"use strict";

import { config, library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCodeBranch,
  faPlay,
  faCircleNotch,
  faStop,
  faEraser,
  faAlignLeft,
  faShareNodes,
  faCog,
  faQuestion,
  faFileImport,
  faToolbox,
  faHeartPulse,
  faAt,
  faHeart,
  faCheckCircle as faCheckCircleSolid,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import {
  faClipboard,
  faKeyboard,
  faCheckCircle,
  faMessage,
} from "@fortawesome/free-regular-svg-icons";
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
  faShareNodes,
  faCog,
  faQuestion,
  faFileImport,
  faToolbox,
  faHeartPulse,
  faAt,
  faHeart,
  faCheckCircleSolid,
  faExclamationTriangle,

  faClipboard,
  faKeyboard,
  faCheckCircle,
  faMessage,

  faSwift,
  faGithub,
  faTwitter,
  faFacebookSquare
);
dom.watch();
