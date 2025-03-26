import { CollectionConfig } from "payload";

const LocalUsers: CollectionConfig = {
  slug: "local-users",
  auth: true,
  admin: { useAsTitle: "email" },
  fields: [{ name: "email", type: "email", required: true }],
};

export default LocalUsers;
