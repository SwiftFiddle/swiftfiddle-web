import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faCodeBranch,
  faPlay,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
// import { faSpinnerThird } from "@fortawesome/pro-duotone-svg-icons";

library.add(faCodeBranch, faPlay, faExternalLinkAlt /*faSpinnerThird*/);
dom.watch();
