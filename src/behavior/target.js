import { findAndSetTarget } from "../helper/movement";

export const Targets = {
  agent: {
    biggest: (world, agent) => {
      findAndSetTarget(
        agent,
        world.agents,
        (other) =>
          agent.attractiveness != world.maxAttractiveness &&
          other.type === "citizen" &&
          other.isAlive &&
          other.size >= world.size
      );
    },

    baby: (world, agent) => {
      findAndSetTarget(
        agent,
        world.agents,
        (other) =>
          agent.gender === "female" &&
          other.age <= 5 &&
          other.type === "citizen" &&
          other.isAlive
      );
    },
    goFight: (world, agent) => {
      findAndSetTarget(
        agent,
        world.agents,
        (other) =>
          agent.type === "citizen" &&
          agent.gender === "male" &&
          agent.age >= 5 &&
          agent.size > other.size &&
          agent != other &&
          agent.matingDrive === 100 &&
          other.type === "citizen" &&
          other.gender === "male" &&
          other.age >= 5 &&
          other.isAlive 
      );
    },
    femaleWithMostAttractiveness: (world, agent) => {
      findAndSetTarget(
        agent,
        world.agents,
        (other) =>
          agent.matingDrive === 100 &&
          agent.gender === "male" &&
          other.gender === "female" &&
          other.age >= 3 &&
          other.type === "citizen" &&
          other.isAlive &&
          other.attractiveness === world.maxAttractiveness &&
          other.reproductionCooldown === 0
      );
    },
  },

  resource: {
    food: (world, agent) => {
      findAndSetTarget(
        agent,
        world.agents,
        (other) => other.type === "business"
      );
    },
  },
};
