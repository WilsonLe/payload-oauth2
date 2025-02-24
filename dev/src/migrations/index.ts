import * as migration_20241017_034629 from "./20241017_034629";
import * as migration_20250224_052431 from "./20250224_052431";

export const migrations = [
  {
    up: migration_20241017_034629.up,
    down: migration_20241017_034629.down,
    name: "20241017_034629",
  },
  {
    up: migration_20250224_052431.up,
    down: migration_20250224_052431.down,
    name: "20250224_052431",
  },
];
