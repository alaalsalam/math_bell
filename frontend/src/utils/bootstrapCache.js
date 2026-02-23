import { getBootstrap } from "../api/client";

let bootstrapPromise = null;
let bootstrapData = null;

export async function loadBootstrap(force = false) {
  if (force) {
    bootstrapData = null;
    bootstrapPromise = null;
  }

  if (bootstrapData) {
    return bootstrapData;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = getBootstrap().then((res) => {
      bootstrapData = res.data;
      return bootstrapData;
    });
  }

  return bootstrapPromise;
}

export function getCachedBootstrap() {
  return bootstrapData;
}
