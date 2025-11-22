import { randInt } from "../helper/math";
import { dropArea } from "../helper/movement";
import { createBusiness } from "../main";

export const Passives = {
  agent: {
    death: (world, agent) => {

      if (agent.hunger <= 0) {
        agent.isAlive = false;

        for (let i = 0; i < agent.eaten; i++) {
          const { x: clampedX, y: clampedY } = dropArea(agent);
          world.addAgent(
            createBusiness({
              agentName: "C" + randInt(1000),
              x: clampedX,
              y: clampedY,
            })
          );
        }
        return;
      }
    },
    reproductionCooldown: (world, agent) => {
         if (world.tick % 50 === 0 && agent.gender === "female") {
        agent.reproductionCooldown = Math.max(0, agent.reproductionCooldown - 5);
      }
    },
    ageUp : (world, agent) => {
          if (world.tick % world.worldTicksPerDay === 0) agent.age++;
    },

    hungerDecay : (world, agent) => {
        if (world.tick % 50 === 0) agent.hunger = Math.max(0, agent.hunger - 1);
    }
  },
};

