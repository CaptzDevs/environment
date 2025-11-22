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
  }