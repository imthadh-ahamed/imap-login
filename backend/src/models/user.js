export default (sequelize, DataTypes) => {
  /**
   * Defines a User model with fields for email, accessToken and refreshToken.
   * These tokens will be used to connect to Gmail via IMAP.
   */
  const User = sequelize.define("User", {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    accessToken: DataTypes.TEXT,
    refreshToken: DataTypes.TEXT,
  });

  return User;
};