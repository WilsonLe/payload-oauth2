import { CollectionConfig } from "payload";

const Users: CollectionConfig = {
  slug: "users",
  auth: {
    disableLocalStrategy: true,
  },
  admin: {
    useAsTitle: "email",
  },
  fields: [{ name: "email", type: "email", required: true }],
};

export default Users;
