import { Sequelize, DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// Import model definitions
import UserModel from "./user.js";
import EmailModel from "./email.js";

// Initialize models
const User = UserModel(sequelize, DataTypes);
const Email = EmailModel(sequelize, DataTypes);

// Define relationships
User.hasMany(Email, { foreignKey: "userId" });
Email.belongsTo(User, { foreignKey: "userId" });

export { sequelize, User, Email };