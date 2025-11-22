import { Actions } from "./action";
import { Passives } from "./passive";
import { Targets } from "./target";

export const Behavior = {
    passive : {...Passives},
    target : {...Targets},
    action : {...Actions}
};
